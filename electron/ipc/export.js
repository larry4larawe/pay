const fs = require('fs');
const path = require('path');
const { shell, BrowserWindow, app, dialog } = require('electron');
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

function ensureOutputDirs(outputDir) {
  const base = outputDir || getPaths().outputDocx;
  const docxDir = outputDir ? path.join(outputDir, 'docx') : getPaths().outputDocx;
  const pdfDir = outputDir ? path.join(outputDir, 'pdf') : getPaths().outputPdf;
  [docxDir, pdfDir].forEach((dir) => {
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

function initExportHandlers(ipcMain, getMainWindow) {
  // Dialogue numéro de chèque
  ipcMain.handle('dialog:promptCheque', async (_event, monthLabel) => {
    // Utilise un BrowserWindow modal au lieu de prompt() bloquant
    return new Promise((resolve) => {
      const parentWin = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
      const promptWin = new BrowserWindow({
        width: 420,
        height: 180,
        parent: parentWin || undefined,
        modal: Boolean(parentWin),
        show: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        title: 'N° de chèque',
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body { font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f7; }
        label { font-size: 13px; color: #555; }
        input { width: 100%; padding: 8px; margin: 8px 0 16px; border: 1px solid #d1d1d6; border-radius: 6px; font-size: 14px; }
        .btns { text-align: right; }
        button { padding: 6px 16px; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; margin-left: 8px; }
        .ok { background: #007aff; color: #fff; }
        .cancel { background: transparent; border: 1px solid #d1d1d6; }
      </style></head><body>
        <label>N° du chèque pour ${monthLabel} :</label>
        <input id="num" type="text" autofocus onkeydown="if(event.key==='Enter') submit()">
        <div class="btns">
          <button class="cancel" onclick="window.close()">Annuler</button>
          <button class="ok" onclick="submit()">Valider</button>
        </div>
        <script>
          function submit() {
            window.__result = document.getElementById('num').value;
            window.close();
          }
        </script>
      </body></html>`;

      promptWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      promptWin.once('ready-to-show', () => promptWin.show());

      promptWin.on('close', async (e) => {
        e.preventDefault();
        try {
          const val = await promptWin.webContents.executeJavaScript('window.__result || null');
          promptWin.destroy();
          resolve(val);
        } catch {
          promptWin.destroy();
          resolve(null);
        }
      });
    });
  });

  // Sélecteur de dossier
  ipcMain.handle('export:pickFolder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choisir le dossier de sortie',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return { canceled: true };
    return { canceled: false, path: result.filePaths[0] };
  });

  // Export DOCX
  ipcMain.handle('export:docx', async (_event, bulletinData, fileName, outputDir) => {
    try {
      const docxDir = outputDir ? path.join(outputDir, 'docx') : getPaths().outputDocx;
      ensureOutputDirs(outputDir);

      // Override OUTPUT_DIR dans le générateur en passant le chemin
      const companyInfo = loadCompanyInfo();
      const { generateBulletin } = require('../../src/utils/docx/generator');
      const { Packer } = require('docx');

      const doc = generateBulletin(bulletinData, companyInfo);
      const buffer = await Packer.toBuffer(doc);
      const filePath = path.join(docxDir, `${fileName}.docx`);
      fs.writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Export PDF via Electron printToPDF
  ipcMain.handle('export:pdf', async (_event, bulletinData, fileName, outputDir) => {
    try {
      const pdfDir = outputDir ? path.join(outputDir, 'pdf') : getPaths().outputPdf;
      ensureOutputDirs(outputDir);

      const companyInfo = loadCompanyInfo();
      const html = buildBulletinHTML(bulletinData, companyInfo);

      const win = new BrowserWindow({
        width: 800,
        height: 1100,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      win.close();

      const filePath = path.join(pdfDir, `${fileName}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Ouvrir le dossier de sortie
  ipcMain.handle('export:openFolder', (_event, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
      shell.openPath(folderPath);
    } else {
      // Fallback: ouvrir le dossier docx par défaut
      const p = getPaths();
      if (!fs.existsSync(p.outputDocx)) fs.mkdirSync(p.outputDocx, { recursive: true });
      shell.openPath(p.outputDocx);
    }
    return { success: true };
  });
}

module.exports = { initExportHandlers };
