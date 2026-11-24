
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useWorkspace } from '../../context/WorkspaceContext'

const propertyTypes = [
  'RESIDENTIAL',
  'COMMERCIAL',
  'LAND',
  'INDUSTRIAL',
  'MIXED_USE',
  'OTHER',
]

export default function Properties() {
  const { selectedWorkspaceId } = useWorkspace()

  const [properties, setProperties] = useState([])
  const [name, setName] = useState('')
  const [propertyType, setPropertyType] = useState('RESIDENTIAL')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('India')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadProperties = async () => {
    if (!selectedWorkspaceId) {
      setProperties([])
      return
    }

    const response = await api.get(
      `/workspaces/${selectedWorkspaceId}/properties`,
    )
    setProperties(response.data)
  }

  useEffect(() => {
    setError('')
    loadProperties().catch((err) =>
      setError(err.response?.data?.message || 'Unable to load properties.'),
    )
  }, [selectedWorkspaceId])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post(
        `/workspaces/${selectedWorkspaceId}/properties`,
        {
          name,
          propertyType,
          websiteUrl,
          city,
          country,
          status: 'ACTIVE',
        },
      )

      await loadProperties()

      setName('')
      setWebsiteUrl('')
      setCity('')
      setSuccess('Property created successfully.')
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to create property.',
      )
    }
  }

  return (
    <div>
      <div className="page-heading">
        <h1>Properties</h1>
        <p>Manage properties belonging to the selected workspace.</p>
      </div>

      {!selectedWorkspaceId ? (
        <div className="empty-state">
          Select or create a workspace first.
        </div>
      ) : (
        <>
          <form className="data-form" onSubmit={handleCreate}>
            <h2>Add Property</h2>

            <label>Property Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={150}
              placeholder="e.g. PropertyBasket Whitefield"
            />

            <label>Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <label>Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />

            <label>City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
            />

            <label>Country</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />

            <button type="submit">Create Property</button>
          </form>

          <div className="data-section">
            <h2>Properties</h2>

            {properties.length === 0 ? (
              <p>No properties found in this workspace.</p>
            ) : (
              <div className="data-list">
                {properties.map((property) => (
                  <div className="data-card" key={property.id}>
                    <div>
                      <strong>{property.name}</strong>
                      <p>{property.propertyType} · {property.status}</p>
                      <small>
                        {[property.city, property.country]
                          .filter(Boolean)
                          .join(', ')}
                      </small>
                    </div>
                    <span className="record-id">#{property.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  )
}
