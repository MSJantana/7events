import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DeviceAuthContextType {
  deviceApiKey: string | null
  setDeviceApiKey: (key: string | null) => void
  isAuthenticated: boolean
}

const DeviceAuthContext = createContext<DeviceAuthContextType | undefined>(undefined)

export function DeviceAuthProvider({ children }: { children: ReactNode }) {
  const [deviceApiKey, setDeviceApiKeyState] = useState<string | null>(() => {
    return localStorage.getItem('device_api_key')
  })

  useEffect(() => {
    if (deviceApiKey) {
      localStorage.setItem('device_api_key', deviceApiKey)
    } else {
      localStorage.removeItem('device_api_key')
    }
  }, [deviceApiKey])

  const setDeviceApiKey = (key: string | null) => {
    setDeviceApiKeyState(key)
  }

  return (
    <DeviceAuthContext.Provider value={{ deviceApiKey, setDeviceApiKey, isAuthenticated: !!deviceApiKey }}>
      {children}
    </DeviceAuthContext.Provider>
  )
}

export function useDeviceAuth() {
  const context = useContext(DeviceAuthContext)
  if (context === undefined) {
    throw new Error('useDeviceAuth must be used within a DeviceAuthProvider')
  }
  return context
}
