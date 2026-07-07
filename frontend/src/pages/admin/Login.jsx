import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { loginAdmin } from '../../services/api'
import logoSimbolo from '../../assets/logo-simbolo.svg'
import logoTexto from '../../assets/logo-texto.svg'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const { token, admin } = await loginAdmin(email, senha)
      login(token, admin)
      navigate('/admin/dashboard')
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eae1d4] flex items-center justify-center px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm">
        {/* Logos */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src={logoSimbolo} alt="Tropia" className="h-14 w-14 object-contain" />
          <img src={logoTexto} alt="Tropia" className="h-8 object-contain" />
          <span className="text-[10px] tracking-[0.3em] text-[#654a2b] uppercase">Painel administrativo</span>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-[#f2ead9] border border-[#d6c8b3] rounded-sm p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[#654a2b]">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              autoComplete="username"
              className="h-11 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b]" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-[#654a2b]">Senha</span>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
              autoComplete="current-password"
              className="h-11 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b]" />
          </label>

          {erro && (
            <p className="text-xs text-[#c44b00] bg-[#ffe0cc] px-3 py-2 rounded-sm">{erro}</p>
          )}

          <button type="submit" disabled={enviando}
            className="h-11 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.16em] rounded-sm disabled:opacity-60 active:opacity-80 transition-opacity">
            {enviando ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
