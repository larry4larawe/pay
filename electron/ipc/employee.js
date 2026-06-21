const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');

function loadEmployees() {
  if (!fs.existsSync(EMPLOYEES_FILE)) return [];
  return JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf-8'));
}

function saveEmployees(data) {
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function initEmployeeHandlers(ipcMain) {
  ipcMain.handle('employee:getAll', () => loadEmployees());

  ipcMain.handle('employee:get', (_event, id) => {
    const employees = loadEmployees();
    return employees.find((e) => e.id === id) || null;
  });

  ipcMain.handle('employee:save', (_event, data) => {
    const employees = loadEmployees();
    if (data.id) {
      const idx = employees.findIndex((e) => e.id === data.id);
      if (idx >= 0) {
        employees[idx] = { ...employees[idx], ...data };
      }
    } else {
      data.id = crypto.randomUUID();
      employees.push(data);
    }
    saveEmployees(employees);
    return data;
  });

  ipcMain.handle('employee:delete', (_event, id) => {
    let employees = loadEmployees();
    employees = employees.filter((e) => e.id !== id);
    saveEmployees(employees);
    return { success: true };
  });
}

module.exports = { initEmployeeHandlers };
