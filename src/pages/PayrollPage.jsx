import React, { useState, useEffect } from 'react';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function PayrollPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [fromMonth, setFromMonth] = useState(new Date().getMonth() + 1);
  const [fromYear, setFromYear] = useState(new Date().getFullYear());
  const [toMonth, setToMonth] = useState(new Date().getMonth() + 1);
  const [toYear, setToYear] = useState(new Date().getFullYear());
  const [payroll, setPayroll] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (window.tadpay) {
      window.tadpay.getEmployees().then(setEmployees);
    }
  }, []);

  const emp = employees.find((e) => e.id === selectedEmp);

  // ── Calcul pour un mois donné ──────────────────────────────
  const handleCalculate = async () => {
    if (!selectedEmp) return;
    const salaryComponents = [
      { libelle: 'Salaire de base', base: '30 j', taux: '---', montant: emp.salaireBase || 0 },
      { libelle: 'Sursalaire', base: '---', taux: '---', montant: emp.sursalaire || 0 },
      { libelle: 'Indemnité de fonction', base: '---', taux: '---', montant: emp.indemniteFonction || 0 },
    ];

    if (window.tadpay) {
      const result = await window.tadpay.calculatePayroll(
        emp, salaryComponents, fromMonth, fromYear, null
      );
      setPayroll(result);
    }
  };

  // ── Nom de fichier pour un mois donné ─────────────────────
  const buildFileName = (m, y) => {
    if (!emp) return '';
    const monthName = MONTHS[m - 1];
    return `${emp.nom}_${emp.prenom}_${monthName}_${y}`
      .replace(/\s+/g, '_')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // ── Génération de la série de mois ────────────────────────
  const handleGenerateSeries = async () => {
    if (!emp || !window.tadpay) return;
    setExporting(true);
    setStatusMsg('');

    // Construire la liste des mois dans la plage
    const months = [];
    let y = fromYear;
    let m = fromMonth;
    const end = toYear * 12 + toMonth;
    while (y * 12 + m <= end) {
      months.push({ month: m, year: y });
      m++;
      if (m > 12) { m = 1; y++; }
    }

    if (months.length === 0) {
      setExporting(false);
      return;
    }

    const salaryComponents = [
      { libelle: 'Salaire de base', base: '30 j', taux: '---', montant: emp.salaireBase || 0 },
      { libelle: 'Sursalaire', base: '---', taux: '---', montant: emp.sursalaire || 0 },
      { libelle: 'Indemnité de fonction', base: '---', taux: '---', montant: emp.indemniteFonction || 0 },
    ];

    let successCount = 0;
    const errors = [];

    for (let i = 0; i < months.length; i++) {
      const { month, year } = months[i];
      const monthLabel = `${MONTHS[month - 1]} ${year}`;
      setStatusMsg(`Génération ${i + 1}/${months.length} : ${monthLabel}...`);

      // Si mode chèque, demander le numéro
      let chequeNum = '';
      if (emp.modePaiement === 'Chèque') {
        chequeNum = window.prompt(`N° du chèque pour ${monthLabel} :`, '');
        if (chequeNum === null) {
          errors.push(`${monthLabel} : annulé par l'utilisateur`);
          continue;
        }
      }

      // Cloner l'employé avec le numéro de chèque du mois
      const empForMonth = { ...emp };
      if (emp.modePaiement === 'Chèque') {
        empForMonth.numeroCheque = chequeNum;
      }

      try {
        // Calculer
        const payrollData = await window.tadpay.calculatePayroll(
          empForMonth, salaryComponents, month, year, null
        );

        const fileName = buildFileName(month, year);

        // Exporter DOCX
        const docxResult = await window.tadpay.exportDocx(payrollData, fileName);
        if (!docxResult.success) errors.push(`${monthLabel} DOCX : ${docxResult.error}`);

        // Exporter PDF
        const pdfResult = await window.tadpay.exportPdf(payrollData, fileName);
        if (!pdfResult.success) errors.push(`${monthLabel} PDF : ${pdfResult.error}`);

        if (docxResult.success && pdfResult.success) successCount++;
      } catch (err) {
        errors.push(`${monthLabel} : ${err.message}`);
      }

      // Petite pause pour ne pas surcharger
      await new Promise((r) => setTimeout(r, 200));
    }

    setExporting(false);

    if (errors.length > 0) {
      setStatusMsg(
        `${successCount}/${months.length} bulletins générés.\nErreurs :\n${errors.join('\n')}`
      );
    } else {
      setStatusMsg(`${successCount} bulletins générés avec succès.`);
      window.tadpay.openOutputFolder('docx');
    }
  };

  const formatFCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1>Générer un bulletin de paie</h1>
      </div>

      {/* Sélection */}
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
        </div>

        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label>Du mois</label>
            <select value={fromMonth} onChange={(e) => setFromMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Année</label>
            <input
              type="number"
              value={fromYear}
              onChange={(e) => setFromYear(parseInt(e.target.value))}
              min={2020}
              max={2100}
            />
          </div>
          <div className="form-group">
            <label>Au mois</label>
            <select value={toMonth} onChange={(e) => setToMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Année</label>
            <input
              type="number"
              value={toYear}
              onChange={(e) => setToYear(parseInt(e.target.value))}
              min={2020}
              max={2100}
            />
          </div>
        </div>

        <div className="flex gap-8" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleCalculate} disabled={!selectedEmp}>
            📊 Aperçu (1 mois)
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerateSeries}
            disabled={!selectedEmp || exporting}
            style={{ background: exporting ? '#999' : '#34c759' }}
          >
            {exporting ? '⏳ Génération en cours...' : '📦 Générer la série'}
          </button>
        </div>

        {statusMsg && (
          <div style={{ marginTop: 12, padding: 12, background: '#f0f0f0', borderRadius: 6, whiteSpace: 'pre-line', fontSize: 13 }}>
            {statusMsg}
          </div>
        )}
      </div>

      {/* Aperçu */}
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
        </>
      )}
    </div>
  );
}
