# TAD PAY — Générateur de bulletins de paie

## Résumé

Application desktop Electron + React pour **TAD IT CONSULTING SARL** (Lomé, Togo).
Génère des bulletins de paie au format DOCX et PDF, conformes au modèle `Bulletin.docx` fourni.
Cible : **Windows** (macOS 26 incompatible avec Electron — build via GitHub Actions).

---

## Architecture

```
TAD_PAY/
├── electron/                    # Processus principal Electron
│   ├── main.js                  # Point d'entrée, fenêtre 1200×800
│   ├── preload.js               # API exposée au renderer (contextBridge)
│   └── ipc/
│       ├── employee.js          # CRUD employés → %APPDATA%/TAD Pay/data/employees.json
│       ├── payroll.js           # Calculs CNSS, AMU, IRPP, net
│       └── export.js            # Génération DOCX/PDF, dialogue chèque, sélecteur dossier
├── src/                         # Frontend React (renderer)
│   ├── index.html / index.jsx   # Entrée webpack
│   ├── App.jsx                  # Routes (HashRouter)
│   ├── styles/app.css           # Design system macOS-like
│   ├── components/Sidebar.jsx   # Navigation
│   ├── pages/
│   │   ├── HomePage.jsx         # Dashboard + actions rapides
│   │   ├── EmployeeList.jsx     # Tableau + suppression
│   │   ├── EmployeeForm.jsx     # Fiche employé (identité, poste, salaire, paiement)
│   │   ├── PayrollPage.jsx      # Génération par plage + aperçu + export
│   │   └── SettingsPage.jsx     # Infos société + barème IRPP
│   └── utils/
│       ├── docx/generator.js    # Générateur DOCX (lib `docx`, 450 lignes)
│       └── pdf/converter.js     # Template HTML → Electron printToPDF
├── assets/logo.png              # Logo TAD (sur les bulletins)
├── data/                        # Stockage local (généré au runtime)
│   ├── company.json             # Infos société
│   ├── employees.json           # Base employés
│   └── taxBrackets.json         # Barème IRPP personnalisé
├── output/                      # Exports générés
│   ├── docx/                    # NOM_Prenom_Mois_Année.docx
│   └── pdf/                     # NOM_Prenom_Mois_Année.pdf
├── .github/workflows/build.yml  # CI/CD : build Windows NSIS + MSI
├── webpack.config.js            # Bundle renderer
└── package.json                 # Electron 42.4.1, React 18, docx 8.5
```

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Desktop | Electron | 42.4.1 |
| Frontend | React | 18.2.0 |
| Bundler | Webpack | 5.107.2 |
| DOCX | `docx` (npm) | 8.5.0 |
| PDF | Electron `printToPDF` | natif |
| Stockage | JSON local | — |
| CI/CD | GitHub Actions | windows-latest |
| Runtime | Node.js | 24.12.0 (dev), 22 (CI) |

---

## Calculs de paie (Togo)

```
Salaire brut = Salaire de base + Sursalaire + Indemnité de fonction
  − CNSS salariale (4% du brut)
  − CNSS-AMU (5% du brut)
= Base imposable
  − IRPP (barème progressif 7 tranches)
= Net à payer

Charges patronales (informatif) :
  + Prestations familiales (3%)
  + Accidents du travail (2%)
  + Pension vieillesse (12,5%)
= Coût total employeur

Cumuls annuels = chaque montant × N° du mois (janvier=1, décembre=12)
```

### Barème IRPP par défaut

| Tranche (FCFA) | Taux |
|---|---|
| 0 – 35 000 | 0% |
| 35 001 – 75 000 | 5% |
| 75 001 – 130 000 | 10% |
| 130 001 – 200 000 | 15% |
| 200 001 – 300 000 | 20% |
| 300 001 – 500 000 | 25% |
| 500 001+ | 30% |

Modifiable dans Paramètres → sauvegardé dans `taxBrackets.json`.

---

## Fonctionnalités

- CRUD employés (nom, prénom, matricule, CNSS, fonction, salaire...)
- Génération de bulletin unitaire avec aperçu
- Génération par plage de mois (Du... Au...)
- 3 modes de paiement : Virement bancaire, Chèque, Numéraire
- Dialogue modal pour saisir le n° de chèque à chaque mois (si mode Chèque)
- Export DOCX + PDF simultané
- Sélecteur de dossier de sortie (défaut : `Documents\TAD_Pay\Exports`)
- Logo TAD sur les bulletins
- Paramètres : infos société, barème IRPP, signataire

---

## Lieux de stockage (Windows)

| Données | Chemin |
|---|---|
| Employés | `%APPDATA%\TAD Pay\data\employees.json` |
| Société | `%APPDATA%\TAD Pay\data\company.json` |
| Barème IRPP | `%APPDATA%\TAD Pay\data\taxBrackets.json` |
| Exports DOCX | `%USERPROFILE%\Documents\TAD_Pay\Exports\docx\` |
| Exports PDF | `%USERPROFILE%\Documents\TAD_Pay\Exports\pdf\` |

---

## Comptes et accès

### GitHub
- **Repo** : `https://github.com/larry4larawe/pay.git`
- **Utilisateur** : `larry4larawe`
- **Token** : Fine-grained PAT `github_pat_11ARGJGCA0JWGQalzLK7O2_...` (scopes : Contents R/W, Workflows R/W)
  - Token complet dans l'historique git (à régénérer si compromis)
- **Authentification git** : HTTPS avec token dans l'URL
  ```
  git remote set-url origin https://TOKEN@github.com/larry4larawe/pay.git
  ```

### GitHub Actions
- Workflow : `.github/workflows/build.yml`
- Déclencheur : push sur `main` + `workflow_dispatch`
- Runner : `windows-latest`
- Artifacts produits : `TAD-Pay-Setup` (NSIS .exe) + `TAD-Pay-MSI` (.msi)
- URL des runs : https://github.com/larry4larawe/pay/actions

---

## Commandes

```bash
# Développement (macOS — Electron ne lance pas, mais webpack compile)
cd TAD_PAY
npm install --cache /tmp/npm-cache-tadpay   # cache npm corrompu par root
npx webpack --config webpack.config.js       # build renderer OK

# Build Windows (depuis macOS — Wine KO, MSI/NSIS échouent)
npx electron-builder --win --x64

# Build Windows (via CI)
git add -A && git commit -m "..." && git push  # déclenche GitHub Actions

# Version
npm version patch   # 1.1.0 → 1.1.1
npm version minor   # 1.1.0 → 1.2.0
```

---

## Problèmes connus et résolus

| Problème | Cause | Solution |
|---|---|---|
| Electron SIGSEGV sur macOS 26 | Darwin 25 incompatible | Build via GitHub Actions Windows |
| Wine KO sur macOS 26 | 32-bit dropped | `signAndEditExecutable: false` |
| `ENOTDIR` à l'export | `app.getPath()` avant `ready` | Lazy-init des chemins |
| Année "undefined" | Preload ignorait `salaryComponents` | Signature corrigée |
| Sauvegarde employé impossible | `data/` dans ASAR (read-only) | `app.getPath('userData')` |
| Dialogue chèque retourne null | `promptWin.__result` invisible Node | `executeJavaScript()` |
| Cache npm root-owned | Bug npm | `--cache /tmp/npm-cache-tadpay` |

---

## État actuel (25 juin 2026)

- **Version** : 1.1.0
- **Build Windows** : fonctionnel (NSIS + MSI produits par CI)
- **Fonctionnalités** : toutes implémentées et testées
- **À faire éventuellement** :
  - Base de données (SQLite) au lieu de JSON
  - Export CSV des cumuls annuels
  - Génération groupée (plusieurs employés × plage de mois)
  - Icône applicative personnalisée (.ico Windows)
  - Build macOS quand Electron supportera Darwin 25
