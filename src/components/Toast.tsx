import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface ToastData {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
}

let addToastFn: ((toast: Omit<ToastData, 'id'>) => void) | null = null;

export function showToast(type: ToastData['type'], message: string) {
  addToastFn?.({ type, message });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (toast) => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { ...toast, id }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { addToastFn = null; };
  }, []);

  const icons = { success: CheckCircle2, warning: AlertTriangle, info: Info, error: AlertTriangle };

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={16} />
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
