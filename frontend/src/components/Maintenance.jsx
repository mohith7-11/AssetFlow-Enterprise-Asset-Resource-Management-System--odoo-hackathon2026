import React, { useState, useEffect } from 'react';

/* ── Mock data ── */
const MOCK_REQUESTS = [
  { id: 1,  tag: 'AF-0062', asset_id: 1, requested_by: 4, requester_name: 'David Employee', description: 'Projector bulb not turning on',   priority: 'HIGH',     status: 'PENDING',             assigned_to: null, assigned_to_name: null,   created_at: new Date(Date.now()-2*86400000).toISOString(), resolved_at: null, resolution_notes: null },
  { id: 2,  tag: 'AF-003',  asset_id: 2, requested_by: 3, requester_name: 'Charlie Head',   description: 'AC unit noisy compressor',          priority: 'MEDIUM',   status: 'APPROVED',            assigned_to: null, assigned_to_name: null,   created_at: new Date(Date.now()-3*86400000).toISOString(), resolved_at: null, resolution_notes: null },
  { id: 3,  tag: 'AF-0078', asset_id: 3, requested_by: 4, requester_name: 'David Employee', description: 'Forklift – hydraulic issue',         priority: 'CRITICAL', status: 'TECHNICIAN_ASSIGNED', assigned_to: 2,   assigned_to_name: 'R. Varma',         created_at: new Date(Date.now()-4*86400000).toISOString(), resolved_at: null, resolution_notes: null },
  { id: 4,  tag: 'AF-897',  asset_id: 4, requested_by: 1, requester_name: 'Alice Admin',    description: 'Printer jam – parts ordered',        priority: 'HIGH',     status: 'IN_PROGRESS',         assigned_to: 2,   assigned_to_name: 'Bob Manager',      created_at: new Date(Date.now()-5*86400000).toISOString(), resolved_at: null, resolution_notes: null },
  { id: 5,  tag: 'AF-873',  asset_id: 5, requested_by: 3, requester_name: 'Charlie Head',   description: 'Chair repair – resolved 7 Jul',      priority: 'LOW',      status: 'RESOLVED',            assigned_to: 2,   assigned_to_name: 'Bob Manager',      created_at: new Date(Date.now()-6*86400000).toISOString(), resolved_at: new Date().toISOString(), resolution_notes: 'Repaired armrests and replaced foam padding.' },
];

const MOCK_ASSETS = [
  { id: 1, tag: 'AF-0062', name: 'Projector (Room 4B)'     },
  { id: 2, tag: 'AF-003',  name: 'HVAC Unit – Floor 2'     },
  { id: 3, tag: 'AF-0078', name: 'Warehouse Forklift'      },
  { id: 4, tag: 'AF-897',  name: 'Laser Printer'           },
  { id: 5, tag: 'AF-873',  name: 'Ergonomic Office Chair'  },
  { id: 6, tag: 'AF-0114', name: 'Dell Laptop'             },
];

const MOCK_STAFF = [
  { id: 1, name: 'Alice Admin',  role: 'admin'         },
  { id: 2, name: 'Bob Manager',  role: 'asset_manager' },
  { id: 5, name: 'R. Varma',     role: 'asset_manager' },
];

/* ── Column config ── */
const COLUMNS = [
  { key: 'PENDING',              label: 'Pending',              color: '#fbbf24' },
  { key: 'APPROVED',             label: 'Approved',             color: '#60a5fa' },
  { key: 'TECHNICIAN_ASSIGNED',  label: 'Technician Assigned',  color: '#a78bfa' },
  { key: 'IN_PROGRESS',          label: 'In Progress',          color: '#fb923c' },
  { key: 'RESOLVED',             label: 'Resolved',             color: '#4ade80' },
];

export default function Maintenance({ currentUser }) {
  const [requests, setRequests]   = useState(MOCK_REQUESTS);
  const [assets]                  = useState(MOCK_ASSETS);

  /* New ticket form */
  const [ticketAsset, setTicketAsset]   = useState('');
  const [ticketDesc, setTicketDesc]     = useState('');
  const [ticketPrio, setTicketPrio]     = useState('MEDIUM');

  /* Assign overlay */
  const [assignTarget, setAssignTarget] = useState(null);
  const [techId, setTechId]             = useState('');

  /* Resolve overlay */
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNotes, setResolveNotes]   = useState('');

  /* ui */
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isManager = currentUser.role === 'admin' || currentUser.role === 'asset_manager';

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/v1/maintenance');
        if (r.ok) { const d = await r.json(); if (d.length) setRequests(d); }
      } catch { /* use mock */ }
    })();
  }, []);

  /* ── API helpers with sim fallback ── */
  const apiAction = async (url, method, body, simulateFn) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.ok) { return await r.json().catch(() => ({})); }
      const err = await r.json().catch(() => ({}));
      setError(err.detail || `Request failed (${r.status}).`);
      return null;
    } catch {
      simulateFn?.();
      return 'simulated';
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (id, status, extra = {}) =>
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r));

  /* ── Submit ticket ── */
  const handleSubmitTicket = async e => {
    e.preventDefault();
    if (!ticketAsset || !ticketDesc) { setError('Select an asset and write a description.'); return; }
    const asset = assets.find(a => a.id === parseInt(ticketAsset));
    const payload = { asset_id: parseInt(ticketAsset), description: ticketDesc, priority: ticketPrio };

    const result = await apiAction('/api/v1/maintenance', 'POST', payload, () => {
      setRequests(prev => [...prev, {
        id: prev.length + 1, tag: asset?.tag || `AF-${Date.now()}`,
        asset_id: parseInt(ticketAsset), requested_by: currentUser.id,
        requester_name: currentUser.name, description: ticketDesc,
        priority: ticketPrio, status: 'PENDING',
        assigned_to: null, assigned_to_name: null,
        created_at: new Date().toISOString(), resolved_at: null, resolution_notes: null,
      }]);
      setSuccess('Ticket submitted (simulated).');
    });
    if (result) { setSuccess('Ticket submitted.'); setTicketAsset(''); setTicketDesc(''); setTicketPrio('MEDIUM'); }
  };

  /* ── Approve ── */
  const handleApprove = async id => {
    const result = await apiAction(`/api/v1/maintenance/${id}/approve`, 'POST', null, () => {
      setStatus(id, 'APPROVED'); setSuccess('Approved (simulated).');
    });
    if (result) { setStatus(id, 'APPROVED'); setSuccess('Approved.'); }
  };

  /* ── Reject ── */
  const handleReject = async id => {
    const result = await apiAction(`/api/v1/maintenance/${id}/reject`, 'POST', null, () => {
      setStatus(id, 'REJECTED'); setSuccess('Rejected (simulated).');
    });
    if (result) { setStatus(id, 'REJECTED'); setSuccess('Rejected.'); }
  };

  /* ── Assign technician ── */
  const handleAssign = async e => {
    e.preventDefault();
    if (!techId || !assignTarget) { setError('Select a technician.'); return; }
    const tech = MOCK_STAFF.find(s => s.id === parseInt(techId));
    const result = await apiAction(
      `/api/v1/maintenance/${assignTarget.id}/assign`, 'POST',
      { assigned_to: parseInt(techId) },
      () => {
        setStatus(assignTarget.id, 'TECHNICIAN_ASSIGNED', { assigned_to: parseInt(techId), assigned_to_name: tech?.name });
        setSuccess('Assigned (simulated).');
      }
    );
    if (result) {
      setStatus(assignTarget.id, 'TECHNICIAN_ASSIGNED', { assigned_to: parseInt(techId), assigned_to_name: tech?.name });
      setSuccess('Technician assigned.');
    }
    setAssignTarget(null); setTechId('');
  };

  /* ── Start work ── */
  const handleStart = async id => {
    const result = await apiAction(`/api/v1/maintenance/${id}/start`, 'POST', null, () => {
      setStatus(id, 'IN_PROGRESS'); setSuccess('Work started (simulated).');
    });
    if (result) { setStatus(id, 'IN_PROGRESS'); setSuccess('Work started.'); }
  };

  /* ── Resolve ── */
  const handleResolve = async e => {
    e.preventDefault();
    if (!resolveNotes || !resolveTarget) { setError('Add resolution notes.'); return; }
    const result = await apiAction(
      `/api/v1/maintenance/${resolveTarget.id}/resolve`, 'POST',
      { resolution_notes: resolveNotes },
      () => {
        setStatus(resolveTarget.id, 'RESOLVED', { resolved_at: new Date().toISOString(), resolution_notes: resolveNotes });
        setSuccess('Resolved (simulated).');
      }
    );
    if (result) {
      setStatus(resolveTarget.id, 'RESOLVED', { resolved_at: new Date().toISOString(), resolution_notes: resolveNotes });
      setSuccess('Ticket resolved.');
    }
    setResolveTarget(null); setResolveNotes('');
  };

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

  return (
    <div>
      {error   && <div className="alert alert-danger"><span className="alert-icon">⚠</span>{error}</div>}
      {success && <div className="alert alert-success"><span className="alert-icon">✓</span>{success}</div>}

      {/* Overlay panels */}
      {assignTarget && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(59,130,246,0.4)', maxWidth: 440 }}>
          <div className="card-title">🔧 Assign Technician – {assignTarget.tag}</div>
          <form onSubmit={handleAssign}>
            <div className="form-group">
              <label>Select Staff</label>
              <select className="form-control" value={techId} onChange={e => setTechId(e.target.value)}>
                <option value="">-- Choose --</option>
                {MOCK_STAFF.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-blue" disabled={loading}>Assign</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAssignTarget(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {resolveTarget && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(34,197,94,0.4)', maxWidth: 440 }}>
          <div className="card-title">✅ Resolve – {resolveTarget.tag}</div>
          <form onSubmit={handleResolve}>
            <div className="form-group">
              <label>Resolution Notes</label>
              <textarea className="form-control" rows={3} value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Describe what was repaired / replaced..." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>Submit Resolution</button>
              <button type="button" className="btn btn-ghost" onClick={() => setResolveTarget(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Submit ticket form (compact, above board) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">➕ Raise Maintenance Request</div>
        <form onSubmit={handleSubmitTicket}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Asset</label>
              <select className="form-control" value={ticketAsset} onChange={e => setTicketAsset(e.target.value)}>
                <option value="">-- Select asset --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.tag} — {a.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Priority</label>
              <select className="form-control" value={ticketPrio} onChange={e => setTicketPrio(e.target.value)}>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-secondary" style={{ height: 42 }}
              onClick={() => document.getElementById('ticket-desc-row')?.classList.toggle('hidden')}
            >
              ▼ Description
            </button>
          </div>
          <div id="ticket-desc-row" style={{ marginTop: 12 }}>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Describe the fault..."
              value={ticketDesc}
              onChange={e => setTicketDesc(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>Submit Ticket</button>
          </div>
        </form>
      </div>

      {/* ── Kanban Board — 5 columns ── */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const cards = requests.filter(r => r.status === col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header" style={{ borderTop: `3px solid ${col.color}` }}>
                <span>{col.label}</span>
                <span className="kanban-col-count">{cards.length}</span>
              </div>
              <div className="kanban-col-body">
                {cards.map(req => {
                  const isAssignedTech = req.assigned_to === currentUser.id;
                  return (
                    <div key={req.id} className={`kanban-card ${col.key === 'RESOLVED' ? 'resolved' : ''}`}>
                      <div className="kanban-card-id">{req.tag}</div>
                      <span className={`priority-tag priority-${req.priority.toLowerCase()}`}>{req.priority}</span>
                      <div className="kanban-card-desc">{req.description}</div>
                      {req.assigned_to_name && (
                        <div className="kanban-card-meta">tech: {req.assigned_to_name}</div>
                      )}
                      {req.resolved_at && (
                        <div className="kanban-card-meta">
                          Resolved {fmtDate(req.resolved_at)}
                        </div>
                      )}
                      {req.resolution_notes && (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
                          {req.resolution_notes}
                        </div>
                      )}

                      {/* ── Contextual actions per column ── */}
                      <div className="kanban-card-actions">
                        {col.key === 'PENDING' && isManager && (
                          <>
                            <button className="btn btn-primary btn-sm btn-full" onClick={() => handleApprove(req.id)} disabled={loading}>Approve</button>
                            <button className="btn btn-danger btn-sm btn-full" onClick={() => handleReject(req.id)} disabled={loading}>Reject</button>
                          </>
                        )}
                        {col.key === 'APPROVED' && isManager && (
                          <button className="btn btn-blue btn-sm btn-full" onClick={() => { setAssignTarget(req); setTechId(''); }}>
                            Assign Tech
                          </button>
                        )}
                        {col.key === 'TECHNICIAN_ASSIGNED' && (
                          <>
                            {isManager && (
                              <button className="btn btn-ghost btn-sm btn-full" onClick={() => { setAssignTarget(req); setTechId(String(req.assigned_to || '')); }}>
                                Reassign
                              </button>
                            )}
                            {isAssignedTech && (
                              <button className="btn btn-blue btn-sm btn-full" onClick={() => handleStart(req.id)} disabled={loading}>
                                Start Work
                              </button>
                            )}
                          </>
                        )}
                        {col.key === 'IN_PROGRESS' && isAssignedTech && (
                          <button className="btn btn-primary btn-sm btn-full" onClick={() => { setResolveTarget(req); setResolveNotes(''); }}>
                            Resolve Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {cards.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem', marginTop: 24 }}>
                    No items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note exactly matching spec */}
      <div className="kanban-footer-note">
        <span>ℹ</span>
        Approving a card moves the asset to under maintenance; resolving returns it to available.
      </div>
    </div>
  );
}
