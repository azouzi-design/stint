import { useState } from 'react'
import Today from './pages/Today'
import Later from './pages/Later'
import History from './pages/History'
import Playground from './pages/Playground'
import { NavigationLink } from './components/navbar/navigation-link'

type Tab = 'today' | 'later' | 'history' | 'playground'

const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today,' },
  { id: 'later', label: 'Later,' },
  { id: 'history', label: 'History,' },
  ...(import.meta.env.DEV ? [{ id: 'playground' as const, label: 'Playground,' }] : []),
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex justify-center gap-12 border-b border-border py-12">
        {tabs.map((tab) => (
          <NavigationLink key={tab.id} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </NavigationLink>
        ))}
      </nav>
      {activeTab === 'today' && <Today />}
      {activeTab === 'later' && <Later />}
      {activeTab === 'history' && <History />}
      {activeTab === 'playground' && <Playground />}
    </div>
  )
}
