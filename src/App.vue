<template>
  <v-app>
    <v-navigation-drawer permanent rail rail-width="80">
      <div class="left-rail-header">
        <v-btn
          icon
          variant="flat"
          color="primary"
          :title="'Return to main page'"
          :aria-label="'Return to main page'"
          @click="goHome"
        >
          <v-icon size="large">mdi-radio-tower</v-icon>
        </v-btn>
      </div>
      <v-divider class="my-2" />
      <div class="left-rail-actions">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          :title="'Add Hello World pane to workspace'"
          @click="addHelloPane"
        />
        <v-btn
          color="secondary"
          variant="flat"
          prepend-icon="mdi-format-list-bulleted-square"
          :title="'Add Hello World pane to right drawer'"
          @click="addRightHelloPane"
        />
      </div>
    </v-navigation-drawer>

    <v-app-bar app color="grey-lighten-4">
      <v-toolbar-title>RadioView</v-toolbar-title>
      <v-spacer />
      <v-chip color="success" text-color="white" size="small">
        OK
      </v-chip>
    </v-app-bar>
    <v-divider />

    <v-main>
      <div class="pa-6">
        <VueGridStack ref="gridStack" />
      </div>
    </v-main>

    <v-navigation-drawer
      permanent
      location="right"
      :rail="rightRail"
      :width="rightDrawerWidth"
      :rail-width="RIGHT_RAIL_WIDTH"
      class="right-drawer"
    >
      <div
        class="right-drawer-resize-handle"
        @pointerdown.stop.prevent="startRightDrawerResize"
      ></div>
      <div class="right-drawer-toggle">
        <v-btn
          block
          variant="tonal"
          :prepend-icon="rightDrawerIcon"
          :aria-label="rightDrawerLabel"
          @click="toggleRightRail"
        >
        </v-btn>
      </div>
      <v-divider />
      <div class="right-drawer-stack" v-show="!rightRail">
        <VueGridStack
          ref="rightGridStack"
          :settings="rightGridSettings"
          class="right-grid-stack"
        />
      </div>
    </v-navigation-drawer>
  </v-app>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import VueGridStack from './components/VueGridStack.vue'
import HelloWorldPane from './components/HelloWorldPane.vue'

const RIGHT_RAIL_WIDTH = 80
const DEFAULT_RIGHT_DRAWER_WIDTH = 320
const COLLAPSE_THRESHOLD = 8

const rightRail = ref(true)
const gridStack = ref(null)
const rightGridStack = ref(null)
const rightDrawerWidth = ref(RIGHT_RAIL_WIDTH)
const savedExpandedRightDrawerWidth = ref(DEFAULT_RIGHT_DRAWER_WIDTH)
const isResizingRightDrawer = ref(false)
const resizeStartX = ref(0)
const resizeStartWidth = ref(RIGHT_RAIL_WIDTH)

const expandRightDrawer = () => {
  rightRail.value = false
  rightDrawerWidth.value = Math.max(
    savedExpandedRightDrawerWidth.value,
    RIGHT_RAIL_WIDTH
  )
}

const collapseRightDrawer = () => {
  savedExpandedRightDrawerWidth.value = Math.max(
    rightDrawerWidth.value,
    savedExpandedRightDrawerWidth.value,
    RIGHT_RAIL_WIDTH
  )
  rightRail.value = true
  rightDrawerWidth.value = RIGHT_RAIL_WIDTH
}

const toggleRightRail = () => {
  if (rightRail.value) {
    expandRightDrawer()
    return
  }

  collapseRightDrawer()
}

const rightGridSettings = {
  column: 1,
  disableOneColumnMode: false,
}

const rightDrawerIcon = computed(() =>
  rightRail.value ? 'mdi-menu-open' : 'mdi-menu-close'
)
const rightDrawerLabel = computed(() =>
  rightRail.value ? 'Expand' : 'Collapse'
)

const stopRightDrawerResize = () => {
  if (typeof window === 'undefined') {
    return
  }

  if (!isResizingRightDrawer.value) {
    return
  }
  isResizingRightDrawer.value = false
  window.removeEventListener('pointermove', handleRightDrawerResize)
  window.removeEventListener('pointerup', stopRightDrawerResize)
  window.removeEventListener('pointercancel', stopRightDrawerResize)
}

const handleRightDrawerResize = (event) => {
  if (!isResizingRightDrawer.value) {
    return
  }

  const delta = resizeStartX.value - event.clientX
  const newWidth = Math.max(RIGHT_RAIL_WIDTH, resizeStartWidth.value + delta)

  if (newWidth <= RIGHT_RAIL_WIDTH + COLLAPSE_THRESHOLD) {
    collapseRightDrawer()
    return
  }

  rightRail.value = false
  rightDrawerWidth.value = newWidth
  savedExpandedRightDrawerWidth.value = newWidth
}

const startRightDrawerResize = (event) => {
  if (typeof window === 'undefined') {
    return
  }

  resizeStartX.value = event.clientX
  resizeStartWidth.value = rightDrawerWidth.value
  isResizingRightDrawer.value = true

  window.addEventListener('pointermove', handleRightDrawerResize)
  window.addEventListener('pointerup', stopRightDrawerResize)
  window.addEventListener('pointercancel', stopRightDrawerResize)
}

onBeforeUnmount(() => {
  stopRightDrawerResize()
})

const goHome = () => {
  window.location.href = '/'
}

const addHelloPane = () => {
  gridStack.value?.addPane({
    title: 'Hello World',
    component: HelloWorldPane,
    w: 2,
    h: 2,
  })
  console.log("Added pane")
}

const addRightHelloPane = () => {
  if (rightRail.value) {
    expandRightDrawer()
  }
  rightGridStack.value?.addPane({
    title: 'Hello World',
    component: HelloWorldPane,
    w: 2,
    h: 2,
  })
}
</script>

<style scoped>
.left-rail-header {
  display: flex;
  justify-content: center;
  padding: 12px 8px 4px;
}

.left-rail-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.right-drawer {
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: visible;
}

.right-drawer-resize-handle {
  position: absolute;
  top: 0;
  left: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-drawer-resize-handle::before {
  content: '';
  width: 2px;
  height: 32px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
}

.right-drawer-toggle {
  padding: 8px;
}

.right-drawer-stack {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.right-grid-stack :deep(.grid-stack) {
  min-height: auto;
}

.right-grid-stack :deep(.grid-stack-item-content) {
  min-height: auto;
}
</style>
