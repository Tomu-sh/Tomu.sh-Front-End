import { useEffect, useMemo, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem('theme') as ThemeMode | null
  if (stored === 'light' || stored === 'dark' || stored === 'system')
    return stored
  return 'system'
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effectiveDark = mode === 'dark' || (mode === 'system' && prefersDark)
  root.classList.toggle('dark', effectiveDark)
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialTheme())

  useEffect(() => {
    try {
      localStorage.setItem('theme', mode)
    } catch {}
    applyTheme(mode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mql.addEventListener?.('change', handler)
    return () => mql.removeEventListener?.('change', handler)
  }, [mode])

  const label = useMemo(() => {
    if (mode === 'light') return 'Light'
    if (mode === 'dark') return 'Dark'
    return 'System'
  }, [mode])

  return (
    <div className='relative'>
      <div className='inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 backdrop-blur px-1 py-1 shadow-sm'>
        <button
          aria-label='Use system theme'
          onClick={() => setMode('system')}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'system'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          Sys
        </button>
        <button
          aria-label='Use light theme'
          onClick={() => setMode('light')}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'light'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          Light
        </button>
        <button
          aria-label='Use dark theme'
          onClick={() => setMode('dark')}
          className={`px-2.5 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'dark'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          Dark
        </button>
      </div>
    </div>
  )
}

export default ThemeToggle
