// Génère le HTML du bulletin de paie pour conversion PDF via Electron printToPDF
function buildBulletinHTML(bulletinData, companyInfo) {
  const {
    employee, period, remuneration,
    salaireBrut, cnssSalarial, amu, baseImposable, irpp,
    totalRetenues, netAPayer, cnssPatronal, coutTotalEmployeur, cumulsAnnee,
  } = bulletinData;

  const mois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  const moisNom = mois[period.month - 1];
  // Dernier jour réel du mois (gère février et les mois de 31 jours)
  const lastDay = new Date(period.year, period.month, 0).getDate();
  const debutMois = `01/${String(period.month).padStart(2, '0')}/${period.year}`;
  const finMois = `${String(lastDay).padStart(2, '0')}/${String(period.month).padStart(2, '0')}/${period.year}`;
  const datePaiement = `${lastDay} ${moisNom.toLowerCase()} ${period.year}`;

  const formatFCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  // Échappe les valeurs dynamiques pour éviter toute casse/injection HTML
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Mode de paiement
  let paiementHTML = `<p><em>Mode de paiement : ${esc(employee.modePaiement || '')}</em>`;
  if (employee.modePaiement === 'Chèque') {
    paiementHTML += ` — N° ${esc(employee.numeroCheque || 'N/A')}`;
  } else if (employee.modePaiement === 'Virement bancaire') {
    paiementHTML += `<br>Banque : ${esc(employee.banque || '')} — N° Compte : ${esc(employee.numCompte || '')}`;
  }
  paiementHTML += '</p>';

  // Rows for salary table
  const remunerationRows = remuneration.map(r => `
    <tr>
      <td>${esc(r.libelle)}</td>
      <td>${esc(r.base)}</td>
      <td>${esc(r.taux)}</td>
      <td class="right">${formatFCFA(r.montant)}</td>
      <td class="right">---</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', serif;
    font-size: 9pt;
    color: #1d1d1f;
    padding: 0.8in;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .header-left { flex: 1; }
  .header-right { text-align: right; }
  .header-right h1 { font-size: 14pt; color: #003366; margin-bottom: 8px; }
  .header-right p { margin-bottom: 2px; }
  .logo { width: 100px; margin-bottom: 6px; }
  .company-name { font-size: 12pt; font-weight: bold; }
  .company-info { color: #555; margin-bottom: 2px; }
  .divider { border-bottom: 2px solid #003366; margin: 12px 0; }
  .divider-thin { border-bottom: 1px solid #ccc; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 3px 6px; vertical-align: middle; }
  .emp-table td.label { font-weight: bold; width: 22%; }
  .emp-table td.value { width: 28%; }
  .salary-table th {
    text-align: left; padding: 4px 6px; font-size: 8pt; text-transform: uppercase;
    border-bottom: 1px solid #ccc;
  }
  .salary-table th.right, .salary-table td.right { text-align: right; }
  .salary-table td { padding: 4px 6px; }
  .section-header {
    background: #f0f0f0; font-weight: bold; font-size: 10pt; padding: 6px;
  }
  .bold { font-weight: bold; }
  .right { text-align: right; }
  .center { text-align: center; }
  .net-row {
    border-top: 2px solid #003366; border-bottom: 2px solid #003366;
    padding: 10px; font-size: 14pt; font-weight: bold; color: #003366;
  }
  .charges-title { font-size: 8pt; color: #555; font-style: italic; margin-top: 16px; margin-bottom: 4px; }
  .cumuls-title { font-size: 8pt; color: #555; font-style: italic; margin-top: 12px; margin-bottom: 4px; }
  .payment-info { font-size: 8pt; font-style: italic; color: #555; margin-top: 12px; }
  .legal { text-align: center; font-size: 7pt; color: #999; font-style: italic; margin-top: 24px; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <p class="company-name">${esc(companyInfo.nom || 'TAD IT CONSULTING SARL')}</p>
      <p class="company-info">${esc(companyInfo.formeJuridique || '')}</p>
      <p class="company-info">Siège : ${esc(companyInfo.adresse || '')}, Lomé, Togo</p>
      <p>RCCM : ${esc(companyInfo.rccm || '')}</p>
      <p>NIF : ${esc(companyInfo.nif || '')}</p>
      <p>N° employeur CNSS : ${esc(companyInfo.numCNSSEmployeur || '')}</p>
      <p>Tél : ${esc(companyInfo.telephone || '')}</p>
    </div>
    <div class="header-right">
      <h1>BULLETIN DE PAIE</h1>
      <p><strong>Période : ${esc(moisNom)} ${period.year}</strong></p>
      <p>du ${debutMois} au ${finMois}</p>
      <p>Date de paiement : ${datePaiement}</p>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Employee info -->
  <table class="emp-table">
    <tr>
      <td class="label">Nom et Prénom</td><td class="value">${esc(employee.nom)} ${esc(employee.prenom)}</td>
      <td class="label">Matricule</td><td class="value">${esc(employee.matricule || '')}</td>
    </tr>
    <tr>
      <td class="label">Fonction</td><td class="value">${esc(employee.fonction || '')}</td>
      <td class="label">Catégorie</td><td class="value">${esc(employee.categorie || '')}</td>
    </tr>
    <tr>
      <td class="label">Date d'embauche</td><td class="value">${esc(employee.dateEmbauche || '')}</td>
      <td class="label">N° CNSS</td><td class="value">${esc(employee.numCNSS || '')}</td>
    </tr>
    <tr>
      <td class="label">Adresse</td><td class="value">${esc(employee.adresse || '')}</td>
      <td class="label">Type de contrat</td><td class="value">${esc(employee.typeContrat || '')}</td>
    </tr>
  </table>

  <div class="divider-thin"></div>

  <!-- Salary table -->
  <table class="salary-table">
    <thead>
      <tr>
        <th>DÉSIGNATION</th><th>Base</th><th>Taux</th><th class="right">Gain (FCFA)</th><th class="right">Retenue (FCFA)</th>
      </tr>
    </thead>
    <tbody>
      <tr><td class="section-header" colspan="5">ÉLÉMENTS DE RÉMUNÉRATION</td></tr>
      ${remunerationRows}
      <tr class="bold">
        <td>SALAIRE BRUT</td><td></td><td></td>
        <td class="right">${formatFCFA(salaireBrut)}</td><td class="right">---</td>
      </tr>
      <tr><td class="section-header" colspan="5">COTISATIONS SALARIALES</td></tr>
      <tr>
        <td>CNSS - part salariale</td>
        <td>${formatFCFA(salaireBrut)}</td><td>4,00 %</td>
        <td class="right">---</td><td class="right">${formatFCFA(cnssSalarial)}</td>
      </tr>
      <tr>
        <td>CNSS-AMU</td>
        <td>${formatFCFA(salaireBrut)}</td><td>5,00 %</td>
        <td class="right">---</td><td class="right">${formatFCFA(amu)}</td>
      </tr>
      <tr><td class="section-header" colspan="5">IMPÔTS SUR SALAIRES</td></tr>
      <tr>
        <td>Base imposable</td><td>${formatFCFA(baseImposable)}</td><td>---</td><td></td><td></td>
      </tr>
      <tr>
        <td>IRPP (barème progressif)</td>
        <td>${formatFCFA(baseImposable)}</td><td>Barème</td>
        <td class="right">---</td><td class="right">${formatFCFA(irpp)}</td>
      </tr>
      <tr class="bold">
        <td>TOTAL DES RETENUES</td><td></td><td></td>
        <td class="right">---</td><td class="right">${formatFCFA(totalRetenues)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Net à payer -->
  <div class="net-row center">NET À PAYER : ${formatFCFA(netAPayer)}</div>

  <!-- Charges patronales -->
  <p class="charges-title">CHARGES PATRONALES (à titre informatif - non déduites du salaire)</p>
  <table>
    <tr><td>CNSS - Prestations familiales</td><td>${formatFCFA(salaireBrut)}</td><td>3,00 %</td><td class="right">${formatFCFA(cnssPatronal.prestationsFamiliales)}</td></tr>
    <tr><td>CNSS - Accidents du travail</td><td>${formatFCFA(salaireBrut)}</td><td>2,00 %</td><td class="right">${formatFCFA(cnssPatronal.accidentsTravail)}</td></tr>
    <tr><td>CNSS - Pension vieillesse (part patronale)</td><td>${formatFCFA(salaireBrut)}</td><td>12,50 %</td><td class="right">${formatFCFA(cnssPatronal.vieillesse)}</td></tr>
    <tr class="bold"><td>TOTAL CHARGES PATRONALES</td><td></td><td>17,50 %</td><td class="right">${formatFCFA(cnssPatronal.total)}</td></tr>
    <tr class="bold"><td>COÛT TOTAL EMPLOYEUR</td><td></td><td></td><td class="right">${formatFCFA(coutTotalEmployeur)}</td></tr>
  </table>

  <!-- Cumuls -->
  <p class="cumuls-title">CUMULS DE L'ANNÉE ${period.year}</p>
  <table>
    <tr>
      <th class="center">Cumul Brut</th><th class="center">Cumul CNSS</th><th class="center">Cumul AMU</th><th class="center">Cumul IRPP</th><th class="center">Cumul Net</th>
    </tr>
    <tr>
      <td class="center bold">${formatFCFA(cumulsAnnee.brut)}</td>
      <td class="center">${formatFCFA(cumulsAnnee.cnss)}</td>
      <td class="center">${formatFCFA(cumulsAnnee.amu)}</td>
      <td class="center">${formatFCFA(cumulsAnnee.irpp)}</td>
      <td class="center bold">${formatFCFA(cumulsAnnee.net)}</td>
    </tr>
  </table>

  <div class="payment-info">${paiementHTML}</div>

  <p class="legal">Le présent bulletin doit être conservé sans limitation de durée.</p>
</body>
</html>`;
}

module.exports = { buildBulletinHTML };
