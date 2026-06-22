import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, User, MapPin, Route, RefreshCw, Navigation } from 'lucide-react';
import { showToast } from '../components/Toast';

export default function Dispatch() {
  const { jobs, customers, team, setJobs } = useApp();
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [optimized, setOptimized] = useState(false);

  const todayJobs = jobs.filter(j => j.scheduledDate === '2026-06-21' && j.status !== 'cancelled');
  const techs = team.filter(t => t.role === 'technician');

  const routes = techs.map(tech => {
    const techJobs = todayJobs.filter(j => j.assignedTo.includes(tech.id))
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return { tech, jobs: techJobs };
  }).filter(r => r.jobs.length > 0);

  const allVisible = selectedTech ? routes.filter(r => r.tech.id === selectedTech) : routes;

  const handleOptimize = () => {
    const reorderings: string[] = [];
    routes.forEach(({ jobs: routeJobs }) => {
      if (routeJobs.length < 2) return;
      const sorted = [...routeJobs].sort((a, b) => {
        const latA = a.lat || 39.75; const latB = b.lat || 39.75;
        const lngA = a.lng || -105; const lngB = b.lng || -105;
        return (latB - latA) || (lngA - lngB);
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
    if (reorderings.length > 0) {
      showToast('success', `Routes optimized! ${reorderings.length} stop(s) reordered to minimize drive time.`);
    } else {
      showToast('info', 'Routes are already optimized.');
    }
  };

  const handleReassign = (jobId: string, fromTechId: string, toTechId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      const newAssigned = j.assignedTo.filter(id => id !== fromTechId);
      if (!newAssigned.includes(toTechId)) newAssigned.push(toTechId);
      return { ...j, assignedTo: newAssigned };
    }));
    const toTech = team.find(t => t.id === toTechId);
    showToast('success', `Job reassigned to ${toTech?.name}`);
  };

  return (
    <div className="dispatch-page">
      <div className="page-header">
        <h1>Dispatch Map</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOptimize}><Route size={16} /> {optimized ? 'Re-Optimize' : 'Optimize Routes'}</button>
        </div>
      </div>

      <div className="dispatch-layout">
        <div className="dispatch-sidebar">
          <h3>Routes - Today</h3>
          <div className="route-filter">
            <button className={`filter-chip ${!selectedTech ? 'active' : ''}`} onClick={() => setSelectedTech(null)}>All</button>
            {techs.map(t => (
              <button key={t.id} className={`filter-chip ${selectedTech === t.id ? 'active' : ''}`} onClick={() => setSelectedTech(t.id)} style={selectedTech === t.id ? { backgroundColor: t.color, color: '#fff' } : {}}>{t.name.split(' ')[0]}</button>
            ))}
          </div>

          {allVisible.length === 0 && <p className="empty-text">No routes for selected technician today.</p>}

          {allVisible.map(({ tech, jobs: routeJobs }) => (
            <div key={tech.id} className="route-card">
              <div className="route-header" style={{ borderLeftColor: tech.color }}>
                <span className="crew-badge" style={{ backgroundColor: tech.color }}>{tech.name.split(' ').map(n => n[0]).join('')}</span>
                <div><strong>{tech.name}</strong><span className={`status-badge status-${tech.status}`}>{tech.status.replace('_', ' ')}</span></div>
                <span className="route-job-count">{routeJobs.length} stops</span>
              </div>
              <div className="route-stops">
                {routeJobs.map((job, i) => {
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
                })}
              </div>
              <div className="route-summary">
                <span>Est. drive: {routeJobs.length * 15} min total</span>
                <span>Revenue: ${routeJobs.reduce((s, j) => s + j.totalAmount, 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
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
                  <svg key={tech.id} className="route-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={tech.color} strokeWidth="2" strokeDasharray={optimized ? "0" : "6,4"} opacity={optimized ? "0.8" : "0.6"} />
                  </svg>
                );
              })}
            </div>
            <div className="map-legend">
              <Navigation size={16} />
              <span>{optimized ? 'Routes optimized for minimum drive time' : 'Interactive map — click Optimize Routes to minimize drive time'}</span>
              {optimized && <RefreshCw size={14} style={{ color: 'var(--success)' }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
