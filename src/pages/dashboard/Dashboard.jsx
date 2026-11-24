import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import api from '../../services/api'
import { useWorkspace } from '../../context/WorkspaceContext'

import './Dashboard.css'

const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const CAMPAIGN_STATUSES = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const PROSPECT_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'TO_REVIEW', label: 'To review' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'LINK_ACQUIRED', label: 'Link acquired' },
]

const BACKLINK_STATUSES = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'OUTREACH_SENT', label: 'Outreach sent' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FOUND', label: 'Found' },
  { value: 'LOST', label: 'Lost' },
  { value: 'REJECTED', label: 'Rejected' },
]

const iconPaths = {
  properties: [
    'M3 10.5 12 3l9 7.5',
    'M5 9v12h14V9',
    'M9 21v-7h6v7',
  ],
  campaigns: [
    'M4 19V5',
    'M4 19h16',
    'm7 15 4-4 3 2 5-7',
  ],
  prospects: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M20 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  backlinks: [
    'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71',
  ],
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value || 0)
}

function formatStatus(value) {
  if (!value) return 'Not specified'

  return String(value)
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getStatusTone(status) {
  if (
    ['ACTIVE', 'FOUND', 'COMPLETED', 'QUALIFIED', 'LINK_ACQUIRED']
      .includes(status)
  ) {
    return 'success'
  }

  if (['LOST', 'REJECTED'].includes(status)) {
    return 'danger'
  }

  if (
    ['PENDING', 'PAUSED', 'TO_REVIEW', 'INACTIVE']
      .includes(status)
  ) {
    return 'warning'
  }

  if (
    ['OUTREACH_SENT', 'CONTACTED', 'PLANNING']
      .includes(status)
  ) {
    return 'info'
  }

  if (status === 'ARCHIVED') {
    return 'muted'
  }

  return 'primary'
}

function getTotalElements(response) {
  const value = Number(response?.data?.totalElements ?? 0)
  return Number.isFinite(value) ? value : 0
}

function countArrayStatuses(records, statuses) {
  return Object.fromEntries(
    statuses.map(({ value }) => [
      value,
      records.filter((record) => record.status === value).length,
    ]),
  )
}

function sumCounts(counts) {
  return Object.values(counts).reduce(
    (total, count) => total + count,
    0,
  )
}

function MetricIcon({ type }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[type].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

function MetricCard({ type, label, value, detail }) {
  return (
    <article className={`dashboard-metric dashboard-metric--${type}`}>
      <div className="dashboard-metric-top">
        <span className="dashboard-metric-label">{label}</span>

        <span className="dashboard-metric-icon">
          <MetricIcon type={type} />
        </span>
      </div>

      <strong className="dashboard-metric-value">
        {formatNumber(value)}
      </strong>

      <span className="dashboard-metric-detail">{detail}</span>
    </article>
  )
}

function StatusBreakdown({ title, description, statuses, counts, total }) {
  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <span className="dashboard-panel-total">
          {formatNumber(total)}
        </span>
      </div>

      <div className="dashboard-status-list">
        {statuses.map(({ value, label }) => {
          const count = counts[value] || 0
          const percentage = total > 0
            ? Math.round((count / total) * 100)
            : 0

          const tone = getStatusTone(value)

          return (
            <div className="dashboard-status-item" key={value}>
              <div className="dashboard-status-meta">
                <span className="dashboard-status-name">
                  <span className={`dashboard-status-dot dashboard-tone-${tone}`} />
                  {label}
                </span>

                <strong>{formatNumber(count)}</strong>
              </div>

              <div className="dashboard-status-track">
                <div
                  className={`dashboard-status-fill dashboard-tone-${tone}`}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-label={`${label} percentage`}
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function EntityEmptyState({ message }) {
  return <div className="dashboard-entity-empty">{message}</div>
}

function Dashboard() {
  const {
    selectedWorkspaceId,
    workspaces,
    loading: workspaceLoading,
  } = useWorkspace()

  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isCurrentRequest = true

    if (workspaceLoading) {
      setIsLoading(true)

      return () => {
        isCurrentRequest = false
      }
    }

    if (!selectedWorkspaceId) {
      setDashboardData(null)
      setError('')
      setIsLoading(false)

      return () => {
        isCurrentRequest = false
      }
    }

    const loadDashboard = async () => {
      setIsLoading(true)
      setError('')
      setDashboardData(null)

      try {
        const workspacePath = `/workspaces/${selectedWorkspaceId}`

        const propertyRequest = api.get(
          `${workspacePath}/properties`,
        )

        const campaignRequest = api.get(
          `${workspacePath}/campaigns`,
        )

        // Each status request uses page size 1.
        // The backend's totalElements field provides the full matching count.
        const prospectRequests = PROSPECT_STATUSES.map(
          ({ value }) =>
            api.get(`${workspacePath}/prospects`, {
              params: {
                status: value,
                page: 0,
                size: 1,
                sortBy: 'updatedAt',
                direction: 'DESC',
              },
            }),
        )

        const backlinkRequests = BACKLINK_STATUSES.map(
          ({ value }) =>
            api.get(`${workspacePath}/backlinks`, {
              params: {
                status: value,
                page: 0,
                size: 1,
                sortBy: 'updatedAt',
                sortDir: 'desc',
              },
            }),
        )

        const responses = await Promise.all([
          propertyRequest,
          campaignRequest,
          ...prospectRequests,
          ...backlinkRequests,
        ])

        if (!isCurrentRequest) return

        const properties = Array.isArray(responses[0].data)
          ? responses[0].data
          : []

        const campaigns = Array.isArray(responses[1].data)
          ? responses[1].data
          : []

        const prospectStart = 2
        const prospectEnd = prospectStart + PROSPECT_STATUSES.length

        const prospectResponses = responses.slice(
          prospectStart,
          prospectEnd,
        )

        const backlinkResponses = responses.slice(prospectEnd)

        const prospectCounts = Object.fromEntries(
          PROSPECT_STATUSES.map(({ value }, index) => [
            value,
            getTotalElements(prospectResponses[index]),
          ]),
        )

        const backlinkCounts = Object.fromEntries(
          BACKLINK_STATUSES.map(({ value }, index) => [
            value,
            getTotalElements(backlinkResponses[index]),
          ]),
        )

        setDashboardData({
          properties,
          campaigns,
          prospectCounts,
          backlinkCounts,
          propertyCounts: countArrayStatuses(
            properties,
            PROPERTY_STATUSES,
          ),
          campaignCounts: countArrayStatuses(
            campaigns,
            CAMPAIGN_STATUSES,
          ),
        })
      } catch (err) {
        if (!isCurrentRequest) return

        setError(
          err.response?.data?.message ||
          'Unable to load dashboard information. Please refresh and try again.',
        )
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isCurrentRequest = false
    }
  }, [selectedWorkspaceId, workspaceLoading, refreshKey])

  const selectedWorkspace = workspaces.find(
    (workspace) =>
      String(workspace.id) === String(selectedWorkspaceId),
  )

  if (workspaceLoading || isLoading) {
    return (
      <div className="dashboard-loading">
        <span className="spinner" />
        <p>Loading workspace analytics...</p>
      </div>
    )
  }

  if (!selectedWorkspaceId) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-heading">
          <div>
            <span className="dashboard-eyebrow">WORKSPACE OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Your property SEO operations at a glance.</p>
          </div>
        </div>

        <div className="dashboard-empty-workspace">
          <div className="dashboard-empty-symbol">PL</div>
          <h2>No workspace selected</h2>
          <p>
            Create a workspace to start managing properties,
            SEO campaigns, prospects and backlinks.
          </p>
          <Link to="/workspaces" className="dashboard-primary-link">
            Go to Workspaces
          </Link>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-heading">
          <div>
            <span className="dashboard-eyebrow">WORKSPACE OVERVIEW</span>
            <h1>Dashboard</h1>
            <p>Your property SEO operations at a glance.</p>
          </div>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Refresh data
          </button>
        </div>

        <div className="error-message dashboard-error">
          {error || 'Dashboard data is not available.'}
        </div>
      </div>
    )
  }

  const {
    properties,
    campaigns,
    prospectCounts,
    backlinkCounts,
    propertyCounts,
    campaignCounts,
  } = dashboardData

  const totalProspects = sumCounts(prospectCounts)
  const totalBacklinks = sumCounts(backlinkCounts)

  const foundBacklinks = backlinkCounts.FOUND || 0
  const activeProperties = propertyCounts.ACTIVE || 0
  const activeCampaigns = campaignCounts.ACTIVE || 0
  const qualifiedProspects = prospectCounts.QUALIFIED || 0

  const foundPercentage = totalBacklinks > 0
    ? Math.round((foundBacklinks / totalBacklinks) * 100)
    : 0

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">WORKSPACE OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>
            Track your properties, campaigns, prospects and backlink
            performance.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh-button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={isLoading}
        >
          <span aria-hidden="true">↻</span>
          Refresh data
        </button>
      </div>

      <section className="dashboard-workspace-banner">
        <div className="dashboard-workspace-identity">
          <div className="dashboard-workspace-icon">PL</div>

          <div>
            <span className="dashboard-workspace-caption">
              ACTIVE WORKSPACE
            </span>
            <h2>
              {selectedWorkspace?.name || 'Selected workspace'}
            </h2>
            <p>
              {selectedWorkspace?.description ||
                'Your workspace performance overview.'}
            </p>
          </div>
        </div>

        <div className="dashboard-workspace-meta">
          <span>
            <strong>Website</strong>
            {selectedWorkspace?.websiteUrl || 'Not configured'}
          </span>

          <span>
            <strong>Members</strong>
            {selectedWorkspace?.memberCount ?? '—'}
          </span>
        </div>
      </section>

      <section className="dashboard-metric-grid">
        <MetricCard
          type="properties"
          label="Properties"
          value={properties.length}
          detail={`${formatNumber(activeProperties)} active properties`}
        />

        <MetricCard
          type="campaigns"
          label="SEO Campaigns"
          value={campaigns.length}
          detail={`${formatNumber(activeCampaigns)} active campaigns`}
        />

        <MetricCard
          type="prospects"
          label="Prospects"
          value={totalProspects}
          detail={`${formatNumber(qualifiedProspects)} qualified prospects`}
        />

        <MetricCard
          type="backlinks"
          label="Backlinks"
          value={totalBacklinks}
          detail={`${formatNumber(foundBacklinks)} successfully found`}
        />
      </section>

      <section className="dashboard-highlight">
        <div className="dashboard-highlight-copy">
          <span>BACKLINK ACQUISITION</span>
          <strong>{foundPercentage}%</strong>
          <p>
            {formatNumber(foundBacklinks)} found out of{' '}
            {formatNumber(totalBacklinks)} total backlinks
          </p>
        </div>

        <div className="dashboard-highlight-progress">
          <div className="dashboard-highlight-track">
            <div
              className="dashboard-highlight-fill"
              style={{ width: `${foundPercentage}%` }}
            />
          </div>
          <span>
            {totalBacklinks === 0
              ? 'No backlinks recorded yet'
              : 'Based on current backlink statuses'}
          </span>
        </div>
      </section>

      <section className="dashboard-analytics-grid">
        <StatusBreakdown
          title="Backlink performance"
          description="Workspace backlink status distribution"
          statuses={BACKLINK_STATUSES}
          counts={backlinkCounts}
          total={totalBacklinks}
        />

        <StatusBreakdown
          title="Campaign status"
          description="Distribution of SEO campaigns"
          statuses={CAMPAIGN_STATUSES}
          counts={campaignCounts}
          total={campaigns.length}
        />

        <StatusBreakdown
          title="Prospect pipeline"
          description="Prospect qualification and outreach stages"
          statuses={PROSPECT_STATUSES}
          counts={prospectCounts}
          total={totalProspects}
        />

        <StatusBreakdown
          title="Property portfolio"
          description="Properties by their current status"
          statuses={PROPERTY_STATUSES}
          counts={propertyCounts}
          total={properties.length}
        />
      </section>

      <section className="dashboard-details-grid">
        <article className="dashboard-panel dashboard-entity-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>SEO campaigns</h2>
              <p>Campaigns configured in this workspace</p>
            </div>

            <Link to="/campaigns" className="dashboard-panel-link">
              View all
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <EntityEmptyState message="No campaigns have been created in this workspace yet." />
          ) : (
            <div className="dashboard-entity-list">
              {campaigns.slice(0, 5).map((campaign) => (
                <div className="dashboard-entity-row" key={campaign.id}>
                  <div className="dashboard-entity-main">
                    <strong>
                      {campaign.campaignName || 'Untitled campaign'}
                    </strong>
                    <span>
                      Property: {campaign.propertyName || 'Not specified'}
                    </span>
                  </div>

                  <span
                    className={`dashboard-pill dashboard-tone-${getStatusTone(campaign.status)}`}
                  >
                    {formatStatus(campaign.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-entity-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Properties</h2>
              <p>Properties managed in this workspace</p>
            </div>

            <Link to="/properties" className="dashboard-panel-link">
              View all
            </Link>
          </div>

          {properties.length === 0 ? (
            <EntityEmptyState message="No properties have been added to this workspace yet." />
          ) : (
            <div className="dashboard-entity-list">
              {properties.slice(0, 5).map((property) => (
                <div className="dashboard-entity-row" key={property.id}>
                  <div className="dashboard-entity-main">
                    <strong>{property.name || 'Untitled property'}</strong>
                    <span>
                      {formatStatus(property.propertyType)}
                      {property.websiteUrl
                        ? ` · ${property.websiteUrl}`
                        : ''}
                    </span>
                  </div>

                  <span
                    className={`dashboard-pill dashboard-tone-${getStatusTone(property.status)}`}
                  >
                    {formatStatus(property.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default Dashboard