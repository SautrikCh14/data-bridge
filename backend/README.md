# DataBridge Backend

A data-processing platform backend for small nonprofits. Accepts CSV and Excel files, parses them, detects schemas, normalizes data, finds duplicates and inconsistencies, identifies relationships between datasets, reconciles data, calculates metrics, and provides full traceability.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **File Upload**: Multer
- **CSV Parsing**: csv-parse
- **Excel Parsing**: SheetJS (xlsx)
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **PDF Reports**: PDFKit
- **IDs**: crypto.randomUUID()
- **Database**: None (in-memory storage)

## Folder Structure

```
backend/
├── src/
│   ├── server.js                    # Entry point, listens on 0.0.0.0
│   ├── app.js                       # Express app configuration
│   ├── routes/
│   │   ├── datasetRoutes.js         # Dataset CRUD and export routes
│   │   ├── analysisRoutes.js        # Analysis and traceability routes
│   │   └── reportRoutes.js          # Report generation routes
│   ├── controllers/
│   │   ├── datasetController.js     # Upload, preview, dashboard, export
│   │   ├── analysisController.js    # Analysis pipeline orchestration
│   │   └── reportController.js      # JSON and PDF report generation
│   ├── services/
│   │   ├── fileParser.js            # File type routing
│   │   ├── csvParser.js             # CSV parsing with csv-parse
│   │   ├── excelParser.js           # Excel parsing with SheetJS
│   │   ├── normalizer.js            # Schema detection and normalization
│   │   ├── duplicateDetector.js     # Exact and potential duplicate detection
│   │   ├── inconsistencyDetector.js # Cross-dataset inconsistency detection
│   │   ├── reconciliationService.js # Relationship discovery and reconciliation
│   │   ├── metricService.js         # Dynamic metric calculation
│   │   ├── traceabilityService.js   # Lineage, assumptions, limitations
│   │   └── reportService.js         # Report data and PDF generation
│   ├── middleware/
│   │   ├── uploadMiddleware.js      # Multer config, file validation
│   │   ├── errorHandler.js          # Global error handling
│   │   └── validation.js            # Request validation
│   ├── utils/
│   │   ├── dataTypes.js             # Type detection (email, phone, date, etc.)
│   │   ├── normalizeValue.js        # Value normalization utilities
│   │   └── response.js              # Standard API response helpers
│   └── storage/
│       └── inMemoryStore.js         # In-memory Map-based dataset store
├── uploads/                         # Temporary uploaded files
├── processed/                       # Processed output files
├── reports/                         # Generated reports
├── test/
│   ├── fixtures/                    # Synthetic test data (CSV)
│   └── runTests.js                  # Test runner
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Installation

```bash
cd backend
npm install
```

## Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` as needed:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
NODE_ENV=development
```

## Running the Backend

Development (with auto-reload):

```bash
npm run dev
```

Production:

```bash
npm start
```

The server listens on `0.0.0.0:5000` by default.

## API Documentation

### Health Check

```
GET /api/health
```

Response:
```json
{
  "success": true,
  "service": "DataBridge Backend",
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123.456,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Upload Files

```
POST /api/datasets/upload
Content-Type: multipart/form-data
Field: files (multiple)
Accepted: .csv, .xls, .xlsx
Max: 50MB per file
```

Response:
```json
{
  "success": true,
  "datasetId": "uuid-here",
  "files": [
    {
      "fileId": "uuid-here",
      "filename": "beneficiaries.csv",
      "extension": ".csv",
      "size": 245812,
      "status": "uploaded"
    }
  ]
}
```

### Preview Data

```
GET /api/datasets/:datasetId/preview?sheet=SheetName&page=1&limit=20
```

Response:
```json
{
  "success": true,
  "sheet": "beneficiaries",
  "page": 1,
  "limit": 20,
  "totalRows": 500,
  "totalPages": 25,
  "columns": ["beneficiary_id", "name", "email"],
  "rows": [...]
}
```

### Run Analysis

```
POST /api/datasets/:datasetId/analyze
```

Runs the full pipeline: schema detection → normalization → duplicate detection → inconsistency detection → reconciliation → metric calculation → traceability generation.

Response:
```json
{
  "success": true,
  "datasetId": "uuid-here",
  "status": "completed",
  "summary": {
    "files": 3,
    "sheets": 4,
    "records": 4582,
    "cleanRecords": 4545,
    "duplicates": 37,
    "potentialDuplicates": 12,
    "inconsistencies": 14,
    "missingValues": 82,
    "relationships": 2,
    "metricsGenerated": 18
  }
}
```

### Processing Status

```
GET /api/datasets/:datasetId/status
```

Response:
```json
{
  "success": true,
  "datasetId": "uuid-here",
  "status": "processing",
  "progress": 65,
  "stage": "duplicate_detection"
}
```

Possible stages: `upload`, `parsing`, `schema_detection`, `normalization`, `duplicate_detection`, `inconsistency_detection`, `reconciliation`, `metric_calculation`, `completed`, `error`

### Dashboard

```
GET /api/datasets/:datasetId/dashboard
```

Response:
```json
{
  "success": true,
  "datasetId": "uuid-here",
  "summary": {
    "totalRecords": 1420,
    "cleanRecords": 1288,
    "duplicates": 84,
    "potentialDuplicates": 12,
    "missingValues": 31,
    "inconsistencies": 17
  },
  "statistics": {
    "totalRecords": 1288,
    "beneficiary_id": 1142
  },
  "charts": {
    "recordsBy_program": [
      { "label": "Education", "count": 450 }
    ]
  },
  "metrics": [
    {
      "metricId": "uuid",
      "name": "Unique beneficiary_id",
      "value": 1142,
      "category": "unique_count",
      "calculation": "COUNT DISTINCT beneficiary_id"
    }
  ]
}
```

### Cleaned Data

```
GET /api/datasets/:datasetId/cleaned-data?page=1&limit=20&sheet=SheetName
```

Response:
```json
{
  "success": true,
  "sheet": "beneficiaries",
  "page": 1,
  "limit": 20,
  "total": 1288,
  "totalPages": 65,
  "columns": [...],
  "rows": [...]
}
```

### Issues

```
GET /api/datasets/:datasetId/issues?type=duplicate&severity=warning&page=1&limit=20
```

Response:
```json
{
  "success": true,
  "summary": {
    "duplicates": 5,
    "inconsistencies": 3,
    "missingValues": 10,
    "total": 18
  },
  "issues": [
    {
      "type": "duplicate",
      "subType": "exact",
      "severity": "warning",
      "sheet": "beneficiaries",
      "rows": [1, 16],
      "reason": "Exact duplicate rows"
    }
  ]
}
```

### Traceability

```
GET /api/datasets/:datasetId/traceability
```

Response:
```json
{
  "success": true,
  "traceability": [
    {
      "metricId": "uuid",
      "name": "Unique beneficiary_id",
      "value": 1142,
      "calculation": "COUNT DISTINCT beneficiary_id",
      "sources": [
        { "file": "beneficiaries.csv", "sheet": "beneficiaries", "column": "beneficiary_id" }
      ],
      "transformations": ["Trimmed whitespace", "Normalized to lowercase"],
      "assumptions": ["beneficiary_id is treated as an identifier field"],
      "limitations": ["4 records had no beneficiary_id"]
    }
  ]
}
```

### Single Metric Traceability

```
GET /api/datasets/:datasetId/traceability/:metricId
```

### Assumptions & Limitations

```
GET /api/datasets/:datasetId/limitations
```

Response:
```json
{
  "success": true,
  "assumptions": [
    {
      "text": "beneficiary_id is treated as a unique identifier.",
      "source": "beneficiaries.csv",
      "column": "beneficiary_id"
    }
  ],
  "limitations": [
    {
      "text": "Data is stored in-memory and will be lost on server restart.",
      "severity": "info",
      "source": "system"
    }
  ]
}
```

### Export Cleaned CSV

```
GET /api/datasets/:datasetId/export/csv?sheet=SheetName
```

Returns a CSV file download with `Content-Type: text/csv`.

### Audit Report (JSON)

```
GET /api/datasets/:datasetId/report
```

### Audit Report (PDF)

```
GET /api/datasets/:datasetId/report/pdf
```

Returns a PDF file download.

### List All Datasets

```
GET /api/datasets
```

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only CSV, XLS and XLSX files are supported."
  }
}
```

Error codes: `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `TOO_MANY_FILES`, `NO_FILES`, `DATASET_NOT_FOUND`, `NOT_PARSED`, `ANALYSIS_NOT_COMPLETE`, `SHEET_NOT_FOUND`, `METRIC_NOT_FOUND`, `NOT_FOUND`, `INTERNAL_ERROR`

## Frontend Connection

The React frontend (on a separate computer) connects to this backend over HTTP.

### Same Machine

```env
# Backend .env
FRONTEND_URL=http://localhost:5173

# Frontend .env
VITE_API_URL=http://localhost:5000/api
```

### Different Computers (Local Network)

1. Find the backend computer's IP address:

   ```bash
   # Windows
   ipconfig

   # Linux/Mac
   ifconfig
   # or
   ip addr
   ```

2. Configure the backend `.env`:

   ```env
   PORT=5000
   FRONTEND_URL=http://192.168.1.100:5173
   ```

   Replace `192.168.1.100` with the frontend computer's IP.

3. Configure the frontend `.env`:

   ```env
   VITE_API_URL=http://192.168.1.200:5000/api
   ```

   Replace `192.168.1.200` with the backend computer's IP.

4. **Windows Firewall**: You may need to allow Node.js through Windows Firewall:
   - Open Windows Defender Firewall
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Click "Change settings" → "Allow another app"
   - Browse to your Node.js executable
   - Check both "Private" and "Public" network boxes

5. Both computers must be on the same local network.

### Multiple Frontend Origins

Set comma-separated origins in `.env`:

```env
FRONTEND_URL=http://localhost:5173,http://192.168.1.100:5173
```

## Running Tests

Start the server first, then run:

```bash
npm test
```

The test runner exercises all API endpoints using synthetic test data in `test/fixtures/`.

## In-Memory Architecture

This hackathon version uses in-memory storage (`Map<datasetId, datasetObject>`). There is no database.

**Implications:**
- All data is lost when the server restarts
- Multiple server instances do not share data
- Memory usage grows with each uploaded dataset
- Suitable for hackathon demos, not production

Each dataset object contains:
- `datasetId` — unique identifier
- `files` — uploaded file metadata
- `parsedSheets` — parsed sheet data
- `originalData` — pre-normalization data
- `cleanedData` — post-normalization, de-duplicated data
- `schema` — detected column types and statistics
- `issues` — missing values and data quality issues
- `duplicates` — exact and potential duplicate records
- `inconsistencies` — cross-dataset conflicts
- `reconciliations` — matched dataset relationships
- `metrics` — dynamically calculated metrics
- `traceability` — full lineage for every metric
- `assumptions` — documented assumptions made during processing
- `limitations` — documented limitations of the analysis
- `qualitySummary` — overall data quality statistics
- `status` / `stage` / `progress` — processing state

## Data Principles

- Never invent data or metrics
- Never silently delete duplicates (originals are preserved)
- Never hide inconsistencies
- Always preserve source information
- Always record transformations
- Always record assumptions and limitations
- Return source-traceable metrics
- Do not assume specific column names exist
- Do not merge datasets without evidence

## Known Limitations

1. In-memory storage — data lost on restart
2. Synchronous processing — large files may block the event loop
3. Potential duplicate detection uses heuristic matching
4. Date parsing may not handle all international formats
5. No authentication or authorization
6. No rate limiting
7. Uploaded files are stored on the filesystem temporarily
