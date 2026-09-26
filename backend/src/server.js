require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n===========================================`);
  console.log(`  DataBridge Backend`);
  console.log(`===========================================`);
  console.log(`  Status:    Running`);
  console.log(`  Host:      ${HOST}`);
  console.log(`  Port:      ${PORT}`);
  console.log(`  Local:     http://localhost:${PORT}`);
  console.log(`  Network:   http://<YOUR_IP>:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/api/health`);
  console.log(`  Frontend:  ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`  Env:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`===========================================\n`);
});
