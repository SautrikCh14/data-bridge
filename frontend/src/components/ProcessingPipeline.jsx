import { useMemo } from 'react'

const STAGES = [
  'File ingestion',
  'Schema detection',
  'Data cleaning',
  'Duplicate detection',
  'Reconciliation',
  'Metric calculation'
]

function getStageState(overallProgress, stageIndex, totalStages) {
  const perStage = 100 / totalStages
  const stageEnd = (stageIndex + 1) * perStage
  const stageStart = stageIndex * perStage

  if (overallProgress >= stageEnd) return 'completed'
  if (overallProgress >= stageStart) return 'active'
  return 'pending'
}

export default function ProcessingPipeline({ files, overallProgress }) {
  const completedCount = files.filter(f => f.status === 'complete').length

  const stages = useMemo(() => {
    return STAGES.map((name, i) => ({
      name,
      state: getStageState(overallProgress, i, STAGES.length)
    }))
  }, [overallProgress])

  return (
    <div className="card processing-section" id="processing-pipeline">
      <div className="card-header">
        <div className="card-header-left">
          <svg className="card-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="card-title">Processing Data</span>
        </div>
      </div>

      <div className="processing-stats">
        <div className="processing-stat">
          <span className="processing-stat-label">Files</span>
          <span className="processing-stat-value">{completedCount} / {files.length}</span>
        </div>
        <div className="processing-stat">
          <span className="processing-stat-label">Overall Progress</span>
          <span className="processing-stat-value">{Math.round(overallProgress)}%</span>
        </div>
      </div>

      <div className="overall-progress">
        <div className="overall-progress-bar-container">
          <div
            className="overall-progress-bar"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="pipeline-stages">
        {stages.map((stage, i) => (
          <div key={i} className={`pipeline-stage ${stage.state}`}>
            <div className={`pipeline-icon ${stage.state}`}>
              {stage.state === 'completed' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {stage.state === 'active' && (
                <svg viewBox="0 0 24 24" fill="currentColor" width="8" height="8">
                  <circle cx="12" cy="12" r="6" />
                </svg>
              )}
              {stage.state === 'pending' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                  <circle cx="12" cy="12" r="5" />
                </svg>
              )}
            </div>
            <span>{stage.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
