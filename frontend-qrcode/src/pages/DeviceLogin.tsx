import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeviceAuth } from '../context/DeviceAuthContext'
import { useToast } from '../hooks/useToast'

export default function DeviceLogin() {
  const [inputKey, setInputKey] = useState('')
  const { setDeviceApiKey } = useDeviceAuth()
  const navigate = useNavigate()
  const { show } = useToast()

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (inputKey.trim().length > 5) {
      setDeviceApiKey(inputKey.trim())
      navigate('/device/checkin')
    } else {
      show({ text: 'API Key inválida', kind: 'err' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
            Acesso do Leitor
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Insira a API Key do dispositivo para iniciar as operações.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="api-key" className="sr-only">
                API Key
              </label>
              <input
                id="api-key"
                name="api-key"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors duration-200"
                placeholder="API Key (ex: dev_...)"
                value={inputKey}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputKey(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-blue-500 group-hover:text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              {' '}
              Acessar Sistema
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
