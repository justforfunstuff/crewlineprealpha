import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, User, MapPin, Route, RefreshCw, Navigation, ChevronLeft, ChevronRight, Plus, Settings, Coffee, Fuel, Package, Trash2 } from 'lucide-react';
import { showToast } from '../components/Toast';
import { format, addDays } from 'date-fns';
import Modal from '../components/Modal';

type OptimizeBy = 'distance' | 'priority' | 'revenue' | 'schedule';

interface CustomStop {
  id: string;
  label: string;
  type: 'material' | 'gas' | 'lunch' | 'other';
  techId: string;
  time: string;
}

export default function Dispatch() {
  const { jobs, customers, team, setJobs } = useApp();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [optimized, setOptimized] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 21));
  const [optimizeBy, setOptimizeBy] = useState<OptimizeBy>('distance');
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [customStops, setCustomStops] = useState<CustomStop[]>([]);
  const [newStop, setNewStop] = useState({ label: '', type: 'material' as CustomStop['type'], techId: '', time: '12:00' });

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayJobs = jobs.filter(j => j.scheduledDate === dateStr && j.status !== 'cancelled');
  const techs = team.filter(t => t.role === 'technician');

  const routes = techs.map(tech => {
    const techJobs = dayJobs.filter(j => j.assignedTo.includes(tech.id))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const techStops = customStops.filter(s => s.techId === tech.id).sort((a, b) => a.time.localeCompare(b.time));
    return { tech, jobs: techJobs, stops: techStops };
  }).filter(r => r.jobs.length > 0 || r.stops.length > 0);

  const allVisible = selectedTech ? routes.filter(r => r.tech.id === selectedTech) : routes;

  const handleOptimize = () => {
    const reorderings: string[] = [];
    routes.forEach(({ jobs: routeJobs }) => {
      if (routeJobs.length < 2) return;
      const sorted = [...routeJobs].sort((a, b) => {
        if (optimizeBy === 'distance') {
          const latA = a.lat || 39.75; const latB = b.lat || 39.75;
          const lngA = a.lng || -105; const lngB = b.lng || -105;
          return (latB - latA) || (lngA - lngB);
        }
        if (optimizeBy === 'priority') {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return order[a.priority] - order[b.priority];
        }
        if (optimizeBy === 'revenue') return b.totalAmount - a.totalAmount;
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
      const times = routeJobs.map(j => j.scheduledTime).sort();
      sorted.forEach((job, i) => {
        if (job.scheduledTime !== times[i]) {
          reorderings.push(job.id);
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, scheduledTime: times[i] } : j));
        }
      });
    });
    setOptimized(true);
    setShowOptimizeModal(false);
    showToast('success', reorderings.length > 0 ? `Routes optimized by ${optimizeBy}! ${reorderings.length} stop(s) reordered.` : 'Routes are already optimal.');
  };

  const handleReassign = (jobId: string, fromTechId: string, toTechId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const newAssigned = j.assignedTo.filter(id => id !== fromTechId);
      if (!newAssigned.includes(toTechId)) newAssigned.push(toTechId);
      return { ...j, assignedTo: newAssigned };
    }));
    showToast('success', `Job reassigned to ${team.find(t => t.id === toTechId)?.name}`);
  };

  const handleAddStop = () => {
    if (!newStop.label || !newStop.techId) return;
    setCustomStops(prev => [...prev, { ...newStop, id: `stop${Date.now()}` }]);
    setNewStop({ label: '', type: 'material', techId: '', time: '12:00' });
    setShowStopModal(false);
    showToast('success', 'Custom stop added');
  };

  const stopIcons = { material: Package, gas: Fuel, lunch: Coffee, other: MapPin };

  return (
    <div className="dispatch-page">
      <div className="page-header">
        <h1>Dispatch Map</h1>
        <div className="header-actions">
          <div className="date-nav">
            <button onClick={() => setCurrentDate(d => addDays(d, -1))}><ChevronLeft size={18} /></button>
            <span className="date-label">{format(currentDate, 'EEE, MMM d, yyyy')}</span>
            <button onClick={() => setCurrentDate(d => addDays(d, 1))}><ChevronRight size={18} /></button>
          </div>
          <button className="btn" onClick={() => setShowStopModal(true)}><Plus size={16} /> Add Stop</button>
          <button className="btn btn-primary" onClick={() => setShowOptimizeModal(true)}><Route size={16} /> Optimize</button>
        </div>
      </div>

      <div className="dispatch-layout">
        <div className="dispatch-sidebar">
          <h3>Routes — {format(currentDate, 'MMM d')}</h3>
          <div className="route-filter">
            <button className={`filter-chip ${!selectedTech ? 'active' : ''}`} onClick={() => setSelectedTech(null)}>All</button>
            {techs.map(t => (
              <button key={t.id} className={`filter-chip ${selectedTech === t.id ? 'active' : ''}`} onClick={() => setSelectedTech(t.id)} style={selectedTech === t.id ? { backgroundColor: t.color, color: '#fff' } : {}}>{t.name.split(' ')[0]}</button>
            ))}
          </div>

          {allVisible.length === 0 && <p className="empty-text">No routes for this day.</p>}

          {allVisible.map(({ tech, jobs: routeJobs, stops }) => {
            const allItems = [
              ...routeJobs.map(j => ({ type: 'job' as const, time: j.scheduledTime, data: j })),
              ...stops.map(s => ({ type: 'stop' as const, time: s.time, data: s })),
            ].sort((a, b) => a.time.localeCompare(b.time));

            return (
              <div key={tech.id} className="route-card">
                <div className="route-header" style={{ borderLeftColor: tech.color }}>
                  <span className="crew-badge" style={{ backgroundColor: tech.color }}>{tech.name.split(' ').map(n => n[0]).join('')}</span>
                  <div><strong>{tech.name}</strong><span className={`status-badge status-${tech.status}`}>{tech.status.replace('_', ' ')}</span></div>
                  <span className="route-job-count">{allItems.length} stops</span>
                </div>
                <div className="route-stops">
                  {allItems.map((item, i) => {
                    if (item.type === 'job') {
                      const job = item.data as typeof routeJobs[0];
                      const customer = customers.find(c => c.id === job.customerId);
                      return (
                        <div key={job.id} className={`route-stop status-${job.status}`}>
                          <div className="stop-number">{i + 1}</div>
                          <div className="stop-info">
                            <strong>{job.title}</strong>
                            <span><User size={12} /> {customer?.firstName} {customer?.lastName}</span>
                            <span><MapPin size={12} /> {job.address}, {job.city}</span>
                            <span><Clock size={12} /> {job.scheduledTime} &middot; {job.estimatedDuration}h</span>
                            <div className="reassign-row">
                              <select className="reassign-select" value="" onChange={e => { if (e.target.value) handleReassign(job.id, tech.id, e.target.value); }}>
                                <option value="">Reassign to...</option>
                                {techs.filter(t => t.id !== tech.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <span className={`status-badge status-${job.status}`}>{job.status.replace('_', ' ')}</span>
                        </div>
                      );
                    } else {
                      const stop = item.data as CustomStop;
                      const StopIcon = stopIcons[stop.type];
                      return (
                        <div key={stop.id} className="route-stop custom-stop">
                          <div className="stop-number" style={{ background: 'var(--text-light)' }}><StopIcon size={12} /></div>
                          <div className="stop-info">
                            <strong>{stop.label}</strong>
                            <span><Clock size={12} /> {stop.time} &middot; {stop.type}</span>
                          </div>
                          <button className="btn-icon" onClick={() => setCustomStops(prev => prev.filter(s => s.id !== stop.id))}><Trash2 size={14} /></button>
                        </div>
                      );
                    }
                  })}
                </div>
                <div className="route-summary">
                  <span>Est. drive: {routeJobs.length * 15} min</span>
                  <span>Revenue: ${routeJobs.reduce((s, j) => s + j.totalAmount, 0).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dispatch-map">
          <div className="map-placeholder">
            <div className="map-grid">
              {allVisible.map(({ tech, jobs: routeJobs }) =>
                routeJobs.map((job, i) => (
                  <div key={job.id} className="map-pin" style={{ backgroundColor: tech.color, left: `${20 + ((job.lng ? (job.lng + 105.1) * 800 : i * 80) % 600)}px`, top: `${20 + ((job.lat ? (40.0 - job.lat) * 1500 : i * 60) % 400)}px` }} title={`${job.title} - ${tech.name}`}>
                    <span>{i + 1}</span>
                  </div>
                ))
              )}
              {allVisible.map(({ tech, jobs: routeJobs }) => {
                if (routeJobs.length < 2) return null;
                const points = routeJobs.map((job, i) => ({ x: 20 + ((job.lng ? (job.lng + 105.1) * 800 : i * 80) % 600) + 16, y: 20 + ((job.lat ? (40.0 - job.lat) * 1500 : i * 60) % 400) + 16 }));
                return (
                  <svg key={tech.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={tech.color} strokeWidth="2" strokeDasharray={optimized ? "0" : "6,4"} opacity={optimized ? "0.8" : "0.6"} />
                  </svg>
                );
              })}
            </div>
            <div className="map-legend">
              <Navigation size={16} />
              <span>{optimized ? `Routes optimized by ${optimizeBy}` : 'Click Optimize to plan routes'}</span>
              {optimized && <RefreshCw size={14} style={{ color: 'var(--success)' }} />}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showOptimizeModal} onClose={() => setShowOptimizeModal(false)} title="Optimize Routes" width="420px">
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>Choose which factor to prioritize when ordering stops:</p>
        <div className="optimize-options">
          {([
            { id: 'distance', label: 'Shortest Distance', desc: 'Minimize drive time between stops' },
            { id: 'priority', label: 'Job Priority', desc: 'Urgent and high-priority jobs first' },
            { id: 'revenue', label: 'Highest Revenue', desc: 'Most valuable jobs first' },
            { id: 'schedule', label: 'Scheduled Time', desc: 'Follow the original time order' },
          ] as { id: OptimizeBy; label: string; desc: string }[]).map(opt => (
            <label key={opt.id} className={`optimize-option ${optimizeBy === opt.id ? 'selected' : ''}`}>
              <input type="radio" name="optimizeBy" checked={optimizeBy === opt.id} onChange={() => setOptimizeBy(opt.id)} />
              <div><strong>{opt.label}</strong><span>{opt.desc}</span></div>
            </label>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowOptimizeModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOptimize}><Route size={14} /> Optimize Now</button>
        </div>
      </Modal>

      <Modal open={showStopModal} onClose={() => setShowStopModal(false)} title="Add Custom Stop" width="420px">
        <div className="form-grid">
          <div className="form-group full-width"><label>Stop Name *</label><input value={newStop.label} onChange={e => setNewStop(p => ({ ...p, label: e.target.value }))} placeholder="e.g., Home Depot material pickup" /></div>
          <div className="form-group"><label>Type</label>
            <select value={newStop.type} onChange={e => setNewStop(p => ({ ...p, type: e.target.value as CustomStop['type'] }))}><option value="material">Material Run</option><option value="gas">Gas</option><option value="lunch">Lunch Break</option><option value="other">Other</option></select>
          </div>
          <div className="form-group"><label>Time</label><input type="time" value={newStop.time} onChange={e => setNewStop(p => ({ ...p, time: e.target.value }))} /></div>
          <div className="form-group full-width"><label>Assign to Technician *</label>
            <select value={newStop.techId} onChange={e => setNewStop(p => ({ ...p, techId: e.target.value }))}><option value="">Select...</option>{techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowStopModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddStop} disabled={!newStop.label || !newStop.techId}>Add Stop</button>
        </div>
      </Modal>
    </div>
  );
}
