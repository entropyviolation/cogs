/**
 * electron/preload.js — Electron preload (context-isolated)
 *
 * Runs in the renderer before the web app loads and exposes a minimal, read-only
 * `window.desktop` API (`isElectron`, `platform`, `versions`) via `contextBridge`.
 * This is the only privileged surface available to the renderer; all app data
 * stays in localStorage/Zustand in the renderer itself.
 */
const { contextBridge } = require("electron")

// Expose a minimal, read-only surface to the renderer. The app stores all of
// its data in localStorage, so no privileged APIs are required today, but this
// keeps a safe channel available for future desktop-only features.
contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
})
