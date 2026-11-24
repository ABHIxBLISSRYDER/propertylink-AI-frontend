import { useEffect, useState } from 'react'
import api from '../../services/api'
import './OutreachDrafts.css'

const tones = [
  'PROFESSIONAL',
  'FRIENDLY',
  'WARM',
  'CONCISE',
  'PERSUASIVE',
  'EDITORIAL',
]

const draftStatuses = [
  'DRAFT',
  'READY_FOR_REVIEW',
  'SENT_MANUALLY',
  'REPLIED',
  'POSITIVE_REPLY',
  'DECLINED',
  'FOLLOW_UP_NEEDED',
]

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

export default function OutreachDrafts({
  prospectPath,
  campaignIds = [],
  campaignNames = [],
  opportunities = [],
}) {
  const [drafts, setDrafts] = useState([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [draftsError, setDraftsError] = useState('')

  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')

  const [tone, setTone] = useState('PROFESSIONAL')
  const [campaignId, setCampaignId] = useState('')
  const [contentOpportunityId, setContentOpportunityId] = useState('')

  const [generating, setGenerating] = useState(false)
  const [updatingDraftId, setUpdatingDraftId] = useState(null)
  const [deletingDraftId, setDeletingDraftId] = useState(null)

  const [editingDraftId, setEditingDraftId] = useState(null)
  const [editSubject, setEditSubject] = useState('')
  const [editEmailBody, setEditEmailBody] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  // Load drafts whenever the selected prospect changes.
  useEffect(() => {
    let active = true

    const loadDrafts = async () => {
      setDrafts([])
      setDraftsError('')
      setActionError('')
      setSuccess('')
      setDraftsLoading(true)

      setEditingDraftId(null)
      setEditSubject('')
      setEditEmailBody('')

      setCampaignId('')
      setContentOpportunityId('')

      try {
        const response = await api.get(
          `${prospectPath}/outreach-drafts`,
        )

        if (active) {
          setDrafts(
            Array.isArray(response.data) ? response.data : [],
          )
        }
      } catch (err) {
        if (active) {
          setDraftsError(
            getErrorMessage(
              err,
              'Unable to load outreach drafts.',
            ),
          )
        }
      } finally {
        if (active) {
          setDraftsLoading(false)
        }
      }
    }

    if (prospectPath) {
      loadDrafts()
    }

    return () => {
      active = false
    }
  }, [prospectPath, refreshKey])

  // Generate a new AI outreach draft.
  const handleGenerate = async (event) => {
    event.preventDefault()

    setGenerating(true)
    setActionError('')
    setSuccess('')
    setDraftsError('')

    const requestBody = {
      tone,
    }

    if (campaignId) {
      requestBody.campaignId = Number(campaignId)
    }

    if (contentOpportunityId) {
      requestBody.contentOpportunityId = Number(
        contentOpportunityId,
      )
    }

    try {
      const response = await api.post(
        `${prospectPath}/outreach-drafts/generate`,
        requestBody,
      )

      const createdDraft = response.data

      setDrafts((current) => [
        createdDraft,
        ...current.filter((draft) => draft.id !== createdDraft.id),
      ])

      setCampaignId('')
      setContentOpportunityId('')

      setSuccess('AI outreach draft generated and saved.')
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          'Unable to generate the outreach draft.',
        ),
      )
    } finally {
      setGenerating(false)
    }
  }

  // Start editing an existing draft.
  const handleStartEdit = (draft) => {
    setEditingDraftId(draft.id)
    setEditSubject(draft.subject || '')
    setEditEmailBody(draft.emailBody || '')
    setActionError('')
    setSuccess('')
  }

  // Cancel editing.
  const handleCancelEdit = () => {
    setEditingDraftId(null)
    setEditSubject('')
    setEditEmailBody('')
  }

  // Save edited subject and email body.
  const handleSaveEdit = async (event, draftId) => {
    event.preventDefault()

    if (!editSubject.trim() || !editEmailBody.trim()) {
      setActionError('Subject and email body cannot be empty.')
      return
    }

    if (editSubject.trim().length > 300) {
      setActionError('Subject cannot exceed 300 characters.')
      return
    }

    if (editEmailBody.trim().length > 10000) {
      setActionError('Email body cannot exceed 10,000 characters.')
      return
    }

    setSavingEdit(true)
    setActionError('')
    setSuccess('')

    try {
      const response = await api.put(
        `${prospectPath}/outreach-drafts/${draftId}`,
        {
          subject: editSubject.trim(),
          emailBody: editEmailBody.trim(),
        },
      )

      setDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId ? response.data : draft,
        ),
      )

      setEditingDraftId(null)
      setEditSubject('')
      setEditEmailBody('')

      setSuccess('Outreach draft updated successfully.')
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Unable to update outreach draft.'),
      )
    } finally {
      setSavingEdit(false)
    }
  }

  // Update the lifecycle status of a draft.
  const handleStatusChange = async (draftId, nextStatus) => {
    setUpdatingDraftId(draftId)
    setActionError('')
    setSuccess('')

    try {
      const response = await api.patch(
        `${prospectPath}/outreach-drafts/${draftId}/status`,
        {
          status: nextStatus,
        },
      )

      setDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId ? response.data : draft,
        ),
      )

      setSuccess('Outreach draft status updated.')
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          'Unable to update outreach draft status.',
        ),
      )
    } finally {
      setUpdatingDraftId(null)
    }
  }

  // Delete a saved draft.
  const handleDelete = async (draftId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this outreach draft?',
    )

    if (!confirmed) return

    setDeletingDraftId(draftId)
    setActionError('')
    setSuccess('')

    try {
      await api.delete(
        `${prospectPath}/outreach-drafts/${draftId}`,
      )

      setDrafts((current) =>
        current.filter((draft) => draft.id !== draftId),
      )

      if (editingDraftId === draftId) {
        handleCancelEdit()
      }

      setSuccess('Outreach draft deleted.')
    } catch (err) {
      setActionError(
        getErrorMessage(err, 'Unable to delete outreach draft.'),
      )
    } finally {
      setDeletingDraftId(null)
    }
  }

  // Copy the subject and email body.
  const handleCopy = async (draft) => {
    setActionError('')
    setSuccess('')

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard is unavailable')
      }

      await navigator.clipboard.writeText(
        `Subject: ${draft.subject}\n\n${draft.emailBody}`,
      )

      setSuccess('Email subject and body copied to clipboard.')
    } catch {
      setActionError(
        'Unable to access the clipboard. Please copy the email manually.',
      )
    }
  }

  return (
    <section className="data-section outreach-draft-section">
      <div className="outreach-draft-heading">
        <div>
          <span className="outreach-draft-eyebrow">
            AI-POWERED EMAIL WORKFLOW
          </span>
          <h3>AI Outreach Drafts</h3>
          <p>
            Generate personalized first-contact emails using
            prospect, campaign and content opportunity information.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={draftsLoading}
        >
          Refresh Drafts
        </button>
      </div>

      {draftsError && (
        <div className="error-message">{draftsError}</div>
      )}

      {actionError && (
        <div className="error-message">{actionError}</div>
      )}

      {success && (
        <div className="success-message">{success}</div>
      )}

      {/* GENERATE DRAFT */}
      <div className="outreach-draft-generator">
        <div className="outreach-draft-subheading">
          <div>
            <h4>Generate New Draft</h4>
            <p>Choose the context and writing tone for your email.</p>
          </div>
        </div>

        <form
          className="outreach-draft-generation-form"
          onSubmit={handleGenerate}
        >
          <div>
            <label htmlFor="outreach-tone">Writing tone</label>
            <select
              id="outreach-tone"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
            >
              {tones.map((item) => (
                <option key={item} value={item}>
                  {displayLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="outreach-campaign">
              Campaign (optional)
            </label>
            <select
              id="outreach-campaign"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              <option value="">No explicit campaign</option>

              {campaignIds.map((id, index) => (
                <option key={id} value={id}>
                  {campaignNames[index] || `Campaign #${id}`}
                </option>
              ))}
            </select>

            {campaignIds.length === 0 && (
              <small>
                This prospect has no associated campaigns.
              </small>
            )}
          </div>

          <div>
            <label htmlFor="outreach-opportunity">
              Content opportunity (optional)
            </label>
            <select
              id="outreach-opportunity"
              value={contentOpportunityId}
              onChange={(event) =>
                setContentOpportunityId(event.target.value)
              }
            >
              <option value="">No content opportunity</option>

              {opportunities.map((opportunity) => (
                <option
                  key={opportunity.id}
                  value={opportunity.id}
                >
                  {opportunity.title ||
                    `Opportunity #${opportunity.id}`}
                </option>
              ))}
            </select>

            {opportunities.length === 0 && (
              <small>
                Generate content opportunities above to use them here.
              </small>
            )}
          </div>

          <button type="submit" disabled={generating}>
            {generating
              ? 'Generating with AI...'
              : 'Generate Outreach Draft'}
          </button>
        </form>

        <p className="outreach-draft-form-note">
          When a content opportunity has an associated campaign,
          the backend can use that campaign automatically when no
          explicit campaign is selected. If you select both, they
          must belong together.
        </p>
      </div>

      {/* SAVED DRAFTS */}
      <div className="outreach-draft-list-heading">
        <div>
          <h4>Saved Outreach Drafts</h4>
          <span>
            {drafts.length}{' '}
            {drafts.length === 1 ? 'draft' : 'drafts'}
          </span>
        </div>
      </div>

      {draftsLoading ? (
        <div className="empty-state">
          Loading outreach drafts...
        </div>
      ) : drafts.length === 0 ? (
        <div className="outreach-draft-empty">
          <div className="outreach-draft-empty-icon">✉</div>
          <h4>No outreach drafts yet</h4>
          <p>
            Generate an AI-powered email draft above. Your saved
            drafts will appear here for review and editing.
          </p>
        </div>
      ) : (
        <div className="outreach-draft-list">
          {drafts.map((draft) => {
            const isEditing = editingDraftId === draft.id

            return (
              <article
                className="outreach-draft-card"
                key={draft.id}
              >
                <div className="outreach-draft-card-heading">
                  <div className="outreach-draft-card-title">
                    <span className="outreach-draft-id">
                      DRAFT #{draft.id}
                    </span>

                    <h4>{draft.subject || 'Untitled email'}</h4>

                    <div className="outreach-draft-recipient">
                      <span>
                        To:{' '}
                        {draft.recipientName ||
                          'Contact name not provided'}
                      </span>

                      {draft.recipientEmail && (
                        <a href={`mailto:${draft.recipientEmail}`}>
                          {draft.recipientEmail}
                        </a>
                      )}

                      {!draft.recipientEmail && (
                        <span>Email address not provided</span>
                      )}
                    </div>
                  </div>

                  <div className="outreach-draft-status-control">
                    <label htmlFor={`draft-status-${draft.id}`}>
                      Status
                    </label>

                    <select
                      id={`draft-status-${draft.id}`}
                      value={draft.status || 'DRAFT'}
                      disabled={
                        updatingDraftId === draft.id ||
                        isEditing
                      }
                      onChange={(event) =>
                        handleStatusChange(
                          draft.id,
                          event.target.value,
                        )
                      }
                    >
                      {draftStatuses.map((item) => (
                        <option key={item} value={item}>
                          {displayLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    className="outreach-draft-edit-form"
                    onSubmit={(event) =>
                      handleSaveEdit(event, draft.id)
                    }
                  >
                    <div>
                      <label htmlFor={`edit-subject-${draft.id}`}>
                        Email subject
                      </label>
                      <input
                        id={`edit-subject-${draft.id}`}
                        type="text"
                        value={editSubject}
                        onChange={(event) =>
                          setEditSubject(event.target.value)
                        }
                        maxLength={300}
                        required
                      />
                      <small>
                        {editSubject.length}/300 characters
                      </small>
                    </div>

                    <div>
                      <label htmlFor={`edit-body-${draft.id}`}>
                        Email body
                      </label>
                      <textarea
                        id={`edit-body-${draft.id}`}
                        value={editEmailBody}
                        onChange={(event) =>
                          setEditEmailBody(event.target.value)
                        }
                        rows={9}
                        maxLength={10000}
                        required
                      />
                      <small>
                        {editEmailBody.length}/10,000 characters
                      </small>
                    </div>

                    <div className="outreach-draft-actions">
                      <button
                        type="submit"
                        disabled={savingEdit}
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="outreach-draft-email">
                      <div className="outreach-draft-email-heading">
                        <strong>Email body</strong>
                        <span>{displayLabel(draft.tone)} tone</span>
                      </div>

                      <p>{draft.emailBody}</p>
                    </div>

                    <div className="outreach-draft-metadata">
                      <div>
                        <span>Campaign</span>
                        <strong>
                          {draft.campaignId
                            ? `#${draft.campaignId}`
                            : 'Not linked'}
                        </strong>
                      </div>

                      <div>
                        <span>Content opportunity</span>
                        <strong>
                          {draft.contentOpportunityId
                            ? `#${draft.contentOpportunityId}`
                            : 'Not linked'}
                        </strong>
                      </div>

                      <div>
                        <span>AI model</span>
                        <strong>{draft.modelName || '—'}</strong>
                      </div>

                      <div>
                        <span>Prompt version</span>
                        <strong>{draft.promptVersion || '—'}</strong>
                      </div>

                      <div>
                        <span>Created</span>
                        <strong>{formatDate(draft.createdAt)}</strong>
                      </div>

                      <div>
                        <span>Last updated</span>
                        <strong>{formatDate(draft.updatedAt)}</strong>
                      </div>
                    </div>

                    <div className="outreach-draft-actions">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(draft)}
                      >
                        Edit Draft
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleCopy(draft)}
                      >
                        Copy Email
                      </button>

                      <button
                        type="button"
                        className="outreach-draft-delete-button"
                        disabled={deletingDraftId === draft.id}
                        onClick={() => handleDelete(draft.id)}
                      >
                        {deletingDraftId === draft.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="outreach-draft-disclaimer">
        AI-generated emails should be reviewed before use. PropertyLink
        AI stores and tracks drafts but does not send emails. Use your
        email client to send a message, then update its status to
        Sent Manually when appropriate.
      </p>
    </section>
  )
}