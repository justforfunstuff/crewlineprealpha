import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Customer, Job, Estimate, Invoice, TeamMember, Message } from '../types';
import { customers as initCustomers, jobs as initJobs, estimates as initEstimates, invoices as initInvoices, teamMembers as initTeam, messages as initMessages } from '../data/mockData';

interface AppState {
  customers: Customer[];
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  team: TeamMember[];
  messages: Message[];
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initCustomers);
  const [jobs, setJobs] = useState<Job[]>(initJobs);
  const [estimates, setEstimates] = useState<Estimate[]>(initEstimates);
  const [invoices, setInvoices] = useState<Invoice[]>(initInvoices);
  const [team, setTeam] = useState<TeamMember[]>(initTeam);
  const [messages, setMessages] = useState<Message[]>(initMessages);

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const addMessage = (m: Message) => {
    setMessages(prev => [...prev, m]);
  };

  return (
    <AppContext.Provider value={{ customers, jobs, estimates, invoices, team, messages, setCustomers, setJobs, setEstimates, setInvoices, setTeam, setMessages, updateJob, addMessage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
