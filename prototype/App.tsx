import { Calendar } from './components/Calendar'
import { ConnectDesktopDialog } from './components/ConnectDesktop'
import { Navbar } from './components/Navbar'
import { SessionController } from './components/SessionController'
import { SettingsDialog } from './components/Settings'
import { StartOverlay } from './components/StartOverlay'
import { SignInDialog } from './components/SignIn'
import { TimeUpOverlay } from './components/TimeUpOverlay'

export default function App() {
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <SessionController />
      <StartOverlay />
      <TimeUpOverlay />
      <SignInDialog />
      <ConnectDesktopDialog />
      <SettingsDialog />
      <Navbar />
      <main>
        <Calendar />
      </main>
    </div>
  )
}
