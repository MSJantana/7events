import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'

interface DeviceAuthContextType {
  deviceApiKey: string | null
  setDeviceApiKey: (key: string | null) => void
  isAuthenticated: boolean
}

const DeviceAuthContext = createContext<DeviceAuthContextType | undefined>(undefined)

export function DeviceAuthProvider({ children }: { readonly children: ReactNode }) {
  const [storedApiKey, setStoredApiKey] = useState<string | null>(() => {
    return localStorage.getItem('device_api_key')
  })

  useEffect(() => {
    if (storedApiKey) {
      localStorage.setItem('device_api_key', storedApiKey)
    } else {
      localStorage.removeItem('device_api_key')
    }
  }, [storedApiKey])

  const setDeviceApiKey = useCallback((key: string | null) => {
    setStoredApiKey(key)
  }, [])

  const value = useMemo(() => ({
    deviceApiKey: storedApiKey,
    setDeviceApiKey,
    isAuthenticated: !!storedApiKey
  }), [storedApiKey, setDeviceApiKey])

  return (
    <DeviceAuthContext.Provider value={value}>
      {children}
    </DeviceAuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDeviceAuth() {
  const context = useContext(DeviceAuthContext)
  if (context === undefined) {
    throw new Error('useDeviceAuth must be used within a DeviceAuthProvider')
  }
  return context
}
