// D'Lotus PDV — Electron main process
const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const APP_URL = process.env.DLOTUS_APP_URL || "https://lotus-pdv-bar.preview.emergentagent.com";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0A0A0C",
    title: "D'Lotus PDV",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11") { mainWindow.setFullScreen(!mainWindow.isFullScreen()); event.preventDefault(); }
    if (input.control && input.shift && input.key.toLowerCase() === "i") { mainWindow.webContents.toggleDevTools(); event.preventDefault(); }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

Menu.setApplicationMenu(null);

// ---------- IPC: Listar impressoras instaladas no Windows ----------
ipcMain.handle("dlotus:list-printers", async () => {
  try {
    if (!mainWindow) return { ok: false, error: "Janela não disponível", printers: [] };
    const list = await mainWindow.webContents.getPrintersAsync();
    const printers = (list || []).map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      description: p.description || "",
      status: p.status,
      isDefault: !!p.isDefault,
    }));
    return { ok: true, printers };
  } catch (e) {
    return { ok: false, error: String(e), printers: [] };
  }
});

// ---------- IPC: Impressão silenciosa ----------
ipcMain.handle("dlotus:silent-print", async (_evt, opts = {}) => {
  const { printerName, html, copies = 1, debug = false, paperWidthMm = 72 } = opts;
  if (!printerName) return { ok: false, error: "Nome da impressora não informado" };
  if (!html) return { ok: false, error: "Conteúdo HTML vazio" };
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: "Janela do PDV indisponível" };
  // Confere o nome exato instalado no Windows antes de enviar o cupom.
  try {
    const available = await mainWindow.webContents.getPrintersAsync();
    if (!available.some((p) => p.name === printerName)) {
      return { ok: false, error: `Impressora não instalada ou indisponível neste Windows: ${printerName}` };
    }
  } catch (e) {
    return { ok: false, error: `Não foi possível consultar as impressoras: ${e.message}` };
  }

  const tmpFile = path.join(os.tmpdir(), `dlotus-receipt-${process.pid}-${Date.now()}-${require("crypto").randomBytes(6).toString("hex")}.html`);
  try { fs.writeFileSync(tmpFile, html, "utf8"); }
  catch (e) { return { ok: false, error: "Falha ao gravar temp: " + e.message }; }

  // Janela de render: largura ~302px = 80mm, altura grande o suficiente
  const printWin = new BrowserWindow({
    show: !!debug,
    width: 400,
    height: 1200,
    backgroundColor: "#ffffff",
    webPreferences: { sandbox: true },
  });

  const cleanup = () => {
    try { if (!debug) printWin.destroy(); } catch (_) {}
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  };

  const diagnostics = { tmpFile, printerName, paperWidthMm };

  try {
    await printWin.loadFile(tmpFile);
    await new Promise((r) => setTimeout(r, 200));

    // Salva um PDF do que o Chromium renderizou, para diagnóstico
    try {
      const pdfBuf = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: { width: paperWidthMm * 1000, height: 297000 },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      const pdfPath = path.join(app.getPath("desktop"), `dlotus-ultimo-cupom.pdf`);
      fs.writeFileSync(pdfPath, pdfBuf);
      diagnostics.pdfSaved = pdfPath;
      diagnostics.pdfSizeKb = Math.round(pdfBuf.length / 1024);
    } catch (pdfErr) {
      diagnostics.pdfError = String(pdfErr);
    }

    // IMPORTANTE: pageSize em microns (1mm = 1000) — necessário para a térmica
    // não cortar o cupom como se fosse A4.
    const printOpts = {
      silent: true,
      printBackground: true,
      deviceName: printerName,
      copies: Math.max(1, Number(copies) || 1),
      margins: { marginType: "none" },
      pageSize: { width: paperWidthMm * 1000, height: 297000 },
    };
    diagnostics.printOptions = printOpts;

    const result = await new Promise((resolve) => {
      printWin.webContents.print(printOpts, (success, failureReason) => {
        resolve({ ok: !!success, error: success ? null : (failureReason || "unknown") });
      });
    });

    await new Promise((r) => setTimeout(r, 250));
    cleanup();
    return { ...result, diagnostics };
  } catch (e) {
    cleanup();
    return { ok: false, error: String(e), diagnostics };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
