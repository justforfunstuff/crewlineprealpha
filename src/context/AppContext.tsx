import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Customer, Job, Estimate, Invoice, TeamMember, Message, DailyStats } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppState {
  customers: Customer[];
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  team: TeamMember[];
  messages: Message[];
  dailyStats: DailyStats[];
  loading: boolean;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  updateJob: (id: string, updates: Partial<Job>) => void;
  addMessage: (m: Message) => void;
}

const AppContext = createContext<AppState | null>(null);

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
  return {
    id: c.id as string, firstName: c.firstName as string, lastName: c.lastName as string,
    email: (c.email as string) || '', phone: (c.phone as string) || '',
    address: (c.address as string) || '', city: (c.city as string) || '',
    state: (c.state as string) || '', zip: (c.zip as string) || '',
    notes: (c.notes as string) || '', tags: (c.tags as string[]) || [],
    createdAt: (c.createdAt as string) || '', totalSpent: Number(c.totalSpent) || 0,
    jobCount: Number(c.jobCount) || 0, rating: Number(c.rating) || 5,
    source: (c.source as Customer['source']) || 'phone',
    lastContactDate: (c.lastContactDate as string) || '',
  };
}

function mapJob(row: Record<string, unknown>): Job {
  const j = snakeToCamel(row);
  return {
    id: j.id as string, title: (j.title as string) || '', description: (j.description as string) || '',
    customerId: (j.customerId as string) || '', assignedTo: (j.assignedTo as string[]) || [],
    status: (j.status as Job['status']) || 'scheduled', priority: (j.priority as Job['priority']) || 'medium',
    scheduledDate: (j.scheduledDate as string) || '', scheduledTime: (j.scheduledTime as string) || '',
    estimatedDuration: Number(j.estimatedDuration) || 1, actualDuration: j.actualDuration ? Number(j.actualDuration) : undefined,
    address: (j.address as string) || '', city: (j.city as string) || '',
    lat: j.lat ? Number(j.lat) : undefined, lng: j.lng ? Number(j.lng) : undefined,
    lineItems: (j.lineItems as Job['lineItems']) || [], totalAmount: Number(j.totalAmount) || 0,
    notes: (j.notes as string) || '', photos: (j.photos as string[]) || [],
    createdAt: (j.createdAt as string) || '', completedAt: j.completedAt as string | undefined,
  };
}

function mapEstimate(row: Record<string, unknown>): Estimate {
  const e = snakeToCamel(row);
  return {
    id: e.id as string, number: (e.number as string) || '', customerId: (e.customerId as string) || '',
    jobId: e.jobId as string | undefined, lineItems: (e.lineItems as Estimate['lineItems']) || [],
    subtotal: Number(e.subtotal) || 0, tax: Number(e.tax) || 0, total: Number(e.total) || 0,
    status: (e.status as Estimate['status']) || 'draft', validUntil: (e.validUntil as string) || '',
    notes: (e.notes as string) || '', createdAt: (e.createdAt as string) || '',
    sentAt: e.sentAt as string | undefined, approvedAt: e.approvedAt as string | undefined,
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  const i = snakeToCamel(row);
  return {
    id: i.id as string, number: (i.number as string) || '', customerId: (i.customerId as string) || '',
    jobId: i.jobId as string | undefined, lineItems: (i.lineItems as Invoice['lineItems']) || [],
    subtotal: Number(i.subtotal) || 0, tax: Number(i.tax) || 0, total: Number(i.total) || 0,
    amountPaid: Number(i.amountPaid) || 0, status: (i.status as Invoice['status']) || 'draft',
    dueDate: (i.dueDate as string) || '', notes: (i.notes as string) || '',
    createdAt: (i.createdAt as string) || '', sentAt: i.sentAt as string | undefined,
    paidAt: i.paidAt as string | undefined,
  };
}

function mapTeamMember(row: Record<string, unknown>): TeamMember {
  const p = snakeToCamel(row);
  return {
    id: p.id as string, name: (p.fullName as string) || '', email: (p.email as string) || '',
    phone: (p.phone as string) || '', role: (p.teamRole as TeamMember['role']) || 'technician',
    avatar: (p.avatarUrl as string) || '', color: (p.color as string) || '#3B82F6',
    skills: (p.skills as string[]) || [], availability: (p.availability as TeamMember['availability']) || { monday: null, tuesday: null, wednesday: null, thursday: null, friday: null, saturday: null, sunday: null },
    status: (p.status as TeamMember['status']) || 'available',
    currentLocation: p.currentLocation as TeamMember['currentLocation'],
    activeJobId: p.activeJobId as string | undefined,
  };
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

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
      if (msgRes.data) setMessages(msgRes.data.map(r => {
        const m = snakeToCamel(r as Record<string, unknown>);
        return { id: m.id as string, customerId: m.customerId as string, direction: m.direction as Message['direction'], channel: m.channel as Message['channel'], content: m.content as string, timestamp: m.createdAt as string, read: m.read as boolean };
      }));
      if (statsRes.data) setDailyStats(statsRes.data.map(r => {
        const s = snakeToCamel(r as Record<string, unknown>);
        return { date: s.date as string, revenue: Number(s.revenue), jobsCompleted: Number(s.jobsCompleted), newCustomers: Number(s.newCustomers), estimatesSent: Number(s.estimatesSent) };
      }));

      setLoading(false);
    };

    fetchAll();
  }, [tenantId]);

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    const snakeUpdates = camelToSnake(updates as Record<string, unknown>);
    supabase.from('jobs').update(snakeUpdates).eq('id', id).then();
  };

  const addMessage = (m: Message) => {
    setMessages(prev => [...prev, m]);
    if (tenantId) {
      supabase.from('messages').insert({
        tenant_id: tenantId,
        customer_id: m.customerId,
        direction: m.direction,
        channel: m.channel,
        content: m.content,
        read: m.read,
      }).then();
    }
  };

  return (
    <AppContext.Provider value={{ customers, jobs, estimates, invoices, team, messages, dailyStats, loading, setCustomers, setJobs, setEstimates, setInvoices, setTeam, setMessages, updateJob, addMessage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
