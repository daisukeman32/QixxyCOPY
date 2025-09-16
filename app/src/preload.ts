import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any API methods here if needed
});