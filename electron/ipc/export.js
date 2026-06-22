const fs = require('fs');
const path = require('path');
const { shell, BrowserWindow, app } = require('electron');
const { exportDocx } = require('../../src/utils/docx/generator');
const { buildBulletinHTML } = require('../../src/utils/pdf/converter');

// Lazy — résolus au premier appel (après app.whenReady)
let _paths = null;
function getPaths() {
  if (!_paths) {
    const userData = app.getPath('userData');
    const docs = app.getPath('documents');
    const outputBase = path.join(docs, 'TAD_Pay', 'Exports');
    _paths = {
      outputDocx: path.join(outputBase, 'docx'),
      outputPdf: path.join(outputBase, 'pdf'),
      dataDir: path.join(userData, 'data'),
    };
  }
  return _paths;
}

function ensureOutputDirs() {
  const p = getPaths();
  [p.outputDocx, p.outputPdf].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function loadCompanyInfo() {
  const file = path.join(getPaths().dataDir, 'company.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  return {
    nom: 'TAD IT CONSULTING SARL',
    formeJuridique: 'Société à Responsabilité Limitée',
    adresse: '',
    rccm: 'TG-LFW-01-2020-B12-04753',
    nif: '1001724348',
    numCNSSEmployeur: '4741176',
    telephone: '+228 22 50 65 47 / 93 80 48 10',
    signataireNom: 'ADIKI ABALO',
    signataireFonction: 'Responsable Administration du Personnel',
  };
}

function initExportHandlers(ipcMain) {
  // Export DOCX
  ipcMain.handle('export:docx', async (_event, bulletinData, fileName) => {
    try {
      ensureOutputDirs();
      const companyInfo = loadCompanyInfo();
      const filePath = await exportDocx(bulletinData, companyInfo, fileName);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Export PDF via Electron printToPDF
  ipcMain.handle('export:pdf', async (_event, bulletinData, fileName) => {
    try {
      ensureOutputDirs();
      const companyInfo = loadCompanyInfo();
      const html = buildBulletinHTML(bulletinData, companyInfo);

      // Créer une fenêtre cachée pour le rendu PDF
      const win = new BrowserWindow({
        width: 800,
        height: 1100,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      // Attendre un peu le rendu
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      win.close();

      const filePath = path.join(getPaths().outputPdf, `${fileName}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Ouvrir le dossier de sortie
  ipcMain.handle('export:openFolder', (_event, type) => {
    const p = getPaths();
    const folder = type === 'pdf' ? p.outputPdf : p.outputDocx;
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    shell.openPath(folder);
    return { success: true };
  });
}

module.exports = { initExportHandlers };
