/** Canvas-only theme state. It never changes the main workbench theme. */
import { ref, watch } from 'vue'

const STORAGE_KEY = 'facemini:canvas-theme'

const getInitialTheme = () => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const isDark = ref(getInitialTheme())

watch(isDark, (value) => {
  document.documentElement.classList.toggle('canvas-dark', value)
  document.documentElement.style.colorScheme = value ? 'dark' : 'light'
  window.localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
}, { immediate: true })

export const toggleTheme = () => {
  isDark.value = !isDark.value
}
