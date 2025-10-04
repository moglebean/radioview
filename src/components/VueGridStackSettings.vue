<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const slots = useSlots()
const settings = computed(() => props.modelValue)
const hasActions = computed(() => Boolean(slots.actions))

const updateSetting = (key, value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const updateNumber = (key, value) => {
  if (value === '' || value === null || value === undefined) {
    updateSetting(key, undefined)
    return
  }

  const numeric = Number(value)
  if (!Number.isNaN(numeric)) {
    updateSetting(key, numeric)
  }
}

const coerceBoolean = (value) => {
  if (value === true || value === false) return value
  if (value === 'true') return true
  if (value === 'false') return false
  return Boolean(value)
}

const updateBoolean = (key, value) => {
  updateSetting(key, coerceBoolean(value))
}
</script>

<template>
  <v-card class="settings-card" elevation="1">
    <v-card-title class="text-subtitle-1 font-weight-medium">Grid Settings</v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Columns"
            type="number"
            min="1"
            :model-value="settings.column ?? ''"
            @update:model-value="updateNumber('column', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Max Rows"
            type="number"
            min="1"
            :model-value="settings.maxRow ?? ''"
            @update:model-value="updateNumber('maxRow', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Min Rows"
            type="number"
            min="0"
            :model-value="settings.minRow ?? ''"
            @update:model-value="updateNumber('minRow', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Cell Height"
            type="number"
            min="0"
            :model-value="settings.cellHeight ?? ''"
            @update:model-value="updateNumber('cellHeight', $event)"
            hint="Height in pixels"
            persistent-hint
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Margin"
            type="number"
            min="0"
            :model-value="settings.margin ?? ''"
            @update:model-value="updateNumber('margin', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Resizable Handles"
            :model-value="settings.resizableHandles ?? ''"
            @update:model-value="updateSetting('resizableHandles', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Drag Handle Selector"
            :model-value="settings.draggableHandle ?? ''"
            @update:model-value="updateSetting('draggableHandle', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            label="Drag Append Target"
            :model-value="settings.draggableAppendTo ?? ''"
            @update:model-value="updateSetting('draggableAppendTo', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch
            label="Enable Float"
            color="primary"
            :model-value="settings.float ?? false"
            hide-details
            @update:model-value="updateBoolean('float', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch
            label="Disable One Column Mode"
            color="primary"
            :model-value="settings.disableOneColumnMode ?? false"
            hide-details
            @update:model-value="updateBoolean('disableOneColumnMode', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch
            label="Static Grid"
            color="primary"
            :model-value="settings.staticGrid ?? false"
            hide-details
            @update:model-value="updateBoolean('staticGrid', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch
            label="Show Resize Handle"
            color="primary"
            :model-value="settings.alwaysShowResizeHandle ?? false"
            hide-details
            @update:model-value="updateBoolean('alwaysShowResizeHandle', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch
            label="Draggable Scroll"
            color="primary"
            :model-value="settings.draggableScroll ?? false"
            hide-details
            @update:model-value="updateBoolean('draggableScroll', $event)"
          />
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions v-if="hasActions" class="settings-card__actions">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.settings-card {
  background: #ffffff;
}

.settings-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 8px 16px 16px;
}
</style>
