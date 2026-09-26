import { useState, useMemo, useEffect } from 'react'
import StatusBadge from './StatusBadge'
import { demoCleanedData } from '../data/demoData'
import { getCleanedData } from '../services/api'

const PAGE_SIZE = 8
const DEMO_TOTAL_RECORDS = 1288

function formatColName(name) {
  if (!name) return ''
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase())
}

export default function DataTable({ datasetId, initialData }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [serverData, setServerData] = useState(initialData || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!datasetId) return

    let isMounted = true
    setLoading(true)

    getCleanedData(datasetId, currentPage, PAGE_SIZE)
      .then(res => {
        if (isMounted) {
          setServerData(res)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Error fetching cleaned data page:', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [datasetId, currentPage])

  const isServer = Boolean(datasetId && serverData)

  const columns = useMemo(() => {
    if (isServer && serverData.columns && serverData.columns.length > 0) {
      return serverData.columns
    }
    return ['id', 'fullName', 'email', 'phone', 'program', 'location']
  }, [isServer, serverData])

  const totalRecords = isServer ? (serverData.total || 0) : DEMO_TOTAL_RECORDS
  const totalPages = isServer ? (serverData.totalPages || Math.ceil(totalRecords / PAGE_SIZE) || 1) : Math.ceil(demoCleanedData.length / PAGE_SIZE)

  const rows = useMemo(() => {
    if (isServer) {
      return serverData.rows || []
    }
    const start = (currentPage - 1) * PAGE_SIZE
    return demoCleanedData.slice(start, start + PAGE_SIZE)
  }, [isServer, serverData, currentPage])

  const startRow = totalRecords > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const endRow = Math.min(currentPage * PAGE_SIZE, totalRecords)

  return (
    <div className="card" id="data-table-section">
      <div className="card-header">
        <div className="card-header-left">
          <svg className="card-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span className="card-title">Cleaned Data</span>
        </div>
        <span className="card-subtitle">
          Showing {rows.length} of {totalRecords.toLocaleString()} clean rows
        </span>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{formatColName(col)}</th>
              ))}
              <th>Cleaned Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '32px' }}>
                  Loading cleaned rows...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  No clean records found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map(col => (
                    <td key={col}>{row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}</td>
                  ))}
                  <td><StatusBadge status={row.status || 'cleaned'} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span className="pagination-info">
          Showing {startRow}–{endRow} of {totalRecords.toLocaleString()} records
        </span>
        <div className="pagination-buttons">
          <button
            className="pagination-btn"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
