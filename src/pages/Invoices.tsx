import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Send, DollarSign, CheckCircle2, AlertTriangle, Clock, CreditCard, Banknote, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import type { InvoiceStatus, LineItem } from '../types';

export default function Invoices() {
  const { invoices, customers, setInvoices, jobs, addInvoice: addInvoiceToDb, updateInvoice, deleteInvoice } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('inv2');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('credit_card');
  const defaultDueDate = new Date(2026, 6, 21).toISOString().split('T')[0];
  const [form, setForm] = useState({ customerId: '', jobId: '', dueDate: defaultDueDate, notes: '' });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 'i1', description: '', quantity: 1, unitPrice: 0 }]);

  const filtered = invoices.filter(i => {
    const customer = customers.find(c => c.id === i.customerId);
    const matchesSearch = `${i.number} ${customer?.firstName} ${customer?.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selected = invoices.find(i => i.id === selectedId);
  const selectedCustomer = selected ? customers.find(c => c.id === selected.customerId) : null;

  const totals = {
    outstanding: invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total - i.amountPaid), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total - i.amountPaid), 0),
    collected: invoices.reduce((s, i) => s + i.amountPaid, 0),
  };

  const handleRecordPayment = async () => {
    if (!selected) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    const newPaid = Math.min(selected.amountPaid + amount, selected.total);
    const newStatus: InvoiceStatus = newPaid >= selected.total ? 'paid' : 'partial';
    await updateInvoice(selected.id, { amountPaid: newPaid, status: newStatus, ...(newStatus === 'paid' ? { paidAt: new Date().toISOString().split('T')[0] } : {}) });
    setShowPayModal(false);
    setPayAmount('');
    showToast('success', `$${amount.toFixed(2)} payment recorded via ${payMethod.replace('_', ' ')}`);
  };

  const handleSendReminder = () => {
    if (!selected || !selectedCustomer) return;
    showToast('success', `Payment reminder sent to ${selectedCustomer.firstName} ${selectedCustomer.lastName}`);
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: `i${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }]);
  const updateLineItem = (id: string, field: string, value: string | number) => setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));

  const handleCreate = async () => {
    if (!form.customerId) return;
    const subtotal = lineItems.filter(li => li.description).reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const tax = subtotal * 0.07;
    const result = await addInvoiceToDb({
      number: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      customerId: form.customerId,
      jobId: form.jobId || undefined,
      lineItems: lineItems.filter(li => li.description),
      subtotal, tax, total: subtotal + tax, amountPaid: 0,
      status: 'draft' as InvoiceStatus,
      dueDate: form.dueDate,
      notes: form.notes,
    });
    if (result) {
      setSelectedId(result.id);
      setShowModal(false);
      setForm({ customerId: '', jobId: '', dueDate: defaultDueDate, notes: '' });
      setLineItems([{ id: 'i1', description: '', quantity: 1, unitPrice: 0 }]);
      showToast('success', `Invoice ${result.number} created`);
    } else {
      showToast('error', 'Failed to save invoice.');
    }
  };

  const handleSendInvoice = async (id: string) => {
    await updateInvoice(id, { status: 'sent' as InvoiceStatus, sentAt: new Date().toISOString().split('T')[0] });
    showToast('success', 'Invoice sent');
  };

  const customerJobs = form.customerId ? jobs.filter(j => j.customerId === form.customerId) : [];

  const handleImportFromJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setLineItems(job.lineItems.map(li => ({ ...li, id: `i${Date.now()}${li.id}` })));
      setForm(p => ({ ...p, jobId }));
    }
  };

  return (
    <div className="invoices-page">
      <div className="page-header">
        <h1>Invoices</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Invoice</button>
      </div>

      <div className="invoice-summary-bar">
        <div className="summary-card"><DollarSign size={18} className="text-blue" /><div><span className="summary-value">${totals.outstanding.toLocaleString()}</span><span className="summary-label">Outstanding</span></div></div>
        <div className="summary-card warning"><AlertTriangle size={18} className="text-orange" /><div><span className="summary-value">${totals.overdue.toLocaleString()}</span><span className="summary-label">Overdue</span></div></div>
        <div className="summary-card success"><CheckCircle2 size={18} className="text-green" /><div><span className="summary-value">${totals.collected.toLocaleString()}</span><span className="summary-label">Collected</span></div></div>
      </div>

      <div className="split-layout">
        <div className="list-panel">
          <div className="search-box"><Search size={16} /><input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="status-filters compact">
            {(['all', 'draft', 'sent', 'overdue', 'partial', 'paid'] as const).map(s => (
              <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          <div className="document-list">
            {filtered.map(inv => {
              const customer = customers.find(c => c.id === inv.customerId);
              return (
                <div key={inv.id} className={`document-card ${selectedId === inv.id ? 'selected' : ''}`} onClick={() => setSelectedId(inv.id)}>
                  <div className={`doc-status-icon status-${inv.status}`}>{inv.status === 'overdue' ? <AlertTriangle size={16} /> : inv.status === 'paid' ? <CheckCircle2 size={16} /> : <Clock size={16} />}</div>
                  <div className="doc-info"><strong>{inv.number}</strong><span>{customer?.firstName} {customer?.lastName}</span></div>
                  <div className="doc-meta"><span className="doc-amount">${inv.total.toLocaleString()}</span><span className={`status-badge status-${inv.status}`}>{inv.status}</span></div>
                </div>
              );
            })}
          </div>
        </div>

        {selected && selectedCustomer ? (
          <div className="detail-panel document-detail">
            <div className="document-header">
              <div><h2>{selected.number}</h2><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div>
              <div className="document-actions">
                {selected.status === 'draft' && <button className="btn btn-primary" onClick={() => handleSendInvoice(selected.id)}><Send size={14} /> Send</button>}
                {selected.status !== 'paid' && (
                  <><button className="btn btn-success" onClick={() => { setPayAmount(String((selected.total - selected.amountPaid).toFixed(2))); setShowPayModal(true); }}><CreditCard size={14} /> Record Payment</button>
                  <button className="btn btn-primary" onClick={handleSendReminder}><Send size={14} /> Send Reminder</button></>
                )}
                <button className="btn btn-danger" onClick={async () => { await deleteInvoice(selected.id); setSelectedId(null); showToast('info', 'Invoice deleted'); }}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="document-body">
              <div className="doc-parties">
                <div><h4>From</h4><strong>Crewline</strong><p>Denver, CO 80202</p></div>
                <div><h4>Bill To</h4><strong>{selectedCustomer.firstName} {selectedCustomer.lastName}</strong><p>{selectedCustomer.address}</p><p>{selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zip}</p></div>
              </div>
              <div className="doc-dates">
                <div><span>Invoice Date:</span> <strong>{selected.createdAt}</strong></div>
                <div><span>Due Date:</span> <strong className={selected.status === 'overdue' ? 'text-red' : ''}>{selected.dueDate}</strong></div>
                {selected.paidAt && <div><span>Paid:</span> <strong>{selected.paidAt}</strong></div>}
              </div>
              <table className="line-items-table">
                <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>{selected.lineItems.map(li => <tr key={li.id}><td>{li.description}</td><td>{li.quantity}</td><td>${li.unitPrice.toFixed(2)}</td><td>${(li.quantity * li.unitPrice).toFixed(2)}</td></tr>)}</tbody>
              </table>
              <div className="doc-totals">
                <div><span>Subtotal</span><span>${selected.subtotal.toLocaleString()}</span></div>
                <div><span>Tax (7%)</span><span>${selected.tax.toFixed(2)}</span></div>
                <div className="total-row"><span>Total</span><span>${selected.total.toLocaleString()}</span></div>
                {selected.amountPaid > 0 && <div className="paid-row"><span>Amount Paid</span><span>-${selected.amountPaid.toLocaleString()}</span></div>}
                {selected.status !== 'paid' && <div className="balance-row"><span>Balance Due</span><span>${(selected.total - selected.amountPaid).toLocaleString()}</span></div>}
              </div>
              <div className="payment-options">
                <h4>Payment Methods</h4>
                <div className="payment-method-grid">
                  <div className="payment-method"><CreditCard size={20} /><span>Credit Card</span><span className="rate">2.59%</span></div>
                  <div className="payment-method"><Banknote size={20} /><span>ACH Transfer</span><span className="rate">1.0%</span></div>
                  <div className="payment-method highlight"><DollarSign size={20} /><span>InstaPay</span><span className="rate">Same-day</span></div>
                </div>
              </div>
              {selected.notes && <div className="doc-notes"><h4>Notes</h4><p>{selected.notes}</p></div>}
            </div>
          </div>
        ) : <div className="detail-panel document-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}><p>Select an invoice to view details</p></div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Invoice" width="680px">
        <div className="form-grid">
          <div className="form-group"><label>Customer *</label>
            <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value, jobId: '' }))}><option value="">Select...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select>
          </div>
          <div className="form-group"><label>From Job</label>
            <select value={form.jobId} onChange={e => handleImportFromJob(e.target.value)} disabled={!form.customerId}><option value="">None (manual)</option>{customerJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
          </div>
          <div className="form-group"><label>Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
          <div className="form-group full-width">
            <label>Line Items</label>
            <table className="line-items-table editable">
              <thead><tr><th>Description</th><th style={{width:60}}>Qty</th><th style={{width:90}}>Price</th><th style={{width:40}}></th></tr></thead>
              <tbody>{lineItems.map(li => (
                <tr key={li.id}><td><input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)} placeholder="Item description" /></td>
                <td><input type="number" min="1" value={li.quantity} onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 1)} /></td>
                <td><input type="number" min="0" step="0.01" value={li.unitPrice || ''} placeholder="0.00" onChange={e => updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)} /></td>
                <td><button className="btn-icon" onClick={() => removeLineItem(li.id)}><Trash2 size={14} /></button></td></tr>
              ))}</tbody>
            </table>
            <button className="btn btn-sm" onClick={addLineItem} style={{ marginTop: 6 }}><Plus size={12} /> Add Item</button>
            <div style={{ textAlign: 'right', marginTop: 8 }}><strong>Total: ${(lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0) * 1.07).toFixed(2)}</strong></div>
          </div>
          <div className="form-group full-width"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={!form.customerId}>Create Invoice</button></div>
      </Modal>

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" width="420px">
        <div className="form-grid">
          <div className="form-group full-width"><label>Amount</label><input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
          <div className="form-group full-width"><label>Payment Method</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              <option value="credit_card">Credit Card (2.59%)</option><option value="ach">ACH Transfer (1.0%)</option><option value="instapay">InstaPay (Same-day)</option><option value="cash">Cash</option><option value="check">Check</option>
            </select>
          </div>
        </div>
        <div className="modal-footer"><button className="btn" onClick={() => setShowPayModal(false)}>Cancel</button><button className="btn btn-success" onClick={handleRecordPayment} disabled={!payAmount || parseFloat(payAmount) <= 0}>Record Payment</button></div>
      </Modal>
    </div>
  );
}
