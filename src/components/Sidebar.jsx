import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',          label: 'Accueil',        icon: '⌂' },
  { to: '/employees', label: 'Employés',       icon: '👥' },
  { to: '/payroll',   label: 'Générer Bulletin', icon: '📄' },
  { to: '/settings',  label: 'Paramètres',     icon: '⚙' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">TAD Pay</div>
      <nav>
        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
