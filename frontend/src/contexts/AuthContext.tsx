import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api, { getToken, setToken, removeToken } from '../lib/api'
import { User, AuthResponse } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const response = await api.get<User>('/auth/me')
        setUser(response.data)
      } catch {
        removeToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password })
    setToken(response.data.token)
    setUser(response.data.user)
  }

  const register = async (name: string, email: string, password: string): Promise<void> => {
    const response = await api.post<AuthResponse>('/auth/register', { name, email, password })
    setToken(response.data.token)
    setUser(response.data.user)
  }

  const logout = () => {
    removeToken()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
