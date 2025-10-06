<template>
  <v-app>
    <v-navigation-drawer permanent rail>
      <v-divider class="my-2" />
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="addHelloPane"
        />

    </v-navigation-drawer>

    <v-app-bar app color="grey-lighten-4">
      <v-btn icon>
        <v-icon>mdi-radio-tower</v-icon>
      </v-btn>
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

    <v-navigation-drawer permanent location="right" :rail="rightRail">
      <div class="pa-2">
        <v-btn
          block
          variant="tonal"
          :prepend-icon="rightDrawerIcon"
          @click="toggleRightRail"
        >
        </v-btn>
      </div>
      <v-divider />
    </v-navigation-drawer>
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue'
import VueGridStack from './components/VueGridStack.vue'
import HelloWorldPane from './components/HelloWorldPane.vue'

const rightRail = ref(true)
const gridStack = ref(null)

const toggleRightRail = () => {
  rightRail.value = !rightRail.value
}

const rightDrawerIcon = computed(() =>
  rightRail.value ? 'mdi-menu-open' : 'mdi-menu-close'
)
const rightDrawerLabel = computed(() =>
  rightRail.value ? 'Expand' : 'Collapse'
)

const addHelloPane = () => {
  gridStack.value?.addPane({
    title: 'Hello World',
    component: HelloWorldPane,
    w: 2,
    h: 2,
  })
  console.log("Added pane")
}
</script>
