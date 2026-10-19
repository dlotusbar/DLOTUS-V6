// D'Lotus PDV — preload bridge
// Expõe uma API segura (contextIsolated) do Electron para o renderer (React)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dlotus", {
  isDesktop: true,
  platform: process.platform,
  listPrinters: () => ipcRenderer.invoke("dlotus:list-printers"),
  silentPrint: (opts) => ipcRenderer.invoke("dlotus:silent-print", opts),
});
