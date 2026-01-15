import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useDeviceAuth } from '../context/DeviceAuthContext'
import { useNavigate } from 'react-router-dom'
import styles from './DeviceCheckin.module.css'
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
  const { deviceApiKey, isAuthenticated, setDeviceApiKey } = useDeviceAuth()
  const navigate = useNavigate()
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'scan' | 'manual'>('manual') // Default to manual to avoid instant camera request
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const isProcessing = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/device/login')
    }
  }, [isAuthenticated, navigate])

  const handleValidate = useCallback(async (code: string) => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch(`${API_URL}/checkin/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': deviceApiKey || ''
        },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      setResult(data)
      
      // If success or failure, we keep isProcessing = true to stop scanning
      // untill user clears the result.
      
    } catch (err) {
      console.error(err)
      setResult({ success: false, message: 'Erro de conexão ou servidor.' })
      // On network error, we might want to allow retry immediately? 
      // Or show error and wait for clear. Let's wait for clear.
    } finally {
      setLoading(false)
      setManualCode('')
    }
  }, [deviceApiKey])

  useEffect(() => {
    isProcessing.current = false // Reset processing state on mode change

    if (mode === 'scan') {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            )
            
            scanner.render(
                (decodedText) => {
                    if (isProcessing.current) return
                    isProcessing.current = true
                    handleValidate(decodedText)
                },
                () => {
                    // console.warn(error)
                }
            )
            scannerRef.current = scanner
        }
      }, 100)
      
      return () => {
        clearTimeout(timer)
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err))
            scannerRef.current = null
        }
      }
    } else if (scannerRef.current) {
        // Cleanup if switching away from scan mode
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err))
        scannerRef.current = null
    }
  }, [mode, handleValidate])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleValidate(manualCode.trim())
    }
  }

  const handleClearResult = () => {
    setResult(null)
    isProcessing.current = false
  }


  const handleLogout = () => {
    setDeviceApiKey(null)
    navigate('/device/login')
  }

  const getStatusColor = () => {
    if (!result) return 'gray'
    if (result.success) return 'green' // Entrada Liberada
    if (result.message.includes('utilizado')) return 'yellow' // Já utilizado (warning)
    return 'red' // Inválido / Outro erro
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Portaria 7Events</h2>
        <button onClick={handleLogout} className={styles.logoutBtn}>Sair</button>
      </header>

      <div className={styles.main}>
        <div className={styles.tabs}>
            <button 
                className={`${styles.tab} ${mode === 'manual' ? styles.activeTab : ''}`}
                onClick={() => setMode('manual')}
            >
                Digitar Código
            </button>
            <button 
                className={`${styles.tab} ${mode === 'scan' ? styles.activeTab : ''}`}
                onClick={() => setMode('scan')}
            >
                Ler QR Code
            </button>
        </div>

        {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className={styles.manualForm}>
                <input 
                    type="text" 
                    placeholder="Código do ingresso" 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className={styles.input}
                    autoFocus
                />
                <button type="submit" className={styles.validateBtn} disabled={loading}>
                    {loading ? 'Validando...' : 'Validar'}
                </button>
            </form>
        )}

        {mode === 'scan' && (
            <div className={styles.scannerContainer}>
                <div id="reader" className={styles.reader}></div>
                <p className={styles.hint}>Aponte a câmera para o QR Code</p>
            </div>
        )}

        {result && (
            <div className={`${styles.resultCard} ${styles[getStatusColor()]}`}>
                <h1 className={styles.resultTitle}>
                    {result.success ? 'ENTRADA LIBERADA' : 'ACESSO NEGADO'}
                </h1>
                <p className={styles.resultMessage}>{result.message}</p>
                
                {result.ticket && (
                    <div className={styles.ticketDetails}>
                        <p><strong>Evento:</strong> {result.ticket.eventName}</p>
                        <p><strong>Tipo:</strong> {result.ticket.ticketType}</p>
                        <p><strong>Participante:</strong> {result.ticket.attendeeName}</p>
                        <p><strong>Código:</strong> {result.ticket.code}</p>
                        <p><strong>Status:</strong> {result.ticket.status}</p>
                    </div>
                )}
                
                <button onClick={handleClearResult} className={styles.clearBtn}>
                    Nova Leitura
                </button>
            </div>
        )}
      </div>
    </div>
  )
}
