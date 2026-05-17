import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import IconPencil from '~icons/lucide/pencil'
import IconRefreshCw from '~icons/lucide/refresh-cw'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ScheduleField } from '@/components/ScheduleField'
import { cronToPreset, presetToCron, type SchedulePreset } from '@/lib/cron'
import { updateWebsite, fetchMetadataForUrl } from '@/services/websites'

export type EditableWebsite = {
  id: string
  name: string
  url: string
  faviconUrl: string | null
  ogImageUrl: string | null
  formFactor: 'mobile' | 'desktop'
  cronExpression: string | null
}

export function EditWebsiteDialog({ website, onSaved }: { website: EditableWebsite; onSaved: () => void }) {
  const initialSchedule = cronToPreset(website.cronExpression ?? null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(website.name)
  const [url, setUrl] = useState(website.url)
  const [faviconUrl, setFaviconUrl] = useState(website.faviconUrl ?? '')
  const [ogImageUrl, setOgImageUrl] = useState(website.ogImageUrl ?? '')
  const [formFactor, setFormFactor] = useState<'mobile' | 'desktop'>(website.formFactor ?? 'mobile')
  const [schedulePreset, setSchedulePreset] = useState<SchedulePreset>(initialSchedule.preset)
  const [customCron, setCustomCron] = useState(initialSchedule.custom)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const sched = cronToPreset(website.cronExpression ?? null)
      setName(website.name)
      setUrl(website.url)
      setFaviconUrl(website.faviconUrl ?? '')
      setOgImageUrl(website.ogImageUrl ?? '')
      setFormFactor(website.formFactor ?? 'mobile')
      setSchedulePreset(sched.preset)
      setCustomCron(sched.custom)
      setError(null)
    }
    setOpen(next)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const meta = await fetchMetadataForUrl({ data: { url } })
      setFaviconUrl(meta.faviconUrl ?? '')
      setOgImageUrl(meta.ogImageUrl ?? '')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const cronExpression = presetToCron(schedulePreset, customCron)
    try {
      await updateWebsite({
        data: {
          websiteId: website.id,
          name,
          url,
          faviconUrl: faviconUrl || null,
          ogImageUrl: ogImageUrl || null,
          formFactor,
          cronExpression,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      return
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <IconPencil className="size-3.5" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-favicon">Favicon URL</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="h-6 text-xs px-2"
              >
                <IconRefreshCw className={`size-3 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {faviconUrl && (
                <img src={faviconUrl} alt="" className="w-5 h-5 object-contain shrink-0" />
              )}
              <Input
                id="edit-favicon"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-og">OG Image URL</Label>
            <Input
              id="edit-og"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              placeholder="https://example.com/og.png"
            />
            {ogImageUrl && (
              <img src={ogImageUrl} alt="" className="w-full h-24 object-cover rounded-md" />
            )}
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
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
