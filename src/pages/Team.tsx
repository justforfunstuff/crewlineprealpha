import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Phone, Mail, Clock, Wrench, Calendar, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import type { TeamMember, WeeklyAvailability } from '../types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const SKILL_OPTIONS = ['plumbing', 'HVAC', 'electrical', 'drain-cleaning', 'lighting', 'panel-upgrades', 'refrigeration', 'ductwork', 'remodeling', 'general'];

const defaultAvail: WeeklyAvailability = { monday: { start: '08:00', end: '17:00' }, tuesday: { start: '08:00', end: '17:00' }, wednesday: { start: '08:00', end: '17:00' }, thursday: { start: '08:00', end: '17:00' }, friday: { start: '08:00', end: '17:00' }, saturday: null, sunday: null };

export default function Team() {
  const { team, setTeam, jobs } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>('t1');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'technician' as TeamMember['role'], color: COLORS[0], skills: [] as string[], availability: { ...defaultAvail } });

  const selected = team.find(t => t.id === selectedId);
  const memberJobs = selected ? jobs.filter(j => j.assignedTo.includes(selected.id)) : [];
  const completedJobs = memberJobs.filter(j => j.status === 'completed');
  const totalRevenue = completedJobs.reduce((s, j) => s + j.totalAmount, 0);

  const toggleSkill = (skill: string) => setForm(p => ({ ...p, skills: p.skills.includes(skill) ? p.skills.filter(s => s !== skill) : [...p.skills, skill] }));
  const toggleDay = (day: typeof DAYS[number]) => setForm(p => ({ ...p, availability: { ...p.availability, [day]: p.availability[day] ? null : { start: '08:00', end: '17:00' } } }));
  const updateDayTime = (day: typeof DAYS[number], field: 'start' | 'end', value: string) => setForm(p => ({ ...p, availability: { ...p.availability, [day]: p.availability[day] ? { ...p.availability[day]!, [field]: value } : null } }));

  const openAdd = () => { setEditMode(false); setForm({ name: '', email: '', phone: '', role: 'technician', color: COLORS[team.length % COLORS.length], skills: [], availability: { ...defaultAvail } }); setShowModal(true); };
  const openEdit = () => {
    if (!selected) return;
    setEditMode(true);
    setForm({ name: selected.name, email: selected.email, phone: selected.phone, role: selected.role, color: selected.color, skills: [...selected.skills], availability: JSON.parse(JSON.stringify(selected.availability)) });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editMode && selected) {
      setTeam(prev => prev.map(t => t.id === selected.id ? { ...t, ...form } : t));
      showToast('success', `${form.name} updated`);
    } else {
      const newMember: TeamMember = { ...form, id: `t${Date.now()}`, avatar: '', currentLocation: undefined, activeJobId: undefined, status: 'available' };
      setTeam(prev => [...prev, newMember]);
      setSelectedId(newMember.id);
      showToast('success', `${form.name} added to team`);
    }
    setShowModal(false);
  };

  const handleDelete = () => {
    if (!selected || !confirm(`Remove ${selected.name} from the team?`)) return;
    setTeam(prev => prev.filter(t => t.id !== selected.id));
    setSelectedId(team.find(t => t.id !== selected.id)?.id || null);
    showToast('info', 'Team member removed');
  };

  const handleStatusToggle = (memberId: string) => {
    setTeam(prev => prev.map(t => {
      if (t.id !== memberId) return t;
      const order: TeamMember['status'][] = ['available', 'on_job', 'break', 'off_duty'];
      const next = order[(order.indexOf(t.status) + 1) % order.length];
      return { ...t, status: next };
    }));
  };

  return (
    <div className="team-page">
      <div className="page-header"><h1>Team</h1><button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Member</button></div>

      <div className="crm-layout">
        <div className="customer-list-panel">
          <div className="team-list">
            {team.map(member => (
              <div key={member.id} className={`customer-card ${selectedId === member.id ? 'selected' : ''}`} onClick={() => setSelectedId(member.id)}>
                <div className="crew-badge large" style={{ backgroundColor: member.color }}>{member.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="customer-card-info">
                  <strong>{member.name}</strong>
                  <span className="role-badge">{member.role}</span>
                  <div className="customer-tags">{member.skills.slice(0, 3).map(s => <span key={s} className="tag">{s}</span>)}</div>
                </div>
                <span className={`status-dot status-${member.status}`} title={member.status.replace('_', ' ')} onClick={e => { e.stopPropagation(); handleStatusToggle(member.id); }} style={{ cursor: 'pointer', width: 12, height: 12 }} />
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="customer-detail-panel">
            <div className="detail-header">
              <div className="crew-badge xlarge" style={{ backgroundColor: selected.color }}>{selected.name.split(' ').map(n => n[0]).join('')}</div>
              <div>
                <h2>{selected.name}</h2>
                <span className="role-badge">{selected.role}</span>
                <span className={`status-badge status-${selected.status}`} style={{ cursor: 'pointer', marginLeft: 8 }} onClick={() => handleStatusToggle(selected.id)}>{selected.status.replace('_', ' ')}</span>
              </div>
              <div className="detail-actions">
                <button className="btn btn-sm" onClick={openEdit}><Edit2 size={14} /> Edit</button>
                <button className="btn btn-sm btn-danger" onClick={handleDelete}><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-section contact-info"><h4>Contact</h4><div className="info-row"><Phone size={14} /><span>{selected.phone}</span></div><div className="info-row"><Mail size={14} /><span>{selected.email}</span></div></div>
              <div className="detail-section"><h4>Skills</h4><div className="skills-list">{selected.skills.map(s => <span key={s} className="skill-badge"><Wrench size={12} /> {s}</span>)}{selected.skills.length === 0 && <span className="empty-text">No skills assigned</span>}</div></div>
              <div className="detail-section customer-stats"><h4>Performance</h4>
                <div className="stat-grid">
                  <div className="stat-item"><span className="stat-value">{memberJobs.length}</span><span className="stat-label">Total Jobs</span></div>
                  <div className="stat-item"><span className="stat-value">{completedJobs.length}</span><span className="stat-label">Completed</span></div>
                  <div className="stat-item"><span className="stat-value">${totalRevenue.toLocaleString()}</span><span className="stat-label">Revenue</span></div>
                  <div className="stat-item"><span className="stat-value">{completedJobs.length > 0 ? `${(completedJobs.reduce((s, j) => s + (j.actualDuration || j.estimatedDuration), 0) / completedJobs.length).toFixed(1)}h` : 'N/A'}</span><span className="stat-label">Avg Duration</span></div>
                </div>
              </div>
              <div className="detail-section"><h4>Weekly Availability</h4>
                <div className="availability-grid">{DAYS.map(day => { const slot = selected.availability[day]; return (
                  <div key={day} className={`avail-day ${slot ? 'available' : 'off'}`}><span className="day-label">{day.slice(0, 3)}</span>{slot ? <span className="avail-time"><Clock size={12} /> {slot.start} - {slot.end}</span> : <span className="avail-off">Off</span>}</div>
                ); })}</div>
              </div>
              <div className="detail-section"><h4>Upcoming Jobs</h4>
                <div className="history-list">{memberJobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').map(j => (
                  <div key={j.id} className="history-item"><span className={`status-dot status-${j.status}`} /><div><strong>{j.title}</strong><span><Calendar size={12} /> {j.scheduledDate} at {j.scheduledTime}</span></div></div>
                ))}{memberJobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length === 0 && <p className="empty-text">No upcoming jobs.</p>}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editMode ? 'Edit Team Member' : 'Add Team Member'} width="600px">
        <div className="form-grid">
          <div className="form-group"><label>Full Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" /></div>
          <div className="form-group"><label>Role</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as TeamMember['role'] }))}><option value="technician">Technician</option><option value="dispatcher">Dispatcher</option><option value="admin">Admin</option></select>
          </div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="form-group"><label>Phone</label><input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          <div className="form-group"><label>Color</label>
            <div className="color-picker">{COLORS.map(c => <button key={c} type="button" className={`color-swatch ${form.color === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />)}</div>
          </div>
          <div className="form-group full-width"><label>Skills</label>
            <div className="tech-picker">{SKILL_OPTIONS.map(s => <button key={s} type="button" className={`tech-chip ${form.skills.includes(s) ? 'active' : ''}`} onClick={() => toggleSkill(s)}>{s}</button>)}</div>
          </div>
          <div className="form-group full-width"><label>Availability</label>
            <div className="availability-editor">{DAYS.map(day => (
              <div key={day} className="avail-edit-row">
                <label className="avail-toggle"><input type="checkbox" checked={!!form.availability[day]} onChange={() => toggleDay(day)} /><span>{day.slice(0, 3)}</span></label>
                {form.availability[day] && (
                  <><input type="time" value={form.availability[day]!.start} onChange={e => updateDayTime(day, 'start', e.target.value)} />
                  <span>to</span>
                  <input type="time" value={form.availability[day]!.end} onChange={e => updateDayTime(day, 'end', e.target.value)} /></>
                )}
              </div>
            ))}</div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={!form.name}>{editMode ? 'Save Changes' : 'Add Member'}</button></div>
      </Modal>
    </div>
  );
}
