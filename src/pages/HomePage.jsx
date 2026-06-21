import React, { useState, useEffect } from 'react';

export default function HomePage() {
  const [employees, setEmployees] = useState([]);
  const [recentBulletins, setRecentBulletins] = useState([]);

  useEffect(() => {
    if (window.tadpay) {
      window.tadpay.getEmployees().then(setEmployees);
    }
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Accueil</h1>
      </div>

      <div className="card">
        <h2>Résumé</h2>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div className="text-secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Employés</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{employees.length}</div>
          </div>
          <div>
            <div className="text-secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>Bulletins générés</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{recentBulletins.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Actions rapides</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="#/employees/new" className="btn btn-primary">➕ Nouvel employé</a>
          <a href="#/payroll" className="btn btn-outline">📄 Générer un bulletin</a>
          <a href="#/employees" className="btn btn-outline">👥 Voir les employés</a>
        </div>
      </div>
    </div>
  );
}
