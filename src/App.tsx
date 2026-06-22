import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import ToastContainer from './components/Toast';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Jobs from './pages/Jobs';
import Customers from './pages/Customers';
import Estimates from './pages/Estimates';
import Invoices from './pages/Invoices';
import Dispatch from './pages/Dispatch';
import Team from './pages/Team';
import Messages from './pages/Messages';
import Booking from './pages/Booking';
import Reports from './pages/Reports';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/team" element={<Team />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </AppProvider>
  );
}
