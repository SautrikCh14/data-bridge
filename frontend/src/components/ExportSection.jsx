import { useState } from 'react'
import { downloadAuditReport, downloadCleanCsv } from '../services/api'

export default function ExportSection({ datasetId, onUploadAnother }) {
  const [toasts, setToasts] = useState([])
  const [isDownloadingAudit, setIsDownloadingAudit] = useState(false)
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const handleDownloadCSV = async () => {
    if (isDownloadingCsv || isDownloadingAudit) return

    setIsDownloadingCsv(true)
    try {
      await downloadCleanCsv(datasetId)
      showToast('Clean CSV downloaded successfully.', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to download clean CSV. Please try again.', 'error')
    } finally {
      setIsDownloadingCsv(false)
    }
  }

  const handleDownloadAudit = async () => {
    if (isDownloadingAudit || isDownloadingCsv) return

    setIsDownloadingAudit(true)
    try {
      await downloadAuditReport(datasetId, 'txt')
      showToast('Audit report downloaded successfully.', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to generate audit report. Please try again.', 'error')
    } finally {
      setIsDownloadingAudit(false)
    }
  }

  return (
    <>
      <div className="export-card" id="export-section">
        <div className="export-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="export-title">Your dataset is clean and ready for reporting.</div>
        <div className="export-subtitle">
          All records conform to the detected schema and standardization rules.
        </div>
        <div className="export-buttons">
          <button
            className="btn btn-primary"
            onClick={handleDownloadCSV}
            id="btn-download-csv"
            disabled={isDownloadingCsv || isDownloadingAudit}
            style={isDownloadingCsv ? { opacity: 0.8, cursor: 'wait' } : {}}
          >
            {isDownloadingCsv ? (
              <>
                <svg className="btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Downloading CSV...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Clean CSV
              </>
            )}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleDownloadAudit}
            id="btn-download-audit"
            disabled={isDownloadingAudit || isDownloadingCsv}
            style={isDownloadingAudit ? { opacity: 0.8, cursor: 'wait' } : {}}
          >
            {isDownloadingAudit ? (
              <>
                <svg className="btn-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generating Report...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Download Audit Report
              </>
            )}
          </button>
          <button className="btn btn-outline" onClick={onUploadAnother} id="btn-upload-another">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Another File
          </button>
        </div>
      </div>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
            {toast.type === 'success' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#22a958" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  )
}
