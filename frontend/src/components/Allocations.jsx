import React, { useState, useEffect } from 'react';

/* ── Mock data (fallback when auth/backend not merged yet) ── */
const MOCK_ASSETS = [
  { id: 1, tag: 'AF-0114', name: 'Dell Laptop',     status: 'ALLOCATED',  allocated_to_id: 3, allocated_to_name: 'Priya Shah',   department: 'Engineering' },
  { id: 2, tag: 'AF-0227', name: 'MacBook Pro M3',  status: 'ALLOCATED',  allocated_to_id: 4, allocated_to_name: 'David Employee',department: 'Design'      },
  { id: 3, tag: 'AF-0339', name: 'Dell UltraSharp', status: 'AVAILABLE',  allocated_to_id: null, allocated_to_name: null, department: null },
  { id: 4, tag: 'AF-0412', name: 'iPad Pro',        status: 'AVAILABLE',  allocated_to_id: null, allocated_to_name: null, department: null },
];

const MOCK_USERS = [
  { id: 1, name: 'Alice Admin',    role: 'admin',           department_id: 1, department: 'Engineering' },
  { id: 2, name: 'Bob Manager',    role: 'asset_manager',   department_id: 1, department: 'Engineering' },
  { id: 3, name: 'Priya Shah',     role: 'department_head', department_id: 1, department: 'Engineering' },
  { id: 4, name: 'David Employee', role: 'employee',        department_id: 2, department: 'Design'      },
  { id: 5, name: 'R. Varma',       role: 'employee',        department_id: 1, department: 'Engineering' },
];

const MOCK_ALLOCATIONS = [
  {
    id: 1, asset_id: 1, tag: 'AF-0114', asset_name: 'Dell Laptop',
    employee_id: 3, employee_name: 'Priya Shah', department: 'Engineering',
    department_id: 1, allocated_by: 2, allocated_by_name: 'Bob Manager',
    allocated_at: '2025-03-12T09:00:00Z', expected_return_date: null,
    return_requested_at: null, returned_at: null, status: 'ACTIVE',
  },
  {
    id: 2, asset_id: 2, tag: 'AF-0227', asset_name: 'MacBook Pro M3',
    employee_id: 4, employee_name: 'David Employee', department: 'Design',
    department_id: 2, allocated_by: 1, allocated_by_name: 'Alice Admin',
    allocated_at: '2025-01-04T10:00:00Z', expected_return_date: '2025-02-01',
    return_requested_at: new Date().toISOString(), returned_at: null, status: 'RETURN_REQUESTED',
  },
];

const MOCK_HISTORY = {
  1: [
    { date: 'Mar 12', text: 'Allocated to Priya Shah – Engineering' },
    { date: 'Jan 04', text: 'Returned by Arjun Nair – condition: good' },
  ],
  2: [
    { date: 'Jan 04', text: 'Allocated to David Employee – Design' },
  ],
};

const MOCK_TRANSFERS = [
  {
    id: 1, asset_id: 1, tag: 'AF-0114', from_name: 'Priya Shah',
    to_name: null, status: 'PENDING', reason: 'Project reassignment',
    requested_at: '2025-07-01T10:00:00Z',
  },
];

/* ── helpers ── */
const fmt = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
};

export default function Allocations({ currentUser }) {
  const [allocations, setAllocations]     = useState(MOCK_ALLOCATIONS);
  const [assets, setAssets]               = useState(MOCK_ASSETS);
  const [transfers, setTransfers]         = useState(MOCK_TRANSFERS);

  /* asset search / lookup */
  const [assetQuery, setAssetQuery]       = useState('');
  const [lookedUpAsset, setLookedUpAsset] = useState(null);

  /* new allocation form */
  const [allocTargetType, setAllocTargetType] = useState('employee');
  const [allocTargetId, setAllocTargetId]     = useState('');
  const [allocReturnDate, setAllocReturnDate] = useState('');

  /* transfer form (appears when asset is already allocated) */
  const [transferToId, setTransferToId]   = useState('');
  const [transferReason, setTransferReason] = useState('');

  /* return approval */
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes]     = useState('');

  /* ui */
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const roleLower = currentUser?.role?.toLowerCase();
  const isManager = roleLower === 'admin' || roleLower === 'asset_manager';

  /* ── fetch real data (with fallback) ── */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/v1/allocations');
        if (r.ok) { const d = await r.json(); if (d.length) setAllocations(d); }
      } catch { /* use mock */ }
    })();
  }, []);

  /* ── asset lookup ── */
  const handleLookup = () => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) { setError('Enter an asset tag or name to search.'); return; }
    const found = assets.find(a =>
      a.tag.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
    if (!found) { setError(`No asset found matching "${assetQuery}".`); setLookedUpAsset(null); return; }
    setError('');
    setLookedUpAsset(found);
    setAllocTargetId('');
    setTransferToId('');
    setTransferReason('');
  };

  const handleLookupKeyDown = e => { if (e.key === 'Enter') handleLookup(); };

  /* ── allocate ── */
  const handleAllocate = async e => {
    e.preventDefault();
    if (!lookedUpAsset || !allocTargetId) { setError('Select asset and holder.'); return; }

    const payload = {
      asset_id: lookedUpAsset.id,
      employee_id: allocTargetType === 'employee' ? parseInt(allocTargetId) : null,
      department_id: allocTargetType === 'department' ? parseInt(allocTargetId) : null,
      expected_return_date: allocReturnDate || null,
    };

    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch('/api/v1/allocations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setSuccess('Asset allocated successfully.');
        const data = await r.json();
        setAllocations(prev => [data, ...prev]);
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.detail || 'Allocation failed.');
      }
    } catch {
      /* simulate */
      const holder = MOCK_USERS.find(u => u.id === parseInt(allocTargetId));
      setAllocations(prev => [{
        id: prev.length + 1, asset_id: lookedUpAsset.id, tag: lookedUpAsset.tag,
        asset_name: lookedUpAsset.name,
        employee_id: allocTargetType === 'employee' ? parseInt(allocTargetId) : null,
        employee_name: allocTargetType === 'employee' && holder ? holder.name : null,
        department: holder?.department || null, department_id: parseInt(allocTargetId) || null,
        allocated_by: currentUser.id, allocated_by_name: currentUser.name,
        allocated_at: new Date().toISOString(), expected_return_date: allocReturnDate || null,
        return_requested_at: null, returned_at: null, status: 'ACTIVE',
      }, ...prev]);
      setAssets(prev => prev.map(a => a.id === lookedUpAsset.id ? { ...a, status: 'ALLOCATED' } : a));
      setLookedUpAsset({ ...lookedUpAsset, status: 'ALLOCATED', allocated_to_name: holder?.name || 'Selected User' });
      setSuccess('Asset allocated (simulated).');
    }
    setLoading(false);
  };

  /* ── submit transfer request ── */
  const handleTransferRequest = async e => {
    e.preventDefault();
    if (!lookedUpAsset || !transferToId) { setError('Select a target employee.'); return; }

    const payload = {
      asset_id: lookedUpAsset.id,
      target_employee_id: parseInt(transferToId),
      reason: transferReason,
    };

    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch('/api/v1/transfers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setSuccess('Transfer request submitted.');
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.detail || 'Transfer failed.');
      }
    } catch {
      const toUser = MOCK_USERS.find(u => u.id === parseInt(transferToId));
      setTransfers(prev => [{
        id: prev.length + 1, asset_id: lookedUpAsset.id, tag: lookedUpAsset.tag,
        from_name: lookedUpAsset.allocated_to_name || 'Current Holder',
        to_name: toUser?.name || 'Unknown', status: 'PENDING',
        reason: transferReason, requested_at: new Date().toISOString(),
      }, ...prev]);
      setSuccess('Transfer request submitted (simulated).');
      setTransferToId(''); setTransferReason('');
    }
    setLoading(false);
  };

  /* ── return request ── */
  const handleReturnRequest = async allocId => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`/api/v1/allocations/${allocId}/return-request`, { method: 'POST' });
      if (r.ok) { setSuccess('Return request submitted.'); }
      else { setAllocations(prev => prev.map(a => a.id === allocId ? { ...a, status: 'RETURN_REQUESTED', return_requested_at: new Date().toISOString() } : a)); }
    } catch {
      setAllocations(prev => prev.map(a => a.id === allocId ? { ...a, status: 'RETURN_REQUESTED', return_requested_at: new Date().toISOString() } : a));
      setSuccess('Return request submitted (simulated).');
    }
    setLoading(false);
  };

  /* ── approve return ── */
  const handleApproveReturn = async e => {
    e.preventDefault();
    if (!selectedAlloc) return;
    setLoading(true); setError(''); setSuccess('');
    const payload = { return_condition: returnCondition, return_notes: returnNotes };
    try {
      const r = await fetch(`/api/v1/allocations/${selectedAlloc.id}/return-approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) { setSuccess('Return approved.'); } 
      else { setError('Return approval failed.'); }
    } catch {
      setAllocations(prev => prev.map(a => a.id === selectedAlloc.id ? { ...a, status: 'RETURNED', returned_at: new Date().toISOString() } : a));
      setSuccess('Return approved (simulated).');
    }
    setSelectedAlloc(null);
    setLoading(false);
  };

  const allocationHistory = lookedUpAsset ? (MOCK_HISTORY[lookedUpAsset.id] || []) : [];

  return (
    <div className="member3-theme">
      <div className="grid-sidebar-main">

      {/* ── Left Panel: Asset Lookup + Forms ── */}
      <div>

        {/* Asset search field */}
        <div className="card">
          <div className="card-title">🔍 Asset Lookup</div>
          <div className="form-group">
            <label>Asset Tag or Name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                placeholder="e.g. AF-0114 or Dell Laptop"
                value={assetQuery}
                onChange={e => setAssetQuery(e.target.value)}
                onKeyDown={handleLookupKeyDown}
              />
              <button className="btn btn-blue" onClick={handleLookup} style={{ whiteSpace: 'nowrap' }}>
                Search
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger"><span className="alert-icon">⚠</span>{error}</div>}
          {success && <div className="alert alert-success"><span className="alert-icon">✓</span>{success}</div>}

          {/* Looked-up asset info */}
          {lookedUpAsset && (
            <div style={{ marginTop: 4 }}>
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 9, marginBottom: 14, fontWeight: 600, fontSize: '0.92rem' }}>
                {lookedUpAsset.tag} — {lookedUpAsset.name}
                <span style={{ marginLeft: 10 }}>
                  <span className={`badge badge-${lookedUpAsset.status.toLowerCase()}`}>{lookedUpAsset.status}</span>
                </span>
              </div>

              {/* Double-allocation block — shows when asset is already allocated */}
              {lookedUpAsset.status === 'ALLOCATED' && (
                <div className="alert alert-danger">
                  <span className="alert-icon">🚫</span>
                  <div>
                    <strong>Already Allocated to {lookedUpAsset.allocated_to_name} ({lookedUpAsset.department || 'Unknown Dept.'})</strong><br />
                    <span style={{ fontSize: '0.85rem' }}>Direct re-allocation is blocked — submit a transfer request below</span>
                  </div>
                </div>
              )}

              {/* ── Allocate form — only shown when AVAILABLE ── */}
              {lookedUpAsset.status === 'AVAILABLE' && isManager && (
                <form onSubmit={handleAllocate}>
                  <div className="card-title" style={{ marginBottom: 14 }}>Allocate Asset</div>
                  <div className="form-group">
                    <label>Target Type</label>
                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                      {['employee', 'department'].map(t => (
                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                          <input type="radio" name="allocType" value={t}
                            checked={allocTargetType === t}
                            onChange={() => { setAllocTargetType(t); setAllocTargetId(''); }}
                          />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Select {allocTargetType === 'employee' ? 'Employee' : 'Department'}</label>
                    <select className="form-control" value={allocTargetId} onChange={e => setAllocTargetId(e.target.value)}>
                      <option value="">-- Choose --</option>
                      {allocTargetType === 'employee'
                        ? MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)
                        : [{ id: 1, name: 'Engineering' }, { id: 2, name: 'Design' }].map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                      }
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Expected Return Date (optional)</label>
                    <input type="date" className="form-control" value={allocReturnDate} onChange={e => setAllocReturnDate(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    Submit Allocation
                  </button>
                </form>
              )}

              {/* ── Transfer Request form — shown when already ALLOCATED ── */}
              {lookedUpAsset.status === 'ALLOCATED' && (
                <form onSubmit={handleTransferRequest} style={{ marginTop: 4 }}>
                  <div className="card-title" style={{ marginBottom: 14 }}>Transfer Request</div>
                  <div className="form-row" style={{ marginBottom: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>From</label>
                      <input
                        className="form-control"
                        value={lookedUpAsset.allocated_to_name || 'Current Holder'}
                        disabled
                        style={{ opacity: 0.7 }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>To</label>
                      <select className="form-control" value={transferToId} onChange={e => setTransferToId(e.target.value)}>
                        <option value="">Select Employee...</option>
                        {MOCK_USERS.filter(u => u.id !== lookedUpAsset.allocated_to_id).map(u =>
                          <option key={u.id} value={u.id}>{u.name}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Reason</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Describe the reason for transfer..."
                      value={transferReason}
                      onChange={e => setTransferReason(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    Submit Request
                  </button>
                </form>
              )}

              {/* ── Allocation History ── */}
              {allocationHistory.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="card-title" style={{ marginBottom: 12 }}>Allocation history</div>
                  <hr style={{ borderColor: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />
                  <div className="history-log">
                    {allocationHistory.map((h, i) => (
                      <div key={i} className="history-entry">
                        <div className="history-dot" />
                        <div>
                          <div className="history-text">{h.text}</div>
                          <div className="history-date">{h.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return Approval panel */}
        {selectedAlloc && (
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.4)' }}>
            <div className="card-title">✅ Approve Asset Return</div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              Allocation #{selectedAlloc.id} — {selectedAlloc.tag} {selectedAlloc.asset_name}
            </p>
            <form onSubmit={handleApproveReturn}>
              <div className="form-group">
                <label>Return Condition</label>
                <select className="form-control" value={returnCondition} onChange={e => setReturnCondition(e.target.value)}>
                  {['EXCELLENT','GOOD','FAIR','DAMAGED'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" rows={2} value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Condition notes..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>Approve Check-in</button>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedAlloc(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Right Panel: Allocations Table + Transfer Queue ── */}
      <div>
        <div className="card">
          <div className="card-title">📋 Active Allocations</div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Asset</th>
                  <th>Assigned To</th>
                  <th>Allocated</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(alloc => {
                  const isHolder =
                    alloc.employee_id === currentUser.id ||
                    (alloc.department_id && currentUser.department_id === alloc.department_id);
                  return (
                    <tr key={alloc.id}>
                      <td style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>
                        {alloc.tag || `#${alloc.asset_id}`}
                      </td>
                      <td>{alloc.asset_name}</td>
                      <td>
                        {alloc.employee_name
                          ? `${alloc.employee_name} (${alloc.department || 'Individual'})`
                          : `Dept #${alloc.department_id}`}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{fmt(alloc.allocated_at)}</td>
                      <td>
                        <span className={`badge badge-${alloc.status.toLowerCase()}`}>{alloc.status}</span>
                      </td>
                      <td>
                        {alloc.status === 'ACTIVE' && isHolder && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleReturnRequest(alloc.id)}>
                            Request Return
                          </button>
                        )}
                        {alloc.status === 'RETURN_REQUESTED' && isManager && (
                          <button className="btn btn-blue btn-sm" onClick={() => setSelectedAlloc(alloc)}>
                            Process Return
                          </button>
                        )}
                        {alloc.status === 'RETURNED' && (
                          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Transfer Requests */}
        {transfers.length > 0 && (
          <div className="card">
            <div className="card-title">🔄 Transfer Requests</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Tag</th><th>From</th><th>To</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>{t.tag}</td>
                      <td>{t.from_name}</td>
                      <td>{t.to_name || '—'}</td>
                      <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
