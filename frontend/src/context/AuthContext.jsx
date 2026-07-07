import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tropia_admin_token'))
  const [admin, setAdmin] = useState(null)

  const login = (novoToken, dadosAdmin) => {
    localStorage.setItem('tropia_admin_token', novoToken)
    setToken(novoToken)
    setAdmin(dadosAdmin)
  }

  const logout = () => {
    localStorage.removeItem('tropia_admin_token')
    setToken(null)
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ token, admin, setAdmin, login, logout, logado: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
