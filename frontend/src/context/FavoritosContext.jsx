import { createContext, useContext, useState, useEffect } from 'react'

const FavoritosContext = createContext()

export function FavoritosProvider({ children }) {
  const [favoritos, setFavoritos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tropia_favoritos')) ?? []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('tropia_favoritos', JSON.stringify(favoritos))
  }, [favoritos])

  const toggle = (produto) => {
    setFavoritos(prev =>
      prev.some(f => f.id === produto.id)
        ? prev.filter(f => f.id !== produto.id)
        : [...prev, produto]
    )
  }

  const isFavorito = (id) => favoritos.some(f => f.id === id)

  return (
    <FavoritosContext.Provider value={{ favoritos, toggle, isFavorito }}>
      {children}
    </FavoritosContext.Provider>
  )
}

export const useFavoritos = () => useContext(FavoritosContext)
