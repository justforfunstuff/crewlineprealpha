import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Customer, Job, Estimate, Invoice, TeamMember, Message, DailyStats, JobStatus, EstimateStatus, InvoiceStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { showToast } from '../components/Toast';

function snakeToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = row[key];
  }
  return result;
}

function mapCustomer(row: Record<string, unknown>): Customer {
  const c = snakeToCamel(row);
  return { id: c.id as string, firstName: (c.firstName as string) || '', lastName: (c.lastName as string) || '', email: (c.email as string) || '', phone: (c.phone as string) || '', address: (c.address as string) || '', city: (c.city as string) || '', state: (c.state as string) || '', zip: (c.zip as string) || '', notes: (c.notes as string) || '', tags: (c.tags as string[]) || [], createdAt: (c.createdAt as string) || '', totalSpent: Number(c.totalSpent) || 0, jobCount: Number(c.jobCount) || 0, rating: Number(c.rating) || 5, source: (c.source as Customer['source']) || 'phone', lastContactDate: (c.lastContactDate as string) || '' };
}

function mapJob(row: Record<string, unknown>): Job {
  const j = snakeToCamel(row);
  return { id: j.id as string, title: (j.title as string) || '', description: (j.description as string) || '', customerId: (j.customerId as string) || '', assignedTo: (j.assignedTo as string[]) || [], status: (j.status as JobStatus) || 'scheduled', priority: (j.priority as Job['priority']) || 'medium', scheduledDate: (j.scheduledDate as string) || '', scheduledTime: (j.scheduledTime as string) || '', estimatedDuration: Number(j.estimatedDuration) || 1, actualDuration: j.actualDuration ? Number(j.actualDuration) : undefined, address: (j.address as string) || '', city: (j.city as string) || '', lat: j.lat ? Number(j.lat) : undefined, lng: j.lng ? Number(j.lng) : undefined, lineItems: (j.lineItems as Job['lineItems']) || [], totalAmount: Number(j.totalAmount) || 0, notes: (j.notes as string) || '', photos: (j.photos as string[]) || [], createdAt: (j.createdAt as string) || '', completedAt: j.completedAt as string | undefined };
}

function mapEstimate(row: Record<string, unknown>): Estimate {
  const e = snakeToCamel(row);
  return { id: e.id as string, number: (e.number as string) || '', customerId: (e.customerId as string) || '', jobId: e.jobId as string | undefined, lineItems: (e.lineItems as Estimate['lineItems']) || [], subtotal: Number(e.subtotal) || 0, tax: Number(e.tax) || 0, total: Number(e.total) || 0, status: (e.status as EstimateStatus) || 'draft', validUntil: (e.validUntil as string) || '', notes: (e.notes as string) || '', createdAt: (e.createdAt as string) || '', sentAt: e.sentAt as string | undefined, approvedAt: e.approvedAt as string | undefined };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  const i = snakeToCamel(row);
  return { id: i.id as string, number: (i.number as string) || '', customerId: (i.customerId as string) || '', jobId: i.jobId as string | undefined, lineItems: (i.lineItems as Invoice['lineItems']) || [], subtotal: Number(i.subtotal) || 0, tax: Number(i.tax) || 0, total: Number(i.total) || 0, amountPaid: Number(i.amountPaid) || 0, status: (i.status as InvoiceStatus) || 'draft', dueDate: (i.dueDate as string) || '', notes: (i.notes as string) || '', createdAt: (i.createdAt as string) || '', sentAt: i.sentAt as string | undefined, paidAt: i.paidAt as string | undefined };
}

function mapTeamMember(row: Record<string, unknown>): TeamMember {
  const p = snakeToCamel(row);
  return { id: p.id as string, name: (p.fullName as string) || '', email: (p.email as string) || '', phone: (p.phone as string) || '', role: (p.teamRole as TeamMember['role']) || 'technician', avatar: (p.avatarUrl as string) || '', color: (p.color as string) || '#3B82F6', skills: (p.skills as string[]) || [], availability: (p.availability as TeamMember['availability']) || { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null }, status: (p.status as TeamMember['status']) || 'available', currentLocation: p.currentLocation as TeamMember['currentLocation'], activeJobId: p.activeJobId as string | undefined };
}

function mapMessage(row: Record<string, unknown>): Message {
  const m = snakeToCamel(row);
  return { id: m.id as string, customerId: m.customerId as string, direction: m.direction as Message['direction'], channel: m.channel as Message['channel'], content: m.content as string, timestamp: m.createdAt as string, read: m.read as boolean };
}

function customerToRow(c: Partial<Customer>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (c.firstName !== undefined) row.first_name = c.firstName;
  if (c.lastName !== undefined) row.last_name = c.lastName;
  if (c.email !== undefined) row.email = c.email;
  if (c.phone !== undefined) row.phone = c.phone;
  if (c.address !== undefined) row.address = c.address;
  if (c.city !== undefined) row.city = c.city;
  if (c.state !== undefined) row.state = c.state;
  if (c.zip !== undefined) row.zip = c.zip;
  if (c.notes !== undefined) row.notes = c.notes;
  if (c.tags !== undefined) row.tags = c.tags;
  if (c.source !== undefined) row.source = c.source;
  if (c.totalSpent !== undefined) row.total_spent = c.totalSpent;
  if (c.jobCount !== undefined) row.job_count = c.jobCount;
  if (c.rating !== undefined) row.rating = c.rating;
  if (c.lastContactDate !== undefined) row.last_contact_date = c.lastContactDate || null;
  return row;
}

function jobToRow(j: Partial<Job>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (j.title !== undefined) row.title = j.title;
  if (j.description !== undefined) row.description = j.description;
  if (j.customerId !== undefined) row.customer_id = j.customerId || null;
  if (j.assignedTo !== undefined) row.assigned_to = j.assignedTo;
  if (j.status !== undefined) row.status = j.status;
  if (j.priority !== undefined) row.priority = j.priority;
  if (j.scheduledDate !== undefined) row.scheduled_date = j.scheduledDate || null;
  if (j.scheduledTime !== undefined) row.scheduled_time = j.scheduledTime || null;
  if (j.estimatedDuration !== undefined) row.estimated_duration = j.estimatedDuration;
  if (j.actualDuration !== undefined) row.actual_duration = j.actualDuration;
  if (j.address !== undefined) row.address = j.address;
  if (j.city !== undefined) row.city = j.city;
  if (j.lat !== undefined) row.lat = j.lat;
  if (j.lng !== undefined) row.lng = j.lng;
  if (j.lineItems !== undefined) row.line_items = j.lineItems;
  if (j.totalAmount !== undefined) row.total_amount = j.totalAmount;
  if (j.notes !== undefined) row.notes = j.notes;
  if (j.photos !== undefined) row.photos = j.photos;
  if (j.completedAt !== undefined) row.completed_at = j.completedAt || null;
  return row;
}

function estimateToRow(e: Partial<Estimate>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (e.number !== undefined) row.number = e.number;
  if (e.customerId !== undefined) row.customer_id = e.customerId || null;
  if (e.jobId !== undefined) row.job_id = e.jobId || null;
  if (e.lineItems !== undefined) row.line_items = e.lineItems;
  if (e.subtotal !== undefined) row.subtotal = e.subtotal;
  if (e.tax !== undefined) row.tax = e.tax;
  if (e.total !== undefined) row.total = e.total;
  if (e.status !== undefined) row.status = e.status;
  if (e.validUntil !== undefined) row.valid_until = e.validUntil || null;
  if (e.notes !== undefined) row.notes = e.notes;
  if (e.sentAt !== undefined) row.sent_at = e.sentAt || null;
  if (e.approvedAt !== undefined) row.approved_at = e.approvedAt || null;
  return row;
}

function invoiceToRow(i: Partial<Invoice>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (i.number !== undefined) row.number = i.number;
  if (i.customerId !== undefined) row.customer_id = i.customerId || null;
  if (i.jobId !== undefined) row.job_id = i.jobId || null;
  if (i.lineItems !== undefined) row.line_items = i.lineItems;
  if (i.subtotal !== undefined) row.subtotal = i.subtotal;
  if (i.tax !== undefined) row.tax = i.tax;
  if (i.total !== undefined) row.total = i.total;
  if (i.amountPaid !== undefined) row.amount_paid = i.amountPaid;
  if (i.status !== undefined) row.status = i.status;
  if (i.dueDate !== undefined) row.due_date = i.dueDate || null;
  if (i.notes !== undefined) row.notes = i.notes;
  if (i.sentAt !== undefined) row.sent_at = i.sentAt || null;
  if (i.paidAt !== undefined) row.paid_at = i.paidAt || null;
  return row;
}

interface AppState {
  customers: Customer[];
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  team: TeamMember[];
  messages: Message[];
  dailyStats: DailyStats[];
  loading: boolean;

  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addJob: (j: Omit<Job, 'id' | 'createdAt'>) => Promise<Job | null>;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => Promise<void>;

  addEstimate: (e: Omit<Estimate, 'id' | 'createdAt'>) => Promise<Estimate | null>;
  updateEstimate: (id: string, updates: Partial<Estimate>) => Promise<void>;
  deleteEstimate: (id: string) => Promise<void>;

  addInvoice: (i: Omit<Invoice, 'id' | 'createdAt'>) => Promise<Invoice | null>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  addMessage: (m: Message) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;

  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    const fetchAll = async () => {
      setLoading(true);
      const [custRes, jobRes, estRes, invRes, teamRes, msgRes, statsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
        supabase.from('jobs').select('*').eq('tenant_id', tenantId).order('scheduled_date', { ascending: true }),
        supabase.from('estimates').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('tenant_id', tenantId),
        supabase.from('messages').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: true }),
        supabase.from('daily_stats').select('*').eq('tenant_id', tenantId).order('date', { ascending: true }),
      ]);
      if (custRes.data) setCustomers(custRes.data.map(r => mapCustomer(r as Record<string, unknown>)));
      if (jobRes.data) setJobs(jobRes.data.map(r => mapJob(r as Record<string, unknown>)));
      if (estRes.data) setEstimates(estRes.data.map(r => mapEstimate(r as Record<string, unknown>)));
      if (invRes.data) setInvoices(invRes.data.map(r => mapInvoice(r as Record<string, unknown>)));
      if (teamRes.data) setTeam(teamRes.data.map(r => mapTeamMember(r as Record<string, unknown>)));
      if (msgRes.data) setMessages(msgRes.data.map(r => mapMessage(r as Record<string, unknown>)));
      if (statsRes.data) setDailyStats(statsRes.data.map(r => { const s = snakeToCamel(r as Record<string, unknown>); return { date: s.date as string, revenue: Number(s.revenue), jobsCompleted: Number(s.jobsCompleted), newCustomers: Number(s.newCustomers), estimatesSent: Number(s.estimatesSent) }; }));
      setLoading(false);
    };
    fetchAll();
  }, [tenantId]);

  // ===== CUSTOMER MUTATIONS =====
  const addCustomer = useCallback(async (c: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!tenantId) { showToast('error', 'No business account found. Please log out and sign in again.'); return null; }
    const row = { tenant_id: tenantId, ...customerToRow(c) };
    const { data, error } = await supabase.from('customers').insert(row).select().single();
    if (error) { showToast('error', `Save failed: ${error.message}`); console.error('addCustomer error:', error); return null; }
    if (!data) { showToast('error', 'Save failed: no data returned.'); return null; }
    const mapped = mapCustomer(data as Record<string, unknown>);
    setCustomers(prev => [mapped, ...prev]);
    return mapped;
  }, [tenantId]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const prev = customers;
    setCustomers(p => p.map(c => c.id === id ? { ...c, ...updates } : c));
    const { error } = await supabase.from('customers').update(customerToRow(updates)).eq('id', id);
    if (error) { setCustomers(prev); showToast('error', `Save failed: ${error.message}`); console.error('updateCustomer error:', error); }
  }, [customers]);

  const deleteCustomer = useCallback(async (id: string) => {
    const prev = customers;
    setCustomers(p => p.filter(c => c.id !== id));
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) { setCustomers(prev); showToast('error', `Delete failed: ${error.message}`); console.error('deleteCustomer error:', error); }
  }, [customers]);

  // ===== JOB MUTATIONS =====
  const addJob = useCallback(async (j: Omit<Job, 'id' | 'createdAt'>) => {
    if (!tenantId) { showToast('error', 'No business account found. Please log out and sign in again.'); return null; }
    const row = { tenant_id: tenantId, ...jobToRow(j) };
    const { data, error } = await supabase.from('jobs').insert(row).select().single();
    if (error) { showToast('error', `Save failed: ${error.message}`); console.error('addJob error:', error); return null; }
    if (!data) { showToast('error', 'Save failed: no data returned.'); return null; }
    const mapped = mapJob(data as Record<string, unknown>);
    setJobs(p => [...p, mapped]);
    return mapped;
  }, [tenantId]);

  const updateJob = useCallback(async (id: string, updates: Partial<Job>) => {
    const prev = jobs;
    setJobs(p => p.map(j => j.id === id ? { ...j, ...updates } : j));
    const { error } = await supabase.from('jobs').update(jobToRow(updates)).eq('id', id);
    if (error) { setJobs(prev); showToast('error', `Save failed: ${error.message}`); console.error('updateJob error:', error); }
  }, [jobs]);

  const deleteJob = useCallback(async (id: string) => {
    const prev = jobs;
    setJobs(p => p.filter(j => j.id !== id));
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) { setJobs(prev); showToast('error', `Delete failed: ${error.message}`); console.error('deleteJob error:', error); }
  }, [jobs]);

  // ===== ESTIMATE MUTATIONS =====
  const addEstimate = useCallback(async (e: Omit<Estimate, 'id' | 'createdAt'>) => {
    if (!tenantId) { showToast('error', 'No business account found. Please log out and sign in again.'); return null; }
    const row = { tenant_id: tenantId, ...estimateToRow(e) };
    const { data, error } = await supabase.from('estimates').insert(row).select().single();
    if (error) { showToast('error', `Save failed: ${error.message}`); console.error('addEstimate error:', error); return null; }
    if (!data) { showToast('error', 'Save failed: no data returned.'); return null; }
    const mapped = mapEstimate(data as Record<string, unknown>);
    setEstimates(p => [mapped, ...p]);
    return mapped;
  }, [tenantId]);

  const updateEstimate = useCallback(async (id: string, updates: Partial<Estimate>) => {
    const prev = estimates;
    setEstimates(p => p.map(e => e.id === id ? { ...e, ...updates } : e));
    const { error } = await supabase.from('estimates').update(estimateToRow(updates)).eq('id', id);
    if (error) { setEstimates(prev); showToast('error', `Save failed: ${error.message}`); console.error('updateEstimate error:', error); }
  }, [estimates]);

  const deleteEstimate = useCallback(async (id: string) => {
    const prev = estimates;
    setEstimates(p => p.filter(e => e.id !== id));
    const { error } = await supabase.from('estimates').delete().eq('id', id);
    if (error) { setEstimates(prev); showToast('error', `Delete failed: ${error.message}`); console.error('deleteEstimate error:', error); }
  }, [estimates]);

  // ===== INVOICE MUTATIONS =====
  const addInvoice = useCallback(async (i: Omit<Invoice, 'id' | 'createdAt'>) => {
    if (!tenantId) { showToast('error', 'No business account found. Please log out and sign in again.'); return null; }
    const row = { tenant_id: tenantId, ...invoiceToRow(i) };
    const { data, error } = await supabase.from('invoices').insert(row).select().single();
    if (error) { showToast('error', `Save failed: ${error.message}`); console.error('addInvoice error:', error); return null; }
    if (!data) { showToast('error', 'Save failed: no data returned.'); return null; }
    const mapped = mapInvoice(data as Record<string, unknown>);
    setInvoices(p => [mapped, ...p]);
    return mapped;
  }, [tenantId]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    const prev = invoices;
    setInvoices(p => p.map(i => i.id === id ? { ...i, ...updates } : i));
    const { error } = await supabase.from('invoices').update(invoiceToRow(updates)).eq('id', id);
    if (error) { setInvoices(prev); showToast('error', `Save failed: ${error.message}`); console.error('updateInvoice error:', error); }
  }, [invoices]);

  const deleteInvoice = useCallback(async (id: string) => {
    const prev = invoices;
    setInvoices(p => p.filter(i => i.id !== id));
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) { setInvoices(prev); showToast('error', `Delete failed: ${error.message}`); console.error('deleteInvoice error:', error); }
  }, [invoices]);

  // ===== MESSAGE MUTATIONS =====
  const addMessage = useCallback((m: Message) => {
    setMessages(p => [...p, m]);
    if (tenantId) {
      supabase.from('messages').insert({ tenant_id: tenantId, customer_id: m.customerId, direction: m.direction, channel: m.channel, content: m.content, read: m.read }).then(({ error }) => {
        if (error) { showToast('error', `Message sync failed: ${error.message}`); console.error('addMessage error:', error); }
      });
    }
  }, [tenantId]);

  return (
    <AppContext.Provider value={{
      customers, jobs, estimates, invoices, team, messages, dailyStats, loading,
      addCustomer, updateCustomer, deleteCustomer,
      addJob, updateJob, deleteJob,
      addEstimate, updateEstimate, deleteEstimate,
      addInvoice, updateInvoice, deleteInvoice,
      addMessage, setMessages,
      setJobs, setCustomers, setEstimates, setInvoices, setTeam,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
