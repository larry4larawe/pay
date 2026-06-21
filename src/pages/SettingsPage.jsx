import React, { useState, useEffect } from 'react';

const EMPTY_COMPANY = {
  nom: 'TAD IT CONSULTING SARL',
  formeJuridique: 'Société à Responsabilité Limitée',
  adresse: '',
  rccm: 'TG-LFW-01-2020-B12-04753',
  nif: '1001724348',
  numCNSSEmployeur: '4741176',
  telephone: '+228 22 50 65 47 / 93 80 48 10',
  signataireNom: 'ADIKI ABALO',
  signataireFonction: 'Responsable Administration du Personnel',
};

const DEFAULT_BRACKETS = [
  { min: 0, max: 35000, rate: 0 },
  { min: 35001, max: 75000, rate: 0.05 },
  { min: 75001, max: 130000, rate: 0.10 },
  { min: 130001, max: 200000, rate: 0.15 },
  { min: 200001, max: 300000, rate: 0.20 },
  { min: 300001, max: 500000, rate: 0.25 },
  { min: 500001, max: 9999999, rate: 0.30 },
];

export default function SettingsPage() {
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [brackets, setBrackets] = useState(DEFAULT_BRACKETS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (window.tadpay) {
      window.tadpay.getCompanyInfo().then((data) => {
        if (data) setCompany({ ...EMPTY_COMPANY, ...data });
      });
      window.tadpay.getTaxBrackets().then((data) => {
        if (data) setBrackets(data);
      });
    }
  }, []);

  const handleCompanyChange = (e) => {
    setCompany((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBracketChange = (index, field, value) => {
    setBrackets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveCompany = async () => {
    if (window.tadpay) {
      await window.tadpay.saveCompanyInfo(company);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleSaveBrackets = async () => {
    if (window.tadpay) {
      await window.tadpay.saveTaxBrackets(brackets);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Paramètres</h1>
      </div>

      {/* Infos société */}
      <div className="card">
        <h2>Informations de la société</h2>
        <p className="text-secondary" style={{ marginBottom: 16 }}>
          Ces informations apparaissent sur le bulletin de paie.
        </p>

        <div className="form-row">
          <div className="form-group">
            <label>Nom de la société</label>
            <input name="nom" value={company.nom} onChange={handleCompanyChange} />
          </div>
          <div className="form-group">
            <label>Forme juridique</label>
            <input name="formeJuridique" value={company.formeJuridique} onChange={handleCompanyChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Adresse</label>
            <input name="adresse" value={company.adresse} onChange={handleCompanyChange} />
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input name="telephone" value={company.telephone} onChange={handleCompanyChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>RCCM</label>
            <input name="rccm" value={company.rccm} onChange={handleCompanyChange} />
          </div>
          <div className="form-group">
            <label>NIF</label>
            <input name="nif" value={company.nif} onChange={handleCompanyChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>N° employeur CNSS</label>
            <input name="numCNSSEmployeur" value={company.numCNSSEmployeur} onChange={handleCompanyChange} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nom du signataire</label>
            <input name="signataireNom" value={company.signataireNom} onChange={handleCompanyChange} />
          </div>
          <div className="form-group">
            <label>Fonction du signataire</label>
            <input name="signataireFonction" value={company.signataireFonction} onChange={handleCompanyChange} />
          </div>
        </div>

        <div className="flex gap-8">
          <button className="btn btn-primary" onClick={handleSaveCompany}>
            Enregistrer
          </button>
          {saved && <span className="text-secondary" style={{ alignSelf: 'center' }}>✓ Sauvegardé</span>}
        </div>
      </div>

      {/* Barème IRPP */}
      <div className="card">
        <h2>Barème IRPP (Impôt sur le Revenu des Personnes Physiques)</h2>
        <p className="text-secondary" style={{ marginBottom: 16 }}>
          Tranches de revenu imposable et taux applicables (Togo).
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Tranche min (FCFA)</th>
              <th>Tranche max (FCFA)</th>
              <th>Taux (%)</th>
            </tr>
          </thead>
          <tbody>
            {brackets.map((b, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="number"
                    value={b.min}
                    onChange={(e) => handleBracketChange(i, 'min', parseInt(e.target.value))}
                    style={{ width: 120 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={b.max}
                    onChange={(e) => handleBracketChange(i, 'max', parseInt(e.target.value))}
                    style={{ width: 120 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.5"
                    value={b.rate * 100}
                    onChange={(e) => handleBracketChange(i, 'rate', parseFloat(e.target.value) / 100)}
                    style={{ width: 80 }}
                  />
                  <span> %</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn btn-primary mt-16" onClick={handleSaveBrackets}>
          Enregistrer le barème
        </button>
      </div>
    </div>
  );
}
