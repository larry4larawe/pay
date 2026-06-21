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
  exportDocx: (bulletinData, fileName) =>
    ipcRenderer.invoke('export:docx', bulletinData, fileName),
  exportPdf: (bulletinData, fileName) =>
    ipcRenderer.invoke('export:pdf', bulletinData, fileName),
  openOutputFolder: (type) =>
    ipcRenderer.invoke('export:openFolder', type),

  // Paramètres
  getCompanyInfo: () => ipcRenderer.invoke('settings:getCompany'),
  saveCompanyInfo: (data) => ipcRenderer.invoke('settings:saveCompany', data),
  getTaxBrackets: () => ipcRenderer.invoke('settings:getTaxBrackets'),
  saveTaxBrackets: (data) => ipcRenderer.invoke('settings:saveTaxBrackets', data),
});
