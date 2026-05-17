import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getSession } from '@/services/websites'
import { authClient } from '@/lib/auth-client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/Header'
import { KeyRound, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  loader: () => getSession(),
  component: SettingsComponent,
})

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

function ProfileForm({ user }: { user: Session['user'] }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')
    try {
      if (name !== user.name) {
        await authClient.updateUser({ name })
      }
      if (email !== user.email) {
        await authClient.changeEmail({ newEmail: email, callbackURL: '/settings' })
      }
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {status === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">Profile updated.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
      <div>
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.')
      setStatus('error')
      return
    }
    setStatus('saving')
    setErrorMsg('')
    try {
      await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to change password.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">Current Password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {status === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">Password changed.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
      <div>
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Change Password'}
        </Button>
      </div>
    </form>
  )
}

type PasskeyRecord = { id: string; name?: string | null; createdAt?: string | Date | null }

function PasskeysCard() {
  const [passkeys, setPasskeys] = useState<PasskeyRecord[] | null>(null)
  const [newName, setNewName] = useState('')
  const [status, setStatus] = useState<'idle' | 'busy'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const supported =
    typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined'

  const refresh = async () => {
    const res = await authClient.$fetch('/passkey/list-user-passkeys', { method: 'GET' })
    const data = res?.data as PasskeyRecord[] | undefined
    setPasskeys(data ?? [])
  }

  useEffect(() => {
    if (!supported) {
      setPasskeys([])
      return
    }
    refresh().catch(() => setPasskeys([]))
  }, [supported])

  const handleAdd = async () => {
    setStatus('busy')
    setErrorMsg('')
    const result = await authClient.passkey.addPasskey({ name: newName || undefined })
    setStatus('idle')
    if (result?.error) {
      setErrorMsg(result.error.message ?? 'Failed to add passkey.')
      return
    }
    setNewName('')
    await refresh()
  }

  const handleDelete = async (id: string) => {
    setStatus('busy')
    setErrorMsg('')
    const res = await authClient.$fetch('/passkey/delete-passkey', { method: 'POST', body: { id } })
    setStatus('idle')
    if (res?.error) {
      setErrorMsg(res.error.message ?? 'Failed to delete passkey.')
      return
    }
    await refresh()
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This browser doesn't support WebAuthn, so passkeys aren't available here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {passkeys === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys yet. Add one below.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded border">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center gap-3 px-3 py-2">
                <KeyRound size={14} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{pk.name || 'Unnamed passkey'}</p>
                  {pk.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(pk.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={status === 'busy'}
                  onClick={() => handleDelete(pk.id)}
                  title="Remove passkey"
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label htmlFor="passkey-name">Passkey name (optional)</Label>
            <Input
              id="passkey-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="MacBook Touch ID"
            />
          </div>
          <Button onClick={handleAdd} disabled={status === 'busy'} className="gap-2">
            <KeyRound size={14} />
            Add passkey
          </Button>
        </div>

        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      </CardContent>
    </Card>
  )
}

function SettingsComponent() {
  const session = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <Link to="/">
            <Button variant="ghost" size="sm">← Dashboard</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm user={session!.user} />
          </CardContent>
        </Card>
        <PasskeysCard />
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
