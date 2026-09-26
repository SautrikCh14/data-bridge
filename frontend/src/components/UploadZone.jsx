import { useState, useRef, useCallback } from 'react'

const ACCEPTED = ['.csv', '.xls', '.xlsx']

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function getExtension(name) {
  return name.split('.').pop().toLowerCase()
}

function isValidFile(file) {
  const ext = '.' + getExtension(file.name)
  return ACCEPTED.includes(ext)
}

export default function UploadZone({ onFilesAdded, disabled }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFiles = useCallback((fileList) => {
    if (disabled) return
    setError(null)
    const files = Array.from(fileList)
    const valid = []
    const invalid = []

    files.forEach(f => {
      if (isValidFile(f)) {
        valid.push({
          id: crypto.randomUUID(),
          file: f,
          name: f.name,
          size: f.size,
          sizeFormatted: formatSize(f.size),
          extension: getExtension(f.name).toUpperCase(),
          progress: 0,
          status: 'waiting'
        })
      } else {
        invalid.push(f.name)
      }
    })

    if (invalid.length > 0) {
      setError(`Unsupported file${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}. Only CSV, XLS, and XLSX files are accepted.`)
    }

    if (valid.length > 0) {
      onFilesAdded(valid)
    }

    if (inputRef.current) inputRef.current.value = ''
  }, [onFilesAdded, disabled])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleClick = () => {
    if (!disabled && inputRef.current) inputRef.current.click()
  }

  const handleChange = (e) => {
    handleFiles(e.target.files)
  }

  return (
    <div>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        id="upload-dropzone"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      >
        <div className="upload-zone-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="upload-zone-title">Upload your CSV or Excel files</div>
        <div className="upload-zone-subtitle">Drag and drop your files here, or click to browse</div>
        <button className="upload-zone-button" type="button" tabIndex={-1}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Choose Files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          multiple
          onChange={handleChange}
        />
      </div>
      {error && (
        <div className="error-toast" id="upload-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
