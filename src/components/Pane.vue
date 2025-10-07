<template>
  <div class="pane__outer">
    <v-sheet class="pane" rounded elevation="6">
      <v-toolbar class="pane__toolbar" density="compact" flat>
        <div class="pane__title">
          <span class="pane__title-text">{{ title }}</span>
        </div>
        <v-spacer />
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
            <v-list-item @click="emit('clone')">
              <v-list-item-title>Clone</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-toolbar>
      <div class="pane__content">
        <slot />
      </div>
    </v-sheet>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'Pane',
  },
})

const emit = defineEmits(['close','clone'])
</script>

<style scoped>
.pane__outer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: 12px;
}

.pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.08);

}

.pane__toolbar {
  cursor: move;
  user-select: none;
}

.pane__title {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

.pane__title-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pane__content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>
