import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.tadpay) {
      window.tadpay.getEmployees().then(setEmployees);
    }
  }, []);

  const handleDelete = async (id) => {
    await window.tadpay.deleteEmployee(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Employés</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/employees/new')}
        >
          ➕ Nouvel employé
        </button>
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <p className="text-secondary">Aucun employé enregistré.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Fonction</th>
                <th>Catégorie</th>
                <th>Contrat</th>
                <th>Mode paiement</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.nom}</strong>
                    <br />
                    <span className="text-secondary">{emp.prenom}</span>
                  </td>
                  <td>{emp.fonction}</td>
                  <td>{emp.categorie}</td>
                  <td>{emp.typeContrat}</td>
                  <td>{emp.modePaiement}</td>
                  <td>
                    <div className="flex gap-8">
                      <button
                        className="btn btn-outline"
                        onClick={() => navigate(`/employees/${emp.id}`)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(emp.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
