import { ref, watch } from 'vue'

const STORAGE_KEY = 'penstok-theme'
type Theme = 'dark' | 'light'

const theme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark')

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

watch(theme, (t) => {
  localStorage.setItem(STORAGE_KEY, t)
  applyTheme(t)
}, { immediate: true })

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  return { theme, toggle }
}
