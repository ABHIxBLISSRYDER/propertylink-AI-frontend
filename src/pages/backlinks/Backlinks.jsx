
import { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { useWorkspace } from '../../context/WorkspaceContext'

const statuses = [
  'PLANNED',
  'OUTREACH_SENT',
  'PENDING',
  'LOST',
  'REJECTED',
]

const initialForm = {
  campaignId: '',
  prospectId: '',
  sourceUrl: '',
  targetUrl: '',
  expectedAnchorText: '',
  status: 'PLANNED',
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

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

function displayBoolean(value) {
  return value ? 'Yes' : 'No'
}

// Convert a backend LocalDateTime string to datetime-local format.
// Do not use Date conversion here: LocalDateTime has no timezone.
function toDateTimeInput(value) {
  return value ? String(value).slice(0, 16) : ''
}

function getCurrentDateTimeInput() {
  const now = new Date()
  const localOffset = now.getTimezoneOffset() * 60000

  return new Date(now.getTime() - localOffset)
    .toISOString()
    .slice(0, 16)
}

export default function Backlinks() {
  const { selectedWorkspaceId } = useWorkspace()

  const [backlinks, setBacklinks] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [prospects, setProspects] = useState([])

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterProspect, setFilterProspect] = useState('')

  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // Manual verification state
  const [verifyingId, setVerifyingId] = useState(null)
  const [verificationResults, setVerificationResults] = useState({})
  const [verificationErrors, setVerificationErrors] = useState({})

  // Verification history state
  const [historyData, setHistoryData] = useState({})
  const [historyErrors, setHistoryErrors] = useState({})
  const [historyLoadingId, setHistoryLoadingId] = useState(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)

  // Verification scheduling state
  const [schedulePanelId, setSchedulePanelId] = useState(null)
  const [scheduleInputs, setScheduleInputs] = useState({})
  const [scheduleErrors, setScheduleErrors] = useState({})
  const [scheduleSavingId, setScheduleSavingId] = useState(null)
  const [scheduleClearingId, setScheduleClearingId] = useState(null)

  const basePath = selectedWorkspaceId
    ? `/workspaces/${selectedWorkspaceId}/backlinks`
    : null

  const loadRelatedData = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setCampaigns([])
      setProspects([])
      return
    }

    try {
      const [campaignResponse, prospectResponse] = await Promise.all([
        api.get(`/workspaces/${selectedWorkspaceId}/campaigns`),
        api.get(`/workspaces/${selectedWorkspaceId}/prospects`, {
          params: {
            page: 0,
            size: 100,
            sortBy: 'updatedAt',
            direction: 'DESC',
          },
        }),
      ])

      setCampaigns(campaignResponse.data || [])
      setProspects(prospectResponse.data.content || [])
    } catch (err) {
      setError(
        getErrorMessage(err, 'Unable to load campaigns and prospects.'),
      )
    }
  }, [selectedWorkspaceId])

  const loadBacklinks = useCallback(async () => {
    if (!basePath) {
      setBacklinks([])
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
          status: filterStatus || undefined,
          campaignId: filterCampaign || undefined,
          prospectId: filterProspect || undefined,
          page,
          size: 10,
          sortBy: 'updatedAt',
          sortDir: 'desc',
        },
      })

      const data = response.data

      setBacklinks(data.content || [])
      setTotalPages(data.totalPages || 0)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load backlinks.'))
    } finally {
      setLoading(false)
    }
  }, [
    basePath,
    search,
    filterStatus,
    filterCampaign,
    filterProspect,
    page,
  ])

  useEffect(() => {
    setError('')
    setSuccess('')
    setEditingId(null)
    setForm(initialForm)
    setPage(0)

    setVerificationResults({})
    setVerificationErrors({})

    setHistoryData({})
    setHistoryErrors({})
    setHistoryLoadingId(null)
    setExpandedHistoryId(null)

    setSchedulePanelId(null)
    setScheduleInputs({})
    setScheduleErrors({})

    loadRelatedData()
  }, [loadRelatedData])

  useEffect(() => {
    loadBacklinks()
  }, [loadBacklinks])

  // ==========================================
  // MANUAL BACKLINK VERIFICATION
  // ==========================================

  const handleVerify = async (backlinkId) => {
    if (verifyingId !== null) return

    setVerifyingId(backlinkId)

    setVerificationErrors((current) => ({
      ...current,
      [backlinkId]: '',
    }))

    try {
      const response = await api.post(
        `${basePath}/${backlinkId}/verification`,
      )

      setVerificationResults((current) => ({
        ...current,
        [backlinkId]: response.data,
      }))

      // A new verification means cached history is outdated.
      setHistoryData((current) => ({
        ...current,
        [backlinkId]: undefined,
      }))

      setSuccess(`Backlink #${backlinkId} verification completed.`)

      await loadBacklinks()
    } catch (err) {
      setVerificationErrors((current) => ({
        ...current,
        [backlinkId]: getErrorMessage(
          err,
          'Unable to verify this backlink.',
        ),
      }))
    } finally {
      setVerifyingId(null)
    }
  }

  // ==========================================
  // VERIFICATION HISTORY
  // ==========================================

  const loadHistory = async (backlinkId, forceRefresh = false) => {
    if (!forceRefresh && historyData[backlinkId] !== undefined) {
      return
    }

    setHistoryErrors((current) => ({
      ...current,
      [backlinkId]: '',
    }))

    setHistoryLoadingId(backlinkId)

    try {
      const response = await api.get(
        `${basePath}/${backlinkId}/verification/history`,
      )

      setHistoryData((current) => ({
        ...current,
        [backlinkId]: Array.isArray(response.data)
          ? response.data
          : [],
      }))
    } catch (err) {
      setHistoryErrors((current) => ({
        ...current,
        [backlinkId]: getErrorMessage(
          err,
          'Unable to load verification history.',
        ),
      }))
    } finally {
      setHistoryLoadingId(null)
    }
  }

  const handleViewHistory = async (backlinkId) => {
    if (expandedHistoryId === backlinkId) {
      setExpandedHistoryId(null)
      return
    }

    setExpandedHistoryId(backlinkId)
    await loadHistory(backlinkId)
  }

  const handleRefreshHistory = async (backlinkId) => {
    // Keep the history panel open while reloading its data.
    setExpandedHistoryId(backlinkId)
    await loadHistory(backlinkId, true)
  }

  // ==========================================
  // VERIFICATION SCHEDULING
  // ==========================================

  const handleOpenSchedule = (backlink) => {
    if (schedulePanelId === backlink.id) {
      setSchedulePanelId(null)
      return
    }

    setSchedulePanelId(backlink.id)

    setScheduleInputs((current) => ({
      ...current,
      [backlink.id]: toDateTimeInput(backlink.nextCheckAt),
    }))

    setScheduleErrors((current) => ({
      ...current,
      [backlink.id]: '',
    }))
  }

  const handleScheduleInputChange = (backlinkId, value) => {
    setScheduleInputs((current) => ({
      ...current,
      [backlinkId]: value,
    }))

    setScheduleErrors((current) => ({
      ...current,
      [backlinkId]: '',
    }))
  }

  const handleSaveSchedule = async (backlinkId) => {
    const selectedDateTime = scheduleInputs[backlinkId]

    if (!selectedDateTime) {
      setScheduleErrors((current) => ({
        ...current,
        [backlinkId]: 'Please select a date and time.',
      }))
      return
    }

    const selectedTimestamp = new Date(selectedDateTime).getTime()

    if (
      Number.isNaN(selectedTimestamp) ||
      selectedTimestamp <= Date.now()
    ) {
      setScheduleErrors((current) => ({
        ...current,
        [backlinkId]: 'Please select a future date and time.',
      }))
      return
    }

    setScheduleSavingId(backlinkId)

    setScheduleErrors((current) => ({
      ...current,
      [backlinkId]: '',
    }))

    setError('')
    setSuccess('')

    try {
      // Java LocalDateTime expects a timezone-free value.
      const payload = {
        nextCheckAt: `${selectedDateTime}:00`,
      }

      const response = await api.put(
        `${basePath}/${backlinkId}/verification/schedule`,
        payload,
      )

      setSuccess(
        response.data?.message ||
          `Verification schedule saved for backlink #${backlinkId}.`,
      )

      await loadBacklinks()
    } catch (err) {
      setScheduleErrors((current) => ({
        ...current,
        [backlinkId]: getErrorMessage(
          err,
          'Unable to save verification schedule.',
        ),
      }))
    } finally {
      setScheduleSavingId(null)
    }
  }

  const handleClearSchedule = async (backlinkId) => {
    setScheduleClearingId(backlinkId)

    setScheduleErrors((current) => ({
      ...current,
      [backlinkId]: '',
    }))

    setError('')
    setSuccess('')

    try {
      const response = await api.delete(
        `${basePath}/${backlinkId}/verification/schedule`,
      )

      setScheduleInputs((current) => ({
        ...current,
        [backlinkId]: '',
      }))

      setSuccess(
        response.data?.message ||
          `Verification schedule cleared for backlink #${backlinkId}.`,
      )

      await loadBacklinks()
    } catch (err) {
      setScheduleErrors((current) => ({
        ...current,
        [backlinkId]: getErrorMessage(
          err,
          'Unable to clear verification schedule.',
        ),
      }))
    } finally {
      setScheduleClearingId(null)
    }
  }

  // ==========================================
  // BACKLINK FORM
  // ==========================================

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(initialForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.campaignId) {
      setError('Please select an SEO campaign.')
      return
    }

    setSubmitting(true)

    const payload = {
      campaignId: Number(form.campaignId),
      prospectId: form.prospectId ? Number(form.prospectId) : null,
      sourceUrl: form.sourceUrl.trim(),
      targetUrl: form.targetUrl.trim(),
      expectedAnchorText: form.expectedAnchorText.trim(),
      status: form.status || null,
    }

    try {
      if (editingId) {
        await api.put(`${basePath}/${editingId}`, payload)
        setSuccess('Backlink updated successfully.')
      } else {
        await api.post(basePath, payload)
        setSuccess('Backlink created successfully.')
      }

      resetForm()
      setPage(0)
      await loadBacklinks()
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          editingId
            ? 'Unable to update backlink.'
            : 'Unable to create backlink.',
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (backlink) => {
    setError('')
    setSuccess('')
    setEditingId(backlink.id)

    setForm({
      campaignId: String(backlink.campaignId),
      prospectId: backlink.prospectId
        ? String(backlink.prospectId)
        : '',
      sourceUrl: backlink.sourceUrl || '',
      targetUrl: backlink.targetUrl || '',
      expectedAnchorText: backlink.expectedAnchorText || '',
      status: backlink.status === 'FOUND' ? '' : backlink.status,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (backlinkId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this backlink?',
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await api.delete(`${basePath}/${backlinkId}`)
      setSuccess('Backlink deleted successfully.')

      if (editingId === backlinkId) {
        resetForm()
      }

      setHistoryData((current) => {
        const updated = { ...current }
        delete updated[backlinkId]
        return updated
      })

      setVerificationResults((current) => {
        const updated = { ...current }
        delete updated[backlinkId]
        return updated
      })

      setScheduleInputs((current) => {
        const updated = { ...current }
        delete updated[backlinkId]
        return updated
      })

      if (schedulePanelId === backlinkId) {
        setSchedulePanelId(null)
      }

      if (expandedHistoryId === backlinkId) {
        setExpandedHistoryId(null)
      }

      await loadBacklinks()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete backlink.'))
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(0)
    setSearch(searchInput.trim())
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setFilterStatus('')
    setFilterCampaign('')
    setFilterProspect('')
    setPage(0)
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="page-heading">
        <h1>Backlinks</h1>
        <div className="empty-state">
          Select or create a workspace first.
        </div>
      </div>
    )
  }

  return (
    <div className="backlinks-page">
      <div className="page-heading">
        <h1>Backlinks</h1>
        <p>
          Track backlink opportunities across your SEO campaigns.
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* ADD / EDIT BACKLINK */}

      <section className="data-section prospect-section">
        <div className="prospect-section-heading">
          <div>
            <h2>{editingId ? 'Edit Backlink' : 'Add New Backlink'}</h2>
            <p>
              Connect a backlink opportunity to an SEO campaign and prospect.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
            >
              Cancel Editing
            </button>
          )}
        </div>

        <form className="prospect-form" onSubmit={handleSubmit}>
          <div className="prospect-form-grid">
            <div>
              <label>SEO Campaign *</label>
              <select
                name="campaignId"
                value={form.campaignId}
                onChange={updateField}
                required
              >
                <option value="">Select campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.campaignName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Related Prospect (Optional)</label>
              <select
                name="prospectId"
                value={form.prospectId}
                onChange={updateField}
              >
                <option value="">No prospect linked</option>
                {prospects.map((prospect) => (
                  <option key={prospect.id} value={prospect.id}>
                    {prospect.domain}
                  </option>
                ))}
              </select>
            </div>

            <div className="prospect-full-width">
              <label>Source URL *</label>
              <input
                name="sourceUrl"
                type="url"
                value={form.sourceUrl}
                onChange={updateField}
                placeholder="https://example.com/your-article"
                maxLength={1000}
                required
              />
            </div>

            <div className="prospect-full-width">
              <label>Target URL *</label>
              <input
                name="targetUrl"
                type="url"
                value={form.targetUrl}
                onChange={updateField}
                placeholder="https://yourpropertywebsite.com"
                maxLength={1000}
                required
              />
            </div>

            <div>
              <label>Expected Anchor Text *</label>
              <input
                name="expectedAnchorText"
                value={form.expectedAnchorText}
                onChange={updateField}
                placeholder="e.g. 2 BHK flats in Whitefield"
                maxLength={500}
                required
              />
            </div>

            <div>
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={updateField}
              >
                {!form.status && editingId && (
                  <option value="">
                    Keep verification status unchanged
                  </option>
                )}

                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {displayLabel(item)}
                  </option>
                ))}
              </select>

              {editingId && !form.status && (
                <small className="backlink-field-note">
                  This backlink has verification-managed status FOUND.
                  Saving without changing status will preserve it.
                </small>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || campaigns.length === 0}
          >
            {submitting
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Add Backlink'}
          </button>

          {campaigns.length === 0 && (
            <p className="backlink-field-note">
              Create an SEO campaign before adding backlinks.
            </p>
          )}
        </form>
      </section>

      {/* BACKLINK DIRECTORY */}

      <section className="data-section prospect-section">
        <div className="prospect-section-heading">
          <div>
            <h2>Backlink Directory</h2>
            <p>{totalElements} backlinks in this workspace</p>
          </div>
        </div>

        <form
          className="prospect-filters backlink-filters"
          onSubmit={handleSearch}
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search URLs, anchor text, campaign or domain..."
          />

          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All statuses</option>

            {[...statuses, 'FOUND'].map((item) => (
              <option key={item} value={item}>
                {displayLabel(item)}
              </option>
            ))}
          </select>

          <select
            value={filterCampaign}
            onChange={(event) => {
              setFilterCampaign(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All campaigns</option>

            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.campaignName}
              </option>
            ))}
          </select>

          <select
            value={filterProspect}
            onChange={(event) => {
              setFilterProspect(event.target.value)
              setPage(0)
            }}
          >
            <option value="">All prospects</option>

            {prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.domain}
              </option>
            ))}
          </select>

          <button type="submit">Search</button>

          <button
            type="button"
            className="secondary-button"
            onClick={clearFilters}
          >
            Clear
          </button>
        </form>

        {loading ? (
          <div className="empty-state">Loading backlinks...</div>
        ) : backlinks.length === 0 ? (
          <div className="empty-state">
            No backlinks found. Add your first backlink opportunity above.
          </div>
        ) : (
          <>
            <div className="prospect-table-wrap">
              <table className="prospect-table backlink-table">
                <thead>
                  <tr>
                    <th>Source Website</th>
                    <th>Target URL</th>
                    <th>Campaign</th>
                    <th>Prospect</th>
                    <th>Anchor Text</th>
                    <th>Status</th>
                    <th>Next Check</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {backlinks.map((backlink) => (
                    <tr key={backlink.id}>
                      <td>
                        <a
                          href={backlink.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {backlink.sourceUrl}
                        </a>
                      </td>

                      <td>
                        <a
                          href={backlink.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {backlink.targetUrl}
                        </a>
                      </td>

                      <td>{backlink.campaignName || '—'}</td>
                      <td>{backlink.prospectDomain || '—'}</td>
                      <td>{backlink.expectedAnchorText}</td>

                      <td>
                        <span className="prospect-status">
                          {displayLabel(backlink.status)}
                        </span>
                      </td>

                      <td>
                        {backlink.nextCheckAt
                          ? formatDate(backlink.nextCheckAt)
                          : 'Not scheduled'}
                      </td>

                      <td>
                        <div className="backlink-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={verifyingId !== null}
                            onClick={() => handleVerify(backlink.id)}
                          >
                            {verifyingId === backlink.id
                              ? 'Verifying...'
                              : 'Verify Now'}
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleOpenSchedule(backlink)}
                          >
                            {schedulePanelId === backlink.id
                              ? 'Hide Schedule'
                              : 'Schedule'}
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleViewHistory(backlink.id)}
                            disabled={historyLoadingId === backlink.id}
                          >
                            {historyLoadingId === backlink.id
                              ? 'Loading...'
                              : expandedHistoryId === backlink.id
                                ? 'Hide History'
                                : 'View History'}
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleEdit(backlink)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="prospect-archive-button"
                            onClick={() => handleDelete(backlink.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SCHEDULING PANEL */}

            {backlinks.map((backlink) => {
              if (schedulePanelId !== backlink.id) return null

              const scheduleError = scheduleErrors[backlink.id]
              const scheduleInput = scheduleInputs[backlink.id] || ''
              const isSaving = scheduleSavingId === backlink.id
              const isClearing = scheduleClearingId === backlink.id

              return (
                <section
                  key={`schedule-${backlink.id}`}
                  className="data-section prospect-section"
                >
                  <div className="prospect-section-heading">
                    <div>
                      <h3>
                        Verification Schedule — Backlink #{backlink.id}
                      </h3>
                      <p>
                        Set or update the next verification date and time.
                      </p>
                    </div>
                  </div>

                  <p>
                    <strong>Current schedule:</strong>{' '}
                    {backlink.nextCheckAt
                      ? formatDate(backlink.nextCheckAt)
                      : 'No verification scheduled'}
                  </p>

                  <div className="prospect-form">
                    <div className="prospect-form-grid">
                      <div>
                        <label>Next Verification Date & Time</label>

                        <input
                          type="datetime-local"
                          value={scheduleInput}
                          min={getCurrentDateTimeInput()}
                          onChange={(event) =>
                            handleScheduleInputChange(
                              backlink.id,
                              event.target.value,
                            )
                          }
                        />

                        <small className="backlink-field-note">
                          Select a future date and time.
                        </small>
                      </div>
                    </div>

                    {scheduleError && (
                      <div className="error-message">
                        {scheduleError}
                      </div>
                    )}

                    <div className="backlink-actions">
                      <button
                        type="button"
                        disabled={isSaving || isClearing}
                        onClick={() => handleSaveSchedule(backlink.id)}
                      >
                        {isSaving
                          ? 'Saving Schedule...'
                          : backlink.nextCheckAt
                            ? 'Update Schedule'
                            : 'Save Schedule'}
                      </button>

                      {backlink.nextCheckAt && (
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={isSaving || isClearing}
                          onClick={() => handleClearSchedule(backlink.id)}
                        >
                          {isClearing
                            ? 'Clearing...'
                            : 'Clear Schedule'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={isSaving || isClearing}
                        onClick={() => setSchedulePanelId(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </section>
              )
            })}

            {/* CURRENT VERIFICATION RESULTS */}

            {backlinks.map((backlink) => {
              const result = verificationResults[backlink.id]
              const verificationError =
                verificationErrors[backlink.id]

              if (!result && !verificationError) return null

              return (
                <section
                  key={`verification-${backlink.id}`}
                  className="data-section prospect-section"
                >
                  <div className="prospect-section-heading">
                    <div>
                      <h3>
                        Verification Result — Backlink #{backlink.id}
                      </h3>
                      <p>
                        {result
                          ? `Checked ${formatDate(result.checkedAt)}`
                          : 'Verification failed'}
                      </p>
                    </div>
                  </div>

                  {verificationError && (
                    <div className="error-message">
                      {verificationError}
                    </div>
                  )}

                  {result && (
                    <>
                      <p>
                        <strong>Result:</strong>{' '}
                        {displayLabel(result.status)}
                      </p>

                      <p>
                        <strong>HTTP status:</strong>{' '}
                        {result.pageHttpStatus ?? 'Unavailable'}
                      </p>

                      <p>
                        <strong>Backlink found:</strong>{' '}
                        {displayBoolean(result.backlinkFound)}
                      </p>

                      <p>
                        <strong>Target matched:</strong>{' '}
                        {displayBoolean(result.targetMatched)}
                      </p>

                      <p>
                        <strong>Actual URL:</strong>{' '}
                        {result.actualHref || '—'}
                      </p>

                      <p>
                        <strong>Actual anchor text:</strong>{' '}
                        {result.anchorText || '—'}
                      </p>

                      <p>
                        <strong>Expected anchor text:</strong>{' '}
                        {backlink.expectedAnchorText}
                      </p>

                      <p>
                        <strong>rel attributes:</strong>{' '}
                        {result.relAttributes || 'None'}
                      </p>

                      <p>
                        <strong>Nofollow:</strong>{' '}
                        {displayBoolean(result.nofollow)}
                      </p>

                      <p>
                        <strong>Sponsored:</strong>{' '}
                        {displayBoolean(result.sponsored)}
                      </p>

                      <p>
                        <strong>UGC:</strong>{' '}
                        {displayBoolean(result.ugc)}
                      </p>

                      <p>
                        <strong>Message:</strong>{' '}
                        {result.message || '—'}
                      </p>

                      <p>
                        <strong>Anchor text exact match:</strong>{' '}
                        {result.anchorText?.trim() ===
                        backlink.expectedAnchorText?.trim()
                          ? 'Yes'
                          : 'No'}
                      </p>

                      <small className="backlink-field-note">
                        Anchor text comparison is calculated by the frontend.
                        The backend verification checks the target URL.
                      </small>
                    </>
                  )}
                </section>
              )
            })}

            {/* VERIFICATION HISTORY */}

            {backlinks.map((backlink) => {
              if (expandedHistoryId !== backlink.id) return null

              const history = historyData[backlink.id]
              const historyError = historyErrors[backlink.id]
              const historyLoading =
                historyLoadingId === backlink.id

              return (
                <section
                  key={`history-${backlink.id}`}
                  className="data-section prospect-section"
                >
                  <div className="prospect-section-heading">
                    <div>
                      <h3>
                        Verification History — Backlink #{backlink.id}
                      </h3>
                      <p>
                        Previous verification attempts and changes over time.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      disabled={historyLoading}
                      onClick={() => handleRefreshHistory(backlink.id)}
                    >
                      {historyLoading ? 'Refreshing...' : 'Refresh History'}
                    </button>
                  </div>

                  {historyLoading && (
                    <div className="empty-state">
                      Loading verification history...
                    </div>
                  )}

                  {historyError && (
                    <div className="error-message">
                      {historyError}
                    </div>
                  )}

                  {!historyLoading &&
                    !historyError &&
                    Array.isArray(history) &&
                    history.length === 0 && (
                      <div className="empty-state">
                        No verification history is available for this backlink yet.
                      </div>
                    )}

                  {!historyLoading &&
                    !historyError &&
                    Array.isArray(history) &&
                    history.length > 0 && (
                      <div className="prospect-table-wrap">
                        <table className="prospect-table backlink-table">
                          <thead>
                            <tr>
                              <th>Checked At</th>
                              <th>Result</th>
                              <th>HTTP</th>
                              <th>Backlink Found</th>
                              <th>Anchor Text</th>
                              <th>rel Attributes</th>
                            </tr>
                          </thead>

                          <tbody>
                            {history.map((item) => (
                              <tr key={item.id}>
                                <td>{formatDate(item.checkedAt)}</td>

                                <td>
                                  <span className="prospect-status">
                                    {displayLabel(item.status)}
                                  </span>
                                </td>

                                <td>
                                  {item.pageHttpStatus ?? 'Unavailable'}
                                </td>

                                <td>
                                  {displayBoolean(item.backlinkFound)}
                                </td>

                                <td>{item.anchorText || '—'}</td>

                                <td>{item.relAttributes || 'None'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  {!historyLoading &&
                    !historyError &&
                    Array.isArray(history) &&
                    history.map((item, index) => (
                      <div
                        key={`history-details-${item.id}`}
                        className="data-section prospect-section"
                      >
                        <div className="prospect-section-heading">
                          <div>
                            <h4>
                              Verification #{history.length - index}
                            </h4>
                            <p>{formatDate(item.checkedAt)}</p>
                          </div>
                        </div>

                        <p>
                          <strong>Result:</strong>{' '}
                          {displayLabel(item.status)}
                        </p>

                        <p>
                          <strong>Message:</strong>{' '}
                          {item.message || '—'}
                        </p>

                        <p>
                          <strong>Target matched:</strong>{' '}
                          {displayBoolean(item.targetMatched)}
                        </p>

                        <p>
                          <strong>Actual URL:</strong>{' '}
                          {item.actualHref || '—'}
                        </p>

                        <p>
                          <strong>Anchor text:</strong>{' '}
                          {item.anchorText || '—'}
                        </p>

                        <p>
                          <strong>rel attributes:</strong>{' '}
                          {item.relAttributes || 'None'}
                        </p>

                        <p>
                          <strong>Nofollow:</strong>{' '}
                          {displayBoolean(item.nofollow)}
                        </p>

                        <p>
                          <strong>Sponsored:</strong>{' '}
                          {displayBoolean(item.sponsored)}
                        </p>

                        <p>
                          <strong>UGC:</strong>{' '}
                          {displayBoolean(item.ugc)}
                        </p>

                        <div>
                          <strong>
                            Changes since previous successful verification
                          </strong>

                          <p>
                            Status changed:{' '}
                            {displayBoolean(item.statusChanged)}
                          </p>

                          <p>
                            Anchor text changed:{' '}
                            {displayBoolean(item.anchorTextChanged)}
                          </p>

                          <p>
                            rel attributes changed:{' '}
                            {displayBoolean(item.relAttributesChanged)}
                          </p>

                          <p>
                            Previous successful status:{' '}
                            {displayLabel(item.previousSuccessfulStatus)}
                          </p>

                          <p>
                            Previous successful verification:{' '}
                            {formatDate(item.previousSuccessfulCheckedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                </section>
              )
            })}

            {/* PAGINATION */}

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
    </div>
  )
}
