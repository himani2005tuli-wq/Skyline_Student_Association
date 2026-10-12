import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import RequireRole from '@/components/RequireRole';
import RouteProgress from '@/components/RouteProgress';
import SplashScreen from '@/components/SplashScreen';
import { PageSkeleton } from '@/components/ui/primitives';
import PublicLayout from '@/layouts/PublicLayout';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import {
  Login,
  Register,
  ForgotPassword,
  VerifyEmail,
  Unauthorized,
  NotFound,
} from '@/pages/AuthPages';
import Home from '@/pages/Home';

/* Public pages are split into their own chunks so the first paint stays light. */
const Clubs = lazy(() => import('@/pages/Clubs'));
const ClubDetail = lazy(() => import('@/pages/ClubDetail'));
const Events = lazy(() => import('@/pages/Events'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const Membership = lazy(() => import('@/pages/Membership'));
const Store = lazy(() => import('@/pages/Store'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Announcements = lazy(() => import('@/pages/Announcements'));

const MemberHome = lazy(() => import('@/pages/member/MemberHome'));
const MemberMembership = lazy(() => import('@/pages/member/MemberMembership'));
const MemberLoyalty = lazy(() => import('@/pages/member/MemberLoyalty'));
const MemberTickets = lazy(() => import('@/pages/member/MemberTickets'));
const MemberOrders = lazy(() => import('@/pages/member/MemberOrders'));
const AdminHome = lazy(() => import('@/pages/admin/AdminHome'));
const AdminClubs = lazy(() => import('@/pages/admin/AdminClubs'));
const AdminMembers = lazy(() => import('@/pages/admin/AdminMembers'));
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));

const ManageHome = lazy(() => import('@/pages/manager/ManageHome'));
const Checkin = lazy(() => import('@/pages/manager/Checkin'));
const VolunteerHome = lazy(() => import('@/pages/volunteer/VolunteerHome'));
const TreasuryHome = lazy(() => import('@/pages/treasury/TreasuryHome'));
const SystemHome = lazy(() => import('@/pages/system/SystemHome'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({ lerp: 0.11, anchors: true });
    window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = {
    member: '/member',
    admin: '/admin',
    event_manager: '/manage',
    volunteer: '/volunteer',
    treasurer: '/treasury',
    super_admin: '/system',
    student: '/member',
  };
  return <Navigate to={map[user.role] || '/member'} replace />;
}

function AppShell() {
  useLenis();
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteProgress />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/store" element={<Store />} />
          <Route path="/announcements" element={<Announcements />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
        </Route>
        <Route
          path="/checkout"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <Checkout />
            </Suspense>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
        <Route
          path="/member"
          element={
            <RequireRole roles={['member', 'student', 'admin', 'event_manager', 'volunteer', 'treasurer', 'super_admin']}>
              <DashboardLayout />
            </RequireRole>
          }
        >
          <Route index element={<MemberHome />} />
          <Route path="membership" element={<MemberMembership />} />
          <Route path="loyalty" element={<MemberLoyalty />} />
          <Route path="tickets" element={<MemberTickets />} />
          <Route path="orders" element={<MemberOrders />} />
        </Route>
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <DashboardLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="clubs" element={<AdminClubs />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route
          path="/manage"
          element={
            <RequireRole roles={['event_manager', 'admin', 'super_admin', 'volunteer']}>
              <DashboardLayout />
            </RequireRole>
          }
        >
          <Route
            index
            element={
              <RequireRole roles={['event_manager', 'admin', 'super_admin']}>
                <ManageHome />
              </RequireRole>
            }
          />
          <Route path="checkin" element={<Checkin />} />
        </Route>
        <Route
          path="/volunteer"
          element={
            <RequireRole roles={['volunteer', 'event_manager', 'admin', 'super_admin']}>
              <DashboardLayout />
            </RequireRole>
          }
        >
          <Route index element={<VolunteerHome />} />
        </Route>
        <Route
          path="/treasury"
          element={
            <RequireRole roles={['treasurer', 'admin', 'super_admin']}>
              <DashboardLayout />
            </RequireRole>
          }
        >
          <Route index element={<TreasuryHome />} />
        </Route>
        <Route
          path="/system"
          element={
            <RequireRole roles={['super_admin']}>
              <DashboardLayout />
            </RequireRole>
          }
        >
          <Route index element={<SystemHome />} />
        </Route>
        <Route path="/dashboard" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <ConfirmProvider>
            <SplashScreen />
            <AppShell />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#0B0E17',
                  color: '#F6F2E9',
                  border: '1px solid rgba(246,242,233,0.12)',
                  borderRadius: '12px',
                  fontFamily: 'Manrope, sans-serif',
                },
              }}
            />
          </ConfirmProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
