import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client'
import { getSession } from '../services/websites'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import IconGithub from '~icons/simple-icons/github'
import IconGoogle from '~icons/simple-icons/google'
import IconApple from '~icons/simple-icons/apple'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) throw redirect({ to: '/' })
  },
  component: LoginComponent,
})

function LoginComponent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await authClient.signIn.email({ email, password, callbackURL: '/' })
    if (result.error) {
      setError(result.error.message ?? 'Login failed')
    } else {
      router.navigate({ to: '/' })
    }
  }

  const handleSocial = async (provider: 'github' | 'google' | 'apple') => {
    setSocialLoading(provider)
    await authClient.signIn.social({ provider, callbackURL: '/' })
    setSocialLoading(null)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await authClient.signUp.email({
      email,
      password,
      name: email.split('@')[0],
      callbackURL: '/',
    })
    if (result.error) {
      setError(result.error.message ?? 'Sign up failed')
    } else {
      router.navigate({ to: '/' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">LHCI Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Login
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={handleSignUp}>
                Sign Up
              </Button>
            </div>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="flex gap-2">
            {([
              { provider: 'github', icon: IconGithub, label: 'GitHub' },
              { provider: 'google', icon: IconGoogle, label: 'Google' },
              { provider: 'apple',  icon: IconApple,  label: 'Apple'  },
            ] as const).map(({ provider, icon: Icon, label }) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                disabled={socialLoading !== null}
                onClick={() => handleSocial(provider)}
              >
                <Icon className="w-4 h-4" />
                <span className="sr-only">{label}</span>
              </Button>
            ))}</div>
        </CardContent>
      </Card>
    </div>
  )
}
