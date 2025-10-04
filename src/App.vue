<script setup>
import { ref } from 'vue'
import HelloWorldPane from './components/HelloWorldPane.vue'
import VueGridStack from './components/VueGridStack.vue'
import VueGridStackSettings from './components/VueGridStackSettings.vue'

const gridRef = ref(null)
const drawerGridRef = ref(null)
const gridSettings = ref({
  column: 4,
  maxRow: 6,
  minRow: 1,
  margin: 12,
  cellHeight: 260,
  float: true,
  disableOneColumnMode: true,
  staticGrid: false,
  alwaysShowResizeHandle: true,
  resizableHandles: 'e, se, s',
  draggableAppendTo: 'body',
  draggableScroll: true,
  draggableHandle: '.pane__drag-handle',
})
const drawerGridSettings = ref({
  column: 1,
  maxRow: 10,
  minRow: 1,
  margin: 16,
  cellHeight: 240,
  float: true,
  disableOneColumnMode: true,
  staticGrid: false,
  alwaysShowResizeHandle: true,
  resizableHandles: 'n, s',
  draggableAppendTo: 'body',
  draggableScroll: true,
  draggableHandle: '.pane__drag-handle',
})

const panes = ref([])
const showSettings = ref(false)
const drawerOpen = ref(false)

const handlePanesChange = (payload) => {
  panes.value = payload
}

const updateGridSettings = (value) => {
  gridSettings.value = value
}

const addHelloPane = () => {
  return gridRef.value?.addPane({
    title: 'Hello World',
    component: HelloWorldPane,
    props: {},
    autoPosition: true,
  })
}

const addDrawerHelloPane = () => {
  drawerOpen.value = true

  return drawerGridRef.value?.addPane({
    title: 'Hello World',
    component: HelloWorldPane,
    props: {},
    autoPosition: true,
  })
}

const closeDrawer = () => {
  drawerOpen.value = false
}
</script>

<template>
  <v-app>
    <v-navigation-drawer app permanent rail width="84" class="app-toolbar">
      <div class="toolbar__content">
        <v-btn
          color="primary"
          icon="mdi-plus"
          variant="flat"
          @click="addHelloPane"
        />
        <v-btn
          color="secondary"
          icon="mdi-plus-box"
          variant="flat"
          @click="addDrawerHelloPane"
        />
        <v-divider class="my-4" />
        <v-btn icon variant="text" @click="showSettings = true">
          <v-icon icon="mdi-cog" />
        </v-btn>
      </div>
    </v-navigation-drawer>

    <v-app-bar app flat color="transparent" elevate-on-scroll>
      <v-toolbar-title class="font-weight-medium">RadioView Workspace</v-toolbar-title>
      <v-spacer />
    </v-app-bar>

    <v-main class="main-surface">
      <div class="main-surface__inner">
        <VueGridStack
          ref="gridRef"
          :settings="gridSettings"
          @panes-change="handlePanesChange"
        />
      </div>
    </v-main>

    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      width="420"
      class="app-drawer"
      temporary
      :scrim="false"
    >
      <div class="app-drawer__header">
        <span class="app-drawer__title">Drawer Workspace</span>
        <v-btn icon variant="text" @click="closeDrawer">
          <v-icon icon="mdi-close" />
        </v-btn>
      </div>
      <div class="app-drawer__content">
        <VueGridStack
          ref="drawerGridRef"
          :settings="drawerGridSettings"
        />
      </div>
    </v-navigation-drawer>

    <v-dialog v-model="showSettings" max-width="720">
      <VueGridStackSettings :model-value="gridSettings" @update:model-value="updateGridSettings">
        <template #actions>
          <v-btn variant="text" @click="showSettings = false">Close</v-btn>
        </template>
      </VueGridStackSettings>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.app-toolbar {
  padding-top: 16px;
}

.toolbar__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.main-surface {
  background: #f4f5f7;
}

.main-surface__inner {
  height: 100%;
  padding: 24px;
}

.app-drawer {
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}

.app-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}

.app-drawer__title {
  font-size: 16px;
  font-weight: 600;
}

.app-drawer__content {
  padding: 0 20px 20px;
  height: 100%;
  overflow-y: auto;
}
</style>
