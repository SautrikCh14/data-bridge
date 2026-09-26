import { useState, useCallback, useMemo, useRef } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import { uploadDatasetFiles, analyzeDataset, getDashboardData, getCleanedData } from './services/api'

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isProcessed, setIsProcessed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [datasetId, setDatasetId] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [cleanedData, setCleanedData] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const intervalRefs = useRef([])

  const overallProgress = useMemo(() => {
    if (uploadedFiles.length === 0) return 0
    const total = uploadedFiles.reduce((sum, f) => sum + (f.progress || 0), 0)
    return total / uploadedFiles.length
  }, [uploadedFiles])

  const startProcessing = useCallback(async (newFiles) => {
    setIsProcessing(true)
    setErrorMessage(null)

    // Mark as processing
    setUploadedFiles(prev =>
      prev.map(f => ({ ...f, status: 'processing', progress: 15 }))
    )

    // Animate progress smoothly through the stages while backend processes
    const progressInterval = setInterval(() => {
      setUploadedFiles(prev =>
        prev.map(f => {
          if (f.status === 'complete' || f.progress >= 90) return f
          const inc = Math.random() * 6 + 2
          return { ...f, progress: Math.min(f.progress + inc, 90) }
        })
      )
    }, 250)
    intervalRefs.current.push(progressInterval)

    try {
      // 1. Extract raw File objects
      const rawFiles = newFiles
        .map(f => f.file)
        .filter(Boolean)

      if (rawFiles.length === 0) {
        throw new Error('No valid files provided for upload.')
      }

      // 2. Upload to Express backend
      const uploadRes = await uploadDatasetFiles(rawFiles)
      const currentDatasetId = uploadRes.datasetId
      setDatasetId(currentDatasetId)

      // Bump progress for schema detection stage
      setUploadedFiles(prev =>
        prev.map(f => ({ ...f, progress: Math.max(f.progress, 45) }))
      )

      // 3. Run full backend analysis & cleaning pipeline
      await analyzeDataset(currentDatasetId)

      // Bump progress for reconciliation & metric calculation
      setUploadedFiles(prev =>
        prev.map(f => ({ ...f, progress: Math.max(f.progress, 85) }))
      )

      // 4. Fetch dashboard & cleaned data from backend
      const [dash, cleaned] = await Promise.all([
        getDashboardData(currentDatasetId),
        getCleanedData(currentDatasetId, 1, 8)
      ])

      setDashboardData(dash)
      setCleanedData(cleaned)

      // 5. Complete all files
      clearInterval(progressInterval)
      intervalRefs.current = []

      setUploadedFiles(prev =>
        prev.map(f => ({ ...f, progress: 100, status: 'complete' }))
      )

      // 6. Smooth transition to dashboard
      setTimeout(() => {
        setTransitioning(true)
        setTimeout(() => {
          setIsProcessed(true)
          setIsProcessing(false)
          setTransitioning(false)
        }, 350)
      }, 400)

    } catch (err) {
      clearInterval(progressInterval)
      intervalRefs.current = []
      console.error('Processing error:', err)
      setErrorMessage(err.message || 'An error occurred during dataset processing.')
      setIsProcessing(false)
      setUploadedFiles(prev =>
        prev.map(f => ({ ...f, status: 'error' }))
      )
    }
  }, [])

  const handleFilesAdded = useCallback((newFiles) => {
    setUploadedFiles(prev => [...prev, ...newFiles])
    startProcessing(newFiles)
  }, [startProcessing])

  const handleUploadAnother = useCallback(() => {
    intervalRefs.current.forEach(clearInterval)
    intervalRefs.current = []
    setUploadedFiles([])
    setIsProcessed(false)
    setIsProcessing(false)
    setTransitioning(false)
    setDatasetId(null)
    setDashboardData(null)
    setCleanedData(null)
    setErrorMessage(null)
  }, [])

  return (
    <>
      <Header />
      <main
        className="main-content"
        style={transitioning ? { opacity: 0, transition: 'opacity 0.35s ease' } : { opacity: 1, transition: 'opacity 0.35s ease' }}
      >
        {errorMessage && !isProcessed && (
          <div className="error-toast" style={{ margin: '16px 0', maxWidth: '680px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {errorMessage}
          </div>
        )}

        {!isProcessed ? (
          <UploadPage
            files={uploadedFiles}
            onFilesAdded={handleFilesAdded}
            overallProgress={overallProgress}
            isProcessing={isProcessing}
          />
        ) : (
          <DashboardPage
            datasetId={datasetId}
            dashboardData={dashboardData}
            cleanedData={cleanedData}
            onUploadAnother={handleUploadAnother}
          />
        )}
      </main>
      <Footer />
    </>
  )
}
