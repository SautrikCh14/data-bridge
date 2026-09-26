import MetricCard from '../components/MetricCard'
import ProgramChart from '../components/ProgramChart'
import DataTable from '../components/DataTable'
import ExportSection from '../components/ExportSection'
import DatasetComposition from '../components/DatasetComposition'
import { demoSummary, demoStats, demoProgramData, demoDatasetComposition } from '../data/demoData'

export default function DashboardPage({ datasetId, dashboardData, cleanedData, onUploadAnother }) {
  const summary = dashboardData?.summary ? {
    originalRecords: dashboardData.summary.totalRecords ?? 0,
    cleanRecords: dashboardData.summary.cleanRecords ?? 0,
    duplicates: dashboardData.summary.duplicates ?? 0,
    issuesDetected: (dashboardData.summary.missingValues || 0) + (dashboardData.summary.inconsistencies || 0)
  } : demoSummary

  const stats = dashboardData?.statistics ? {
    totalRecords: dashboardData.statistics.totalRecords ?? summary.cleanRecords ?? 0,
    uniquePeople: dashboardData.statistics.uniqueIndividuals ?? dashboardData.statistics.totalRecords ?? 0,
    programs: dashboardData.statistics.uniquePrograms ?? 0,
    locations: dashboardData.statistics.uniqueLocations ?? 0
  } : demoStats

  const programData = (dashboardData?.charts?.recordsByProgram && dashboardData.charts.recordsByProgram.length > 0)
    ? dashboardData.charts.recordsByProgram
    : demoProgramData

  const compositionData = (dashboardData?.datasetComposition && dashboardData.datasetComposition.length > 0)
    ? dashboardData.datasetComposition
    : demoDatasetComposition

  const compositionTotal = dashboardData?.compositionTotalRecords || stats.totalRecords

  const retainedRate = summary.originalRecords > 0
    ? ((summary.cleanRecords / summary.originalRecords) * 100).toFixed(1)
    : '100.0'

  return (
    <div className="state-transition" id="dashboard-page">
      <div className="card">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-title">Data Summary</div>
            <div className="dashboard-section-subtitle">Automated hygiene overview</div>
          </div>
          <div className="dashboard-section-meta">
            <span style={{ color: '#22a958' }}>●</span> Processing complete
          </div>
        </div>

        <div className="metric-cards">
          <MetricCard
            label="Original Records"
            value={summary.originalRecords.toLocaleString()}
            description="Raw imported rows"
            variant="neutral"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
          />
          <MetricCard
            label="Clean Records"
            value={summary.cleanRecords.toLocaleString()}
            description={`${retainedRate}% retained rate`}
            variant="success"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />
          <MetricCard
            label="Duplicates Removed"
            value={summary.duplicates.toLocaleString()}
            description="Contact-pair deduplication"
            variant="error"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            }
          />
          <MetricCard
            label="Issues Found"
            value={summary.issuesDetected.toLocaleString()}
            description="Spelling, phones & nulls"
            variant="info"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="card">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-title">Statistics</div>
            <div className="dashboard-section-subtitle">Distribution & Entity Breakdown</div>
          </div>
        </div>

        <div className="stat-mini-cards">
          <div className="stat-mini-card">
            <div className="stat-mini-label">Total Records</div>
            <div className="stat-mini-value">{stats.totalRecords.toLocaleString()}</div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-mini-label">Unique People</div>
            <div className="stat-mini-value">{stats.uniquePeople.toLocaleString()}</div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-mini-label">Programs</div>
            <div className="stat-mini-value">{stats.programs}</div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-mini-label">Locations</div>
            <div className="stat-mini-value">{stats.locations}</div>
          </div>
        </div>

        <ProgramChart data={programData} />
      </div>

      <DatasetComposition
        data={compositionData}
        totalRecords={compositionTotal}
      />

      <DataTable datasetId={datasetId} initialData={cleanedData} />

      <ExportSection datasetId={datasetId} onUploadAnother={onUploadAnother} />
    </div>
  )
}
