// ─────────────────────────────────────────────────────────────────────
// Destination: app/(app)/layout.tsx
// Silver A2 update: wraps the main content with an OfflineBanner that
// reports connectivity and pending-sync status.
// ─────────────────────────────────────────────────────────────────────
import { TasksProvider } from '@/context/TasksContext'
import Sidebar from '@/components/layout/Sidebar'
import OfflineBanner from '@/components/layout/OfflineBanner'

interface Props { children: React.ReactNode }

export default function AppLayout({ children }: Props) {
  return (
    <TasksProvider>
      <div className="flex h-screen overflow-hidden bg-stone-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <OfflineBanner />
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </TasksProvider>
  )
}
