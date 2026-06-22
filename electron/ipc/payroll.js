const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let _dataDir = null;
function getDataDir() {
  if (!_dataDir) {
    _dataDir = path.join(app.getPath('userData'), 'data');
  }
  return _dataDir;
}

// Taux CNSS (Togo)
const CNSS_SALARIAL = 0.04;       // 4% part salariale
const CNSS_PREST_FAM = 0.03;      // 3% prestations familiales
const CNSS_ACC_TRAVAIL = 0.02;    // 2% accidents du travail
const CNSS_VIEILLESSE = 0.125;    // 12,5% pension vieillesse

// Barème IRPP par défaut (Togo — ajustable dans Settings)
const DEFAULT_TAX_BRACKETS = [
  { min: 0, max: 35000, rate: 0 },
  { min: 35001, max: 75000, rate: 0.05 },
  { min: 75001, max: 130000, rate: 0.10 },
  { min: 130001, max: 200000, rate: 0.15 },
  { min: 200001, max: 300000, rate: 0.20 },
  { min: 300001, max: 500000, rate: 0.25 },
  { min: 500001, max: Infinity, rate: 0.30 },
];

function loadTaxBrackets() {
  const file = path.join(getDataDir(), 'taxBrackets.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  return DEFAULT_TAX_BRACKETS;
}

function calculateIRPP(baseImposable) {
  const brackets = loadTaxBrackets();
  let irpp = 0;
  for (const b of brackets) {
    if (baseImposable <= 0) break;
    const range = b.max - b.min + 1;
    const taxableInBracket = Math.min(baseImposable, range);
    irpp += taxableInBracket * b.rate;
    baseImposable -= taxableInBracket;
  }
  return Math.round(irpp);
}

function calculateCNSS_Salarial(salaireBrut) {
  return Math.round(salaireBrut * CNSS_SALARIAL);
}

function calculateCNSS_Patronal(salaireBrut) {
  return {
    prestationsFamiliales: Math.round(salaireBrut * CNSS_PREST_FAM),
    accidentsTravail: Math.round(salaireBrut * CNSS_ACC_TRAVAIL),
    vieillesse: Math.round(salaireBrut * CNSS_VIEILLESSE),
    total: Math.round(salaireBrut * (CNSS_PREST_FAM + CNSS_ACC_TRAVAIL + CNSS_VIEILLESSE)),
  };
}

function calculatePayroll(employee, salaryComponents, month, year, cumuls) {
  // Salaire brut = somme des éléments de rémunération
  const salaireBrut = salaryComponents.reduce((sum, c) => sum + c.montant, 0);

  // CNSS salariale
  const cnssSalarial = calculateCNSS_Salarial(salaireBrut);

  // Base imposable
  const baseImposable = salaireBrut - cnssSalarial;

  // IRPP
  const irpp = calculateIRPP(baseImposable);

  // Total retenues
  const totalRetenues = cnssSalarial + irpp;

  // Net à payer
  const netAPayer = salaireBrut - totalRetenues;

  // CNSS patronale
  const cnssPatronal = calculateCNSS_Patronal(salaireBrut);

  // Coût total employeur
  const coutTotalEmployeur = salaireBrut + cnssPatronal.total;

  // Cumuls annuels
  const cumulsAnnee = {
    brut: (cumuls?.brut || 0) + salaireBrut,
    cnss: (cumuls?.cnss || 0) + cnssSalarial,
    irpp: (cumuls?.irpp || 0) + irpp,
    net: (cumuls?.net || 0) + netAPayer,
  };

  return {
    employee,
    period: { month, year },
    remuneration: salaryComponents,
    salaireBrut,
    cnssSalarial,
    baseImposable,
    irpp,
    totalRetenues,
    netAPayer,
    cnssPatronal,
    coutTotalEmployeur,
    cumulsAnnee,
  };
}

function initPayrollHandlers(ipcMain) {
  ipcMain.handle('payroll:calculate', (_event, employee, salaryComponents, month, year, cumuls) => {
    return calculatePayroll(employee, salaryComponents, month, year, cumuls);
  });

  ipcMain.handle('payroll:generate', (_event, payrollData) => {
    // Retourne les données formatées prêtes pour la génération DOCX/PDF
    return payrollData;
  });

  // Settings handlers
  ipcMain.handle('settings:getCompany', () => {
    const file = path.join(getDataDir(), 'company.json');
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
    return null;
  });

  ipcMain.handle('settings:saveCompany', (_event, data) => {
    const file = path.join(getDataDir(), 'company.json');
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  });

  ipcMain.handle('settings:getTaxBrackets', () => loadTaxBrackets());

  ipcMain.handle('settings:saveTaxBrackets', (_event, data) => {
    const file = path.join(getDataDir(), 'taxBrackets.json');
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  });
}

module.exports = { initPayrollHandlers, calculatePayroll };
