
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useWorkspace } from '../../context/WorkspaceContext'

export default function Workspaces() {
  const {
    workspaces,
    selectedWorkspaceId,
    selectWorkspace,
    refreshWorkspaces,
  } = useWorkspace()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    refreshWorkspaces().catch((err) =>
      setError(err.response?.data?.message || 'Unable to load workspaces.'),
    )
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await api.post('/workspaces', {
        name,
        description,
        websiteUrl,
      })

      await refreshWorkspaces()
      selectWorkspace(response.data.id)

      setName('')
      setDescription('')
      setWebsiteUrl('')
      setSuccess('Workspace created successfully.')
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to create workspace.',
      )
    }
  }

  return (
    <div>
      <div className="page-heading">
        <h1>Workspaces</h1>
        <p>Manage your organization's workspaces.</p>
      </div>

      <form className="data-form" onSubmit={handleCreate}>
        <h2>Create Workspace</h2>

        <label>Workspace Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          placeholder="e.g. PropertyBasket"
        />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          placeholder="Describe this workspace"
        />

        <label>Website URL</label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          maxLength={500}
          placeholder="https://example.com"
        />

        <button type="submit">Create Workspace</button>
      </form>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="data-section">
        <h2>Existing Workspaces</h2>

        {workspaces.length === 0 ? (
          <p>No workspaces found.</p>
        ) : (
          <div className="data-list">
            {workspaces.map((workspace) => (
              <div className="data-card" key={workspace.id}>
                <div>
                  <strong>{workspace.name}</strong>
                  <p>{workspace.description || 'No description'}</p>
                  <small>{workspace.websiteUrl || 'No website URL'}</small>
                </div>

                <button
                  className={
                    String(workspace.id) === selectedWorkspaceId
                      ? 'secondary-button selected-button'
                      : 'secondary-button'
                  }
                  onClick={() => selectWorkspace(workspace.id)}
                >
                  {String(workspace.id) === selectedWorkspaceId
                    ? 'Selected'
                    : 'Select'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
