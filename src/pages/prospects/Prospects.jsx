import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { useWorkspace } from '../../context/WorkspaceContext'
import './ProspectsAI.css'
import OutreachDrafts from './OutreachDrafts'

const categories = [
  'REAL_ESTATE',
  'LOCAL_PUBLICATION',
  'HOME_LIFESTYLE',
  'FINANCE',
  'ARCHITECTURE',
  'DIRECTORY',
  'OTHER',
]

const localities = [
  'WHITEFIELD',
  'SARJAPUR',
  'BENGALURU',
  'KARNATAKA',
  'INDIA_WIDE',
  'OTHER',
]

const statuses = [
  'NEW',
  'TO_REVIEW',
  'QUALIFIED',
  'REJECTED',
  'CONTACTED',
  'LINK_ACQUIRED',
]

const discoverySources = [
  'MANUAL',
  'CSV',
  'APPROVED_PROVIDER',
  'OTHER',
]

const opportunityStatuses = [
  'NEW',
  'APPROVED',
  'REJECTED',
  'USED',
]

const scoringFactors = [
  { key: 'topicalFit', label: 'Topical fit', maximum: 35 },
  { key: 'audienceFit', label: 'Audience fit', maximum: 20 },
  { key: 'geographicFit', label: 'Geographic fit', maximum: 15 },
  { key: 'contentRelevance', label: 'Content relevance', maximum: 15 },
  { key: 'evidenceQuality', label: 'Evidence quality', maximum: 15 },
]

const initialForm = {
  websiteName: '',
  domain: '',
  sourceUrl: '',
  category: 'REAL_ESTATE',
  localityRelevance: 'BENGALURU',
  contactName: '',
  contactEmail: '',
  discoverySource: 'MANUAL',
  status: 'NEW',
  notes: '',
  sourceEvidence: '',
}

function displayLabel(value) {
  if (!value) return '—'

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    fallback
  )
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getNumericValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getScoreWidth(value, maximum) {
  const score = getNumericValue(value)
  return `${Math.min(Math.max((score / maximum) * 100, 0), 100)}%`
}

function getPriorityClass(priority) {
  return `prospect-ai-priority prospect-ai-priority-${String(
    priority || 'LOW',
  ).toLowerCase()}`
}

export default function Prospects() {
  const { selectedWorkspaceId } = useWorkspace()

  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState(initialForm)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [locality, setLocality] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvMessage, setCsvMessage] = useState('')
  const [csvError, setCsvError] = useState('')

  // AI Prospect Intelligence state
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [opportunities, setOpportunities] = useState([])

  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false)
  const [analysisSubmitting, setAnalysisSubmitting] = useState(false)
  const [generatingOpportunities, setGeneratingOpportunities] =
    useState(false)

  const [analysisError, setAnalysisError] = useState('')
  const [opportunitiesError, setOpportunitiesError] = useState('')
  const [aiActionError, setAiActionError] = useState('')
  const [aiSuccess, setAiSuccess] = useState('')

  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [ideaCount, setIdeaCount] = useState('3')
  const [updatingOpportunityId, setUpdatingOpportunityId] = useState(null)
  const [deletingOpportunityId, setDeletingOpportunityId] = useState(null)
  const [aiRefreshKey, setAiRefreshKey] = useState(0)

  const basePath = selectedWorkspaceId
    ? `/workspaces/${selectedWorkspaceId}/prospects`
    : null

  const selectedProspectId = selectedProspect?.id

  const campaignIds = Array.isArray(selectedProspect?.campaignIds)
    ? selectedProspect.campaignIds
    : []

  const campaignNames = Array.isArray(selectedProspect?.campaignNames)
    ? selectedProspect.campaignNames
    : []

  const analysisDetails = analysis?.analysis || {}
  const scoringBreakdown = analysisDetails.scoringBreakdown || {}

  // Reset AI selection when the active workspace changes.
  useEffect(() => {
    setSelectedProspect(null)
    setSelectedCampaignId('')
    setAnalysis(null)
    setOpportunities([])
    setAnalysisError('')
    setOpportunitiesError('')
    setAiActionError('')
    setAiSuccess('')
  }, [selectedWorkspaceId])

  const loadProspects = useCallback(async () => {
    if (!basePath) {
      setProspects([])
      setTotalPages(0)
      setTotalElements(0)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.get(basePath, {
        params: {
          search: search || undefined,
          category: category || undefined,
          locality: locality || undefined,
          status: status || undefined,
          page,
          size: 10,
          sortBy: 'updatedAt',
          direction: 'DESC',
        },
      })

      const data = response.data

      setProspects(data.content || [])
      setTotalPages(data.totalPages || 0)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load prospects.'))
    } finally {
      setLoading(false)
    }
  }, [basePath, search, category, locality, status, page])

  useEffect(() => {
    loadProspects()
  }, [loadProspects])

  // Keep the selected prospect details up to date after directory reloads.
  useEffect(() => {
    if (!selectedProspectId) return

    const updatedProspect = prospects.find(
      (prospect) => prospect.id === selectedProspectId,
    )

    if (updatedProspect) {
      setSelectedProspect(updatedProspect)
    }
  }, [prospects, selectedProspectId])

  // Load the latest analysis and saved opportunities for the selected prospect.
  useEffect(() => {
    if (!basePath || !selectedProspectId) {
      setAnalysis(null)
      setOpportunities([])
      setAnalysisLoading(false)
      setOpportunitiesLoading(false)
      setAnalysisError('')
      setOpportunitiesError('')
      return undefined
    }

    let active = true

    const prospectPath = `${basePath}/${selectedProspectId}`

    setAnalysis(null)
    setOpportunities([])
    setAnalysisError('')
    setOpportunitiesError('')
    setAnalysisLoading(true)
    setOpportunitiesLoading(true)

    api
      .get(`${prospectPath}/ai-analysis/latest`)
      .then((response) => {
        if (active) {
          setAnalysis(response.data || null)
        }
      })
      .catch((err) => {
        if (!active) return

        // A 404 means this prospect has not been analysed yet.
        if (err.response?.status === 404) {
          setAnalysis(null)
        } else {
          setAnalysisError(
            getErrorMessage(err, 'Unable to load the latest AI analysis.'),
          )
        }
      })
      .finally(() => {
        if (active) {
          setAnalysisLoading(false)
        }
      })

    api
      .get(`${prospectPath}/content-opportunities`)
      .then((response) => {
        if (!active) return

        const data = response.data

        setOpportunities(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.content)
              ? data.content
              : [],
        )
      })
      .catch((err) => {
        if (active) {
          setOpportunitiesError(
            getErrorMessage(
              err,
              'Unable to load saved content opportunities.',
            ),
          )
        }
      })
      .finally(() => {
        if (active) {
          setOpportunitiesLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [basePath, selectedProspectId, aiRefreshKey])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(0)
    setSearch(searchInput.trim())
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await api.post(basePath, form)
      setForm(initialForm)
      setSuccess('Prospect created successfully.')
      setPage(0)
      await loadProspects()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create prospect.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async (prospectId) => {
    const confirmed = window.confirm(
      'Are you sure you want to archive this prospect?',
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await api.delete(`${basePath}/${prospectId}`)

      if (selectedProspect?.id === prospectId) {
        setSelectedProspect(null)
      }

      setSuccess('Prospect archived successfully.')
      await loadProspects()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to archive prospect.'))
    }
  }

  const downloadTemplate = async () => {
    setCsvError('')
    setCsvMessage('')

    try {
      const response = await api.get(`${basePath}/csv-import/template`, {
        responseType: 'blob',
      })

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: 'text/csv' }),
      )

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = 'propertylink-prospects-template.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)

      setCsvMessage('CSV template downloaded.')
    } catch (err) {
      setCsvError(getErrorMessage(err, 'Unable to download CSV template.'))
    }
  }

  const previewCsv = async () => {
    if (!csvFile) {
      setCsvError('Please select a CSV file first.')
      return
    }

    setCsvError('')
    setCsvMessage('')
    setCsvPreview(null)
    setCsvLoading(true)

    try {
      const data = new FormData()
      data.append('file', csvFile)

      const response = await api.post(
        `${basePath}/csv-import/preview`,
        data,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )

      setCsvPreview(response.data)
    } catch (err) {
      setCsvError(getErrorMessage(err, 'Unable to preview CSV file.'))
    } finally {
      setCsvLoading(false)
    }
  }

  const confirmCsvImport = async () => {
    if (!csvFile || !csvPreview?.checksum) {
      setCsvError('Please preview the CSV before confirming the import.')
      return
    }

    setCsvError('')
    setCsvMessage('')
    setCsvLoading(true)

    try {
      const data = new FormData()
      data.append('file', csvFile)
      data.append('checksum', csvPreview.checksum)

      const response = await api.post(
        `${basePath}/csv-import/confirm`,
        data,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      )

      const result = response.data

      setCsvMessage(
        `Import completed: ${result.importedRows} imported, ${result.duplicateRows} duplicates, ${result.invalidRows} invalid, ${result.failedRows} failed.`,
      )

      setCsvFile(null)
      setCsvPreview(null)

      const fileInput = document.getElementById('prospect-csv-file')
      if (fileInput) fileInput.value = ''

      await loadProspects()
    } catch (err) {
      setCsvError(getErrorMessage(err, 'Unable to confirm CSV import.'))
    } finally {
      setCsvLoading(false)
    }
  }

  // Select a prospect for AI analysis and opportunity generation.
  const handleSelectProspect = (event) => {
    const prospectId = event.target.value

    const prospect = prospects.find(
      (item) => String(item.id) === prospectId,
    )

    setSelectedProspect(prospect || null)
    setSelectedCampaignId('')
    setAiActionError('')
    setAiSuccess('')
  }

  // POST /ai-analysis
  const handleRunAnalysis = async () => {
    if (!selectedProspectId) return

    setAnalysisSubmitting(true)
    setAiActionError('')
    setAiSuccess('')

    try {
      const response = await api.post(
        `${basePath}/${selectedProspectId}/ai-analysis`,
      )

      setAnalysis(response.data || null)
      setAiSuccess('AI prospect analysis completed and saved.')
    } catch (err) {
      setAiActionError(
        getErrorMessage(err, 'Unable to run AI prospect analysis.'),
      )
    } finally {
      setAnalysisSubmitting(false)
    }
  }

  // POST /content-opportunities/generate
  const handleGenerateOpportunities = async (event) => {
    event.preventDefault()

    if (!selectedProspectId) return

    setGeneratingOpportunities(true)
    setAiActionError('')
    setAiSuccess('')

    const requestBody = {
      numberOfIdeas: Number(ideaCount),
    }

    if (selectedCampaignId) {
      requestBody.campaignId = Number(selectedCampaignId)
    }

    try {
      await api.post(
        `${basePath}/${selectedProspectId}/content-opportunities/generate`,
        requestBody,
      )

      setAiSuccess('Content opportunities generated and saved.')
      setAiRefreshKey((current) => current + 1)
    } catch (err) {
      setAiActionError(
        getErrorMessage(err, 'Unable to generate content opportunities.'),
      )
    } finally {
      setGeneratingOpportunities(false)
    }
  }

  // PATCH /content-opportunities/{opportunityId}/status
  const handleOpportunityStatusChange = async (
    opportunityId,
    nextStatus,
  ) => {
    if (!selectedProspectId) return

    setUpdatingOpportunityId(opportunityId)
    setAiActionError('')
    setAiSuccess('')

    try {
      await api.patch(
        `${basePath}/${selectedProspectId}/content-opportunities/${opportunityId}/status`,
        { status: nextStatus },
      )

      setOpportunities((current) =>
        current.map((opportunity) =>
          opportunity.id === opportunityId
            ? { ...opportunity, status: nextStatus }
            : opportunity,
        ),
      )

      setAiSuccess('Opportunity status updated.')
    } catch (err) {
      setAiActionError(
        getErrorMessage(err, 'Unable to update opportunity status.'),
      )
    } finally {
      setUpdatingOpportunityId(null)
    }
  }

  // DELETE /content-opportunities/{opportunityId}
  const handleDeleteOpportunity = async (opportunityId) => {
    if (!selectedProspectId) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this content opportunity?',
    )

    if (!confirmed) return

    setDeletingOpportunityId(opportunityId)
    setAiActionError('')
    setAiSuccess('')

    try {
      await api.delete(
        `${basePath}/${selectedProspectId}/content-opportunities/${opportunityId}`,
      )

      setOpportunities((current) =>
        current.filter((opportunity) => opportunity.id !== opportunityId),
      )

      setAiSuccess('Content opportunity deleted.')
    } catch (err) {
      setAiActionError(
        getErrorMessage(err, 'Unable to delete content opportunity.'),
      )
    } finally {
      setDeletingOpportunityId(null)
    }
  }

  const refreshAiData = () => {
    setAiRefreshKey((current) => current + 1)
    setAiActionError('')
    setAiSuccess('')
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="page-heading">
        <h1>Prospects</h1>
        <div className="empty-state">
          Select or create a workspace first.
        </div>
      </div>
    )
  }

  return (
    <div className="prospects-page">
      <div className="page-heading">
        <h1>Prospects</h1>
        <p>Discover, organize and manage backlink opportunities.</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <section className="data-section prospect-section">
        <h2>Add New Prospect</h2>

        <form className="prospect-form" onSubmit={handleCreate}>
          <div className="prospect-form-grid">
            <div>
              <label>Website Name</label>
              <input
                name="websiteName"
                value={form.websiteName}
                onChange={updateField}
                placeholder="e.g. Bangalore Property Times"
                maxLength={200}
              />
            </div>

            <div>
              <label>Domain *</label>
              <input
                name="domain"
                value={form.domain}
                onChange={updateField}
                placeholder="example.com"
                required
                maxLength={255}
              />
            </div>

            <div>
              <label>Source URL</label>
              <input
                name="sourceUrl"
                type="url"
                value={form.sourceUrl}
                onChange={updateField}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label>Category</label>
              <select
                name="category"
                value={form.category}
                onChange={updateField}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {displayLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Locality Relevance</label>
              <select
                name="localityRelevance"
                value={form.localityRelevance}
                onChange={updateField}
              >
                {localities.map((item) => (
                  <option key={item} value={item}>
                    {displayLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Discovery Source</label>
              <select
                name="discoverySource"
                value={form.discoverySource}
                onChange={updateField}
              >
                {discoverySources.map((item) => (
                  <option key={item} value={item}>
                    {displayLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Contact Name</label>
              <input
                name="contactName"
                value={form.contactName}
                onChange={updateField}
                placeholder="Contact person"
              />
            </div>

            <div>
              <label>Contact Email</label>
              <input
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={updateField}
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={updateField}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {displayLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="prospect-full-width">
              <label>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                rows={2}
                placeholder="Notes about this backlink opportunity"
              />
            </div>

            <div className="prospect-full-width">
              <label>Source Evidence</label>
              <textarea
                name="sourceEvidence"
                value={form.sourceEvidence}
                onChange={updateField}
                rows={2}
                placeholder="Why is this website a relevant prospect?"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Add Prospect'}
          </button>
        </form>
      </section>

      <section className="data-section prospect-section">
        <div className="prospect-section-heading">
          <div>
            <h2>Prospect Directory</h2>
            <p>{totalElements} prospects in this workspace</p>
          </div>
        </div>

        <form className="prospect-filters" onSubmit={handleSearch}>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search website name or domain..."
          />

          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {displayLabel(item)}
              </option>
            ))}
          </select>

          <select
            value={locality}
            onChange={(event) => {
              setLocality(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All localities</option>
            {localities.map((item) => (
              <option key={item} value={item}>
                {displayLabel(item)}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {displayLabel(item)}
              </option>
            ))}
          </select>

          <button type="submit">Search</button>
        </form>

        {loading ? (
          <div className="empty-state">Loading prospects...</div>
        ) : prospects.length === 0 ? (
          <div className="empty-state">
            No prospects found. Add one above or import a CSV file.
          </div>
        ) : (
          <>
            <div className="prospect-table-wrap">
              <table className="prospect-table">
                <thead>
                  <tr>
                    <th>Website</th>
                    <th>Category</th>
                    <th>Locality</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((prospect) => (
                    <tr key={prospect.id}>
                      <td>
                        <strong>
                          {prospect.websiteName || prospect.domain}
                        </strong>
                        <small>{prospect.domain}</small>
                      </td>
                      <td>{displayLabel(prospect.category)}</td>
                      <td>{displayLabel(prospect.localityRelevance)}</td>
                      <td>
                        <span className="prospect-status">
                          {displayLabel(prospect.status)}
                        </span>
                      </td>
                      <td>{displayLabel(prospect.discoverySource)}</td>
                      <td>
                        <div className="prospect-row-actions">
                          <button
                            type="button"
                            className="prospect-ai-select-button"
                            onClick={() => {
                              setSelectedProspect(prospect)
                              setSelectedCampaignId('')
                              setAiActionError('')
                              setAiSuccess('')
                            }}
                          >
                            AI Intelligence
                          </button>

                          <button
                            type="button"
                            className="prospect-archive-button"
                            onClick={() => handleArchive(prospect.id)}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="prospect-pagination">
              <span>
                Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
              <div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* AI PROSPECT INTELLIGENCE */}
      <section className="data-section prospect-section prospect-ai-section">
        <div className="prospect-section-heading prospect-ai-heading">
          <div>
            <span className="prospect-ai-eyebrow">AI-POWERED WORKFLOW</span>
            <h2>AI Prospect Intelligence</h2>
            <p>
              Evaluate prospect relevance and create actionable content
              opportunities.
            </p>
          </div>

          {selectedProspect && (
            <button
              type="button"
              className="secondary-button"
              onClick={refreshAiData}
              disabled={analysisLoading || opportunitiesLoading}
            >
              Refresh AI Data
            </button>
          )}
        </div>

        {prospects.length === 0 ? (
          <div className="empty-state">
            Add or import a prospect to start using AI Prospect Intelligence.
          </div>
        ) : (
          <>
            <div className="prospect-ai-selector">
              <div className="prospect-ai-selector-field">
                <label htmlFor="ai-prospect-selector">
                  Select a prospect
                </label>
                <select
                  id="ai-prospect-selector"
                  value={selectedProspectId || ''}
                  onChange={handleSelectProspect}
                >
                  <option value="">Choose a prospect...</option>
                  {prospects.map((prospect) => (
                    <option key={prospect.id} value={prospect.id}>
                      {prospect.websiteName || prospect.domain} (
                      {prospect.domain})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProspect && (
                <div className="prospect-ai-selected-details">
                  <strong>
                    {selectedProspect.websiteName ||
                      selectedProspect.domain}
                  </strong>
                  <span>{selectedProspect.domain}</span>
                  <span>
                    {displayLabel(selectedProspect.category)} ·{' '}
                    {displayLabel(selectedProspect.localityRelevance)}
                  </span>
                </div>
              )}
            </div>

            {!selectedProspect ? (
              <div className="prospect-ai-placeholder">
                <div className="prospect-ai-placeholder-icon">AI</div>
                <h3>Select a prospect to begin</h3>
                <p>
                  Choose a prospect above or use the AI Intelligence action in
                  the directory to load its analysis and saved opportunities.
                </p>
              </div>
            ) : (
              <>
                {aiActionError && (
                  <div className="error-message">{aiActionError}</div>
                )}

                {aiSuccess && (
                  <div className="success-message">{aiSuccess}</div>
                )}

                <div className="prospect-ai-analysis-panel">
                  <div className="prospect-ai-panel-heading">
                    <div>
                      <h3>AI Relevance Analysis</h3>
                      <p>
                        Review the latest saved assessment or run a fresh
                        analysis.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      disabled={analysisSubmitting || analysisLoading}
                    >
                      {analysisSubmitting
                        ? 'Analysing...'
                        : analysis
                          ? 'Run New Analysis'
                          : 'Analyse Prospect'}
                    </button>
                  </div>

                  {analysisError && (
                    <div className="error-message">{analysisError}</div>
                  )}

                  {analysisLoading ? (
                    <div className="empty-state">
                      Loading latest AI analysis...
                    </div>
                  ) : !analysis ? (
                    <div className="prospect-ai-empty-analysis">
                      <h4>No saved analysis yet</h4>
                      <p>
                        Run an analysis to evaluate topical fit, audience fit,
                        geographic relevance, content relevance, and evidence
                        quality.
                      </p>
                      <span>
                        The analysis uses the prospect and associated campaign
                        information available in PropertyLink AI.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="prospect-ai-score-overview">
                        <div className="prospect-ai-score-card">
                          <span className="prospect-ai-card-label">
                            RELEVANCE SCORE
                          </span>
                          <strong>
                            {analysis.relevanceScore ?? '—'}
                            <small>/100</small>
                          </strong>
                          <span className="prospect-ai-card-caption">
                            AI-assessed relevance
                          </span>
                        </div>

                        <div className="prospect-ai-analysis-meta">
                          <div>
                            <span>Confidence</span>
                            <strong>
                              {displayLabel(
                                analysis.confidenceLevel ||
                                  analysisDetails.confidenceLevel,
                              )}
                            </strong>
                          </div>
                          <div>
                            <span>Model</span>
                            <strong>{analysis.modelName || '—'}</strong>
                          </div>
                          <div>
                            <span>Analysed</span>
                            <strong>{formatDate(analysis.analyzedAt)}</strong>
                          </div>
                        </div>
                      </div>

                      {analysisDetails.summary && (
                        <div className="prospect-ai-content-block">
                          <h4>Summary</h4>
                          <p>{analysisDetails.summary}</p>
                        </div>
                      )}

                      {analysisDetails.topicalRelevance && (
                        <div className="prospect-ai-content-block">
                          <h4>Topical Relevance</h4>
                          <p>{analysisDetails.topicalRelevance}</p>
                        </div>
                      )}

                      <div className="prospect-ai-breakdown">
                        <div className="prospect-ai-subheading">
                          <h4>Scoring Breakdown</h4>
                          <span>Factor contribution</span>
                        </div>

                        {scoringFactors.map((factor) => {
                          const factorScore = getNumericValue(
                            scoringBreakdown[factor.key],
                          )

                          return (
                            <div
                              className="prospect-ai-factor"
                              key={factor.key}
                            >
                              <div className="prospect-ai-factor-label">
                                <span>{factor.label}</span>
                                <strong>
                                  {factorScore}/{factor.maximum}
                                </strong>
                              </div>
                              <div className="prospect-ai-progress-track">
                                <div
                                  className="prospect-ai-progress-fill"
                                  style={{
                                    width: getScoreWidth(
                                      factorScore,
                                      factor.maximum,
                                    ),
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="prospect-ai-two-column">
                        <div className="prospect-ai-content-block">
                          <h4>Strengths</h4>
                          {Array.isArray(analysisDetails.strengths) &&
                          analysisDetails.strengths.length > 0 ? (
                            <ul className="prospect-ai-list prospect-ai-list-positive">
                              {analysisDetails.strengths.map(
                                (item, index) => (
                                  <li key={`${index}-${item}`}>{item}</li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <p className="prospect-ai-muted">
                              No strengths listed.
                            </p>
                          )}
                        </div>

                        <div className="prospect-ai-content-block">
                          <h4>Weaknesses</h4>
                          {Array.isArray(analysisDetails.weaknesses) &&
                          analysisDetails.weaknesses.length > 0 ? (
                            <ul className="prospect-ai-list prospect-ai-list-warning">
                              {analysisDetails.weaknesses.map(
                                (item, index) => (
                                  <li key={`${index}-${item}`}>{item}</li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <p className="prospect-ai-muted">
                              No weaknesses listed.
                            </p>
                          )}
                        </div>
                      </div>

                      {analysisDetails.backlinkPotential && (
                        <div className="prospect-ai-content-block">
                          <h4>Backlink Potential</h4>
                          <p>{analysisDetails.backlinkPotential}</p>
                        </div>
                      )}

                      {analysisDetails.recommendedAction && (
                        <div className="prospect-ai-recommendation">
                          <span>RECOMMENDED ACTION</span>
                          <p>{analysisDetails.recommendedAction}</p>
                        </div>
                      )}

                      <div className="prospect-ai-content-block prospect-ai-evidence">
                        <h4>Evidence Limitations</h4>
                        {Array.isArray(
                          analysisDetails.evidenceLimitations,
                        ) &&
                        analysisDetails.evidenceLimitations.length > 0 ? (
                          <ul className="prospect-ai-list">
                            {analysisDetails.evidenceLimitations.map(
                              (item, index) => (
                                <li key={`${index}-${item}`}>{item}</li>
                              ),
                            )}
                          </ul>
                        ) : (
                          <p>No evidence limitations were returned.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="prospect-ai-opportunity-panel">
                  <div className="prospect-ai-panel-heading">
                    <div>
                      <h3>Content Opportunity Generator</h3>
                      <p>
                        Generate content ideas tailored to this prospect and
                        an associated campaign.
                      </p>
                    </div>
                  </div>

                  <form
                    className="prospect-ai-generation-form"
                    onSubmit={handleGenerateOpportunities}
                  >
                    <div>
                      <label htmlFor="ai-campaign-selector">
                        Campaign (optional)
                      </label>
                      <select
                        id="ai-campaign-selector"
                        value={selectedCampaignId}
                        onChange={(event) =>
                          setSelectedCampaignId(event.target.value)
                        }
                      >
                        <option value="">
                          Use all associated campaigns
                        </option>
                        {campaignIds.map((campaignId, index) => (
                          <option key={campaignId} value={campaignId}>
                            {campaignNames[index] ||
                              `Campaign #${campaignId}`}
                          </option>
                        ))}
                      </select>
                      {campaignIds.length === 0 && (
                        <small>
                          No associated campaigns are available for this
                          prospect.
                        </small>
                      )}
                    </div>

                    <div>
                      <label htmlFor="ai-idea-count">Number of ideas</label>
                      <select
                        id="ai-idea-count"
                        value={ideaCount}
                        onChange={(event) => setIdeaCount(event.target.value)}
                      >
                        {[1, 2, 3, 4, 5].map((count) => (
                          <option key={count} value={count}>
                            {count} {count === 1 ? 'idea' : 'ideas'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={generatingOpportunities}
                    >
                      {generatingOpportunities
                        ? 'Generating...'
                        : 'Generate Opportunities'}
                    </button>
                  </form>

                  {opportunitiesError && (
                    <div className="error-message">
                      {opportunitiesError}
                    </div>
                  )}

                  <div className="prospect-ai-opportunities-heading">
                    <div>
                      <h4>Saved Content Opportunities</h4>
                      <span>
                        {opportunities.length}{' '}
                        {opportunities.length === 1
                          ? 'opportunity'
                          : 'opportunities'}
                      </span>
                    </div>
                  </div>

                  {opportunitiesLoading ? (
                    <div className="empty-state">
                      Loading saved opportunities...
                    </div>
                  ) : opportunities.length === 0 ? (
                    <div className="prospect-ai-empty-analysis">
                      <h4>No content opportunities yet</h4>
                      <p>
                        Generate ideas to create a saved list of potential
                        articles, placements, and backlink angles for this
                        prospect.
                      </p>
                    </div>
                  ) : (
                    <div className="prospect-ai-opportunity-list">
                      {opportunities.map((opportunity) => (
                        <article
                          className="prospect-ai-opportunity-card"
                          key={opportunity.id}
                        >
                          <div className="prospect-ai-opportunity-top">
                            <div>
                              <span
                                className={getPriorityClass(
                                  opportunity.priority,
                                )}
                              >
                                {displayLabel(opportunity.priority)} Priority
                              </span>
                              <h4>{opportunity.title}</h4>
                              <span className="prospect-ai-format">
                                {displayLabel(opportunity.contentFormat)}
                              </span>
                            </div>

                            <div className="prospect-ai-opportunity-controls">
                              <label
                                htmlFor={`opportunity-status-${opportunity.id}`}
                              >
                                Status
                              </label>
                              <select
                                id={`opportunity-status-${opportunity.id}`}
                                value={opportunity.status || 'NEW'}
                                disabled={
                                  updatingOpportunityId === opportunity.id
                                }
                                onChange={(event) =>
                                  handleOpportunityStatusChange(
                                    opportunity.id,
                                    event.target.value,
                                  )
                                }
                              >
                                {opportunityStatuses.map((item) => (
                                  <option key={item} value={item}>
                                    {displayLabel(item)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {opportunity.suggestedAngle && (
                            <div className="prospect-ai-opportunity-detail">
                              <strong>Suggested angle</strong>
                              <p>{opportunity.suggestedAngle}</p>
                            </div>
                          )}

                          {opportunity.publisherRelevance && (
                            <div className="prospect-ai-opportunity-detail">
                              <strong>Publisher relevance</strong>
                              <p>{opportunity.publisherRelevance}</p>
                            </div>
                          )}

                          {opportunity.propertyConnection && (
                            <div className="prospect-ai-opportunity-detail">
                              <strong>Property connection</strong>
                              <p>{opportunity.propertyConnection}</p>
                            </div>
                          )}

                          {opportunity.backlinkPlacement && (
                            <div className="prospect-ai-opportunity-detail">
                              <strong>Backlink placement</strong>
                              <p>{opportunity.backlinkPlacement}</p>
                            </div>
                          )}

                          {opportunity.suggestedTargetUrl && (
                            <div className="prospect-ai-opportunity-detail">
                              <strong>Suggested target URL</strong>
                              <a
                                href={opportunity.suggestedTargetUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {opportunity.suggestedTargetUrl}
                              </a>
                            </div>
                          )}

                          <div className="prospect-ai-opportunity-footer">
                            <span>
                              Created {formatDate(opportunity.createdAt)}
                            </span>

                            <button
                              type="button"
                              className="prospect-ai-delete-button"
                              disabled={
                                deletingOpportunityId === opportunity.id
                              }
                              onClick={() =>
                                handleDeleteOpportunity(opportunity.id)
                              }
                            >
                              {deletingOpportunityId === opportunity.id
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <OutreachDrafts
                  key={selectedProspectId}
                  prospectPath={`${basePath}/${selectedProspectId}`}
                  campaignIds={campaignIds}
                  campaignNames={campaignNames}
                  opportunities={opportunities}
                />

                <p className="prospect-ai-disclaimer">
                  AI assessments are based on the prospect and campaign
                  information available in PropertyLink AI. They do not imply
                  that the website was crawled or independently verified.
                  Review evidence and limitations before making outreach
                  decisions.
                </p>
              </>
            )}
          </>
        )}
      </section>

      <section className="data-section prospect-section">
        <div className="prospect-section-heading">
          <div>
            <h2>CSV Import</h2>
            <p>
              Import multiple prospects with a review-before-confirm workflow.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={downloadTemplate}
          >
            Download CSV Template
          </button>
        </div>

        <div className="csv-upload-area">
          <label htmlFor="prospect-csv-file">Select CSV file</label>
          <input
            id="prospect-csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setCsvFile(event.target.files?.[0] || null)
              setCsvPreview(null)
              setCsvError('')
              setCsvMessage('')
            }}
          />

          {csvFile && <p>Selected: {csvFile.name}</p>}

          <button
            type="button"
            disabled={!csvFile || csvLoading}
            onClick={previewCsv}
          >
            {csvLoading ? 'Processing...' : 'Upload and Preview'}
          </button>
        </div>

        {csvError && <div className="error-message">{csvError}</div>}
        {csvMessage && <div className="success-message">{csvMessage}</div>}

        {csvPreview && (
          <div className="csv-preview">
            <h3>Import Preview</h3>

            <div className="csv-summary-grid">
              <div>
                <strong>{csvPreview.totalRows}</strong>
                <span>Total rows</span>
              </div>
              <div>
                <strong>{csvPreview.validRows}</strong>
                <span>Valid</span>
              </div>
              <div>
                <strong>{csvPreview.invalidRows}</strong>
                <span>Invalid</span>
              </div>
              <div>
                <strong>{csvPreview.duplicateRows}</strong>
                <span>Duplicates</span>
              </div>
            </div>

            <div className="prospect-table-wrap">
              <table className="prospect-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Domain</th>
                    <th>Preview status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(csvPreview.rows || []).map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>{row.prospect?.domain || '—'}</td>
                      <td>
                        {row.duplicate
                          ? 'Duplicate'
                          : row.valid
                            ? 'Valid'
                            : 'Invalid'}
                      </td>
                      <td>
                        {row.errors?.length
                          ? row.errors.join(', ')
                          : row.duplicate
                            ? 'Already exists'
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              disabled={csvLoading || csvPreview.validRows === 0}
              onClick={confirmCsvImport}
            >
              {csvLoading ? 'Importing...' : 'Confirm Import'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}