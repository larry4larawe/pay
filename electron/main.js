const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initEmployeeHandlers } = require('./ipc/employee');
const { initPayrollHandlers } = require('./ipc/payroll');
const { initExportHandlers } = require('./ipc/export');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TAD Pay',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initEmployeeHandlers(ipcMain);
  initPayrollHandlers(ipcMain);
  // Getter : la fenêtre n'existe pas encore ici et peut être recréée (activate).
  initExportHandlers(ipcMain, () => mainWindow);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
