// Preload script - contextIsolation bridge
// No sensitive data exposed to renderer
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('legacymind', {
  version: '1.0.0',
  platform: process.platform,
});
