import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useDeviceAuth } from '../context/DeviceAuthContext'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../services/api'

interface ValidationResult {
  success: boolean
  message: string
  ticket?: {
    id: string
    code: string
    status: string
    attendeeName: string
    ticketType: string
    eventName: string
    usedAt?: string
  }
}

export default function DeviceCheckin() {
  const { deviceApiKey } = useDeviceAuth()
  const navigate = useNavigate()
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const isProcessing = useRef(false)

  useEffect(() => {
    if (!deviceApiKey) {
      navigate('/device/login')
    }
  }, [deviceApiKey, navigate])

  const handleValidate = useCallback(async (code: string) => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch(`${API_URL}/checkin/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': deviceApiKey || '',
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()
      setResult(data)
    } catch {
      setResult({ success: false, message: 'Erro de conexão ou servidor.' })
    } finally {
      setLoading(false)
      setManualCode('')
    }
  }, [deviceApiKey])

  useEffect(() => {
    isProcessing.current = false

    if (mode === 'scan') {
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
          const scanner = new Html5QrcodeScanner(
            'reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false,
          )

          scanner.render(
            (decodedText) => {
              if (isProcessing.current) return
              isProcessing.current = true
              handleValidate(decodedText)
            },
            () => {},
          )
          scannerRef.current = scanner
        }
      }, 100)

      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {})
          scannerRef.current = null
        }
      }
    }
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
    }
    return undefined
  }, [mode, handleValidate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Leitor de Ingressos
          </h1>
          <button 
            onClick={() => navigate('/device/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="grow container mx-auto px-4 py-6 max-w-lg">
        {/* Mode Switcher */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-6 flex">
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'scan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Escanear QR
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'manual'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Digitar Código
          </button>
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          {mode === 'scan' ? (
            <div className="p-4 bg-black">
              <div id="reader" className="overflow-hidden rounded-lg"></div>
              <p className="text-center text-gray-400 text-xs mt-2">Aponte a câmera para o QR Code</p>
            </div>
          ) : (
            <div className="p-6">
              <label htmlFor="ticket-code" className="block text-sm font-medium text-gray-700 mb-2">
                Código do Ingresso
              </label>
              <div className="flex gap-2">
                <input
                  id="ticket-code"
                  type="text"
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: TICKET-123"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                />
                <button
                  onClick={() => handleValidate(manualCode)}
                  disabled={!manualCode.trim() || loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Validar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 animate-pulse">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Validando ingresso...</p>
          </div>
        )}

        {/* Result State */}
        {!loading && result && (
          <div className={`rounded-2xl shadow-lg border p-6 animate-fade-in ${
            result.success 
              ? 'bg-green-50 border-green-100' 
              : 'bg-red-50 border-red-100'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full shrink-0 ${
                result.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {result.success ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-1 ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? 'Ingresso Válido' : 'Inválido'}
                </h3>
                <p className={`text-sm mb-4 ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </p>

                {result.ticket && (
                  <div className="bg-white/50 rounded-lg p-3 space-y-2 text-sm border border-black/5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Participante:</span>
                      <span className="font-semibold text-gray-900">{result.ticket.attendeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Evento:</span>
                      <span className="font-semibold text-gray-900">{result.ticket.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="font-semibold text-gray-900">{result.ticket.ticketType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Código:</span>
                      <span className="font-mono text-gray-600">{result.ticket.code}</span>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setResult(null)
                    if (mode === 'scan') isProcessing.current = false
                  }}
                  className={`mt-4 w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    result.success
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Próximo Ingresso
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
