import UploadZone from '../components/UploadZone'
import FileList from '../components/FileList'
import ProcessingPipeline from '../components/ProcessingPipeline'

export default function UploadPage({ files, onFilesAdded, overallProgress, isProcessing }) {
  return (
    <div className="state-transition" id="upload-page">
      <div className="card intro-card">
        <div className="intro-logo">
          <div className="intro-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <span className="intro-logo-text">DataBridge</span>
        </div>
        <div className="intro-badge">Automated Data Pipeline</div>
        <div className="intro-description">
          Quickly clean, reconcile, deduplicate, and analyze records from multiple sources.
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <svg className="card-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M7 2v20" />
              <path d="M17 2v20" />
              <path d="M2 12h20" />
              <path d="M2 7h5" />
              <path d="M2 17h5" />
              <path d="M17 7h5" />
              <path d="M17 17h5" />
            </svg>
            <span className="card-title">File Ingestion</span>
          </div>
          <span className="card-subtitle">CSV &bull; XLS &bull; XLSX</span>
        </div>

        <UploadZone onFilesAdded={onFilesAdded} disabled={isProcessing} />
        <FileList files={files} />
      </div>

      {files.length > 0 && (
        <ProcessingPipeline files={files} overallProgress={overallProgress} />
      )}
    </div>
  )
}
