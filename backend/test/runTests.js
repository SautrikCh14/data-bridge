const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';
let datasetId = null;
let passed = 0;
let failed = 0;
let total = 0;

function log(status, name, detail) {
  const icon = status === 'PASS' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

function request(method, urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, body, json, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

function uploadFiles(filePaths) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const url = new URL('/api/datasets/upload', BASE_URL);

    let body = '';
    const buffers = [];

    for (const filePath of filePaths) {
      const filename = path.basename(filePath);
      const content = fs.readFileSync(filePath);

      body = `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`;
      body += `Content-Type: application/octet-stream\r\n\r\n`;
      buffers.push(Buffer.from(body));
      buffers.push(content);
      buffers.push(Buffer.from('\r\n'));
    }

    buffers.push(Buffer.from(`--${boundary}--\r\n`));
    const fullBody = Buffer.concat(buffers);

    const reqOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length
      }
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString();
        let json = null;
        try { json = JSON.parse(responseBody); } catch (e) {}
        resolve({ status: res.statusCode, body: responseBody, json, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    log('PASS', name);
  } catch (err) {
    failed++;
    log('FAIL', name, err.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
  console.log('\n\x1b[1mDataBridge Backend Tests\x1b[0m');
  console.log('='.repeat(50));
  console.log(`Target: ${BASE_URL}\n`);

  await test('Health endpoint returns healthy status', async () => {
    const res = await request('GET', '/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success: true');
    assert(res.json.service === 'DataBridge Backend', 'Wrong service name');
    assert(res.json.status === 'healthy', 'Expected healthy status');
  });

  await test('Upload CSV files', async () => {
    const fixtures = path.join(__dirname, 'fixtures');
    const files = [
      path.join(fixtures, 'beneficiaries.csv'),
      path.join(fixtures, 'programs.csv')
    ];

    for (const f of files) {
      assert(fs.existsSync(f), `Test fixture not found: ${f}`);
    }

    const res = await uploadFiles(files);
    assert(res.status === 201, `Expected 201, got ${res.status}: ${res.body}`);
    assert(res.json.success === true, 'Expected success: true');
    assert(res.json.datasetId, 'Expected datasetId');
    assert(res.json.files.length === 2, `Expected 2 files, got ${res.json.files.length}`);
    datasetId = res.json.datasetId;
  });

  await test('Get dataset status after upload', async () => {
    assert(datasetId, 'No datasetId from upload');
    const res = await request('GET', `/api/datasets/${datasetId}/status`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.datasetId === datasetId, 'Wrong datasetId');
  });

  await test('Get preview data', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/preview?page=1&limit=5`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.rows.length > 0, 'Expected rows');
    assert(res.json.columns.length > 0, 'Expected columns');
  });

  await test('Run analysis pipeline', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('POST', `/api/datasets/${datasetId}/analyze`);
    assert(res.status === 200, `Expected 200, got ${res.status}: ${res.body}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.status === 'completed', 'Expected completed status');
    assert(res.json.summary, 'Expected summary');
    assert(res.json.summary.records > 0, 'Expected records > 0');
  });

  await test('Get dashboard data', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/dashboard`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.summary, 'Expected summary');
    assert(res.json.metrics, 'Expected metrics');
    assert(res.json.metrics.length > 0, 'Expected at least one metric');
  });

  await test('Get issues including duplicates', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/issues`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.summary, 'Expected summary');
    assert(res.json.summary.total > 0, 'Expected issues to be detected');
  });

  await test('Get traceability data', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/traceability`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.traceability, 'Expected traceability');
    assert(res.json.traceability.length > 0, 'Expected traceability entries');
  });

  await test('Get single metric traceability', async () => {
    assert(datasetId, 'No datasetId');
    const traceRes = await request('GET', `/api/datasets/${datasetId}/traceability`);
    const firstMetric = traceRes.json.traceability[0];
    assert(firstMetric, 'No traceability entries found');

    const res = await request('GET', `/api/datasets/${datasetId}/traceability/${firstMetric.metricId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.metric, 'Expected metric');
    assert(res.json.metric.sources, 'Expected sources');
  });

  await test('Get cleaned data', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/cleaned-data?page=1&limit=10`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.rows, 'Expected rows');
    assert(res.json.columns, 'Expected columns');
  });

  await test('Get assumptions and limitations', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/limitations`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(Array.isArray(res.json.assumptions), 'Expected assumptions array');
    assert(Array.isArray(res.json.limitations), 'Expected limitations array');
  });

  await test('Export cleaned CSV', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/export/csv`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type'].includes('text/csv'), 'Expected text/csv content type');
    assert(res.headers['content-disposition'], 'Expected content-disposition header');
    assert(res.body.length > 0, 'Expected CSV content');
  });

  await test('Get audit report (JSON)', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/report`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json.success === true, 'Expected success');
    assert(res.json.report, 'Expected report');
    assert(res.json.report.files, 'Expected files in report');
    assert(res.json.report.traceability, 'Expected traceability in report');
  });

  await test('Get PDF report', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/report/pdf`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type'].includes('application/pdf'), 'Expected PDF content type');
  });

  await test('Get audit report (TXT)', async () => {
    assert(datasetId, 'No datasetId');
    const res = await request('GET', `/api/datasets/${datasetId}/report?format=txt`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type'].includes('text/plain'), 'Expected text/plain content type');
    assert(res.headers['content-disposition'], 'Expected content-disposition header');
    assert(res.body.includes('DATABRIDGE AUDIT REPORT'), 'Expected DATABRIDGE AUDIT REPORT header');
    assert(res.body.includes('Processing Timestamp'), 'Expected timestamp');
    assert(res.body.includes('CLEANING & NORMALIZATION ACTIONS PERFORMED'), 'Expected cleaning actions');
  });

  await test('Invalid file type rejected', async () => {
    const tmpPath = path.join(__dirname, 'fixtures', 'test.txt');
    fs.writeFileSync(tmpPath, 'this is not a valid file');
    try {
      const res = await uploadFiles([tmpPath]);
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    } finally {
      fs.unlinkSync(tmpPath);
    }
  });

  await test('Nonexistent dataset returns 404', async () => {
    const res = await request('GET', '/api/datasets/nonexistent-id/status');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('Nonexistent route returns 404', async () => {
    const res = await request('GET', '/api/nonexistent');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log(`\x1b[1mResults: ${passed}/${total} passed, ${failed} failed\x1b[0m`);
  if (failed > 0) {
    console.log('\x1b[31mSome tests failed!\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32mAll tests passed!\x1b[0m\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
