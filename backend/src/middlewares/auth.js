import jwt from 'jsonwebtoken'

// Middleware: protege rotas que exigem login admin
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' })
  }
  try {
    const token = authHeader.split(' ')[1]
    req.admin = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido' })
  }
}
