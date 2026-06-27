import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Star, Phone, Mail, MapPin, Tag, ChevronRight, Filter, ArrowUpDown, Edit2, Trash2, Send } from 'lucide-react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import type { Customer } from '../types';

const EMPTY_CUSTOMER: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'jobCount' | 'rating' | 'lastContactDate'> = {
  firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', notes: '', tags: [], source: 'phone',
};

export default function Customers() {
  const { customers, setCustomers, jobs, invoices, messages, addMessage, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('c1');
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'recent'>('recent');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_CUSTOMER);
  const [tagInput, setTagInput] = useState('');
  const [quickMessage, setQuickMessage] = useState('');

  const allTags = [...new Set(customers.flatMap(c => c.tags))];

  const filtered = customers
    .filter(c => {
      const matchesSearch = `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !filterTag || c.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.lastName.localeCompare(b.lastName);
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      return new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime();
    });

  const selected = customers.find(c => c.id === selectedId);
  const customerJobs = selected ? jobs.filter(j => j.customerId === selected.id) : [];
  const customerInvoices = selected ? invoices.filter(i => i.customerId === selected.id) : [];
  const customerMessages = selected ? messages.filter(m => m.customerId === selected.id) : [];

  const updateField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleAdd = async () => {
    if (!formData.firstName || !formData.lastName) return;
    const result = await addCustomer({
      ...formData,
      totalSpent: 0, jobCount: 0, rating: 5,
      lastContactDate: new Date().toISOString().split('T')[0],
    });
    if (result) {
      setSelectedId(result.id);
      setShowAddModal(false);
      setFormData(EMPTY_CUSTOMER);
      showToast('success', `Customer ${result.firstName} ${result.lastName} added`);
    } else {
      showToast('error', 'Failed to save customer. Please try again.');
    }
  };

  const handleOpenEdit = () => {
    if (!selected) return;
    setFormData({ firstName: selected.firstName, lastName: selected.lastName, email: selected.email, phone: selected.phone, address: selected.address, city: selected.city, state: selected.state, zip: selected.zip, notes: selected.notes, tags: [...selected.tags], source: selected.source });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selected || !formData.firstName || !formData.lastName) return;
    await updateCustomer(selected.id, formData);
    setShowEditModal(false);
    showToast('success', `Customer updated`);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete ${selected.firstName} ${selected.lastName}? This cannot be undone.`)) return;
    await deleteCustomer(selected.id);
    setSelectedId(filtered.find(c => c.id !== selected.id)?.id || null);
    showToast('info', 'Customer deleted');
  };

  const handleSendMessage = () => {
    if (!quickMessage.trim() || !selected) return;
    addMessage({
      id: `m${Date.now()}`,
      customerId: selected.id,
      direction: 'outbound',
      channel: 'sms',
      content: quickMessage,
      timestamp: new Date().toISOString(),
      read: true,
    });
    setQuickMessage('');
    setShowMessageModal(false);
    showToast('success', `Message sent to ${selected.firstName}`);
  };

  const customerForm = (
    <div className="form-grid">
      <div className="form-group"><label>First Name *</label><input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} placeholder="John" /></div>
      <div className="form-group"><label>Last Name *</label><input value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} placeholder="Smith" /></div>
      <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="john@email.com" /></div>
      <div className="form-group"><label>Phone</label><input type="tel" value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(555) 123-4567" /></div>
      <div className="form-group full-width"><label>Address</label><input value={formData.address} onChange={e => updateField('address', e.target.value)} placeholder="123 Main St" /></div>
      <div className="form-group"><label>City</label><input value={formData.city} onChange={e => updateField('city', e.target.value)} placeholder="Denver" /></div>
      <div className="form-group"><label>State</label><input value={formData.state} onChange={e => updateField('state', e.target.value)} placeholder="CO" /></div>
      <div className="form-group"><label>ZIP</label><input value={formData.zip} onChange={e => updateField('zip', e.target.value)} placeholder="80202" /></div>
      <div className="form-group"><label>Source</label>
        <select value={formData.source} onChange={e => updateField('source', e.target.value)}>
          <option value="phone">Phone</option><option value="website">Website</option><option value="referral">Referral</option><option value="online_booking">Online Booking</option><option value="repeat">Repeat</option>
        </select>
      </div>
      <div className="form-group full-width"><label>Tags</label>
        <div className="tag-input-row">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} />
          <button className="btn btn-sm" type="button" onClick={handleAddTag}>Add</button>
        </div>
        <div className="customer-tags" style={{ marginTop: 4 }}>
          {formData.tags.map(t => <span key={t} className="tag removable" onClick={() => handleRemoveTag(t)}>{t} ×</span>)}
        </div>
      </div>
      <div className="form-group full-width"><label>Notes</label><textarea value={formData.notes} onChange={e => updateField('notes', e.target.value)} rows={3} placeholder="Customer notes..." /></div>
    </div>
  );

  return (
    <div className="customers-page">
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary" onClick={() => { setFormData(EMPTY_CUSTOMER); setShowAddModal(true); }}><Plus size={16} /> Add Customer</button>
      </div>

      <div className="crm-layout">
        <div className="customer-list-panel">
          <div className="list-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="toolbar-actions">
              <div className="filter-dropdown">
                <button className="btn btn-sm"><Filter size={14} /> {filterTag || 'All'}</button>
                <div className="dropdown-menu">
                  <button onClick={() => setFilterTag(null)}>All</button>
                  {allTags.map(tag => <button key={tag} onClick={() => setFilterTag(tag)}>{tag}</button>)}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => setSortBy(s => s === 'name' ? 'spent' : s === 'spent' ? 'recent' : 'name')}>
                <ArrowUpDown size={14} /> {sortBy}
              </button>
            </div>
          </div>
          <div className="customer-list">
            {filtered.map(c => (
              <div key={c.id} className={`customer-card ${selectedId === c.id ? 'selected' : ''}`} onClick={() => setSelectedId(c.id)}>
                <div className="customer-avatar" style={{ backgroundColor: `hsl(${c.firstName.charCodeAt(0) * 15}, 60%, 50%)` }}>{c.firstName[0]}{c.lastName[0]}</div>
                <div className="customer-card-info">
                  <strong>{c.firstName} {c.lastName}</strong>
                  <span>{c.phone}</span>
                  <div className="customer-tags">{c.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
                </div>
                <div className="customer-card-meta">
                  <span className="customer-spent">${c.totalSpent.toLocaleString()}</span>
                  <span className="customer-jobs">{c.jobCount} jobs</span>
                </div>
                <ChevronRight size={16} className="chevron" />
              </div>
            ))}
            {filtered.length === 0 && <p className="empty-text">No customers match your search.</p>}
          </div>
        </div>

        {selected && (
          <div className="customer-detail-panel">
            <div className="detail-header">
              <div className="detail-avatar" style={{ backgroundColor: `hsl(${selected.firstName.charCodeAt(0) * 15}, 60%, 50%)` }}>{selected.firstName[0]}{selected.lastName[0]}</div>
              <div>
                <h2>{selected.firstName} {selected.lastName}</h2>
                <span className="customer-source">Source: {selected.source.replace('_', ' ')}</span>
              </div>
              <div className="customer-rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < selected.rating ? 'star-filled' : 'star-empty'} style={{ cursor: 'pointer' }} onClick={() => updateCustomer(selected.id, { rating: i + 1 })} />
                ))}
              </div>
              <div className="detail-actions">
                <button className="btn btn-sm" onClick={handleOpenEdit}><Edit2 size={13} /> Edit</button>
                <button className="btn btn-sm" onClick={() => setShowMessageModal(true)}><Send size={13} /> Message</button>
                <button className="btn btn-sm btn-danger" onClick={handleDelete}><Trash2 size={13} /></button>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-section contact-info">
                <h4>Contact Information</h4>
                <div className="info-row"><Phone size={14} /><span>{selected.phone || 'Not provided'}</span></div>
                <div className="info-row"><Mail size={14} /><span>{selected.email || 'Not provided'}</span></div>
                <div className="info-row"><MapPin size={14} /><span>{selected.address ? `${selected.address}, ${selected.city}, ${selected.state} ${selected.zip}` : 'Not provided'}</span></div>
                <div className="info-row"><Tag size={14} /><span>{selected.tags.length > 0 ? selected.tags.join(', ') : 'No tags'}</span></div>
              </div>

              <div className="detail-section customer-stats">
                <h4>Account Summary</h4>
                <div className="stat-grid">
                  <div className="stat-item"><span className="stat-value">${selected.totalSpent.toLocaleString()}</span><span className="stat-label">Total Spent</span></div>
                  <div className="stat-item"><span className="stat-value">{selected.jobCount}</span><span className="stat-label">Jobs</span></div>
                  <div className="stat-item"><span className="stat-value">{customerInvoices.length}</span><span className="stat-label">Invoices</span></div>
                  <div className="stat-item"><span className="stat-value">{selected.lastContactDate}</span><span className="stat-label">Last Contact</span></div>
                </div>
              </div>

              <div className="detail-section"><h4>Notes</h4><p className="customer-notes">{selected.notes || 'No notes.'}</p></div>

              <div className="detail-section">
                <h4>Job History</h4>
                <div className="history-list">
                  {customerJobs.map(j => (
                    <div key={j.id} className="history-item">
                      <span className={`status-dot status-${j.status}`} />
                      <div><strong>{j.title}</strong><span>{j.scheduledDate} &middot; ${j.totalAmount.toLocaleString()}</span></div>
                    </div>
                  ))}
                  {customerJobs.length === 0 && <p className="empty-text">No jobs yet.</p>}
                </div>
              </div>

              <div className="detail-section">
                <h4>Recent Messages</h4>
                <div className="message-list-mini">
                  {customerMessages.slice(-4).map(m => (
                    <div key={m.id} className={`message-mini ${m.direction}`}>
                      <span className="message-dir">{m.direction === 'inbound' ? '←' : '→'}</span>
                      <span className="message-text">{m.content}</span>
                      <span className="message-time">{new Date(m.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {customerMessages.length === 0 && <p className="empty-text">No messages.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Customer" width="600px">
        {customerForm}
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={!formData.firstName || !formData.lastName}>Add Customer</button>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Customer" width="600px">
        {customerForm}
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit} disabled={!formData.firstName || !formData.lastName}>Save Changes</button>
        </div>
      </Modal>

      <Modal open={showMessageModal} onClose={() => setShowMessageModal(false)} title={`Message ${selected?.firstName || ''}`} width="480px">
        <div className="form-group full-width">
          <label>Send SMS</label>
          <textarea value={quickMessage} onChange={e => setQuickMessage(e.target.value)} rows={4} placeholder="Type your message..." />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowMessageModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSendMessage} disabled={!quickMessage.trim()}><Send size={14} /> Send</button>
        </div>
      </Modal>
    </div>
  );
}
