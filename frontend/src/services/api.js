import { demoCleanedData, demoProgramData, demoSummary, demoStats, demoDatasetComposition } from '../data/demoData'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function triggerBrowserDownload(blob, defaultFilename, contentDisposition) {
  let filename = defaultFilename
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim()
    }
  }

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  setTimeout(() => {
    window.URL.revokeObjectURL(url)
    if (document.body.contains(link)) {
      document.body.removeChild(link)
    }
  }, 150)

  return filename
}

export async function uploadDatasetFiles(files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetch(`${API_BASE_URL}/datasets/upload`, {
    method: 'POST',
    body: formData
  })

  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to upload files')
  }

  return json.data
}

export async function analyzeDataset(datasetId) {
  const res = await fetch(`${API_BASE_URL}/datasets/${datasetId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to analyze dataset')
  }

  return json.data
}

export async function getDashboardData(datasetId) {
  if (!datasetId) {
    return {
      summary: demoSummary,
      stats: demoStats,
      programData: demoProgramData,
      datasetComposition: demoDatasetComposition
    }
  }

  const res = await fetch(`${API_BASE_URL}/datasets/${datasetId}/dashboard`)
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to fetch dashboard data')
  }

  return json.data
}

export async function getCleanedData(datasetId, page = 1, pageSize = 8, sheet) {
  if (!datasetId) {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const rows = demoCleanedData.slice(start, end)
    return {
      rows,
      total: demoCleanedData.length,
      page,
      pageSize,
      totalPages: Math.ceil(demoCleanedData.length / pageSize),
      columns: ['id', 'fullName', 'email', 'phone', 'program', 'location', 'status']
    }
  }

  const query = sheet ? `&sheet=${encodeURIComponent(sheet)}` : ''
  const res = await fetch(`${API_BASE_URL}/datasets/${datasetId}/cleaned-data?page=${page}&limit=${pageSize}${query}`)
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to fetch cleaned data')
  }

  return json.data
}

export async function downloadAuditReport(datasetId, format = 'txt') {
  if (!datasetId) {
    throw new Error('No active dataset found to generate audit report.')
  }

  const url = `${API_BASE_URL}/datasets/${datasetId}/report?format=${format}`
  const response = await fetch(url)

  if (!response.ok) {
    let errMsg = `Failed to generate audit report (${response.status})`
    try {
      const errJson = await response.json()
      if (errJson?.error?.message) errMsg = errJson.error.message
    } catch (_) {}
    throw new Error(errMsg)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const defaultFilename = `DataBridge_Audit_Report_${Date.now()}.${format}`
  return triggerBrowserDownload(blob, defaultFilename, disposition)
}

export async function downloadCleanCsv(datasetId, sheet) {
  if (!datasetId) {
    throw new Error('No active dataset found to export clean CSV.')
  }

  const query = sheet ? `?sheet=${encodeURIComponent(sheet)}` : ''
  const url = `${API_BASE_URL}/datasets/${datasetId}/export/csv${query}`
  const response = await fetch(url)

  if (!response.ok) {
    let errMsg = `Failed to export cleaned CSV (${response.status})`
    try {
      const errJson = await response.json()
      if (errJson?.error?.message) errMsg = errJson.error.message
    } catch (_) {}
    throw new Error(errMsg)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const defaultFilename = `DataBridge_Cleaned_${Date.now()}.csv`
  return triggerBrowserDownload(blob, defaultFilename, disposition)
}

export async function downloadReport(type, datasetId) {
  if (type === 'audit' || type === 'audit_report') {
    return downloadAuditReport(datasetId, 'txt')
  } else if (type === 'csv' || type === 'clean_csv') {
    return downloadCleanCsv(datasetId)
  }
  return { message: 'Invalid report type' }
}
