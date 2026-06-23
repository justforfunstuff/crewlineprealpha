// ========== Auth & Multi-Tenancy ==========

export type UserRole = 'crewline_admin' | 'business_owner' | 'business_member';
export type TeamRole = 'admin' | 'dispatcher' | 'technician';
export type TenantPlan = 'free' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'trial';
export type SubscriptionPlan = 'monthly' | 'yearly' | 'annual_upfront';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'cancelled';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logo_url: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarded: boolean;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  team_role: TeamRole;
  color: string;
  skills: string[];
  availability: WeeklyAvailability;
  status: 'available' | 'on_job' | 'break' | 'off_duty';
  created_at: string;
  updated_at: string;
}

// ========== Business Data ==========

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  tags: string[];
  createdAt: string;
  totalSpent: number;
  jobCount: number;
  rating: number;
  source: 'referral' | 'online_booking' | 'phone' | 'website' | 'repeat';
  lastContactDate: string;
}

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Job {
  id: string;
  title: string;
  description: string;
  customerId: string;
  assignedTo: string[];
  status: JobStatus;
  priority: JobPriority;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;
  actualDuration?: number;
  address: string;
  city: string;
  lat?: number;
  lng?: number;
  lineItems: LineItem[];
  totalAmount: number;
  notes: string;
  photos: string[];
  createdAt: string;
  completedAt?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  optional?: boolean;
}

export type EstimateStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired';

export interface Estimate {
  id: string;
  number: string;
  customerId: string;
  jobId?: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: EstimateStatus;
  validUntil: string;
  notes: string;
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'partial';

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  jobId?: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  dueDate: string;
  notes: string;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'dispatcher' | 'technician';
  avatar: string;
  color: string;
  skills: string[];
  availability: WeeklyAvailability;
  currentLocation?: { lat: number; lng: number };
  activeJobId?: string;
  status: 'available' | 'on_job' | 'break' | 'off_duty';
}

export interface WeeklyAvailability {
  monday: TimeSlot | null;
  tuesday: TimeSlot | null;
  wednesday: TimeSlot | null;
  thursday: TimeSlot | null;
  friday: TimeSlot | null;
  saturday: TimeSlot | null;
  sunday: TimeSlot | null;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface Message {
  id: string;
  customerId: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'app';
  content: string;
  timestamp: string;
  read: boolean;
}

export interface BookingSlot {
  date: string;
  time: string;
  available: boolean;
  technicianId?: string;
  driveTimeMinutes?: number;
}

export interface DailyStats {
  date: string;
  revenue: number;
  jobsCompleted: number;
  newCustomers: number;
  estimatesSent: number;
}

// ========== Payments ==========

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string | null;
  stripe_payment_intent_id: string;
  amount: number;
  processing_fee: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  payment_method_type: 'card' | 'us_bank_account';
  status: PaymentStatus;
  customer_email: string | null;
  customer_name: string | null;
  created_at: string;
  completed_at: string | null;
}
