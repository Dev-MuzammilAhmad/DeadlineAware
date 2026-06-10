import { useEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState('light')

  const setTheme = (newTheme) => {
    if (newTheme === 'system') {
      localStorage.removeItem('theme')
    } else {
      localStorage.setItem('theme', newTheme)
    }
    setThemeState(newTheme)
  }

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = () => {
      let activeTheme = theme

      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        activeTheme = systemPrefersDark ? 'dark' : 'light'
      }

      setResolvedTheme(activeTheme)

      if (activeTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme()

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const isDark = resolvedTheme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
