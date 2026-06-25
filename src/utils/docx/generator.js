const {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, WidthType, BorderStyle, ShadingType,
  convertInchesToTwip, VerticalAlign,
} = require('docx');
const fs = require('fs');
const path = require('path');

// __dirname = src/utils/docx → remonter de 3 niveaux jusqu'à la racine du projet
const LOGO_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'logo.png');

// ─── Styles constants ───────────────────────────────────────────
const FONT = 'Times New Roman';
const FONT_BOLD = 'Times New Roman';
const FONT_SIZE = 18; // half-points = 9pt
const FONT_SIZE_SM = 16; // 8pt
const FONT_SIZE_TITLE = 24; // 12pt
const FONT_SIZE_HEADING = 20; // 10pt
const COLOR_DARK = '1d1d1f';
const COLOR_GRAY = '555555';
const BORDER_STYLE = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
const NO_BORDER = { style: BorderStyle.NONE };

// ─── Helpers ────────────────────────────────────────────────────
function textRun(text, options = {}) {
  return new TextRun({
    text: String(text),
    font: options.font || FONT,
    size: options.size || FONT_SIZE,
    bold: options.bold || false,
    color: options.color || COLOR_DARK,
    ...options,
  });
}

function cell(text, options = {}) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [textRun(text, options)],
        alignment: options.alignment || AlignmentType.LEFT,
        spacing: { before: 20, after: 20 },
      }),
    ],
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    borders: {
      top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
    },
    verticalAlign: VerticalAlign.CENTER,
    ...(options.colSpan ? { columnSpan: options.colSpan } : {}),
  });
}

function emptyCell() {
  return cell('');
}

function sectionHeader(text) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [textRun(text, { bold: true, size: FONT_SIZE_HEADING })],
            spacing: { before: 40, after: 40 },
          }),
        ],
        columnSpan: 5,
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        shading: { fill: 'f0f0f0', type: ShadingType.CLEAR },
      }),
    ],
  });
}

function boldRow(label, base, taux, gain, retenue, options = {}) {
  return new TableRow({
    children: [
      cell(label, { bold: true, ...options }),
      cell(base, { bold: true, alignment: options.alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT }),
      cell(taux, { bold: true }),
      cell(gain, { bold: true, alignment: AlignmentType.RIGHT }),
      cell(retenue, { bold: true, alignment: AlignmentType.RIGHT }),
    ],
  });
}

function dataRow(label, base, taux, gain, retenue) {
  return new TableRow({
    children: [
      cell(label),
      cell(base),
      cell(taux),
      cell(gain, { alignment: AlignmentType.RIGHT }),
      cell(retenue, { alignment: AlignmentType.RIGHT }),
    ],
  });
}

function formatFCFA(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

// ─── Generator ──────────────────────────────────────────────────
function generateBulletin(bulletinData, companyInfo) {
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

  // Image du logo (si présent)
  const logoImage = fs.existsSync(LOGO_PATH)
    ? new ImageRun({
        data: fs.readFileSync(LOGO_PATH),
        transformation: { width: 120, height: 60 },
      })
    : null;

  // ── Header row with logo ──
  const headerLeft = [
    new Paragraph({
      children: [
        ...(logoImage ? [logoImage, new TextRun({ break: 1 })] : []),
        textRun(companyInfo.nom || 'TAD IT CONSULTING SARL', { bold: true, size: FONT_SIZE_TITLE }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [textRun(companyInfo.formeJuridique || '', { size: FONT_SIZE, color: COLOR_GRAY })],
    }),
    new Paragraph({
      children: [textRun(`Siège : ${companyInfo.adresse || ''}, Lomé, Togo`, { size: FONT_SIZE, color: COLOR_GRAY })],
    }),
    new Paragraph({
      children: [textRun(`RCCM : ${companyInfo.rccm || ''}`, { size: FONT_SIZE })],
    }),
    new Paragraph({
      children: [textRun(`NIF : ${companyInfo.nif || ''}`, { size: FONT_SIZE })],
    }),
    new Paragraph({
      children: [textRun(`N° employeur CNSS : ${companyInfo.numCNSSEmployeur || ''}`, { size: FONT_SIZE })],
    }),
    new Paragraph({
      children: [textRun(`Tél : ${companyInfo.telephone || ''}`, { size: FONT_SIZE })],
    }),
  ];

  const headerRight = [
    new Paragraph({
      children: [textRun('BULLETIN DE PAIE', { bold: true, size: 28, color: '003366' })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [textRun(`Période : ${moisNom} ${period.year}`, { bold: true, size: FONT_SIZE_HEADING })],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [textRun(`du ${debutMois} au ${finMois}`, { size: FONT_SIZE })],
      alignment: AlignmentType.RIGHT,
    }),
    new Paragraph({
      children: [textRun(`Date de paiement : ${datePaiement}`, { size: FONT_SIZE })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 },
    }),
  ];

  // ── Employee info table (4 columns) ──
  const empInfoRows = [
    ['Nom et Prénom', `${employee.nom} ${employee.prenom}`, 'Matricule', employee.matricule || ''],
    ['Date de naissance', `${employee.dateNaissance || ''} à ${employee.lieuNaissance || ''}`, 'CNI', employee.cni || ''],
    ['Fonction', employee.fonction || '', 'Catégorie', employee.categorie || ''],
    ['Date d\'embauche', employee.dateEmbauche || '', 'N° CNSS', employee.numCNSS || ''],
    ['Adresse', employee.adresse || '', 'Type de contrat', employee.typeContrat || ''],
    ['Situation familiale', employee.situationFamiliale || '', '', ''],
  ];

  const empTableRows = empInfoRows.map(([l1, v1, l2, v2]) =>
    new TableRow({
      children: [
        cell(l1, { bold: true, width: 20 }),
        cell(v1, { width: 30 }),
        cell(l2, { bold: true, width: 20 }),
        cell(v2, { width: 30 }),
      ],
    })
  );

  // ── Salary table ──
  const salaryRows = [
    sectionHeader('ÉLÉMENTS DE RÉMUNÉRATION'),
    ...remuneration.map(r => dataRow(r.libelle, r.base, r.taux, formatFCFA(r.montant), '---')),
    boldRow('SALAIRE BRUT', '', '', formatFCFA(salaireBrut), '---'),
    sectionHeader('COTISATIONS SALARIALES'),
    dataRow('CNSS - part salariale', formatFCFA(salaireBrut), '4,00 %', '---', formatFCFA(cnssSalarial)),
    dataRow('CNSS-AMU', formatFCFA(salaireBrut), '5,00 %', '---', formatFCFA(amu)),
    sectionHeader('IMPÔTS SUR SALAIRES'),
    dataRow('Base imposable', formatFCFA(baseImposable), '---', '---', '---'),
    dataRow('IRPP (barème progressif)', formatFCFA(baseImposable), 'Barème', '---', formatFCFA(irpp)),
    boldRow('TOTAL DES RETENUES', '', '', '---', formatFCFA(totalRetenues)),
  ];

  const salaryTable = new Table({
    rows: salaryRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // ── Net à payer ──
  const netRow = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  textRun('NET À PAYER', { bold: true, size: FONT_SIZE_HEADING }),
                  textRun(`    ${formatFCFA(netAPayer)}`, { bold: true, size: 26, color: '003366' }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
              }),
            ],
            columnSpan: 5,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '003366' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '003366' },
              left: NO_BORDER, right: NO_BORDER,
            },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // ── Employer charges ──
  const chargesRows = [
    ['CNSS - Prestations familiales', formatFCFA(salaireBrut), '3,00 %', formatFCFA(cnssPatronal.prestationsFamiliales)],
    ['CNSS - Accidents du travail', formatFCFA(salaireBrut), '2,00 %', formatFCFA(cnssPatronal.accidentsTravail)],
    ['CNSS - Pension vieillesse (part patronale)', formatFCFA(salaireBrut), '12,50 %', formatFCFA(cnssPatronal.vieillesse)],
  ];

  const chargesTable = new Table({
    rows: [
      new TableRow({
        children: [
          cell('Désignation', { bold: true, width: 50 }),
          cell('Base', { bold: true, width: 17 }),
          cell('Taux', { bold: true, width: 17 }),
          cell('Montant', { bold: true, alignment: AlignmentType.RIGHT, width: 16 }),
        ],
      }),
      ...chargesRows.map(([d, b, t, m]) =>
        new TableRow({
          children: [
            cell(d),
            cell(b),
            cell(t),
            cell(m, { alignment: AlignmentType.RIGHT }),
          ],
        })
      ),
      new TableRow({
        children: [
          cell('TOTAL CHARGES PATRONALES', { bold: true }),
          cell(''),
          cell('17,50 %', { bold: true }),
          cell(formatFCFA(cnssPatronal.total), { bold: true, alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          cell('COÛT TOTAL EMPLOYEUR', { bold: true, size: FONT_SIZE_HEADING }),
          cell(''),
          cell(''),
          cell(formatFCFA(coutTotalEmployeur), { bold: true, alignment: AlignmentType.RIGHT }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // ── Annual cumuls ──
  const cumulsTable = new Table({
    rows: [
      new TableRow({
        children: [
          cell('Cumul Brut', { bold: true, alignment: AlignmentType.CENTER, width: 20 }),
          cell('Cumul CNSS', { bold: true, alignment: AlignmentType.CENTER, width: 20 }),
          cell('Cumul AMU', { bold: true, alignment: AlignmentType.CENTER, width: 20 }),
          cell('Cumul IRPP', { bold: true, alignment: AlignmentType.CENTER, width: 20 }),
          cell('Cumul Net', { bold: true, alignment: AlignmentType.CENTER, width: 20 }),
        ],
      }),
      new TableRow({
        children: [
          cell(formatFCFA(cumulsAnnee.brut), { alignment: AlignmentType.CENTER, bold: true }),
          cell(formatFCFA(cumulsAnnee.cnss), { alignment: AlignmentType.CENTER }),
          cell(formatFCFA(cumulsAnnee.amu), { alignment: AlignmentType.CENTER }),
          cell(formatFCFA(cumulsAnnee.irpp), { alignment: AlignmentType.CENTER }),
          cell(formatFCFA(cumulsAnnee.net), { alignment: AlignmentType.CENTER, bold: true }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // ── Payment mode ──
  let paiementText = `Mode de paiement : ${employee.modePaiement || ''}`;
  if (employee.modePaiement === 'Chèque') {
    paiementText += ` — N° ${employee.numeroCheque || 'N/A'}`;
  } else if (employee.modePaiement === 'Virement bancaire') {
    paiementText += `\nBanque : ${employee.banque || ''} — N° Compte : ${employee.numCompte || ''}`;
  }

  // ── Assemble document ──
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        children: [
          // Header: two columns with logo
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: headerLeft,
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                  }),
                  new TableCell({
                    children: headerRight,
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Separator
          new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '003366' } },
            spacing: { before: 80, after: 80 },
          }),

          // Employee info
          new Table({
            rows: empTableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Separator
          new Paragraph({
            children: [],
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } },
            spacing: { before: 80, after: 80 },
          }),

          // Salary table
          salaryTable,

          // Spacer
          new Paragraph({ children: [], spacing: { before: 40 } }),

          // Net à payer
          netRow,

          // Spacer
          new Paragraph({ children: [], spacing: { before: 60 } }),

          // Charges patronales
          new Paragraph({
            children: [textRun('CHARGES PATRONALES (à titre informatif - non déduites du salaire)', { bold: true, size: FONT_SIZE_SM, color: COLOR_GRAY, italics: true })],
            spacing: { before: 80, after: 40 },
          }),
          chargesTable,

          // Cumuls
          new Paragraph({
            children: [textRun(`CUMULS DE L'ANNÉE ${period.year}`, { bold: true, size: FONT_SIZE_SM, color: COLOR_GRAY, italics: true })],
            spacing: { before: 80, after: 40 },
          }),
          cumulsTable,

          // Payment mode
          new Paragraph({
            children: [textRun(paiementText, { size: FONT_SIZE_SM })],
            spacing: { before: 80, after: 40 },
          }),

          // Legal mention
          new Paragraph({
            children: [textRun('Le présent bulletin doit être conservé sans limitation de durée.', { size: FONT_SIZE_SM - 2, color: COLOR_GRAY, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
          }),
        ],
      },
    ],
  });

  return doc;
}

module.exports = { generateBulletin };
