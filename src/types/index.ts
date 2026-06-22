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
