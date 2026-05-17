import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { addWebsite } from '@/services/websites'
import { authClient } from '@/lib/auth-client'
import { ScheduleField } from '@/components/ScheduleField'
import { presetToCron, type SchedulePreset } from '@/lib/cron'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const tabClass =
  'flex items-center px-3 h-full border-b-2 border-transparent text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground'

export function Header() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [formFactor, setFormFactor] = useState<'mobile' | 'desktop'>('mobile')
  const [schedulePreset, setSchedulePreset] = useState<SchedulePreset>('off')
  const [customCron, setCustomCron] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: session } = authClient.useSession()
  const initials = getInitials(session?.user.name ?? '')

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cronExpression = presetToCron(schedulePreset, customCron)
    try {
      await addWebsite({ data: { name, url, formFactor, cronExpression } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add website')
      return
    }
    setName('')
    setUrl('')
    setFormFactor('mobile')
    setSchedulePreset('off')
    setCustomCron('')
    setDialogOpen(false)
    router.invalidate()
  }

  const handleLogout = async () => {
    await authClient.signOut()
    router.navigate({ to: '/login' })
  }

  return (
    <header className="border-b">
      <div className="max-w-4xl mx-auto px-6 h-11 flex items-stretch">
        <Link
          to="/"
          className="flex items-center mr-6 font-mono text-primary font-medium tracking-tight text-base shrink-0"
          activeOptions={{ exact: true, includeSearch: false }}
        >
          LHCI
        </Link>

        <nav className="flex items-stretch flex-1 gap-1">
          {session && (
            <>
              <Link to="/" activeOptions={{ exact: true }} className={tabClass}>
                Websites
              </Link>
              <Link to="/settings" className={tabClass}>
                Settings
              </Link>
              {(session.user as { role?: string }).role === 'admin' && (
                <Link to="/admin" className={tabClass}>
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  + Add Website
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Website</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddWebsite} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="site-name">Name</Label>
                      <Input
                        id="site-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Website"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="site-url">URL</Label>
                      <Input
                        id="site-url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Form Factor</Label>
                      <div className="flex gap-2">
                        {(['mobile', 'desktop'] as const).map((ff) => (
                          <Button
                            key={ff}
                            type="button"
                            variant={formFactor === ff ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 capitalize"
                            onClick={() => setFormFactor(ff)}
                          >
                            {ff}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <ScheduleField
                      preset={schedulePreset}
                      customCron={customCron}
                      onPresetChange={setSchedulePreset}
                      onCustomCronChange={setCustomCron}
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <DialogFooter>
                      <DialogClose render={<Button type="button" variant="outline" />}>
                        Cancel
                      </DialogClose>
                      <Button type="submit">Add</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="w-[26px] h-[26px] rounded-full border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono font-semibold flex items-center justify-center shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Account menu"
                    />
                  }
                >
                  {initials || '?'}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link to="/settings" />}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link to="/login">
                <Button size="sm" variant="outline">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
