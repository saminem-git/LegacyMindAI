'use strict';
// Runs the server and web dev servers together without relying on a third-party
// process runner (avoids network installs being blocked by corporate proxies).
const { spawn } = require('node:child_process');
const path = require('node:path');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rootDir = path.join(__dirname, '..');

const targets = [
  { name: 'server', cwd: path.join(rootDir, 'apps', 'server') },
  { name: 'web', cwd: path.join(rootDir, 'apps', 'web') },
];

const children = targets.map(({ cwd }) => spawn(npmCmd, ['run', 'dev'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' }));

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

children.forEach((child, i) => {
  child.on('exit', (code) => {
    console.log(`[${targets[i].name}] exited with code ${code}`);
    shutdown(code ?? 0);
  });
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
