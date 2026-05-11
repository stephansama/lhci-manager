import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/Header'

export const Route = createFileRoute('/websites/$websiteId')({
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <Outlet />
    </div>
  ),
})
