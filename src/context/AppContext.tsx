import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Customer, Job, Estimate, Invoice, TeamMember, Message, DailyStats, JobStatus, EstimateStatus, InvoiceStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

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
    if (!tenantId) return null;
    const row = { tenant_id: tenantId, first_name: c.firstName, last_name: c.lastName, email: c.email, phone: c.phone, address: c.address, city: c.city, state: c.state, zip: c.zip, notes: c.notes, tags: c.tags, source: c.source, total_spent: c.totalSpent, job_count: c.jobCount, rating: c.rating, last_contact_date: c.lastContactDate || null };
    const { data, error } = await supabase.from('customers').insert(row).select().single();
    if (error || !data) return null;
    const mapped = mapCustomer(data as Record<string, unknown>);
    setCustomers(prev => [mapped, ...prev]);
    return mapped;
  }, [tenantId]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const snakeUpdates = camelToSnake(updates as Record<string, unknown>);
    await supabase.from('customers').update(snakeUpdates).eq('id', id);
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    await supabase.from('customers').delete().eq('id', id);
  }, []);

  // ===== JOB MUTATIONS =====
  const addJob = useCallback(async (j: Omit<Job, 'id' | 'createdAt'>) => {
    if (!tenantId) return null;
    const row = { tenant_id: tenantId, title: j.title, description: j.description, customer_id: j.customerId || null, assigned_to: j.assignedTo, status: j.status, priority: j.priority, scheduled_date: j.scheduledDate || null, scheduled_time: j.scheduledTime || null, estimated_duration: j.estimatedDuration, address: j.address, city: j.city, line_items: j.lineItems, total_amount: j.totalAmount, notes: j.notes, photos: j.photos };
    const { data, error } = await supabase.from('jobs').insert(row).select().single();
    if (error || !data) return null;
    const mapped = mapJob(data as Record<string, unknown>);
    setJobs(prev => [...prev, mapped]);
    return mapped;
  }, [tenantId]);

  const updateJob = useCallback((id: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    const snakeUpdates = camelToSnake(updates as Record<string, unknown>);
    supabase.from('jobs').update(snakeUpdates).eq('id', id).then();
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    await supabase.from('jobs').delete().eq('id', id);
  }, []);

  // ===== ESTIMATE MUTATIONS =====
  const addEstimate = useCallback(async (e: Omit<Estimate, 'id' | 'createdAt'>) => {
    if (!tenantId) return null;
    const row = { tenant_id: tenantId, number: e.number, customer_id: e.customerId || null, job_id: e.jobId || null, line_items: e.lineItems, subtotal: e.subtotal, tax: e.tax, total: e.total, status: e.status, valid_until: e.validUntil || null, notes: e.notes, sent_at: e.sentAt || null, approved_at: e.approvedAt || null };
    const { data, error } = await supabase.from('estimates').insert(row).select().single();
    if (error || !data) return null;
    const mapped = mapEstimate(data as Record<string, unknown>);
    setEstimates(prev => [mapped, ...prev]);
    return mapped;
  }, [tenantId]);

  const updateEstimate = useCallback(async (id: string, updates: Partial<Estimate>) => {
    setEstimates(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    const snakeUpdates = camelToSnake(updates as Record<string, unknown>);
    await supabase.from('estimates').update(snakeUpdates).eq('id', id);
  }, []);

  const deleteEstimate = useCallback(async (id: string) => {
    setEstimates(prev => prev.filter(e => e.id !== id));
    await supabase.from('estimates').delete().eq('id', id);
  }, []);

  // ===== INVOICE MUTATIONS =====
  const addInvoice = useCallback(async (i: Omit<Invoice, 'id' | 'createdAt'>) => {
    if (!tenantId) return null;
    const row = { tenant_id: tenantId, number: i.number, customer_id: i.customerId || null, job_id: i.jobId || null, line_items: i.lineItems, subtotal: i.subtotal, tax: i.tax, total: i.total, amount_paid: i.amountPaid, status: i.status, due_date: i.dueDate || null, notes: i.notes, sent_at: i.sentAt || null, paid_at: i.paidAt || null };
    const { data, error } = await supabase.from('invoices').insert(row).select().single();
    if (error || !data) return null;
    const mapped = mapInvoice(data as Record<string, unknown>);
    setInvoices(prev => [mapped, ...prev]);
    return mapped;
  }, [tenantId]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    const snakeUpdates = camelToSnake(updates as Record<string, unknown>);
    await supabase.from('invoices').update(snakeUpdates).eq('id', id);
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
    await supabase.from('invoices').delete().eq('id', id);
  }, []);

  // ===== MESSAGE MUTATIONS =====
  const addMessage = useCallback((m: Message) => {
    setMessages(prev => [...prev, m]);
    if (tenantId) {
      supabase.from('messages').insert({ tenant_id: tenantId, customer_id: m.customerId, direction: m.direction, channel: m.channel, content: m.content, read: m.read }).then();
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
