import { Calendar } from './components/Calendar'
import { ConnectDesktopDialog } from './components/ConnectDesktop'
import { Navbar } from './components/Navbar'
import { SessionController } from './components/SessionController'
import { SettingsDialog } from './components/Settings'
import { StartOverlay } from './components/StartOverlay'
import { SignInScreen } from './components/SignIn'
import { TimeUpOverlay } from './components/TimeUpOverlay'
import { useAuth } from './lib/auth'

export default function App() {
  const auth = useAuth((s) => s.status)
  // Stint requires an account ('unavailable' = no database configured: local dev, offline).
  if (auth === 'loading') return <div className="min-h-screen bg-background" />
  if (auth === 'signedOut') return <SignInScreen />
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <SessionController />
      <StartOverlay />
      <TimeUpOverlay />
      <ConnectDesktopDialog />
      <SettingsDialog />
      <Navbar />
      <main>
        <Calendar />
      </main>
    </div>
  )
}
