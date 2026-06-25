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

// Taux de cotisation par défaut (Togo — ajustables dans Settings)
const DEFAULT_RATES = {
  cnssSalarial: 0.04,         // 4% part salariale
  amu: 0.05,                  // 5% AMU (Assurance Maladie Universelle)
  prestationsFamiliales: 0.03,// 3% prestations familiales
  accidentsTravail: 0.02,     // 2% accidents du travail
  vieillesse: 0.125,          // 12,5% pension vieillesse
};

function loadRates() {
  const file = path.join(getDataDir(), 'rates.json');
  if (fs.existsSync(file)) {
    try {
      return { ...DEFAULT_RATES, ...JSON.parse(fs.readFileSync(file, 'utf-8')) };
    } catch {
      return { ...DEFAULT_RATES };
    }
  }
  return { ...DEFAULT_RATES };
}

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
  // Les tranches sont définies par leur borne supérieure (max). On taxe
  // progressivement la part du revenu comprise entre la borne inférieure
  // de la tranche précédente et celle de la tranche courante.
  let lowerBound = 0;
  for (const b of brackets) {
    const upper = (b.max === null || b.max === undefined || !isFinite(b.max))
      ? Infinity
      : b.max;
    if (baseImposable <= lowerBound) break;
    const taxable = Math.min(baseImposable, upper) - lowerBound;
    if (taxable > 0) irpp += taxable * b.rate;
    lowerBound = upper;
  }
  return Math.round(irpp);
}

function calculateCNSS_Salarial(salaireBrut, rates) {
  return Math.round(salaireBrut * rates.cnssSalarial);
}

function calculateCNSS_Patronal(salaireBrut, rates) {
  return {
    prestationsFamiliales: Math.round(salaireBrut * rates.prestationsFamiliales),
    accidentsTravail: Math.round(salaireBrut * rates.accidentsTravail),
    vieillesse: Math.round(salaireBrut * rates.vieillesse),
    total: Math.round(salaireBrut * (rates.prestationsFamiliales + rates.accidentsTravail + rates.vieillesse)),
  };
}

// Nombre de mois cumulés dans l'année, en tenant compte de la date d'embauche.
// Si l'employé a été embauché en cours d'année, on ne compte que les mois
// effectivement travaillés. NB : suppose un salaire mensuel constant.
function monthsElapsed(employee, month, year) {
  let startMonth = 1;
  if (employee && employee.dateEmbauche) {
    const d = new Date(employee.dateEmbauche);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() === year) startMonth = d.getMonth() + 1;
      else if (d.getFullYear() > year) return 0;
    }
  }
  return Math.max(0, month - startMonth + 1);
}

function calculatePayroll(employee, salaryComponents, month, year, cumuls) {
  const rates = loadRates();

  // Salaire brut = somme des éléments de rémunération
  const salaireBrut = salaryComponents.reduce((sum, c) => sum + c.montant, 0);

  // CNSS salariale
  const cnssSalarial = calculateCNSS_Salarial(salaireBrut, rates);

  // AMU
  const amu = Math.round(salaireBrut * rates.amu);

  // Base imposable
  const baseImposable = salaireBrut - cnssSalarial - amu;

  // IRPP
  const irpp = calculateIRPP(baseImposable);

  // Total retenues
  const totalRetenues = cnssSalarial + amu + irpp;

  // Net à payer
  const netAPayer = salaireBrut - totalRetenues;

  // CNSS patronale
  const cnssPatronal = calculateCNSS_Patronal(salaireBrut, rates);

  // Coût total employeur
  const coutTotalEmployeur = salaireBrut + cnssPatronal.total;

  // Cumuls annuels : nombre de mois travaillés dans l'année (tient compte
  // de la date d'embauche). Suppose un salaire mensuel constant.
  const nbMois = monthsElapsed(employee, month, year);
  const cumulsAnnee = {
    brut: salaireBrut * nbMois,
    cnss: cnssSalarial * nbMois,
    amu: amu * nbMois,
    irpp: irpp * nbMois,
    net: netAPayer * nbMois,
  };

  return {
    employee,
    period: { month, year },
    remuneration: salaryComponents,
    salaireBrut,
    cnssSalarial,
    amu,
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

  ipcMain.handle('settings:getRates', () => loadRates());

  ipcMain.handle('settings:saveRates', (_event, data) => {
    const file = path.join(getDataDir(), 'rates.json');
    fs.writeFileSync(file, JSON.stringify({ ...DEFAULT_RATES, ...data }, null, 2), 'utf-8');
    return { success: true };
  });
}

module.exports = { initPayrollHandlers, calculatePayroll };
