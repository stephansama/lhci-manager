import { useEffect, useState } from 'react'
import IconMoon from '~icons/lucide/moon'
import IconSun from '~icons/lucide/sun'
import IconMonitor from '~icons/lucide/monitor'
import { Button } from '@/components/ui/button'

type ThemeMode = 'light' | 'dark' | 'auto'

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
  document.documentElement.style.colorScheme = resolved
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode | null
    const initial = (stored === 'light' || stored === 'dark' || stored === 'auto') ? stored : 'auto'
    setMode(initial)
    applyTheme(initial)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function toggle() {
    const next: ThemeMode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto'
    setMode(next)
    applyTheme(next)
    localStorage.setItem('theme', next)
  }

  const icon = mode === 'dark' ? <IconMoon className="size-4" /> : mode === 'light' ? <IconSun className="size-4" /> : <IconMonitor className="size-4" />
  const label = `Theme: ${mode}`

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      {icon}
    </Button>
  )
}
