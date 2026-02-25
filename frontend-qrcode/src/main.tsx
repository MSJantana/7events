import { StrictMode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ToastProvider } from './components/Toast'
import { DeviceAuthProvider } from './context/DeviceAuthContext'
import DeviceLogin from './pages/DeviceLogin'
import DeviceCheckin from './pages/DeviceCheckin'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <DeviceAuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/device/login" />} />
            <Route path="/device/login" element={<DeviceLogin />} />
            <Route path="/device/checkin" element={<DeviceCheckin />} />
          </Routes>
        </DeviceAuthProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
)

