import { useState } from 'react'
import Today from './pages/Today'
import Later from './pages/Later'
import History from './pages/History'

type Tab = 'today' | 'later' | 'history'

const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'later', label: 'Later' },
  { id: 'history', label: 'History' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#171414' }}>
      <nav style={{ borderBottom: '1px solid #e5e4e7', display: 'flex', justifyContent: 'center' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              color: activeTab === tab.id ? '#171414' : '#565151',
              borderBottom: activeTab === tab.id ? '2px solid #171414' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === 'today' && <Today />}
      {activeTab === 'later' && <Later />}
      {activeTab === 'history' && <History />}
    </div>
  )
}
