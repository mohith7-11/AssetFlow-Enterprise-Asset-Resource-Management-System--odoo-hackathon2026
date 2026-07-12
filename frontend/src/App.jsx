import React, { useState } from 'react';
import Allocations from './components/Allocations';
import Bookings from './components/Bookings';
import Maintenance from './components/Maintenance';

const SIMULATION_PROFILES = [
  { id: 1, name: 'Alice Admin',           role: 'admin',           department_id: 1, email: 'alice@assetflow.com' },
  { id: 2, name: 'Bob Manager',           role: 'asset_manager',   department_id: 1, email: 'bob@assetflow.com'   },
  { id: 3, name: 'Charlie Head',          role: 'department_head', department_id: 1, email: 'charlie@assetflow.com'},
  { id: 4, name: 'David Employee',        role: 'employee',        department_id: 2, email: 'david@assetflow.com' },
];

const NAV_ITEMS = [
  { key: 'dashboard',      label: 'Dashboard',          icon: '⊞',  disabled: true  },
  { key: 'org',            label: 'Organization setup', icon: '🏢', disabled: true  },
  { key: 'assets',         label: 'Assets',             icon: '📦', disabled: true  },
  { key: 'allocations',    label: 'Allocation & Transfer', icon: '🔄', disabled: false },
  { key: 'bookings',       label: 'Resource Booking',   icon: '📅', disabled: false },
  { key: 'maintenance',    label: 'Maintenance',         icon: '🔧', disabled: false },
  { key: 'audit',          label: 'Audit',               icon: '📋', disabled: true  },
  { key: 'reports',        label: 'Reports',             icon: '📊', disabled: true  },
  { key: 'notifications',  label: 'Notifications',       icon: '🔔', disabled: true  },
];

const PAGE_TITLES = {
  allocations: { title: 'Allocation & Transfer', subtitle: 'Allocate assets and manage transfer requests between employees and departments.' },
  bookings:    { title: 'Resource Booking',       subtitle: 'View booked slots and reserve shared resources for your team.' },
  maintenance: { title: 'Maintenance Management', subtitle: 'Track maintenance requests across the full approval workflow.' },
};

function App() {
  const [activeTab, setActiveTab]     = useState('allocations');
  const [currentUser, setCurrentUser] = useState(SIMULATION_PROFILES[0]);

  const info = PAGE_TITLES[activeTab];

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>AssetFlow</h1>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${activeTab === item.key ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => !item.disabled && setActiveTab(item.key)}
              style={item.disabled ? { opacity: 0.4, cursor: 'default' } : {}}
              title={item.disabled ? 'Coming soon' : item.label}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-chip-label">Simulator Profile</span>
            <select
              value={currentUser.id}
              onChange={e => {
                const p = SIMULATION_PROFILES.find(p => p.id === parseInt(e.target.value));
                if (p) setCurrentUser(p);
              }}
            >
              {SIMULATION_PROFILES.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.role}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
              Dept #{currentUser.department_id}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="main-area">
        <div className="page-header">
          <h2>{info?.title}</h2>
          <p>{info?.subtitle}</p>
        </div>

        <div className="page-body">
          {activeTab === 'allocations' && <Allocations currentUser={currentUser} />}
          {activeTab === 'bookings'    && <Bookings    currentUser={currentUser} />}
          {activeTab === 'maintenance' && <Maintenance currentUser={currentUser} />}
        </div>
      </div>
    </div>
  );
}

export default App;
