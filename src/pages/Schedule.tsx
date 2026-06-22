import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { format, addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, GripVertical, Clock, User, MapPin } from 'lucide-react';
import { showToast } from '../components/Toast';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6);

export default function Schedule() {
  const { jobs, customers, team, updateJob } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 21));
  const [view, setView] = useState<'day' | 'week'>('week');
  const [dragJob, setDragJob] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: view === 'week' ? 7 : 1 }, (_, i) =>
    view === 'week' ? addDays(weekStart, i) : currentDate
  );

  const techs = team.filter(t => t.role === 'technician');

  const unscheduledJobs = jobs.filter(j => j.status === 'on_hold' && j.status !== 'cancelled');

  const getJobsForDay = (date: string) =>
    jobs.filter(j => j.scheduledDate === date && j.status !== 'cancelled' && j.status !== 'on_hold');

  const handleDragStart = (jobId: string, e: React.DragEvent) => {
    setDragJob(jobId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragJob(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(cellKey);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (date: string, hour: number) => {
    if (!dragJob) return;
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const job = jobs.find(j => j.id === dragJob);
    const wasUnscheduled = job?.status === 'on_hold';

    updateJob(dragJob, {
      scheduledDate: date,
      scheduledTime: timeStr,
      ...(wasUnscheduled ? { status: 'scheduled' as const } : {}),
    });

    setDragJob(null);
    setDragOverCell(null);

    if (wasUnscheduled) {
      showToast('success', `"${job?.title}" scheduled for ${format(new Date(date + 'T00:00'), 'MMM d')} at ${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`);
    }
  };

  return (
    <div className="schedule-page">
      <div className="page-header">
        <h1>Schedule</h1>
        <div className="header-actions">
          <div className="view-toggle">
            <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Day</button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Week</button>
          </div>
          <div className="date-nav">
            <button onClick={() => setCurrentDate(d => addDays(d, view === 'week' ? -7 : -1))}><ChevronLeft size={18} /></button>
            <span className="date-label">
              {view === 'week'
                ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <button onClick={() => setCurrentDate(d => addDays(d, view === 'week' ? 7 : 1))}><ChevronRight size={18} /></button>
          </div>
          <button className="btn btn-primary"><Plus size={16} /> New Job</button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-header">
          <div className="time-gutter">Time</div>
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayJobs = getJobsForDay(dateStr);
            const isToday = dateStr === '2026-06-21';
            return (
              <div key={dateStr} className={`day-header ${isToday ? 'today' : ''}`}>
                <span className="day-name">{format(day, 'EEE')}</span>
                <span className={`day-number ${isToday ? 'today-circle' : ''}`}>{format(day, 'd')}</span>
                <span className="day-job-count">{dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}</span>
              </div>
            );
          })}
        </div>

        <div className="calendar-body">
          {HOURS.map(hour => (
            <div key={hour} className="calendar-row">
              <div className="time-label">{hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</div>
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const cellKey = `${dateStr}-${hour}`;
                const hourJobs = getJobsForDay(dateStr).filter(j => {
                  const jobHour = parseInt(j.scheduledTime.split(':')[0]);
                  return jobHour === hour;
                });
                const isDropTarget = dragOverCell === cellKey;
                return (
                  <div
                    key={cellKey}
                    className={`calendar-cell ${isDropTarget ? 'drag-over' : ''}`}
                    onDragOver={e => handleDragOver(e, cellKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(dateStr, hour)}
                  >
                    {hourJobs.map(job => {
                      const customer = customers.find(c => c.id === job.customerId);
                      const assigned = techs.filter(t => job.assignedTo.includes(t.id));
                      return (
                        <div
                          key={job.id}
                          className={`calendar-event priority-${job.priority} status-${job.status}`}
                          style={{ height: `${Math.max(job.estimatedDuration, 1) * 60}px` }}
                          draggable
                          onDragStart={e => handleDragStart(job.id, e)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="event-header">
                            <GripVertical size={12} className="drag-handle" />
                            <strong>{job.title}</strong>
                          </div>
                          <span className="event-customer">{customer?.firstName} {customer?.lastName}</span>
                          <span className="event-time">{job.scheduledTime} &middot; {job.estimatedDuration}h</span>
                          <div className="event-crew">
                            {assigned.map(t => (
                              <span key={t.id} className="crew-dot" style={{ backgroundColor: t.color }} title={t.name} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="schedule-sidebar">
        <h3>Unscheduled Jobs</h3>
        <p className="feature-description">Drag a job onto the calendar to schedule it.</p>
        <div className="unscheduled-list">
          {unscheduledJobs.length === 0 && (
            <p className="empty-text">All jobs are scheduled</p>
          )}
          {unscheduledJobs.map(job => {
            const customer = customers.find(c => c.id === job.customerId);
            const assigned = techs.filter(t => job.assignedTo.includes(t.id));
            const isDragging = dragJob === job.id;
            return (
              <div
                key={job.id}
                className={`unscheduled-item priority-${job.priority} ${isDragging ? 'dragging' : ''}`}
                draggable
                onDragStart={e => handleDragStart(job.id, e)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical size={14} className="drag-handle" />
                <div className="unscheduled-info">
                  <strong>{job.title}</strong>
                  <span><User size={11} /> {customer?.firstName} {customer?.lastName}</span>
                  <span><Clock size={11} /> {job.estimatedDuration}h</span>
                  {job.address && <span><MapPin size={11} /> {job.city}</span>}
                </div>
                <div className="unscheduled-meta">
                  <span className={`priority-dot priority-${job.priority}`} />
                  <div className="event-crew">
                    {assigned.map(t => (
                      <span key={t.id} className="crew-dot" style={{ backgroundColor: t.color }} title={t.name} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h3>Find a Time</h3>
        <p className="feature-description">Smart slot suggestions ranked by drive time and technician availability.</p>
        <div className="smart-slots">
          {[
            { time: '10:00 AM', date: 'Mon, Jun 22', tech: 'Maria Santos', drive: 8 },
            { time: '2:00 PM', date: 'Mon, Jun 22', tech: 'Jake Morrison', drive: 12 },
            { time: '8:00 AM', date: 'Tue, Jun 23', tech: 'Ryan Cooper', drive: 5 },
          ].map((slot, i) => (
            <div key={i} className="smart-slot">
              <div className="slot-time">
                <strong>{slot.time}</strong>
                <span>{slot.date}</span>
              </div>
              <div className="slot-info">
                <span>{slot.tech}</span>
                <span className="drive-time">{slot.drive} min drive</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
