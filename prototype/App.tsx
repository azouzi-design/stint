import { Calendar } from './components/Calendar'
import { Navbar } from './components/Navbar'
import { PipPortal } from './components/PipTimer'
import { SessionController } from './components/SessionController'
import { StartOverlay } from './components/StartOverlay'

export default function App() {
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <SessionController />
      <PipPortal />
      <StartOverlay />
      <Navbar />
      <main>
        <Calendar />
      </main>
    </div>
  )
}
