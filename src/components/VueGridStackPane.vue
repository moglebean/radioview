<template>
  <v-card class="pane__outer d-flex flex-column" height="100%">
  <v-card-title class="headlinepane__header">
    <v-row>
      <slot name="title">{{ title }}</slot>
      
      <v-spacer />
      
      <slot name="buttons" />
      
      <slot name="menu">
        <v-menu location="bottom">
          <template #activator="{ props }">
            <v-btn icon variant="text" density="comfortable" v-bind="props">
              <v-icon icon="mdi-dots-vertical" />
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="emit('close')">
              <v-list-item-title>Close</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </slot>
    </v-row>
    <v-divider class="my-2" />
  </v-card-title>
  
  <!-- This is the only part that scrolls -->
  <v-card-text class="pane__body">
    <slot />
  </v-card-text>
  <v-card-actions>
    <slot name="actions">
      <!-- By default, just include a little space-->
      <v-spacer />
    </slot>
  </v-card-actions>
</v-card>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: 'Pane' },
})
const emit = defineEmits(['close','clone'])
</script>

<style scoped>

.pane__header { cursor: grab; user-select: none; }
.pane__header:active { cursor: grabbing; }

/* Let the text area take remaining space and scroll */
.pane__body {
  /* grow to fill remaining height between title and bottom */
  flex: 1 1 auto;
  /* critical: allow the flex child to actually shrink inside a fixed-height parent */
  min-height: 0;
  /* the scrolling you want */
  overflow-y: auto;
  overflow-x: hidden;
}
</style>