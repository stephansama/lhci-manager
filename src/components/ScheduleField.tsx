import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SchedulePreset } from '@/lib/cron'

const PRESETS: { value: SchedulePreset; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

type Props = {
  preset: SchedulePreset
  customCron: string
  onPresetChange: (preset: SchedulePreset) => void
  onCustomCronChange: (cron: string) => void
}

export function ScheduleField({ preset, customCron, onPresetChange, onCustomCronChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Schedule</Label>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            variant={preset === p.value ? 'default' : 'outline'}
            size="sm"
            className="flex-1 min-w-[60px]"
            onClick={() => onPresetChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === 'custom' && (
        <Input
          value={customCron}
          onChange={(e) => onCustomCronChange(e.target.value)}
          placeholder="0 */6 * * *"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        />
      )}
    </div>
  )
}
