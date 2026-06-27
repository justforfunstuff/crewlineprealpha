import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Send, CheckCircle2, Eye, Clock, XCircle, FileText, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import type { EstimateStatus, LineItem } from '../types';

const STATUS_ICONS: Record<EstimateStatus, typeof Clock> = {
  draft: FileText, sent: Send, viewed: Eye, approved: CheckCircle2, declined: XCircle, expired: Clock,
};

export default function Estimates() {
  const { estimates, customers, addEstimate: addEstimateToDb, updateEstimate, deleteEstimate, setEstimates } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('e2');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customerId: '', title: '', description: '', validDays: 30, notes: '' });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 'e1', description: '', quantity: 1, unitPrice: 0, optional: false }]);

  const filtered = estimates.filter(e => {
    const customer = customers.find(c => c.id === e.customerId);
    return `${e.number} ${customer?.firstName} ${customer?.lastName}`.toLowerCase().includes(search.toLowerCase());
  });

  const selected = estimates.find(e => e.id === selectedId);
  const selectedCustomer = selected ? customers.find(c => c.id === selected.customerId) : null;

  const handleStatusUpdate = async (id: string, status: EstimateStatus) => {
    const updates: Partial<Estimate> = { status };
    if (status === 'sent') updates.sentAt = new Date().toISOString().split('T')[0];
    if (status === 'approved') updates.approvedAt = new Date().toISOString().split('T')[0];
    await updateEstimate(id, updates);
    showToast('success', `Estimate ${status}`);
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: `e${Date.now()}`, description: '', quantity: 1, unitPrice: 0, optional: false }]);
  const updateLineItem = (id: string, field: string, value: string | number | boolean) => setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));

  const handleCreate = async () => {
    if (!form.customerId) return;
    const subtotal = lineItems.filter(li => li.description).reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const tax = subtotal * 0.07;
    const today = new Date();
    const validDate = new Date(today);
    validDate.setDate(validDate.getDate() + form.validDays);
    const result = await addEstimateToDb({
      number: `EST-${String(estimates.length + 1).padStart(3, '0')}`,
      customerId: form.customerId,
      lineItems: lineItems.filter(li => li.description),
      subtotal, tax, total: subtotal + tax,
      status: 'draft' as EstimateStatus,
      validUntil: validDate.toISOString().split('T')[0],
      notes: form.notes,
    });
    if (result) {
      setSelectedId(result.id);
      setShowModal(false);
      setForm({ customerId: '', title: '', description: '', validDays: 30, notes: '' });
      setLineItems([{ id: 'e1', description: '', quantity: 1, unitPrice: 0, optional: false }]);
      showToast('success', `Estimate ${result.number} created`);
    } else {
      showToast('error', 'Failed to save estimate.');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEstimate(id);
    setSelectedId(null);
    showToast('info', 'Estimate deleted');
  };

  return (
    <div className="estimates-page">
      <div className="page-header">
        <h1>Estimates</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Estimate</button>
      </div>

      <div className="split-layout">
        <div className="list-panel">
          <div className="search-box"><Search size={16} /><input placeholder="Search estimates..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="document-list">
            {filtered.map(est => {
              const customer = customers.find(c => c.id === est.customerId);
              const Icon = STATUS_ICONS[est.status];
              return (
                <div key={est.id} className={`document-card ${selectedId === est.id ? 'selected' : ''}`} onClick={() => setSelectedId(est.id)}>
                  <div className={`doc-status-icon status-${est.status}`}><Icon size={16} /></div>
                  <div className="doc-info"><strong>{est.number}</strong><span>{customer?.firstName} {customer?.lastName}</span></div>
                  <div className="doc-meta"><span className="doc-amount">${est.total.toLocaleString()}</span><span className={`status-badge status-${est.status}`}>{est.status}</span></div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="empty-text">No estimates found.</p>}
          </div>
        </div>

        {selected && selectedCustomer ? (
          <div className="detail-panel document-detail">
            <div className="document-header">
              <div><h2>{selected.number}</h2><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div>
              <div className="document-actions">
                {selected.status === 'draft' && <button className="btn btn-primary" onClick={() => handleStatusUpdate(selected.id, 'sent')}><Send size={14} /> Send</button>}
                {(selected.status === 'sent' || selected.status === 'viewed') && (
                  <><button className="btn btn-success" onClick={() => handleStatusUpdate(selected.id, 'approved')}><CheckCircle2 size={14} /> Approve</button>
                  <button className="btn btn-danger" onClick={() => handleStatusUpdate(selected.id, 'declined')}><XCircle size={14} /> Decline</button></>
                )}
                <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="document-body">
              <div className="doc-parties">
                <div><h4>From</h4><strong>Crewline</strong><p>Denver, CO 80202</p></div>
                <div><h4>To</h4><strong>{selectedCustomer.firstName} {selectedCustomer.lastName}</strong><p>{selectedCustomer.address}</p><p>{selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zip}</p></div>
              </div>
              <div className="doc-dates">
                <div><span>Created:</span> <strong>{selected.createdAt}</strong></div>
                <div><span>Valid Until:</span> <strong>{selected.validUntil}</strong></div>
                {selected.approvedAt && <div><span>Approved:</span> <strong>{selected.approvedAt}</strong></div>}
              </div>
              <table className="line-items-table">
                <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>{selected.lineItems.map(li => (
                  <tr key={li.id} className={li.optional ? 'optional' : ''}><td>{li.description} {li.optional && <span className="optional-badge">Optional</span>}</td><td>{li.quantity}</td><td>${li.unitPrice.toFixed(2)}</td><td>${(li.quantity * li.unitPrice).toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
              <div className="doc-totals">
                <div><span>Subtotal</span><span>${selected.subtotal.toLocaleString()}</span></div>
                <div><span>Tax (7%)</span><span>${selected.tax.toFixed(2)}</span></div>
                <div className="total-row"><span>Total</span><span>${selected.total.toLocaleString()}</span></div>
              </div>
              {selected.notes && <div className="doc-notes"><h4>Notes</h4><p>{selected.notes}</p></div>}
            </div>
          </div>
        ) : <div className="detail-panel document-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}><p>Select an estimate to view details</p></div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Estimate" width="680px">
        <div className="form-grid">
          <div className="form-group full-width"><label>Title</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Kitchen Remodel Estimate" /></div>
          <div className="form-group"><label>Customer *</label>
            <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}><option value="">Select...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
          </div>
          <div className="form-group"><label>Valid for (days)</label><input type="number" value={form.validDays} onChange={e => setForm(p => ({ ...p, validDays: parseInt(e.target.value) || 30 }))} /></div>
          <div className="form-group full-width"><label>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Scope of work..." /></div>
          <div className="form-group full-width">
            <label>Line Items</label>
            <table className="line-items-table editable">
              <thead><tr><th>Description</th><th style={{width:60}}>Qty</th><th style={{width:90}}>Price</th><th style={{width:60}}>Opt?</th><th style={{width:40}}></th></tr></thead>
              <tbody>{lineItems.map(li => (
                <tr key={li.id}>
                  <td><input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)} placeholder="Item description" /></td>
                  <td><input type="number" min="1" value={li.quantity} onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 1)} /></td>
                  <td><input type="number" min="0" step="0.01" value={li.unitPrice || ''} placeholder="0.00" onChange={e => updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                  <td><input type="checkbox" checked={li.optional || false} onChange={e => updateLineItem(li.id, 'optional', e.target.checked)} /></td>
                  <td><button className="btn-icon" onClick={() => removeLineItem(li.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table>
            <button className="btn btn-sm" onClick={addLineItem} style={{ marginTop: 6 }}><Plus size={12} /> Add Item</button>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <span>Subtotal: ${lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0).toFixed(2)}</span>
              <span style={{ marginLeft: 16 }}>Tax: ${(lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0) * 0.07).toFixed(2)}</span>
              <strong style={{ marginLeft: 16 }}>Total: ${(lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0) * 1.07).toFixed(2)}</strong>
            </div>
          </div>
          <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes for customer..." /></div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={!form.customerId || !lineItems.some(li => li.description)}>Create Estimate</button>
        </div>
      </Modal>
    </div>
  );
}
