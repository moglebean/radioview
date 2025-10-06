<template>
  <v-app>
    <v-navigation-drawer permanent rail>
      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-view-dashboard" />
        <v-list-item prepend-icon="mdi-chart-box" />
        <v-list-item prepend-icon="mdi-cog-outline" />
      </v-list>
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
      <div class="pa-6"></div>
    </v-main>

    <v-navigation-drawer permanent location="right" :rail="rightRail">
      <div class="pa-2">
        <v-btn
          block
          variant="tonal"
          :prepend-icon="rightDrawerIcon"
          @click="toggleRightRail"
        >
          {{ rightDrawerLabel }}
        </v-btn>
      </div>
      <v-divider />

    </v-navigation-drawer>
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue'

const rightRail = ref(true)

const toggleRightRail = () => {
  rightRail.value = !rightRail.value
}

const rightDrawerIcon = computed(() =>
  rightRail.value ? 'mdi-menu-open' : 'mdi-menu-close'
)
const rightDrawerLabel = computed(() =>
  rightRail.value ? 'Expand' : 'Collapse'
)
</script>
