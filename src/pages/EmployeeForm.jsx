import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const MODES_PAIEMENT = ['Virement bancaire', 'Chèque', 'Numéraire'];
const CATEGORIES = ['Cadre', 'Agent de maîtrise', 'Employé', 'Ouvrier'];
const TYPES_CONTRAT = ['CDI', 'CDD', 'Stage', 'Intérim'];
const SITUATION_FAMILIALE = [
  'Célibataire sans enfant',
  'Célibataire avec enfant(s)',
  'Marié(e) sans enfant',
  'Marié(e) avec enfant(s)',
  'Veuf(ve)',
  'Divorcé(e)',
];

const EMPTY_EMPLOYEE = {
  nom: '',
  prenom: '',
  dateNaissance: '',
  lieuNaissance: '',
  fonction: '',
  categorie: 'Employé',
  dateEmbauche: '',
  adresse: '',
  situationFamiliale: 'Célibataire sans enfant',
  nombreParts: 1,
  matricule: '',
  cni: '',
  numCNSS: '',
  typeContrat: 'CDI',
  modePaiement: 'Virement bancaire',
  numeroCheque: '',
  banque: '',
  numCompte: '',
  salaireBase: 0,
  sursalaire: 0,
  indemniteFonction: 0,
};

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_EMPLOYEE);
  const isEdit = Boolean(id);

  useEffect(() => {
    if (id && window.tadpay) {
      window.tadpay.getEmployee(id).then((data) => {
        if (data) setForm({ ...EMPTY_EMPLOYEE, ...data });
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.tadpay) {
      await window.tadpay.saveEmployee(form);
      navigate('/employees');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Modifier l\'employé' : 'Nouvel employé'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Identité */}
        <div className="card">
          <h2>Identité</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Nom *</label>
              <input name="nom" value={form.nom} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Prénom *</label>
              <input name="prenom" value={form.prenom} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date de naissance</label>
              <input
                name="dateNaissance"
                type="date"
                value={form.dateNaissance}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Lieu de naissance</label>
              <input name="lieuNaissance" value={form.lieuNaissance} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Situation familiale</label>
              <select name="situationFamiliale" value={form.situationFamiliale} onChange={handleChange}>
                {SITUATION_FAMILIALE.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nombre de parts</label>
              <input
                name="nombreParts"
                type="number"
                step="0.5"
                min="1"
                value={form.nombreParts}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>N° CNI</label>
              <input name="cni" value={form.cni} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Adresse</label>
              <input name="adresse" value={form.adresse} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Poste */}
        <div className="card">
          <h2>Poste</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Matricule</label>
              <input name="matricule" value={form.matricule} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Date d'embauche</label>
              <input
                name="dateEmbauche"
                type="date"
                value={form.dateEmbauche}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fonction *</label>
              <input name="fonction" value={form.fonction} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Catégorie</label>
              <select name="categorie" value={form.categorie} onChange={handleChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type de contrat</label>
              <select name="typeContrat" value={form.typeContrat} onChange={handleChange}>
                {TYPES_CONTRAT.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>N° CNSS</label>
              <input name="numCNSS" value={form.numCNSS} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Salaire */}
        <div className="card">
          <h2>Rémunération</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Salaire de base (FCFA) *</label>
              <input
                name="salaireBase"
                type="number"
                min="0"
                value={form.salaireBase}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Sursalaire (FCFA)</label>
              <input
                name="sursalaire"
                type="number"
                min="0"
                value={form.sursalaire}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Indemnité de fonction (FCFA)</label>
              <input
                name="indemniteFonction"
                type="number"
                min="0"
                value={form.indemniteFonction}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Paiement */}
        <div className="card">
          <h2>Mode de paiement</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Mode de paiement</label>
              <select name="modePaiement" value={form.modePaiement} onChange={handleChange}>
                {MODES_PAIEMENT.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {form.modePaiement === 'Chèque' && (
              <div className="form-group">
                <label>N° du chèque</label>
                <input name="numeroCheque" value={form.numeroCheque} onChange={handleChange} />
              </div>
            )}
            {form.modePaiement === 'Virement bancaire' && (
              <>
                <div className="form-group">
                  <label>Banque</label>
                  <input name="banque" value={form.banque} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>N° de compte</label>
                  <input name="numCompte" value={form.numCompte} onChange={handleChange} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/employees')}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
