import { CronExpressionParser } from 'cron-parser'

export type SchedulePreset = 'off' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export const PRESET_CRON: Record<Exclude<SchedulePreset, 'off' | 'custom'>, string> = {
  hourly: '0 * * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
  monthly: '0 0 1 * *',
}

export function presetToCron(preset: SchedulePreset, custom: string): string | null {
  if (preset === 'off') return null
  if (preset === 'custom') return custom.trim() || null
  return PRESET_CRON[preset]
}

export function cronToPreset(cron: string | null): { preset: SchedulePreset; custom: string } {
  if (!cron) return { preset: 'off', custom: '' }
  const match = (Object.entries(PRESET_CRON) as [Exclude<SchedulePreset, 'off' | 'custom'>, string][])
    .find(([, value]) => value === cron)
  if (match) return { preset: match[0], custom: '' }
  return { preset: 'custom', custom: cron }
}

export function validateCron(expr: string): void {
  CronExpressionParser.parse(expr)
}

export function describeCron(cron: string | null): string {
  if (!cron) return 'No schedule'
  const { preset, custom } = cronToPreset(cron)
  if (preset === 'custom') return custom
  return preset.charAt(0).toUpperCase() + preset.slice(1)
}
