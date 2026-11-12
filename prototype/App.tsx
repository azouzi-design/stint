import { Calendar } from './components/Calendar'
import { Navbar } from './components/Navbar'

export default function App() {
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <Navbar />
      <main>
        <Calendar />
      </main>
    </div>
  )
}
