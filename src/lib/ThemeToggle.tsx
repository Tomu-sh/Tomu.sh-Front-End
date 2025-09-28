import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

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

  return (
    <motion.div
      className='relative'
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <div className='inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-1 shadow-sm'>
        <button
          aria-label='Use system theme'
          onClick={() => setMode('system')}
          className={`p-2 rounded-md transition-all ${
            mode === 'system'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            className='w-4 h-4'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
            />
          </svg>
        </button>
        <button
          aria-label='Use light theme'
          onClick={() => setMode('light')}
          className={`p-2 rounded-md transition-all ${
            mode === 'light'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            className='w-4 h-4'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
            />
          </svg>
        </button>
        <button
          aria-label='Use dark theme'
          onClick={() => setMode('dark')}
          className={`p-2 rounded-md transition-all ${
            mode === 'dark'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            className='w-4 h-4'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
            />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

export default ThemeToggle
