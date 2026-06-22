const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tadpay', {
  // Employés
  getEmployees: () => ipcRenderer.invoke('employee:getAll'),
  getEmployee: (id) => ipcRenderer.invoke('employee:get', id),
  saveEmployee: (data) => ipcRenderer.invoke('employee:save', data),
  deleteEmployee: (id) => ipcRenderer.invoke('employee:delete', id),

  // Paie
  calculatePayroll: (employeeId, month, year) =>
    ipcRenderer.invoke('payroll:calculate', employeeId, month, year),
  generateBulletin: (payrollData) =>
    ipcRenderer.invoke('payroll:generate', payrollData),

  // Export
  exportDocx: (bulletinData, fileName, outputDir) =>
    ipcRenderer.invoke('export:docx', bulletinData, fileName, outputDir),
  exportPdf: (bulletinData, fileName, outputDir) =>
    ipcRenderer.invoke('export:pdf', bulletinData, fileName, outputDir),
  openOutputFolder: (path) =>
    ipcRenderer.invoke('export:openFolder', path),
  pickOutputFolder: () =>
    ipcRenderer.invoke('export:pickFolder'),

  // Paramètres
  getCompanyInfo: () => ipcRenderer.invoke('settings:getCompany'),
  saveCompanyInfo: (data) => ipcRenderer.invoke('settings:saveCompany', data),
  getTaxBrackets: () => ipcRenderer.invoke('settings:getTaxBrackets'),
  saveTaxBrackets: (data) => ipcRenderer.invoke('settings:saveTaxBrackets', data),
});
