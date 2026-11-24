import { useAuth } from './AuthContext'
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import api from '../services/api'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
    const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    localStorage.getItem('propertylink_workspace_id') || '',
  )
  const [loading, setLoading] = useState(true)

  const refreshWorkspaces = async () => {
    const response = await api.get('/workspaces')
    const data = response.data

    setWorkspaces(data)

    const savedId = localStorage.getItem('propertylink_workspace_id')
    const savedWorkspaceExists = data.some(
      (workspace) => String(workspace.id) === savedId,
    )

    if (savedWorkspaceExists) {
      setSelectedWorkspaceId(savedId)
    } else if (data.length > 0) {
      setSelectedWorkspaceId(String(data[0].id))
      localStorage.setItem(
        'propertylink_workspace_id',
        String(data[0].id),
      )
    } else {
      setSelectedWorkspaceId('')
      localStorage.removeItem('propertylink_workspace_id')
    }
  }

  useEffect(() => {
  if (!user) {
    setWorkspaces([])
    setSelectedWorkspaceId('')
    setLoading(false)
    return
  }

  const loadWorkspaces = async () => {
    setLoading(true)

    try {
      await refreshWorkspaces()
    } catch (error) {
      console.error('Unable to load workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  loadWorkspaces()
}, [user?.id])

  const selectWorkspace = (id) => {
    const value = String(id)
    setSelectedWorkspaceId(value)
    localStorage.setItem('propertylink_workspace_id', value)
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        selectedWorkspaceId,
        selectWorkspace,
        refreshWorkspaces,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
