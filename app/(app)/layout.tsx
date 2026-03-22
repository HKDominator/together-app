import { TasksProvider } from '@/context/TasksContext'
import Sidebar from '@/components/layout/Sidebar'

interface Props{
  children: React.ReactNode
}

export default function AppLayout({ children } : Props) {
  return (
    <TasksProvider>
      <div className="flex h-screen overflow-hidden bg-stone-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </TasksProvider>
  )
}
