// Destination: together-app-ui/app/(app)/layout.tsx
// REPLACE — wrap everything with AuthGate so /tasks, /admin/*,
// /account/* all redirect unauthenticated visitors to /login.
import { TasksProvider } from '@/context/TasksContext'
import Sidebar from '@/components/layout/Sidebar'
import OfflineBanner from '@/components/layout/OfflineBanner'
import ChatPanel from '@/components/chat/ChatPanel'
import AuthGate from '@/components/auth/AuthGate'

interface Props { children: React.ReactNode }

export default function AppLayout({ children }: Props) {
  return (
    <AuthGate>
      <TasksProvider>
        <div className="flex h-screen overflow-hidden bg-stone-100">
          <Sidebar />
          <main className="flex-1 overflow-y-auto flex flex-col">
            <OfflineBanner />
            <div className="flex-1">
              {children}
            </div>
            <ChatPanel />
          </main>
        </div>
      </TasksProvider>
    </AuthGate>
  )
}