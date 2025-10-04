<script setup>
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GridStack } from 'gridstack'
import Pane from './Pane.vue'

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['panesChange'])

const gridContainer = ref(null)
const panes = ref([])

let grid
let changeHandler
let paneCounter = 0

const generatePaneId = () => {
  paneCounter += 1
  return `pane-${Date.now()}-${paneCounter}`
}

const buildGridOptions = (settings = {}) => {
  const options = {
    column: settings.column ?? 4,
    float: settings.float ?? true,
    margin: settings.margin ?? 12,
    cellHeight: settings.cellHeight ?? 260,
    disableOneColumnMode: settings.disableOneColumnMode ?? true,
    staticGrid: settings.staticGrid ?? false,
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
    handles: settings.resizableHandles ?? 'e, se, s',
    ...settings.resizableOptions,
  }

  options.draggable = {
    scroll: settings.draggableScroll ?? true,
    appendTo: settings.draggableAppendTo ?? 'body',
    handle: settings.draggableHandle,
    ...settings.draggableOptions,
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

  const id = ensureUniqueId(config.id)
  const pane = {
    id,
    title: config.title ?? 'Untitled Pane',
    component: markRaw(config.component),
    props: config.props ?? {},
    x: Object.prototype.hasOwnProperty.call(config, 'x') ? config.x : undefined,
    y: Object.prototype.hasOwnProperty.call(config, 'y') ? config.y : undefined,
    w: config.w ?? 1,
    h: config.h ?? 1,
    autoPosition: config.autoPosition ?? (!Object.prototype.hasOwnProperty.call(config, 'x') && !Object.prototype.hasOwnProperty.call(config, 'y')),
  }

  panes.value.push(pane)
  await nextTick()

  if (!grid || !gridContainer.value) {
    emitChange()
    return pane
  }

  const el = gridContainer.value.querySelector(`[data-gs-id="${id}"]`)
  if (!el) {
    emitChange()
    return pane
  }

  grid.makeWidget(el)
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
  const el = gridContainer.value?.querySelector(`[data-gs-id="${id}"]`)
  if (el && grid) {
    grid.removeWidget(el)
  }

  const index = panes.value.findIndex((pane) => pane.id === id)
  if (index !== -1) {
    panes.value.splice(index, 1)
    emitChange()
    return true
  }

  return false
}

const updatePane = (id, updates = {}) => {
  const pane = panes.value.find((entry) => entry.id === id)
  if (!pane) return null

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
  if (grid) {
    grid.removeAll()
  }
  panes.value.splice(0, panes.value.length)
  emitChange()
}

onMounted(() => {
  if (!gridContainer.value) return

  grid = GridStack.init(buildGridOptions(props.settings), gridContainer.value)

  const options = buildGridOptions(props.settings)
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

  changeHandler = (_event, items) => syncPositions(items)
  grid.on('change', changeHandler)
})

onBeforeUnmount(() => {
  if (grid && changeHandler) {
    grid.off('change', changeHandler)
  }
  if (grid) {
    grid.destroy(false)
    grid = undefined
  }
})

watch(
  () => props.settings,
  (newSettings) => {
    if (!grid) return
    const options = buildGridOptions(newSettings)
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
  },
  { deep: true },
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
    >
      <div class="grid-stack-item-content">
        <Pane :title="pane.title" @close="removePane(pane.id)">
          <component :is="pane.component" v-bind="pane.props" />
        </Pane>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-stack {
  width: 100%;
  min-height: calc(100vh - 160px);
}

.grid-stack-item-content {
  height: 100%;
}
</style>
