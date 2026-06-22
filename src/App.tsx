import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ToastContainer from './components/Toast';
import RequireAuth from './components/auth/RequireAuth';
import RequireRole from './components/auth/RequireRole';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
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
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminBusinessDetail from './pages/admin/AdminBusinessDetail';
import AdminCreateBusiness from './pages/admin/AdminCreateBusiness';
import AdminUsers from './pages/admin/AdminUsers';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Authenticated routes */}
          <Route element={<RequireAuth />}>
            {/* Business app */}
            <Route element={<RequireRole roles={['business_owner', 'business_member']} />}>
              <Route element={<AppProvider><Layout /></AppProvider>}>
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
            </Route>

            {/* Admin portal */}
            <Route element={<RequireRole roles={['crewline_admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="businesses" element={<AdminBusinesses />} />
                <Route path="businesses/new" element={<AdminCreateBusiness />} />
                <Route path="businesses/:id" element={<AdminBusinessDetail />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </AuthProvider>
  );
}
