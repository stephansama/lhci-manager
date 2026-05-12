import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '@/services/websites'
import { Header } from '@/components/Header'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    const role = (session.user as { role?: string }).role
    if (role !== 'admin') throw redirect({ to: '/' })
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Outlet />
    </div>
  )
}
