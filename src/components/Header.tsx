import { Link, useRouter } from '@tanstack/react-router'
import IconLighthouse from '~icons/simple-icons/lighthouse'
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Header() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [formFactor, setFormFactor] = useState<'mobile' | 'desktop'>('mobile')
  const { data: session } = authClient.useSession()
  const initials = getInitials(session?.user.name ?? '')

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault()
    await addWebsite({ data: { name, url, formFactor } })
    setName('')
    setUrl('')
    setFormFactor('mobile')
    setDialogOpen(false)
    router.invalidate()
  }

  const handleLogout = async () => {
    await authClient.signOut()
    router.navigate({ to: '/login' })
  }

  return (
    <header className="border-b">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <IconLighthouse className="w-6 h-6" />
          <h1 className="text-xl font-semibold">Lighthouse CI Manager</h1>
        </Link>
        <div className="flex items-center gap-2">
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
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </div>
      </div>
    </header>
  )
}
