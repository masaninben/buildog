import { ref } from 'vue'

// モジュールスコープの singleton（KarteToolbar ↔ KarteHomeView で共有）
const isOpen = ref(false)

export function useKarteDrawer() {
  return {
    isOpen,
    open:   () => { isOpen.value = true },
    close:  () => { isOpen.value = false },
    toggle: () => { isOpen.value = !isOpen.value },
  }
}
