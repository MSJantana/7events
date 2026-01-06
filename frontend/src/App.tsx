import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
//import SevenEventsPage from './pages/SevenEventsPage'
import EventDetails from './pages/EventDetails'
import Login from './pages/Login'
import DeviceLogin from './pages/DeviceLogin'
import DeviceCheckin from './pages/DeviceCheckin'
import { useEffect } from 'react'
import { useToast } from './hooks/useToast'

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
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/events/:slug" element={<EventDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/device/login" element={<DeviceLogin />} />
      <Route path="/device/checkin" element={<DeviceCheckin />} />
    </Routes>
  )
}

export default App
