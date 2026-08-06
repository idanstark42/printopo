import { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../lib/supabase'

const BACKEND = 'http://127.0.0.1:8000'

const StoreContext = createContext()

export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('supabase_user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [catalog, setCatalog] = useState([])
  const [cart, setCart] = useState([])

  useEffect(() => {
    if (user) {
      localStorage.setItem('supabase_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('supabase_user')
    }
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCatalog() {
    const res = await fetch(`${BACKEND}/printify/catalog`)
    setCatalog(await res.json())
  }

  const value = {
    user, setUser,
    cart, setCart,
    catalog, fetchCatalog
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}