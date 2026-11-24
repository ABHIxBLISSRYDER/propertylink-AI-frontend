
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('propertylink_token')

      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/me')
        setUser(response.data)
        localStorage.setItem(
          'propertylink_user',
          JSON.stringify(response.data),
        )
      } catch {
        localStorage.removeItem('propertylink_token')
        localStorage.removeItem('propertylink_user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    })

    const { accessToken, user: loggedInUser } = response.data

    localStorage.setItem('propertylink_token', accessToken)
    localStorage.setItem(
      'propertylink_user',
      JSON.stringify(loggedInUser),
    )

    setUser(loggedInUser)

    return loggedInUser
  }

  const logout = () => {
    localStorage.removeItem('propertylink_token')
    localStorage.removeItem('propertylink_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
