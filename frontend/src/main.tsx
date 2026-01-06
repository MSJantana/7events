import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { DeviceAuthProvider } from './context/DeviceAuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DeviceAuthProvider>
          <App />
        </DeviceAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
