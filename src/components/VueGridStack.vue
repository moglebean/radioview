<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GridStack } from 'gridstack'

const getGlobalValue = (key, initializer) => {
  if (typeof globalThis === 'undefined') {
    return initializer()
  }
  if (!globalThis[key]) {
    globalThis[key] = initializer()
  }
  return globalThis[key]
}

const paneTransfers = getGlobalValue('__vueGridStackPaneTransfers__', () => new Map())
let gridInstanceCounter = getGlobalValue('__vueGridStackInstanceCounter__', () => 0)

const toStringArray = (groups) =>
  Array.isArray(groups) ? groups.filter((entry) => typeof entry === 'string') : []

const resolvePaneGroup = (candidate, groups) => {
  if (typeof candidate === 'string') {
    return candidate
  }
  if (groups.length > 0) {
    return groups[0]
  }
  return ''
}

const createInstanceId = () => {
  gridInstanceCounter += 1
  if (typeof globalThis !== 'undefined') {
    globalThis.__vueGridStackInstanceCounter__ = gridInstanceCounter
  }
  return `grid-stack-${gridInstanceCounter}`
}

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({}),
  },
  dragGroups: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['panesChange'])

const gridContainer = ref(null)
const panes = ref([])

const sanitizedDragGroups = computed(() => toStringArray(props.dragGroups))
const instanceId = createInstanceId()
const debugLog = (...args) => {
  // eslint-disable-next-line no-console
  console.log(`[VueGridStack:${instanceId}]`, ...args)
}
const pendingRemovals = new Set()
const suppressedRemovedIds = new Set()
let isClearing = false

let grid
let changeHandler
let dragStartHandler
let dragHandler
let dragStopHandler
let paneCounter = 0

const generatePaneId = () => {
  paneCounter += 1
  return `pane-${Date.now()}-${paneCounter}`
}

const getPaneIdFromNode = (node) =>
  node?.id ??
  node?.el?.getAttribute?.('data-gs-id') ??
  node?.el?.dataset?.gsId ??
  node?.gridstackNode?.id ??
  node?.el?.gridstackNode?.id

const evaluateAcceptSetting = (acceptSetting, element) => {
  if (typeof acceptSetting === 'function') {
    return !!acceptSetting(element)
  }
  if (typeof acceptSetting === 'string') {
    return element?.matches?.(acceptSetting) ?? false
  }
  if (typeof acceptSetting === 'boolean') {
    return acceptSetting
  }
  return true
}

const buildGridOptions = (settings = {}, groups = []) => {
  const draggableHandle = settings.draggableHandle ?? '.pane__header'

  const options = {
    column: settings.column ?? 4,
    float: settings.float ?? true,
    margin: settings.margin ?? 12,
    cellHeight: settings.cellHeight ?? 260,
    minRow: settings.minRow ?? 1,
    disableOneColumnMode: settings.disableOneColumnMode ?? true,
    staticGrid: settings.staticGrid ?? false,
    alwaysShowResizeHandle: false,
    draggableHandle,
  }

  if (settings.maxRow != null) {
    options.maxRow = settings.maxRow
  }
  if (settings.minRow != null) {
    options.minRow = settings.minRow
  }
  if (settings.alwaysShowResizeHandle != null) {
    options.alwaysShowResizeHandle = settings.alwaysShowResizeHandle
  }
  if (settings.dragIn != null) {
    options.dragIn = settings.dragIn
  }
  if (settings.dragInOptions != null) {
    options.dragInOptions = settings.dragInOptions
  }

  options.resizable = {
    handles: settings.resizableHandles ?? 'se',
    ...settings.resizableOptions,
  }

  options.draggable = {
    scroll: settings.draggableScroll ?? false,
    appendTo: settings.draggableAppendTo ?? 'body',
    handle: draggableHandle,
    ...settings.draggableOptions,
  }

  const groupSet = new Set(groups)
  const acceptSetting = settings.acceptWidgets

  options.acceptWidgets = (element) => {
    if (!element) {
      debugLog('acceptWidgets.rejected', { reason: 'no-element' })
      return false
    }
    if (!evaluateAcceptSetting(acceptSetting, element)) {
      debugLog('acceptWidgets.rejected', {
        reason: 'acceptSetting',
        acceptSetting,
        element,
      })
      return false
    }
    const paneGroup = element.getAttribute?.('data-pane-group') ?? ''
    if (paneGroup === '') {
      debugLog('acceptWidgets.rejected', {
        reason: 'emptyGroup',
        element,
      })
      return false
    }
    const allowed = groupSet.has(paneGroup)
    debugLog('acceptWidgets.checked', {
      paneGroup,
      allowedGroups: [...groupSet],
      allowed,
      element,
    })
    return allowed
  }

  return options
}

const emitChange = () => {
  emit(
    'panesChange',
    panes.value.map((pane) => ({
      ...pane,
    })),
  )
}

const syncPositions = (items = []) => {
  debugLog('syncPositions', { items })
  items.forEach((item) => {
    const pane = panes.value.find((entry) => entry.id === item.id)
    if (pane) {
      pane.x = item.x
      pane.y = item.y
      pane.w = item.w
      pane.h = item.h
      pane.autoPosition = false
    }
  })
  emitChange()
}

const ensureUniqueId = (id) => {
  if (!id) return generatePaneId()
  const exists = panes.value.some((pane) => pane.id === id)
  if (exists) {
    throw new Error(`Pane with id "${id}" already exists`)
  }
  return id
}

const addPane = async (config = {}) => {
  if (!config.component) {
    throw new Error('addPane requires a component option')
  }

  const hasExplicitX = Object.prototype.hasOwnProperty.call(config, 'x')
  const hasExplicitY = Object.prototype.hasOwnProperty.call(config, 'y')
  const hasExplicitW = Object.prototype.hasOwnProperty.call(config, 'w')
  const hasExplicitH = Object.prototype.hasOwnProperty.call(config, 'h')

  const id = ensureUniqueId(config.id)
  const groups = sanitizedDragGroups.value
  const paneGroup = resolvePaneGroup(config.group, groups)
  debugLog('addPane', { id, config, resolvedGroup: paneGroup })
  const pane = {
    id,
    title: config.title ?? 'Untitled Pane',
    component: markRaw(config.component),
    props: config.props ?? {},
    x: hasExplicitX ? config.x : undefined,
    y: hasExplicitY ? config.y : undefined,
    w: hasExplicitW ? config.w : 1,
    h: hasExplicitH ? config.h : 1,
    autoPosition: config.autoPosition ?? (!hasExplicitX && !hasExplicitY),
    group: paneGroup,
  }

  panes.value.push(pane)
  await nextTick()

  if (!grid || !gridContainer.value) {
    debugLog('addPane.defer', { id })
    emitChange()
    return pane
  }

  const el = gridContainer.value.querySelector(`[data-gs-id="${id}"]`)
  if (!el) {
    debugLog('addPane.noElement', { id })
    emitChange()
    return pane
  }

  grid.makeWidget(el)

  if (grid && (hasExplicitX || hasExplicitY || hasExplicitW || hasExplicitH)) {
    const updatePayload = {}
    if (hasExplicitX) updatePayload.x = config.x
    if (hasExplicitY) updatePayload.y = config.y
    if (hasExplicitW) updatePayload.w = config.w
    if (hasExplicitH) updatePayload.h = config.h
    updatePayload.autoPosition = false
    grid.update(el, updatePayload)
  }

  if (el.gridstackNode) {
    const { x, y, w, h } = el.gridstackNode
    pane.x = x
    pane.y = y
    pane.w = w
    pane.h = h
    pane.autoPosition = false
  }

  emitChange()
  return pane
}

const removePane = (id) => {
  debugLog('removePane', { id })
  const el = gridContainer.value?.querySelector(`[data-gs-id="${id}"]`)
  if (el && grid) {
    pendingRemovals.add(id)
    grid.removeWidget(el)
  }

  const index = panes.value.findIndex((pane) => pane.id === id)
  if (index !== -1) {
    panes.value.splice(index, 1)
    emitChange()
    paneTransfers.delete(id)
    debugLog('removePane.removed', { id })
    return true
  }

  debugLog('removePane.miss', { id })
  return false
}

const updatePane = (id, updates = {}) => {
  const pane = panes.value.find((entry) => entry.id === id)
  if (!pane) return null

  if (Object.prototype.hasOwnProperty.call(updates, 'group')) {
    const groups = sanitizedDragGroups.value
    pane.group = resolvePaneGroup(updates.group, groups)
  }

  Object.assign(pane, updates)

  if (grid && gridContainer.value) {
    const el = gridContainer.value.querySelector(`[data-gs-id="${id}"]`)
    if (el?.gridstackNode) {
      const node = el.gridstackNode
      const payload = {
        x: Object.prototype.hasOwnProperty.call(updates, 'x') ? updates.x : node.x,
        y: Object.prototype.hasOwnProperty.call(updates, 'y') ? updates.y : node.y,
        w: Object.prototype.hasOwnProperty.call(updates, 'w') ? updates.w : node.w,
        h: Object.prototype.hasOwnProperty.call(updates, 'h') ? updates.h : node.h,
      }
      pane.autoPosition = false
      grid.update(el, payload)
    }
  }

  emitChange()
  return pane
}

const findPaneById = (id) => panes.value.find((entry) => entry.id === id) ?? null

const findPaneByTitle = (title) =>
  panes.value.find((entry) => entry.title.toLowerCase() === title.toLowerCase()) ?? null

const clearPanes = () => {
  debugLog('clearPanes')
  if (grid) {
    isClearing = true
    try {
      grid.removeAll()
      debugLog('clearPanes.removeAll')
    } finally {
      isClearing = false
    }
  }
  panes.value.splice(0, panes.value.length)
  emitChange()
}

const handleRemoved = (_event, nodes = []) => {
  debugLog('handleRemoved', { nodes, isClearing })
  if (isClearing) {
    debugLog('handleRemoved.skip', { reason: 'clearing' })
    return
  }

  nodes.forEach((node) => {
    const paneId = getPaneIdFromNode(node)

    if (!paneId) {
      debugLog('handleRemoved.skip', { reason: 'noId', node })
      return
    }

    if (suppressedRemovedIds.has(paneId)) {
      suppressedRemovedIds.delete(paneId)
      debugLog('handleRemoved.skip', { reason: 'suppressed', paneId })
      return
    }

    if (pendingRemovals.has(paneId)) {
      pendingRemovals.delete(paneId)
      paneTransfers.delete(paneId)
      debugLog('handleRemoved.pendingRemoval', { paneId })
      return
    }

    const index = panes.value.findIndex((pane) => pane.id === paneId)
    if (index === -1) {
      debugLog('handleRemoved.notTracked', { paneId })
      return
    }

    const [pane] = panes.value.splice(index, 1)
    paneTransfers.set(paneId, {
      pane,
      fromGridId: instanceId,
    })
    debugLog('handleRemoved.transferReady', { paneId, pane })
    emitChange()
  })
}

const handleAdded = async (_event, nodes = []) => {
  debugLog('handleAdded', { nodes })
  for (const node of nodes ?? []) {
    const paneId = getPaneIdFromNode(node)
    const targetPosition = node
      ? {
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
        }
      : null

    if (!paneId) {
      debugLog('handleAdded.skip', { reason: 'noId', node })
      continue
    }

    const transfer = paneTransfers.get(paneId)
    if (!transfer) {
      debugLog('handleAdded.noTransfer', { paneId })
      continue
    }

    if (transfer.fromGridId === instanceId) {
      debugLog('handleAdded.originGrid', { paneId, instanceId })
      continue
    }

    paneTransfers.delete(paneId)

    if (node?.el && grid) {
      suppressedRemovedIds.add(paneId)
      grid.removeWidget(node.el)
      debugLog('handleAdded.removedPlaceholder', { paneId })
    }

    debugLog('handleAdded.readdPane', { paneId, transfer })
    await addPane({
      id: transfer.pane.id,
      title: transfer.pane.title,
      component: transfer.pane.component,
      props: transfer.pane.props,
      group: transfer.pane.group,
      x: targetPosition?.x,
      y: targetPosition?.y,
      w: targetPosition?.w,
      h: targetPosition?.h,
      autoPosition: false,
    })
  }
}

const handleDropped = async (_event, _previousNode, newNode) => {
  debugLog('handleDropped', { previousNode: _previousNode, newNode })
  const paneId =
    getPaneIdFromNode(_previousNode) ??
    getPaneIdFromNode(newNode)

  if (!paneId) {
    debugLog('handleDropped.skip', { reason: 'noId', newNode })
    return
  }

  const transfer = paneTransfers.get(paneId)
  const targetPosition = newNode
    ? {
        x: newNode.x,
        y: newNode.y,
        w: newNode.w,
        h: newNode.h,
      }
    : null
  if (!transfer) {
    debugLog('handleDropped.noTransfer', { paneId })
    return
  }

  if (transfer.fromGridId === instanceId) {
    debugLog('handleDropped.originGrid', { paneId })
    return
  }

  paneTransfers.delete(paneId)

  if (newNode?.el && grid) {
    suppressedRemovedIds.add(paneId)
    grid.removeWidget(newNode.el)
    debugLog('handleDropped.removedPlaceholder', { paneId })
  }

  debugLog('handleDropped.readdPane', { paneId, transfer, newNode })
  await addPane({
    id: transfer.pane.id,
    title: transfer.pane.title,
    component: transfer.pane.component,
    props: transfer.pane.props,
    group: transfer.pane.group,
    x: targetPosition?.x,
    y: targetPosition?.y,
    w: targetPosition?.w,
    h: targetPosition?.h,
    autoPosition: false,
  })
}

const applyGridOptions = (settings) => {
  debugLog('applyGridOptions', { settings, groups: sanitizedDragGroups.value })
  if (!grid) return
  const options = buildGridOptions(settings, sanitizedDragGroups.value)
  grid.updateOptions(options)
  if (typeof options.column === 'number') {
    grid.column(options.column)
  }
  if (typeof options.maxRow === 'number') {
    grid.setGridHeight(options.maxRow)
  }
  if (options.margin != null) {
    grid.margin(options.margin)
  }
  if (options.cellHeight != null) {
    grid.cellHeight(options.cellHeight)
  }
  if (typeof options.staticGrid === 'boolean') {
    grid.setStatic(options.staticGrid)
  }
}

const attachDragListeners = () => {
  if (!grid) return
  changeHandler = (_event, items) => {
    debugLog('change', { items })
    syncPositions(items)
  }
  dragStartHandler = (_event, element) => {
    const paneId = element?.getAttribute?.('data-gs-id')
    debugLog('dragstart', { paneId })
  }
  dragHandler = (_event, element) => {
    const paneId = element?.getAttribute?.('data-gs-id')
    debugLog('drag', { paneId })
  }
  dragStopHandler = (_event, element) => {
    const paneId = element?.getAttribute?.('data-gs-id')
    debugLog('dragstop', { paneId })
  }
  grid.on('change', changeHandler)
  grid.on('removed', handleRemoved)
  grid.on('added', handleAdded)
  grid.on('dropped', handleDropped)
  grid.on('dragstart', dragStartHandler)
  grid.on('drag', dragHandler)
  grid.on('dragstop', dragStopHandler)
}

const detachDragListeners = () => {
  if (!grid) return
  if (changeHandler) {
    grid.off('change', changeHandler)
    changeHandler = undefined
  }
  grid.off('removed', handleRemoved)
  grid.off('added', handleAdded)
  grid.off('dropped', handleDropped)
  if (dragStartHandler) {
    grid.off('dragstart', dragStartHandler)
    dragStartHandler = undefined
  }
  if (dragHandler) {
    grid.off('drag', dragHandler)
    dragHandler = undefined
  }
  if (dragStopHandler) {
    grid.off('dragstop', dragStopHandler)
    dragStopHandler = undefined
  }
}

onMounted(() => {
  if (!gridContainer.value) return

  const options = buildGridOptions(props.settings, sanitizedDragGroups.value)
  grid = GridStack.init(options, gridContainer.value)

  if (options.margin != null) {
    grid.margin(options.margin)
  }
  if (options.cellHeight != null) {
    grid.cellHeight(options.cellHeight)
  }
  if (typeof options.staticGrid === 'boolean') {
    grid.setStatic(options.staticGrid)
  }

  nextTick(() => {
    panes.value.forEach((pane) => {
      const el = gridContainer.value?.querySelector(`[data-gs-id="${pane.id}"]`)
      if (!el) return
      grid.makeWidget(el)
      if (el.gridstackNode) {
        const { x, y, w, h } = el.gridstackNode
        pane.x = x
        pane.y = y
        pane.w = w
        pane.h = h
        pane.autoPosition = false
      }
    })
  })

  attachDragListeners()
  debugLog('mounted', { options })
})

onBeforeUnmount(() => {
  detachDragListeners()
  for (const [paneId, transfer] of paneTransfers.entries()) {
    if (transfer.fromGridId === instanceId) {
      paneTransfers.delete(paneId)
    }
  }
  if (grid) {
    grid.destroy(false)
    grid = undefined
  }
})

watch(
  () => props.settings,
  (newSettings) => {
    debugLog('settingsChanged', { newSettings })
    applyGridOptions(newSettings)
  },
  { deep: true },
)

watch(
  sanitizedDragGroups,
  () => {
    debugLog('dragGroupsChanged', { groups: sanitizedDragGroups.value })
    applyGridOptions(props.settings)
  },
)

defineExpose({
  addPane,
  removePane,
  updatePane,
  findPaneById,
  findPaneByTitle,
  getPanes: () => panes.value,
  clearPanes,
})
</script>

<template>
  <div class="grid-stack" ref="gridContainer">
    <div
      v-for="pane in panes"
      :key="pane.id"
      class="grid-stack-item"
      :data-gs-id="pane.id"
      :data-gs-x="pane.x ?? undefined"
      :data-gs-y="pane.y ?? undefined"
      :data-gs-w="pane.w ?? 1"
      :data-gs-h="pane.h ?? 1"
      :data-gs-auto-position="pane.autoPosition ? 'true' : undefined"
      :data-pane-group="pane.group ?? ''"
    >
      
        <!-- <Pane class="grid-stack-item-content" :title="pane.title" @close="removePane(pane.id)"> -->
        <component class="grid-stack-item-content" :is="pane.component" v-bind="pane.props" @close="removePane(pane.id)"/>
        <!-- </Pane> -->

    </div>
  </div>
</template>

<style scoped>
.grid-stack {
  width: 100%;
}

.grid-stack-item-content {
  height: 100%;
  overflow: hidden !important;
}

</style>
