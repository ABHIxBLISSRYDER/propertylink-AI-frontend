
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useWorkspace } from '../../context/WorkspaceContext'

export default function Campaigns() {
  const { selectedWorkspaceId } = useWorkspace()

  const [properties, setProperties] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [propertyId, setPropertyId] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [keywords, setKeywords] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = async () => {
    if (!selectedWorkspaceId) {
      setProperties([])
      setCampaigns([])
      return
    }

    const [propertyResponse, campaignResponse] = await Promise.all([
      api.get(`/workspaces/${selectedWorkspaceId}/properties`),
      api.get(`/workspaces/${selectedWorkspaceId}/campaigns`),
    ])

    setProperties(propertyResponse.data)
    setCampaigns(campaignResponse.data)

    if (
      propertyResponse.data.length > 0 &&
      !propertyResponse.data.some(
        (property) => String(property.id) === propertyId,
      )
    ) {
      setPropertyId(String(propertyResponse.data[0].id))
    }
  }

  useEffect(() => {
    setError('')
    loadData().catch((err) =>
      setError(err.response?.data?.message || 'Unable to load campaigns.'),
    )
  }, [selectedWorkspaceId])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post(
        `/workspaces/${selectedWorkspaceId}/campaigns`,
        {
          propertyId: Number(propertyId),
          campaignName,
          targetKeywords: keywords
            .split('\n')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          websiteUrl,
        },
      )

      await loadData()

      setCampaignName('')
      setWebsiteUrl('')
      setKeywords('')
      setSuccess('SEO campaign created successfully.')
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to create SEO campaign.',
      )
    }
  }

  return (
    <div>
      <div className="page-heading">
        <h1>SEO Campaigns</h1>
        <p>Create and manage property SEO campaigns.</p>
      </div>

      {!selectedWorkspaceId ? (
        <div className="empty-state">
          Select or create a workspace first.
        </div>
      ) : (
        <>
          <form className="data-form" onSubmit={handleCreate}>
            <h2>Create SEO Campaign</h2>

            <label>Property</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              disabled={properties.length === 0}
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>

            <label>Campaign Name</label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              required
              placeholder="e.g. Whitefield SEO Campaign"
            />

            <label>Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />

            <label>Target Keywords (one per line)</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={5}
              placeholder={
                '2 BHK flats in Whitefield\nApartments in Whitefield'
              }
            />

            <button
              type="submit"
              disabled={properties.length === 0 || !propertyId}
            >
              Create Campaign
            </button>

            {properties.length === 0 && (
              <p>Create a property before creating a campaign.</p>
            )}
          </form>

          <div className="data-section">
            <h2>SEO Campaigns</h2>

            {campaigns.length === 0 ? (
              <p>No SEO campaigns found.</p>
            ) : (
              <div className="data-list">
                {campaigns.map((campaign) => (
                  <div className="data-card" key={campaign.id}>
                    <div>
                      <strong>{campaign.campaignName}</strong>
                      <p>Property: {campaign.propertyName}</p>
                      <small>
                        Status: {campaign.status} · Keywords:{' '}
                        {campaign.targetKeywords?.length || 0}
                      </small>
                    </div>
                    <span className="record-id">#{campaign.id}</span>
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
