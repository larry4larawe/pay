import React, { useState, useEffect } from 'react';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function PayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payroll, setPayroll] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (window.tadpay) {
      window.tadpay.getEmployees().then(setEmployees);
    }
  }, []);

  const emp = employees.find((e) => e.id === selectedEmp);

  const handleCalculate = async () => {
    if (!selectedEmp) return;
    const salaryComponents = [
      { libelle: 'Salaire de base', base: '30 j', taux: '---', montant: emp.salaireBase || 0 },
      { libelle: 'Sursalaire', base: '---', taux: '---', montant: emp.sursalaire || 0 },
      { libelle: 'Indemnité de fonction', base: '---', taux: '---', montant: emp.indemniteFonction || 0 },
    ];

    if (window.tadpay) {
      const result = await window.tadpay.calculatePayroll(
        emp, salaryComponents, month, year, null
      );
      setPayroll(result);
    }
  };

  const buildFileName = () => {
    if (!emp) return '';
    const monthName = MONTHS[month - 1];
    return `${emp.nom}_${emp.prenom}_${monthName}_${year}`
      .replace(/\s+/g, '_')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const handleExportDocx = async () => {
    if (!payroll || !window.tadpay) return;
    setExporting(true);
    try {
      const result = await window.tadpay.exportDocx(payroll, buildFileName());
      if (result.success) {
        alert(`DOCX exporté : ${result.path}`);
        window.tadpay.openOutputFolder('docx');
      } else {
        alert(`Erreur DOCX : ${result.error}`);
      }
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    }
    setExporting(false);
  };

  const handleExportPdf = async () => {
    if (!payroll || !window.tadpay) return;
    setExporting(true);
    try {
      const result = await window.tadpay.exportPdf(payroll, buildFileName());
      if (result.success) {
        alert(`PDF exporté : ${result.path}`);
        window.tadpay.openOutputFolder('pdf');
      } else {
        alert(`Erreur PDF : ${result.error}`);
      }
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    }
    setExporting(false);
  };

  const formatFCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  return (
    <div>
      <div className="page-header">
        <h1>Générer un bulletin de paie</h1>
      </div>

      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label>Employé</label>
            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
              <option value="">-- Sélectionner --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom} {e.prenom}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mois</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Année</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min={2020}
              max={2100}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCalculate} disabled={!selectedEmp}>
          📊 Calculer
        </button>
      </div>

      {payroll && (
        <>
          <div className="card">
            <h2>Aperçu — {payroll.employee.nom} {payroll.employee.prenom} — {MONTHS[payroll.period.month - 1]} {payroll.period.year}</h2>
            <div className="preview-frame">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>DÉSIGNATION</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Base</th>
                    <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: 8 }}>Taux</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 8 }}>Gain (FCFA)</th>
                    <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: 8 }}>Retenue (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} style={{ padding: 8, fontWeight: 700 }}>ÉLÉMENTS DE RÉMUNÉRATION</td>
                  </tr>
                  {payroll.remuneration.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: 8 }}>{r.libelle}</td>
                      <td style={{ padding: 8 }}>{r.base}</td>
                      <td style={{ padding: 8 }}>{r.taux}</td>
                      <td style={{ textAlign: 'right', padding: 8 }}>{formatFCFA(r.montant)}</td>
                      <td style={{ textAlign: 'right', padding: 8 }}>---</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ padding: 8 }}>SALAIRE BRUT</td>
                    <td></td><td></td>
                    <td style={{ textAlign: 'right', padding: 8 }}>{formatFCFA(payroll.salaireBrut)}</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>---</td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ padding: 8, fontWeight: 700 }}>COTISATIONS SALARIALES</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8 }}>CNSS - part salariale</td>
                    <td style={{ padding: 8 }}>{formatFCFA(payroll.salaireBrut)}</td>
                    <td style={{ padding: 8 }}>4,00%</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>---</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>{formatFCFA(payroll.cnssSalarial)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ padding: 8, fontWeight: 700 }}>IMPÔTS SUR SALAIRES</td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8 }}>Base imposable</td>
                    <td style={{ padding: 8 }}>{formatFCFA(payroll.baseImposable)}</td>
                    <td></td><td></td><td></td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8 }}>IRPP (barème progressif)</td>
                    <td style={{ padding: 8 }}>{formatFCFA(payroll.baseImposable)}</td>
                    <td style={{ padding: 8 }}>Barème</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>---</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>{formatFCFA(payroll.irpp)}</td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ padding: 8 }}>TOTAL DES RETENUES</td>
                    <td></td><td></td>
                    <td style={{ textAlign: 'right', padding: 8 }}>---</td>
                    <td style={{ textAlign: 'right', padding: 8 }}>{formatFCFA(payroll.totalRetenues)}</td>
                  </tr>
                  <tr style={{ fontWeight: 700, fontSize: '1.1em' }}>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 12 }}>
                      NET À PAYER : {formatFCFA(payroll.netAPayer)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 24 }}>
                <strong>CHARGES PATRONALES (à titre informatif)</strong>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: 4 }}>CNSS - Prestations familiales (3%)</td>
                      <td style={{ textAlign: 'right', padding: 4 }}>{formatFCFA(payroll.cnssPatronal.prestationsFamiliales)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: 4 }}>CNSS - Accidents du travail (2%)</td>
                      <td style={{ textAlign: 'right', padding: 4 }}>{formatFCFA(payroll.cnssPatronal.accidentsTravail)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: 4 }}>CNSS - Pension vieillesse (12,5%)</td>
                      <td style={{ textAlign: 'right', padding: 4 }}>{formatFCFA(payroll.cnssPatronal.vieillesse)}</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td style={{ padding: 4 }}>TOTAL CHARGES PATRONALES</td>
                      <td style={{ textAlign: 'right', padding: 4 }}>{formatFCFA(payroll.cnssPatronal.total)}</td>
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                      <td style={{ padding: 4 }}>COÛT TOTAL EMPLOYEUR</td>
                      <td style={{ textAlign: 'right', padding: 4 }}>{formatFCFA(payroll.coutTotalEmployeur)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {payroll.employee.modePaiement && (
                <div style={{ marginTop: 16, fontStyle: 'italic', color: '#666' }}>
                  <p>Mode de paiement : {payroll.employee.modePaiement}
                    {payroll.employee.modePaiement === 'Chèque' && ` — N° ${payroll.employee.numeroCheque || 'N/A'}`}
                    {payroll.employee.modePaiement === 'Virement bancaire' && ` — ${payroll.employee.banque || 'Banque N/A'} / ${payroll.employee.numCompte || 'N/A'}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'export */}
          <div className="flex gap-8 mb-16">
            <button
              className="btn btn-primary"
              onClick={handleExportDocx}
              disabled={exporting}
            >
              📄 Exporter DOCX
            </button>
            <button
              className="btn btn-outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              📑 Exporter PDF
            </button>
            {payroll && (
              <span className="text-secondary" style={{ alignSelf: 'center' }}>
                Nom du fichier : <strong>{buildFileName()}</strong>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
