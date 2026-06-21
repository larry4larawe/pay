const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadEmployees() {
  ensureDataDir();
  if (!fs.existsSync(EMPLOYEES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf-8'));
  } catch (err) {
    console.error('Erreur lecture employees.json:', err.message);
    return [];
  }
}

function saveEmployees(data) {
  ensureDataDir();
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function initEmployeeHandlers(ipcMain) {
  ipcMain.handle('employee:getAll', () => {
    console.log('IPC: employee:getAll');
    return loadEmployees();
  });

  ipcMain.handle('employee:get', (_event, id) => {
    console.log('IPC: employee:get', id);
    const employees = loadEmployees();
    return employees.find((e) => e.id === id) || null;
  });

  ipcMain.handle('employee:save', (_event, data) => {
    console.log('IPC: employee:save - reçu:', JSON.stringify(data).substring(0, 200));
    try {
      const employees = loadEmployees();
      if (data.id) {
        const idx = employees.findIndex((e) => e.id === data.id);
        if (idx >= 0) {
          employees[idx] = { ...employees[idx], ...data };
          console.log('IPC: employee:save - mise à jour index', idx);
        }
      } else {
        data.id = crypto.randomUUID();
        employees.push(data);
        console.log('IPC: employee:save - nouvel employé id:', data.id);
      }
      saveEmployees(employees);
      console.log('IPC: employee:save - sauvegardé, total:', employees.length);
      return { success: true, data };
    } catch (err) {
      console.error('IPC: employee:save - erreur:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('employee:delete', (_event, id) => {
    console.log('IPC: employee:delete', id);
    let employees = loadEmployees();
    employees = employees.filter((e) => e.id !== id);
    saveEmployees(employees);
    return { success: true };
  });
}

module.exports = { initEmployeeHandlers };
