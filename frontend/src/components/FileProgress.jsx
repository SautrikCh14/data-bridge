export default function FileProgress({ file }) {
  const isComplete = file.status === 'complete'
  const isError = file.status === 'error'

  return (
    <div className="file-item" id={`file-${file.id}`}>
      <div className="file-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="file-item-info">
        <div className="file-item-top">
          <span className="file-item-name">{file.name}</span>
          <span className="file-item-size">{file.sizeFormatted}</span>
        </div>
        <div className="file-item-meta">
          <span className="file-item-ext">{file.extension}</span>
          <span className={`file-item-status ${file.status}`}>
            {file.status === 'waiting' && 'Waiting for processing'}
            {file.status === 'processing' && 'Processing...'}
            {file.status === 'complete' && '✓ Complete'}
            {file.status === 'error' && '✗ Error'}
          </span>
        </div>
        <div className="file-item-progress">
          <div
            className={`file-item-progress-bar ${isComplete ? 'complete' : ''}`}
            style={{ width: `${file.progress}%` }}
          />
        </div>
      </div>
      <span className="file-item-percent">
        {isComplete ? '✓' : `${Math.round(file.progress)}%`}
      </span>
    </div>
  )
}
