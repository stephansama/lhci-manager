export function scorePillClass(score: number | null): string {
  if (score === null) return 'bg-muted text-muted-foreground'
  if (score >= 90) return 'bg-green-500/15 text-green-700 dark:text-green-400'
  if (score >= 75) return 'bg-lime-500/15 text-lime-700 dark:text-lime-400'
  if (score >= 50) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
  if (score >= 25) return 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
  return 'bg-red-500/15 text-red-600 dark:text-red-400'
}

export function scoreClass(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 90) return 'text-green-600 dark:text-green-400 font-medium'
  if (score >= 75) return 'text-lime-600 dark:text-lime-400 font-medium'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400 font-medium'
  if (score >= 25) return 'text-orange-600 dark:text-orange-400 font-medium'
  return 'text-red-600 dark:text-red-400 font-medium'
}

export function dotClass(score: number | null): string {
  if (score === null) return 'bg-muted-foreground'
  if (score >= 90) return 'bg-green-500'
  if (score >= 75) return 'bg-lime-500'
  if (score >= 50) return 'bg-yellow-500'
  if (score >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}
