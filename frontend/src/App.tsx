import './App.css'
import { Routes, Route } from 'react-router-dom'
import SevenEventsPage from './pages/SevenEventsPage'
import EventDetails from './pages/EventDetails'
import CreateEventPage from './pages/CreateEventPage'
import { useEffect } from 'react'
import { useToast } from './hooks/useToast'
import EventPurchasePage from './pages/EventPurchasePage'

function App() {
  const { show } = useToast()

  useEffect(() => {
    const handleExpired = () => {
      show({ text: 'Sessão expirada', kind: 'err' })
      setTimeout(() => {
        try { globalThis.localStorage.removeItem('access_token') } catch { void 0 }
        globalThis.location.href = '/'
      }, 1500)
    }
    globalThis.addEventListener('session-expired', handleExpired)
    return () => globalThis.removeEventListener('session-expired', handleExpired)
  }, [show])

  return (
    <Routes>
      <Route path="/" element={<SevenEventsPage />} />
      <Route path="/create-event" element={<CreateEventPage />} />
      <Route path="/checkout/:slug" element={<EventPurchasePage />} />
      <Route path="/events/:slug" element={<EventDetails />} />
    </Routes>
  )
}

export default App
