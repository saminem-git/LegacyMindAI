const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

const SERVER_PORT = 3001;
const WEB_PORT = 5173;
const isDev = process.env.NODE_ENV !== 'production';

function findBun() {
  const candidates = [
    path.join(process.env.HOME || '', '.bun', 'bin', 'bun'),
    '/usr/local/bin/bun',
    '/usr/bin/bun',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'bun';
}

function startBackend() {
  const bunPath = findBun();
  const serverDir = path.join(__dirname, '..', 'server');
  const serverEntry = path.join(serverDir, 'src', 'index.ts');

  console.log(`Starting backend: ${bunPath} run ${serverEntry}`);

  serverProcess = spawn(bunPath, ['run', serverEntry], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', d => console.log('[server]', d.toString().trim()));
  serverProcess.stderr.on('data', d => console.error('[server]', d.toString().trim()));
  serverProcess.on('exit', code => console.log('[server] exited with code', code));
}

function waitForServer(url, retries = 20) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    let attempts = 0;
    const check = () => {
      http.get(url, res => {
        if (res.statusCode === 200) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) reject(new Error(`Server not ready after ${retries} attempts`));
      else setTimeout(check, 500);
    };
    check();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'LegacyMind AI',
    backgroundColor: '#030712',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // In dev mode load Vite dev server
    try {
      await waitForServer(`http://localhost:${WEB_PORT}`);
      mainWindow.loadURL(`http://localhost:${WEB_PORT}`);
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } catch {
      // Fall back to built files
      const indexPath = path.join(__dirname, '..', 'web', 'dist', 'index.html');
      mainWindow.loadFile(indexPath);
    }
  } else {
    const indexPath = path.join(__dirname, '..', 'web', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }
}

app.whenReady().then(async () => {
  startBackend();
  // Give backend a moment to start
  await new Promise(r => setTimeout(r, 2000));
  await createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
