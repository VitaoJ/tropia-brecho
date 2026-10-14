import { createContext, useContext, useEffect, useState } from 'react'
import { SESSAO_EXPIRADA } from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tropia_admin_token'))
  const [admin, setAdmin] = useState(null)
  // Diferencia "saiu" de "foi tirado": o login mostra o aviso só no segundo.
  const [expirou, setExpirou] = useState(false)

  const login = (novoToken, dadosAdmin) => {
    localStorage.setItem('tropia_admin_token', novoToken)
    setToken(novoToken)
    setAdmin(dadosAdmin)
    setExpirou(false)
  }

  const logout = () => {
    localStorage.removeItem('tropia_admin_token')
    setToken(null)
    setAdmin(null)
  }

  useEffect(() => {
    const aoExpirar = () => {
      localStorage.removeItem('tropia_admin_token')
      setToken(null)
      setAdmin(null)
      setExpirou(true)
    }
    window.addEventListener(SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(SESSAO_EXPIRADA, aoExpirar)
  }, [])

  return (
    <AuthContext.Provider value={{ token, admin, setAdmin, login, logout, expirou, logado: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
