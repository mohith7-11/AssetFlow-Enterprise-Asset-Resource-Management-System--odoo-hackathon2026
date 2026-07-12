import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import AssetsPage from './pages/AssetsPage';
import Allocations from './components/Allocations';
import Bookings from './components/Bookings';
import Maintenance from './components/Maintenance';

// A subcomponent to manage routing and auth logic under BrowserRouter
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgTab, setOrgTab] = useState('departments');
  
  // Master data
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  // Form states
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // New item creation states
  const [newDeptName, setNewDeptName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Modals editing states
  const [editDept, setEditDept] = useState(null);
  const [editCat, setEditCat] = useState(null);
  const [editUser, setEditUser] = useState(null);

  // General Notification
  const [notify, setNotify] = useState({ type: '', message: '' });

  const showNotification = (type, message) => {
    setNotify({ type, message });
    setTimeout(() => {
      setNotify({ type: '', message: '' });
    }, 4000);
  };

  // Check token validity and load current user
  useEffect(() => {
    if (token) {
      fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(userData => {
        setUser(userData);
        localStorage.setItem('token', token);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
        setLoading(false);
        navigate('/login');
      });
    } else {
      setLoading(false);
      if (location.pathname !== '/login' && location.pathname !== '/signup') {
        navigate('/login');
      }
    }
  }, [token, location.pathname]);

  // Load master data when authenticated
  useEffect(() => {
    if (user) {
      loadDepartments();
      loadCategories();
      if (user.role === 'ADMIN') {
        loadUsers();
      }
    }
  }, [user]);

  const loadDepartments = () => {
    fetch('/api/v1/departments', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Failed to load departments');
    })
    .then(data => setDepartments(data))
    .catch(err => showNotification('danger', err.message));
  };

  const loadCategories = () => {
    fetch('/api/v1/asset-categories', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Failed to load categories');
    })
    .then(data => setCategories(data))
    .catch(err => showNotification('danger', err.message));
  };

  const loadUsers = () => {
    fetch('/api/v1/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error('Failed to load employee directory');
    })
    .then(data => setUsers(data))
    .catch(err => showNotification('danger', err.message));
  };

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setFormLoading(true);
    const email = e.target.email.value;
    const password = e.target.password.value;

    fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Login failed') });
    })
    .then(data => {
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
      setFormLoading(false);
      navigate('/');
    })
    .catch(err => {
      setAuthError(err.message);
      setFormLoading(false);
    });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setFormLoading(true);
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Signup failed') });
    })
    .then(() => {
      setAuthSuccess('Account created successfully! Please log in.');
      setFormLoading(false);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    })
    .catch(err => {
      setAuthError(err.message);
      setFormLoading(false);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    navigate('/login');
  };

  // Departments CRUD Handlers
  const onCreateDepartment = (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    fetch('/api/v1/departments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newDeptName })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Failed to create department') });
    })
    .then(() => {
      setNewDeptName('');
      loadDepartments();
      showNotification('success', 'Department created successfully!');
    })
    .catch(err => showNotification('danger', err.message));
  };

  const onUpdateDepartment = (e) => {
    e.preventDefault();
    fetch(`/api/v1/departments/${editDept.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: editDept.name, status: editDept.status })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Failed to update department') });
    })
    .then(() => {
      setEditDept(null);
      loadDepartments();
      showNotification('success', 'Department updated successfully!');
    })
    .catch(err => showNotification('danger', err.message));
  };

  // Categories CRUD Handlers
  const onCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    fetch('/api/v1/asset-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newCatName, description: newCatDesc })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Failed to create category') });
    })
    .then(() => {
      setNewCatName('');
      setNewCatDesc('');
      loadCategories();
      showNotification('success', 'Asset category created successfully!');
    })
    .catch(err => showNotification('danger', err.message));
  };

  const onUpdateCategory = (e) => {
    e.preventDefault();
    fetch(`/api/v1/asset-categories/${editCat.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: editCat.name, description: editCat.description, is_active: editCat.is_active })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Failed to update category') });
    })
    .then(() => {
      setEditCat(null);
      loadCategories();
      showNotification('success', 'Asset category updated successfully!');
    })
    .catch(err => showNotification('danger', err.message));
  };

  // User/Employee Promotion Handlers
  const onUpdateUser = (e) => {
    e.preventDefault();
    fetch(`/api/v1/users/${editUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        department_id: editUser.department_id ? parseInt(editUser.department_id) : null,
        role: editUser.role,
        status: editUser.status
      })
    })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(err => { throw new Error(err.detail || 'Failed to update employee') });
    })
    .then(() => {
      setEditUser(null);
      loadUsers();
      showNotification('success', 'Employee credentials updated successfully!');
    })
    .catch(err => showNotification('danger', err.message));
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(59, 130, 246, 0.2)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-secondary)' }}>Verifying active session...</p>
        </div>
      </div>
    );
  }

  // Auth pages layout
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthPage) {
    return (
      <div className="app-container">
        <div className="auth-wrapper">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="circle">AF</div>
              <h1>AssetFlow</h1>
              <p>Enterprise Asset & Resource Management System</p>
            </div>

            {authError && <div className="alert alert-danger">{authError}</div>}
            {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

            {location.pathname === '/login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="input-control"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="input-control"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Logging in...' : 'Sign In'}
                </button>
                <div className="auth-footer">
                  New here?{' '}
                  <span className="auth-link" onClick={() => navigate('/signup')}>
                    Create an account
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="input-control"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="input-control"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="input-control"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Registering...' : 'Create Account'}
                </button>
                <div className="auth-footer">
                  Already have an account?{' '}
                  <span className="auth-link" onClick={() => navigate('/login')}>
                    Sign in instead
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated layout shell
  return (
    <div className="app-container">
      {notify.message && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000 }}>
          <div className={`alert alert-${notify.type}`} style={{ margin: 0, boxShadow: 'var(--shadow-md)' }}>
            {notify.message}
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="app-header">
        <div className="app-brand">
          <div className="mini-logo">AF</div>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>AssetFlow</span>
        </div>
        <div className="app-user-menu">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <span className="user-badge">{user?.role}</span>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-content">
        {/* Welcome Header */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Welcome back, {user?.name}!</h2>
            <p>
              {user?.role === 'ADMIN' 
                ? 'System Administration Portal is active. You have full access to departments, categories, and permissions.'
                : `Employee panel. Your role is ${user?.role}. View allocations and submit resource requests.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/assets')}>
              Asset Directory
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/allocations')}>
              Allocations & Transfers
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/bookings')}>
              Bookings
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/maintenance')}>
              Maintenance
            </button>
            {user?.role === 'ADMIN' && (
              <button className="btn btn-secondary" onClick={() => navigate('/organization')}>
                Organization Setup
              </button>
            )}
          </div>
        </div>

        <Routes>
          {/* Dashboard Route */}
          <Route path="/" element={
            <>
              <div className="dashboard-grid">
                <div className="kpi-card kpi-success">
                  <span className="kpi-label">Assets Available</span>
                  <span className="kpi-value">128</span>
                  <span className="kpi-desc">Ready for allocation</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Assets Allocated</span>
                  <span className="kpi-value">36</span>
                  <span className="kpi-desc">Currently held by staff</span>
                </div>
                <div className="kpi-card kpi-danger">
                  <span className="kpi-label">Maintenance Today</span>
                  <span className="kpi-value">3</span>
                  <span className="kpi-desc">Awaiting repair resolution</span>
                </div>
                <div className="kpi-card kpi-warning">
                  <span className="kpi-label">Active Bookings</span>
                  <span className="kpi-value">12</span>
                  <span className="kpi-desc">Shared rooms & vehicles</span>
                </div>
              </div>

              <div className="action-box">
                <div>
                  <h4>Operational Quick Shortcuts</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Frequently used shortcuts for resource and lifecycle management
                  </p>
                </div>
                <div className="action-buttons-list">
                  <div className="action-btn-shortcut" onClick={() => navigate('/assets')}>
                    <div className="shortcut-icon">＋</div>
                    <div>Register Asset</div>
                  </div>
                  <div className="action-btn-shortcut" onClick={() => navigate('/bookings')}>
                    <div className="shortcut-icon">📅</div>
                    <div>Book Resource</div>
                  </div>
                  <div className="action-btn-shortcut" onClick={() => navigate('/maintenance')}>
                    <div className="shortcut-icon">🔧</div>
                    <div>Raise Maintenance</div>
                  </div>
                </div>
              </div>
            </>
          } />

          {/* Asset Directory Route */}
          <Route path="/assets" element={<AssetsPage />} />

          {/* Organization Setup (Admin only) */}
          <Route path="/organization" element={
            user?.role === 'ADMIN' ? (
              <div className="tabs-container">
                <div className="tabs-header">
                  <button className={`tab-btn ${orgTab === 'departments' ? 'active' : ''}`} onClick={() => setOrgTab('departments')}>
                    🏢 Departments
                  </button>
                  <button className={`tab-btn ${orgTab === 'categories' ? 'active' : ''}`} onClick={() => setOrgTab('categories')}>
                    🏷️ Asset Categories
                  </button>
                  <button className={`tab-btn ${orgTab === 'employees' ? 'active' : ''}`} onClick={() => setOrgTab('employees')}>
                    👥 Employee Directory
                  </button>
                </div>

                <div className="tabs-content">
                  {orgTab === 'departments' && (
                    <div>
                      <div className="section-header">
                        <h4>Department Management</h4>
                      </div>
                      <form className="grid-form grid-form-2" onSubmit={onCreateDepartment}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="dept-name">Create Department</label>
                          <input type="text" id="dept-name" className="input-control" placeholder="e.g. Engineering" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} required />
                        </div>
                        <div className="align-end">
                          <button type="submit" className="btn btn-primary">Add Department</button>
                        </div>
                      </form>

                      {departments.length === 0 ? (
                        <div className="empty-state">No departments registered.</div>
                      ) : (
                        <div className="table-wrapper">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Department Name</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {departments.map((dept) => (
                                <tr key={dept.id}>
                                  <td>{dept.id}</td>
                                  <td style={{ fontWeight: 600 }}>{dept.name}</td>
                                  <td><span className={`status-badge ${dept.status.toLowerCase()}`}>{dept.status}</span></td>
                                  <td>{new Date(dept.created_at).toLocaleDateString()}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditDept({ ...dept })}>Edit</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {orgTab === 'categories' && (
                    <div>
                      <div className="section-header">
                        <h4>Asset Category Management</h4>
                      </div>
                      <form className="grid-form grid-form-3" onSubmit={onCreateCategory}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="cat-name">Category Name</label>
                          <input type="text" id="cat-name" className="input-control" placeholder="e.g. Electronics" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label htmlFor="cat-desc">Description</label>
                          <input type="text" id="cat-desc" className="input-control" placeholder="Optional details" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} />
                        </div>
                        <div className="align-end">
                          <button type="submit" className="btn btn-primary">Add Category</button>
                        </div>
                      </form>

                      {categories.length === 0 ? (
                        <div className="empty-state">No categories registered.</div>
                      ) : (
                        <div className="table-wrapper">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Category Name</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categories.map((cat) => (
                                <tr key={cat.id}>
                                  <td>{cat.id}</td>
                                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                  <td>{cat.description || <span style={{ color: 'var(--text-muted)' }}>No description</span>}</td>
                                  <td><span className={`status-badge ${cat.is_active ? 'active' : 'inactive'}`}>{cat.is_active ? 'Active' : 'Inactive'}</span></td>
                                  <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditCat({ ...cat })}>Edit</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {orgTab === 'employees' && (
                    <div>
                      <div className="section-header">
                        <h4>Employee Directory & Access Roles</h4>
                      </div>

                      {users.length === 0 ? (
                        <div className="empty-state">No users registered in the system.</div>
                      ) : (
                        <div className="table-wrapper">
                          <table className="custom-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>System Role</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Permissions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((emp) => (
                                <tr key={emp.id}>
                                  <td style={{ fontWeight: 600 }}>{emp.name}</td>
                                  <td>{emp.email}</td>
                                  <td>{emp.department?.name || <span style={{ color: 'var(--text-muted)' }}>None / Unassigned</span>}</td>
                                  <td><span className="user-badge" style={{ verticalAlign: 'middle' }}>{emp.role}</span></td>
                                  <td><span className={`status-badge ${emp.status.toLowerCase()}`}>{emp.status}</span></td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditUser({ ...emp })}>Manage Access</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : <Navigate to="/" />
          } />

          {/* Allocations & Transfers Route */}
          <Route path="/allocations" element={<Allocations currentUser={user} />} />

          {/* Bookings Route */}
          <Route path="/bookings" element={<Bookings currentUser={user} />} />

          {/* Maintenance Route */}
          <Route path="/maintenance" element={<Maintenance currentUser={user} />} />
        </Routes>
      </main>

      {/* Modals definitions (Dept, Cat, User) */}
      {editDept && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h4>Edit Department</h4>
              <button className="modal-close" onClick={() => setEditDept(null)}>×</button>
            </div>
            <form onSubmit={onUpdateDepartment}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-dept-name">Department Name</label>
                  <input type="text" id="edit-dept-name" className="input-control" value={editDept.name} onChange={(e) => setEditDept({ ...editDept, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-dept-status">Status</label>
                  <select id="edit-dept-status" className="select-control" value={editDept.status} onChange={(e) => setEditDept({ ...editDept, status: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditDept(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editCat && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h4>Edit Asset Category</h4>
              <button className="modal-close" onClick={() => setEditCat(null)}>×</button>
            </div>
            <form onSubmit={onUpdateCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-cat-name">Category Name</label>
                  <input type="text" id="edit-cat-name" className="input-control" value={editCat.name} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-cat-desc">Description</label>
                  <input type="text" id="edit-cat-desc" className="input-control" value={editCat.description || ''} onChange={(e) => setEditCat({ ...editCat, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-cat-status">Status</label>
                  <select id="edit-cat-status" className="select-control" value={editCat.is_active ? 'true' : 'false'} onChange={(e) => setEditCat({ ...editCat, is_active: e.target.value === 'true' })}>
                    <option value="true">ACTIVE</option>
                    <option value="false">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditCat(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h4>Manage Access & Promoting Options</h4>
              <button className="modal-close" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={onUpdateUser}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Name</p>
                  <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '8px' }}>{editUser.name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email</p>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{editUser.email}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-user-dept">Department Assignment</label>
                  <select id="edit-user-dept" className="select-control" value={editUser.department_id || ''} onChange={(e) => setEditUser({ ...editUser, department_id: e.target.value })}>
                    <option value="">Unassigned / None</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-user-role">System Role Promotion</label>
                  <select id="edit-user-role" className="select-control" value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="DEPARTMENT_HEAD">DEPARTMENT_HEAD</option>
                    <option value="ASSET_MANAGER">ASSET_MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-user-status">Status</label>
                  <select id="edit-user-status" className="select-control" value={editUser.status} onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        © {new Date().getFullYear()} AssetFlow Systems. Integrated Monorepo.
      </footer>
    </div>
  );
}
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
