import IconSpinner from '~icons/svg-spinners/ring-resize'
import { Badge } from '@/components/ui/badge'

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

export function statusVariant(status: RunStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'completed') return 'default'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const spinning = status === 'pending' || status === 'running'
  return (
    <Badge variant={statusVariant(status)} className="gap-1">
      {spinning && <IconSpinner className="size-3 shrink-0" />}
      {status}
    </Badge>
  )
}
