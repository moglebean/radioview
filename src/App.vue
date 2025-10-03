<script setup>
import { nextTick, onBeforeUnmount, onMounted, markRaw, ref } from 'vue'
import { GridStack } from 'gridstack'
import Pane from './components/Pane.vue'
import HelloWorldPane from './components/HelloWorldPane.vue'

const rightDrawer = ref(true)
const mainGridEl = ref(null)
const mainPanes = ref([])
const drawerPanes = ref([
  {
    id: 'drawer-1',
    title: 'Inspector',
    component: markRaw(HelloWorldPane),
    props: {},
  },
  {
    id: 'drawer-2',
    title: 'Notifications',
    component: markRaw(HelloWorldPane),
    props: {},
  },
])

let grid

const syncPositions = (items = []) => {
  items.forEach((item) => {
    const pane = mainPanes.value.find((entry) => entry.id === item.id)
    if (pane) {
      pane.x = item.x
      pane.y = item.y
      pane.w = item.w
      pane.h = item.h
    }
  })
}

const addHelloPane = async () => {
  const id = `pane-${Date.now()}`
  const pane = {
    id,
    title: 'Hello World',
    component: markRaw(HelloWorldPane),
    props: {},
    x: 0,
    y: 0,
    w: 1,
    h: 1,
  }

  mainPanes.value.push(pane)
  await nextTick()

  if (!grid || !mainGridEl.value) return

  const el = mainGridEl.value.querySelector(`[data-gs-id="${id}"]`)
  if (!el) return

  grid.makeWidget(el)
  if (el.gridstackNode) {
    const { x, y, w, h } = el.gridstackNode
    pane.x = x
    pane.y = y
    pane.w = w
    pane.h = h
  }
}

const removePane = (id) => {
  const el = mainGridEl.value?.querySelector(`[data-gs-id="${id}"]`)
  if (el && grid) {
    grid.removeWidget(el)
  }
  const index = mainPanes.value.findIndex((pane) => pane.id === id)
  if (index !== -1) {
    mainPanes.value.splice(index, 1)
  }
}

const addDrawerPane = () => {
  const id = `drawer-${Date.now()}`
  drawerPanes.value.push({
    id,
    title: 'Drawer Pane',
    component: markRaw(HelloWorldPane),
    props: {},
  })
}

const removeDrawerPane = (id) => {
  const index = drawerPanes.value.findIndex((pane) => pane.id === id)
  if (index !== -1) {
    drawerPanes.value.splice(index, 1)
  }
}

onMounted(async () => {
  if (!mainGridEl.value) return

  grid = GridStack.init(
    {
      column: 2,
      margin: 12,
      cellHeight: 260,
      float: true,
      handle: '.pane__drag-handle',
      disableOneColumnMode: true,
      resizable: {
        handles: 'e, se, s',
      },
      draggable: {
        scroll: true,
        appendTo: 'body',
      },
    },
    mainGridEl.value,
  )

  grid.on('change', (_event, items) => syncPositions(items))

  if (mainPanes.value.length === 0) {
    await addHelloPane()
  }
})

onBeforeUnmount(() => {
  if (grid) {
    grid.destroy(false)
    grid = undefined
  }
})
</script>

<template>
  <v-app>
    <v-navigation-drawer app permanent rail width="84" class="app-toolbar">
      <div class="toolbar__content">
        <v-btn color="primary" icon="mdi-plus" variant="flat" @click="addHelloPane" />
        <v-divider class="my-4" />
        <v-btn icon variant="text">
          <v-icon icon="mdi-cog" />
        </v-btn>
      </div>
    </v-navigation-drawer>

    <v-app-bar app flat color="transparent" elevate-on-scroll>
      <v-toolbar-title class="font-weight-medium">RadioView Workspace</v-toolbar-title>
      <v-spacer />
      <v-btn icon variant="text" @click="rightDrawer = !rightDrawer">
        <v-icon :icon="rightDrawer ? 'mdi-close' : 'mdi-menu-open'" />
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer
      v-model="rightDrawer"
      app
      location="right"
      width="340"
      class="app-drawer"
    >
      <template #prepend>
        <v-toolbar density="compact" flat>
          <v-toolbar-title class="text-subtitle-1 font-weight-medium">Tools</v-toolbar-title>
          <v-spacer />
          <v-btn icon variant="text" @click="rightDrawer = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-toolbar>
      </template>

      <div class="drawer__scroller">
        <div class="grid-stack drawer-grid">
          <div
            v-for="pane in drawerPanes"
            :key="pane.id"
            class="grid-stack-item"
          >
            <div class="grid-stack-item-content">
              <Pane :title="pane.title" @close="removeDrawerPane(pane.id)">
                <component :is="pane.component" v-bind="pane.props" />
              </Pane>
            </div>
          </div>
        </div>
        <div class="drawer__footer">
          <v-btn block prepend-icon="mdi-plus" variant="text" @click="addDrawerPane">
            Add drawer pane
          </v-btn>
        </div>
      </div>
    </v-navigation-drawer>

    <v-main class="main-surface">
      <div class="main-surface__inner">
        <div class="grid-stack" ref="mainGridEl">
          <div
            v-for="pane in mainPanes"
            :key="pane.id"
            class="grid-stack-item"
            :data-gs-id="pane.id"
            :data-gs-x="pane.x"
            :data-gs-y="pane.y"
            :data-gs-w="pane.w"
            :data-gs-h="pane.h"
          >
            <div class="grid-stack-item-content">
              <Pane :title="pane.title" @close="removePane(pane.id)">
                <component :is="pane.component" v-bind="pane.props" />
              </Pane>
            </div>
          </div>
        </div>
      </div>
    </v-main>
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

.grid-stack {
  width: 100%;
  min-height: calc(100vh - 160px);
}

.grid-stack-item-content {
  height: 100%;
}

.app-drawer {
  display: flex;
  flex-direction: column;
}

.drawer__scroller {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding: 16px;
}

.drawer__footer {
  margin-top: 16px;
}

.drawer-grid {
  flex: 1;
  min-height: 100%;
}

.drawer-grid .grid-stack-item-content {
  height: 100%;
}
</style>
