import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeviceAuth } from '../context/DeviceAuthContext'
import styles from './DeviceLogin.module.css'

export default function DeviceLogin() {
  const [inputKey, setInputKey] = useState('')
  const { setDeviceApiKey } = useDeviceAuth()
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputKey.trim().length > 5) {
      setDeviceApiKey(inputKey.trim())
      navigate('/device/checkin')
    } else {
      alert('API Key inválida')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Acesso do Leitor</h1>
        <p>Insira a API Key do dispositivo para iniciar.</p>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="text"
            placeholder="API Key (dev_...)"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Acessar
          </button>
        </form>
      </div>
    </div>
  )
}
