import { Calendar } from './components/Calendar'
import { Navbar } from './components/Navbar'
import { PipPortal } from './components/PipTimer'
import { SessionController } from './components/SessionController'

export default function App() {
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <SessionController />
      <PipPortal />
      <Navbar />
      <main>
        <Calendar />
      </main>
    </div>
  )
}
