import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useRaf(cb: () => void) {
  const id = ref<number | null>(null)
  const tick = () => { cb(); id.value = requestAnimationFrame(tick) }
  onMounted(() => { id.value = requestAnimationFrame(tick) })
  onBeforeUnmount(() => { if (id.value != null) cancelAnimationFrame(id.value) })
}
