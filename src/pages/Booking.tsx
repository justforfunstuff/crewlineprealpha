import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, User, MapPin, CheckCircle2, ChevronLeft, ChevronRight, Wrench, ArrowLeft } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { showToast } from '../components/Toast';

const SERVICE_TYPES = [
  { id: 'plumbing', name: 'Plumbing', icon: '🔧', duration: 2, price: 189 },
  { id: 'electrical', name: 'Electrical', icon: '⚡', duration: 2, price: 199 },
  { id: 'hvac', name: 'HVAC Service', icon: '❄️', duration: 3, price: 249 },
  { id: 'drain', name: 'Drain Cleaning', icon: '🚿', duration: 1.5, price: 149 },
  { id: 'remodel', name: 'Remodel Consultation', icon: '🏠', duration: 1, price: 0 },
  { id: 'maintenance', name: 'General Maintenance', icon: '🔨', duration: 2, price: 159 },
];

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

function seededRandom(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

export default function Booking() {
  const { setCustomers, setJobs, customers } = useApp();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(2026, 5, 22), { weekStartsOn: 1 }));
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [confirmed, setConfirmed] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const service = SERVICE_TYPES.find(s => s.id === selectedService);

  const handleConfirm = () => {
    if (!service || !selectedDate || !selectedTime) return;
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0] || 'Walk-in';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    const existingCustomer = customers.find(c => c.email === formData.email && formData.email);
    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      customerId = `c${Date.now()}`;
      setCustomers(prev => [...prev, {
        id: customerId, firstName, lastName, email: formData.email, phone: formData.phone, address: formData.address, city: 'Denver', state: 'CO', zip: '80202',
        notes: `Booked online: ${service.name}`, tags: ['online-booking'], createdAt: '2026-06-21', totalSpent: 0, jobCount: 0, rating: 5, source: 'online_booking' as const, lastContactDate: '2026-06-21',
      }]);
    }

    const hour24 = selectedTime.includes('PM') && !selectedTime.startsWith('12') ? parseInt(selectedTime) + 12 : parseInt(selectedTime);
    setJobs(prev => [...prev, {
      id: `j${Date.now()}`, title: service.name, description: formData.notes || `Online booking: ${service.name}`, customerId, assignedTo: [],
      status: 'scheduled' as const, priority: 'medium' as const, scheduledDate: selectedDate, scheduledTime: `${String(hour24).padStart(2, '0')}:00`,
      estimatedDuration: service.duration, address: formData.address || 'TBD', city: 'Denver',
      lineItems: [{ id: `li${Date.now()}`, description: service.name, quantity: 1, unitPrice: service.price }],
      totalAmount: service.price, notes: `Online booking by ${formData.name}`, photos: [], createdAt: '2026-06-21',
    }]);

    setConfirmed(true);
    showToast('success', 'Booking confirmed! Job created and customer notified.');
  };

  const handleReset = () => {
    setStep(1); setSelectedService(null); setSelectedDate(null); setSelectedTime(null);
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' }); setConfirmed(false);
  };

  return (
    <div className="booking-page">
      <div className="page-header"><h1>Online Booking</h1><span className="subtitle">Customer-facing booking portal preview</span></div>

      <div className="booking-preview">
        <div className="booking-widget">
          <div className="booking-header"><h2>Book a Service</h2><p>Schedule your appointment in just a few steps</p></div>
          <div className="booking-steps">
            {['Service', 'Date & Time', 'Details', 'Confirm'].map((label, i) => (
              <div key={label} className={`booking-step ${step === i + 1 ? 'active' : step > i + 1 || confirmed ? 'complete' : ''}`}>
                <span className="step-number">{step > i + 1 || confirmed ? <CheckCircle2 size={18} /> : i + 1}</span><span>{label}</span>
              </div>
            ))}
          </div>

          {confirmed ? (
            <div className="booking-confirm">
              <div className="confirm-icon"><CheckCircle2 size={64} /></div>
              <h3>Booking Confirmed!</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: 16 }}>A confirmation has been sent via text and email. Access your booking anytime through the secure link — no password needed.</p>
              <div className="confirm-summary">
                <div className="confirm-row"><Wrench size={16} /><span>{service?.name}</span></div>
                <div className="confirm-row"><Calendar size={16} /><span>{selectedDate}</span></div>
                <div className="confirm-row"><Clock size={16} /><span>{selectedTime} &middot; ~{service?.duration}h</span></div>
                <div className="confirm-row"><User size={16} /><span>{formData.name}</span></div>
                <div className="confirm-row"><MapPin size={16} /><span>{formData.address || 'Address pending'}</span></div>
                {service && service.price > 0 && <div className="confirm-price">Estimated: ${service.price}+</div>}
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleReset}>Book Another Service</button>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="booking-services">
                  <h3>Select a Service</h3>
                  <div className="service-grid">
                    {SERVICE_TYPES.map(svc => (
                      <div key={svc.id} className={`service-card ${selectedService === svc.id ? 'selected' : ''}`} onClick={() => setSelectedService(svc.id)}>
                        <span className="service-icon">{svc.icon}</span><strong>{svc.name}</strong>
                        <span className="service-duration"><Clock size={12} /> ~{svc.duration}h</span>
                        <span className="service-price">{svc.price > 0 ? `From $${svc.price}` : 'Free'}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary btn-lg" disabled={!selectedService} onClick={() => setStep(2)}>Continue</button>
                </div>
              )}

              {step === 2 && (
                <div className="booking-datetime">
                  <h3>Choose Date & Time</h3>
                  <div className="date-picker">
                    <div className="date-nav">
                      <button onClick={() => setWeekStart(d => addDays(d, -7))}><ChevronLeft size={18} /></button>
                      <span>{format(weekStart, 'MMMM yyyy')}</span>
                      <button onClick={() => setWeekStart(d => addDays(d, 7))}><ChevronRight size={18} /></button>
                    </div>
                    <div className="date-grid">
                      {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isWeekend = day.getDay() === 0;
                        return (
                          <button key={dateStr} className={`date-cell ${selectedDate === dateStr ? 'selected' : ''} ${isWeekend ? 'disabled' : ''}`} disabled={isWeekend} onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}>
                            <span className="date-day">{format(day, 'EEE')}</span><span className="date-num">{format(day, 'd')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {selectedDate && (
                    <div className="time-picker">
                      <h4>Available Times</h4>
                      <div className="time-grid">
                        {TIME_SLOTS.map((time, idx) => {
                          const seed = selectedDate.split('-').reduce((a, b) => a + parseInt(b), 0) + idx;
                          const available = seededRandom(seed) > 0.25;
                          const driveMin = Math.round(seededRandom(seed + 100) * 20 + 5);
                          return (
                            <button key={time} className={`time-slot ${selectedTime === time ? 'selected' : ''} ${!available ? 'unavailable' : ''}`} disabled={!available} onClick={() => setSelectedTime(time)}>
                              {time}
                              {available && <span className="drive-hint">~{driveMin} min away</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="booking-nav">
                    <button className="btn btn-secondary" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</button>
                    <button className="btn btn-primary" disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>Continue</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="booking-details">
                  <h3>Your Information</h3>
                  <div className="form-grid">
                    <div className="form-group"><label><User size={14} /> Full Name *</label><input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" /></div>
                    <div className="form-group"><label>Email *</label><input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="john@email.com" /></div>
                    <div className="form-group"><label>Phone *</label><input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" /></div>
                    <div className="form-group full-width"><label><MapPin size={14} /> Service Address *</label><input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, Denver, CO 80202" /></div>
                    <div className="form-group full-width"><label>Notes / Problem Description</label><textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Describe the issue..." rows={3} /></div>
                  </div>
                  <div className="booking-nav">
                    <button className="btn btn-secondary" onClick={() => setStep(2)}><ArrowLeft size={14} /> Back</button>
                    <button className="btn btn-primary" disabled={!formData.name || !formData.email || !formData.phone} onClick={() => setStep(4)}>Review & Confirm</button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="booking-confirm">
                  <h3>Review Your Booking</h3>
                  <div className="confirm-summary">
                    <div className="confirm-row"><Wrench size={16} /><span>{service?.name}</span></div>
                    <div className="confirm-row"><Calendar size={16} /><span>{selectedDate}</span></div>
                    <div className="confirm-row"><Clock size={16} /><span>{selectedTime} &middot; ~{service?.duration}h</span></div>
                    <div className="confirm-row"><User size={16} /><span>{formData.name}</span></div>
                    <div className="confirm-row"><MapPin size={16} /><span>{formData.address}</span></div>
                    {service && service.price > 0 && <div className="confirm-price">Estimated: ${service.price}+</div>}
                  </div>
                  <p className="confirm-note">You'll receive a confirmation via text and email. No password needed — access your booking through the secure link we send.</p>
                  <div className="booking-nav">
                    <button className="btn btn-secondary" onClick={() => setStep(3)}><ArrowLeft size={14} /> Back</button>
                    <button className="btn btn-primary btn-lg" onClick={handleConfirm}>Confirm Booking</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
