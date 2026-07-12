import React, { useState, useEffect } from 'react';

/* ── Time slot helpers ── */
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8:00 – 17:00

const fmtHour = h => {
  if (h === 12) return '12:00';
  if (h > 12)  return `${h - 12}:00`;
  return `${h}:00`;
};

const isoToHour = iso => new Date(iso).getHours() + new Date(iso).getMinutes() / 60;

/* Return format "Tue, 7 Jul" */
const fmtDay = date => date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/* ── Mock data ── */
const MOCK_ASSETS = [
  { id: 1, tag: 'AF-R01', name: 'Conference Room A',  is_bookable: true,  status: 'AVAILABLE' },
  { id: 2, tag: 'AF-R02', name: 'Conference Room B2', is_bookable: true,  status: 'AVAILABLE' },
  { id: 3, tag: 'AF-R03', name: 'Training Room',      is_bookable: true,  status: 'AVAILABLE' },
  { id: 4, tag: 'AF-L01', name: 'MacBook Pro M3',     is_bookable: false, status: 'ALLOCATED' },
];

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const mkISO = (h, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const MOCK_BOOKINGS = [
  { id: 1, asset_id: 2, asset_name: 'Conference Room B2', booked_by: 1, booked_by_name: 'Procurement Team', start_time: mkISO(9),    end_time: mkISO(10),   status: 'ACTIVE' },
  { id: 2, asset_id: 1, asset_name: 'Conference Room A',  booked_by: 4, booked_by_name: 'David Employee',   start_time: mkISO(11),   end_time: mkISO(13),   status: 'ACTIVE' },
  { id: 3, asset_id: 3, asset_name: 'Training Room',      booked_by: 3, booked_by_name: 'Charlie Head',     start_time: mkISO(14),   end_time: mkISO(16),   status: 'ACTIVE' },
];

export default function Bookings({ currentUser }) {
  const [bookings, setBookings]         = useState(MOCK_BOOKINGS);
  const [assets]                        = useState(MOCK_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState(MOCK_ASSETS[1]); // default: Conference Room B2
  const [selectedDate, setSelectedDate] = useState(todayStr);

  /* book-a-slot form */
  const [newStart, setNewStart]         = useState('');
  const [newEnd, setNewEnd]             = useState('');
  const [showBookForm, setShowBookForm] = useState(false);

  /* reschedule */
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rsStart, setRsStart]           = useState('');
  const [rsEnd, setRsEnd]               = useState('');

  /* ui */
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  /* pending conflict preview (visual red dashed slot) */
  const [conflictPreview, setConflictPreview] = useState(null); // { start_h, end_h, label }

  /* load bookings from backend (with fallback) */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/v1/bookings');
        if (r.ok) { const d = await r.json(); if (d.length) setBookings(d); }
      } catch { /* use mock */ }
    })();
  }, []);

  /* bookings for currently selected asset + date */
  const dayBookings = bookings.filter(b => {
    const bDate = b.start_time.split('T')[0];
    return b.asset_id === selectedAsset?.id && bDate === selectedDate && b.status === 'ACTIVE';
  });

  /* detect overlap (client-side) */
  const detectConflict = (startISO, endISO) => {
    const s = new Date(startISO).getTime();
    const e = new Date(endISO).getTime();
    return dayBookings.find(b => s < new Date(b.end_time).getTime() && e > new Date(b.start_time).getTime());
  };

  /* ── Book a slot ── */
  const handleBook = async e => {
    e.preventDefault();
    if (!selectedAsset || !newStart || !newEnd) { setError('Fill in all fields.'); return; }
    const sISO = `${selectedDate}T${newStart}:00`;
    const eISO = `${selectedDate}T${newEnd}:00`;
    if (new Date(sISO) >= new Date(eISO)) { setError('Start must be before end.'); return; }

    const conflict = detectConflict(sISO, eISO);
    if (conflict) {
      setConflictPreview({
        start_h: isoToHour(sISO),
        end_h:   isoToHour(eISO),
        label:   `Requested ${newStart} to ${newEnd} – conflict – slot is unavailable`,
      });
      setError('');
      setLoading(false);
      return;
    }

    setConflictPreview(null);
    setLoading(true); setError(''); setSuccess('');

    const payload = { asset_id: selectedAsset.id, start_time: sISO, end_time: eISO };
    try {
      const r = await fetch('/api/v1/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const data = await r.json();
        setBookings(prev => [...prev, data]);
        setSuccess('Booking confirmed.');
      } else if (r.status === 409) {
        const err = await r.json().catch(() => ({}));
        setConflictPreview({
          start_h: isoToHour(sISO), end_h: isoToHour(eISO),
          label: err.detail || 'Conflict – slot is unavailable',
        });
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.detail || 'Booking failed.');
      }
    } catch {
      /* simulate */
      setBookings(prev => [...prev, {
        id: prev.length + 1, asset_id: selectedAsset.id, asset_name: selectedAsset.name,
        booked_by: currentUser.id, booked_by_name: currentUser.name,
        start_time: sISO, end_time: eISO, status: 'ACTIVE',
      }]);
      setSuccess('Booking confirmed (simulated).');
    }
    setShowBookForm(false);
    setNewStart(''); setNewEnd('');
    setLoading(false);
  };

  /* ── Reschedule ── */
  const handleReschedule = async e => {
    e.preventDefault();
    if (!rsStart || !rsEnd) { setError('Fill in times.'); return; }
    const sISO = `${selectedDate}T${rsStart}:00`;
    const eISO = `${selectedDate}T${rsEnd}:00`;
    if (new Date(sISO) >= new Date(eISO)) { setError('Start must be before end.'); return; }

    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`/api/v1/bookings/${rescheduleTarget.id}/reschedule`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: sISO, end_time: eISO }),
      });
      if (r.ok) { const data = await r.json(); setBookings(prev => prev.map(b => b.id === data.id ? data : b)); setSuccess('Rescheduled.'); }
      else if (r.status === 409) { setError('Conflict – the new slot overlaps an existing booking.'); }
      else { setError('Reschedule failed.'); }
    } catch {
      setBookings(prev => prev.map(b => b.id === rescheduleTarget.id ? { ...b, start_time: sISO, end_time: eISO } : b));
      setSuccess('Rescheduled (simulated).');
    }
    setRescheduleTarget(null); setRsStart(''); setRsEnd('');
    setLoading(false);
  };

  /* ── Cancel ── */
  const handleCancel = async bookingId => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`/api/v1/bookings/${bookingId}/cancel`, { method: 'POST' });
      if (r.ok) { setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)); setSuccess('Booking cancelled.'); }
      else { setError('Cancel failed.'); }
    } catch {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b));
      setSuccess('Cancelled (simulated).');
    }
    setLoading(false);
  };

  /* ── Build calendar slot items for a given hour ── */
  const slotsForHour = h => {
    const items = [];

    dayBookings.forEach(b => {
      const bStart = isoToHour(b.start_time);
      const bEnd   = isoToHour(b.end_time);
      // Show booking label at the starting hour
      if (Math.floor(bStart) === h) {
        const label = `Booked – ${b.booked_by_name || 'User'} – ${fmtHour(Math.floor(bStart))} to ${fmtHour(Math.ceil(bEnd))}`;
        items.push({ type: 'booked', label, booking: b });
      }
    });

    if (conflictPreview && Math.floor(conflictPreview.start_h) === h) {
      items.push({ type: 'conflict', label: conflictPreview.label });
    }

    return items;
  };

  return (
    <div className="member3-theme">
      <div className="grid-sidebar-main">

      {/* ── Left: Resource + Date selector + Book form ── */}
      <div>
        <div className="card">
          <div className="card-title">📅 Resource</div>

          <div className="form-group">
            <label>Select Resource</label>
            <select
              className="form-control"
              value={selectedAsset?.id || ''}
              onChange={e => {
                const a = assets.find(x => x.id === parseInt(e.target.value));
                setSelectedAsset(a || null);
                setConflictPreview(null);
              }}
            >
              {assets.filter(a => a.is_bookable).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="date" className="form-control" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setConflictPreview(null); }} />
          </div>

          {error && <div className="alert alert-danger"><span className="alert-icon">⚠</span>{error}</div>}
          {success && <div className="alert alert-success"><span className="alert-icon">✓</span>{success}</div>}

          {/* Book a slot button / form */}
          {!showBookForm && !rescheduleTarget && (
            <button className="btn btn-primary btn-full" onClick={() => { setShowBookForm(true); setConflictPreview(null); }}>
              Book a slot
            </button>
          )}

          {showBookForm && (
            <form onSubmit={handleBook} style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 14 }}>New Booking</div>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Start Time</label>
                  <input type="time" className="form-control" value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>End Time</label>
                  <input type="time" className="form-control" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>Confirm</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowBookForm(false); setConflictPreview(null); }}>Cancel</button>
              </div>
            </form>
          )}

          {rescheduleTarget && (
            <form onSubmit={handleReschedule} style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 14 }}>Reschedule Booking</div>
              <div className="form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>New Start</label>
                  <input type="time" className="form-control" value={rsStart} onChange={e => setRsStart(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>New End</label>
                  <input type="time" className="form-control" value={rsEnd} onChange={e => setRsEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" className="btn btn-blue" style={{ flex: 1 }} disabled={loading}>Update</button>
                <button type="button" className="btn btn-ghost" onClick={() => setRescheduleTarget(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Right: Calendar timeline ── */}
      <div>
        <div className="card">
          <div className="card-title">
            📆 {selectedAsset?.name || 'Resource'} — {fmtDay(new Date(selectedDate + 'T00:00:00'))}
          </div>

          <div className="calendar-wrapper">
            {HOURS.map(h => {
              const items = slotsForHour(h);
              return (
                <div key={h} className="calendar-row">
                  <div className="time-label">{fmtHour(h)}</div>
                  <div className="slot-area">
                    {items.length === 0 ? (
                      <div
                        className="slot-empty"
                        title={`Click to book ${fmtHour(h)} – ${fmtHour(h + 1)}`}
                        onClick={() => {
                          setShowBookForm(true);
                          setNewStart(`${String(h).padStart(2,'0')}:00`);
                          setNewEnd(`${String(h+1).padStart(2,'0')}:00`);
                          setConflictPreview(null);
                        }}
                      />
                    ) : items.map((item, idx) => {
                      if (item.type === 'booked') {
                        const canManage = item.booking.booked_by === currentUser.id || currentUser.role?.toLowerCase() === 'admin';
                        return (
                          <div key={idx} className="slot-booked">
                            {item.label}
                            {canManage && (
                              <span style={{ marginLeft: 12, display: 'inline-flex', gap: 6 }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setRescheduleTarget(item.booking);
                                    setRsStart(item.booking.start_time.split('T')[1].slice(0,5));
                                    setRsEnd(item.booking.end_time.split('T')[1].slice(0,5));
                                    setShowBookForm(false);
                                  }}
                                >
                                  Reschedule
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                  onClick={() => handleCancel(item.booking.id)}
                                >
                                  Cancel
                                </button>
                              </span>
                            )}
                          </div>
                        );
                      }
                      if (item.type === 'conflict') {
                        return <div key={idx} className="slot-conflict">{item.label}</div>;
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
