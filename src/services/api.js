
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the saved JWT to every API request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('propertylink_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
)

// Handle expired or invalid authentication.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('propertylink_token')
      localStorage.removeItem('propertylink_user')

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default api
