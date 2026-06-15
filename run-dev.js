const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[35m%s\x1b[0m', '==============================================');
console.log('\x1b[36m%s\x1b[0m', ' 🚀  Starting Meridian AI Workspace Dev Environment');
console.log('\x1b[35m%s\x1b[0m', '==============================================\n');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

// Detect virtual environment uvicorn
const uvicornPath = path.join(backendDir, 'venv', 'Scripts', 'uvicorn.exe');
if (!fs.existsSync(uvicornPath)) {
  console.error('\x1b[31m%s\x1b[0m', `❌ Error: Virtual environment uvicorn not found at: ${uvicornPath}`);
  console.log('Please ensure python virtual environment is initialized in: backend/venv');
  process.exit(1);
}

// 1. Spawning Backend (FastAPI)
console.log('\x1b[34m%s\x1b[0m', '📡 [System] Starting FastAPI Backend on port 8000...');
const backend = spawn(uvicornPath, ['app.main:app', '--reload', '--port', '8000'], {
  cwd: backendDir,
});

// Helper to format output
const logData = (prefix, color, data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line) {
      console.log(`${color}${prefix}\x1b[0m ${line}`);
    }
  });
};

backend.stdout.on('data', (data) => logData('[Backend]', '\x1b[32m', data)); // Green
backend.stderr.on('data', (data) => logData('[Backend]', '\x1b[32m', data)); // Treat backend stderr as info (uvicorn logs standard warnings there too)

backend.on('close', (code) => {
  console.log('\x1b[31m%s\x1b[0m', `🛑 [System] Backend process exited with code ${code}`);
  cleanupAndExit();
});

// 2. Spawning Frontend (Next.js)
console.log('\x1b[34m%s\x1b[0m', '🎨 [System] Starting Next.js Frontend on port 5000...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  env: { ...process.env, PORT: '5000' }
});

frontend.stdout.on('data', (data) => logData('[Frontend]', '\x1b[36m', data)); // Cyan
frontend.stderr.on('data', (data) => logData('[Frontend ERROR]', '\x1b[31m', data)); // Red

frontend.on('close', (code) => {
  console.log('\x1b[31m%s\x1b[0m', `🛑 [System] Frontend process exited with code ${code}`);
  cleanupAndExit();
});

// Cleanup handler
let isCleaningUp = false;
function cleanupAndExit() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log('\x1b[33m%s\x1b[0m', '\n🛑 [System] Shutting down dev servers...');

  try {
    backend.kill();
  } catch (e) { }

  try {
    frontend.kill();
  } catch (e) { }

  setTimeout(() => {
    process.exit(0);
  }, 500);
}

// Intercept Ctrl+C
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);
