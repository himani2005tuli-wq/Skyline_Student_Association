import { useState, useEffect, Suspense } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Megaphone,
  Package,
  Settings2,
  Ticket,
  Sparkles,
  ClipboardList,
  Wallet,
  ShieldCheck,
  Bell,
  LogOut,
  Menu,
  X,
  ScanLine,
  Loader2,
  Building2,
  CheckCheck,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { initials } from '@/lib/format';
import { Badge, DashboardSkeleton } from '@/components/ui/primitives';
import { communicationApi } from '@/api';
import { playNotificationSound } from '@/utils/sound';
import { subscribeToNotifications } from '@/utils/socket';

const NAV = {
  member: [
    { to: '/member', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/member/membership', icon: Ticket, label: 'Membership' },
    { to: '/member/loyalty', icon: Sparkles, label: 'Loyalty points' },
    { to: '/member/tickets', icon: ScanLine, label: 'My tickets' },
    { to: '/member/orders', icon: Package, label: 'Orders' },
  ],
  student: [
    { to: '/member', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/member/membership', icon: Ticket, label: 'Membership' },
    { to: '/member/loyalty', icon: Sparkles, label: 'Loyalty points' },
    { to: '/member/tickets', icon: ScanLine, label: 'My tickets' },
    { to: '/member/orders', icon: Package, label: 'Orders' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/admin/clubs', icon: Building2, label: 'Clubs & Chapters' },
    { to: '/admin/members', icon: Users, label: 'Members' },
    { to: '/admin/events', icon: CalendarDays, label: 'Events' },
    { to: '/manage/checkin', icon: ScanLine, label: 'QR check-in' },
    { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
    { to: '/admin/products', icon: Package, label: 'Merch & stock' },
    { to: '/admin/settings', icon: Settings2, label: 'Rules & discounts' },
  ],
  event_manager: [
    { to: '/manage', icon: CalendarDays, label: 'My events', end: true },
    { to: '/manage/checkin', icon: ScanLine, label: 'QR check-in' },
  ],
  volunteer: [
    { to: '/volunteer', icon: ClipboardList, label: 'My tasks', end: true },
    { to: '/manage/checkin', icon: ScanLine, label: 'QR check-in' },
  ],
  treasurer: [{ to: '/treasury', icon: Wallet, label: 'Finance', end: true }],
  super_admin: [
    { to: '/system', icon: ShieldCheck, label: 'Platform Control', end: true },
    { to: '/admin/clubs', icon: Building2, label: 'Clubs & Chapters' },
    { to: '/admin/members', icon: Users, label: 'Members & Roles' },
    { to: '/admin/events', icon: CalendarDays, label: 'Events' },
    { to: '/manage/checkin', icon: ScanLine, label: 'QR Check-in' },
    { to: '/admin/announcements', icon: Megaphone, label: 'Announcements & Push' },
    { to: '/admin/products', icon: Package, label: 'Merchandise & Stock' },
    { to: '/treasury', icon: Wallet, label: 'Treasury & Finance' },
    { to: '/admin/settings', icon: Settings2, label: 'Rules & Discounts' },
  ],
};



const ROLE_LABEL = {
  member: 'Member',
  admin: 'Club administrator',
  event_manager: 'Event manager',
  volunteer: 'Volunteer',
  treasurer: 'Treasurer',
  super_admin: 'Super admin',
  student: 'Student',
};

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const items = NAV[user?.role] || [];
  const signOut = async () => {
    setSigningOut(true);
    await logout();
    navigate('/');
  };
  return (
    <div className="flex h-full flex-col bg-ink text-paper" data-testid="dashboard-sidebar">
      <div className="px-6 py-6">
        <Link to="/" aria-label="Back to site" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>
      {user && (
        <div className="mx-4 mb-4 rounded-xl border border-paper/10 bg-paper/5 px-4 py-3">
          <p className="text-sm font-bold">{user.name}</p>
          <Badge tone="accent" className="mt-1.5">
            {ROLE_LABEL[user.role]}
          </Badge>
        </div>
      )}
      <nav className="flex-1 space-y-1 px-4 py-2" aria-label="Dashboard">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            data-testid={`sidebar-${item.label.toLowerCase().replace(/[^a-z]+/g, '-')}-link`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? 'bg-paper/10 text-paper shadow-inner' : 'text-paper/55 hover:bg-paper/5 hover:text-paper'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-accent' : 'bg-paper/20'}`}
                />
                <item.icon size={16} strokeWidth={2.2} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-paper/10 p-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-paper/55 transition hover:bg-paper/5 hover:text-paper"
          data-testid="sidebar-back-to-site-link"
        >
          <LayoutDashboard size={16} /> Public site
        </Link>
        <button
          onClick={signOut}
          disabled={signingOut}
          aria-busy={signingOut || undefined}
          data-testid="sidebar-signout-button"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-paper/55 transition hover:bg-danger/20 hover:text-paper disabled:cursor-wait disabled:opacity-70"
        >
          {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const crumbs = pathname.split('/').filter(Boolean);

  // Fetch real notifications from database
  const { data: notifData } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => communicationApi.getMyNotifications(20),
    staleTime: 30000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount ?? 0;

  // Mark all read mutation
  const markAllMutation = useMutation({
    mutationFn: () => communicationApi.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  // Mark single notification read mutation
  const markOneMutation = useMutation({
    mutationFn: (id) => communicationApi.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  // Real-time WebSocket notification listener with sound
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((data) => {
      // Play audio chime
      playNotificationSound();

      // Show toast
      toast.info(data.title || 'New Notification', {
        description: data.message || '',
      });

      // Refetch notifications in background
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    });

    return unsubscribe;
  }, [qc]);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-ink/8 bg-paper/85 px-5 backdrop-blur-md lg:px-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink/10 lg:hidden"
          aria-label="Open menu"
          data-testid="dashboard-menu-toggle"
        >
          <Menu size={18} />
        </button>
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/45"
        >
          <span className="hidden sm:inline">Altitude</span>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span
                key={i}
                className={`items-center gap-2 ${last ? 'flex min-w-0' : 'hidden sm:flex'}`}
              >
                <span className="hidden text-ink/25 sm:inline">/</span>
                <span className={`truncate ${last ? 'font-semibold text-ink' : ''}`}>
                  {c.replace(/-/g, ' ')}
                </span>
              </span>
            );
          })}
        </nav>
      </div>
      <div className="relative flex items-center gap-3">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-paper-card text-ink/60 transition hover:text-ink focus:outline-hidden"
          aria-label="Notifications"
          aria-expanded={notifOpen}
          data-testid="dashboard-notifications-button"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold text-white shadow-xs"
              data-testid="unread-notification-badge"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-ink/10 bg-paper-card p-4 shadow-lift"
              data-testid="dashboard-notifications-panel"
            >
              <div className="mb-3 flex items-center justify-between border-b border-ink/8 pb-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-semibold text-ink">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-dark">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllMutation.mutate()}
                    disabled={markAllMutation.isPending}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-dark hover:underline"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink/40">
                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) markOneMutation.mutate(n.id);
                        if (n.link) {
                          setNotifOpen(false);
                          navigate(n.link);
                        }
                      }}
                      className={`group cursor-pointer rounded-xl p-2.5 transition ${
                        !n.isRead
                          ? 'bg-accent/5 border border-accent/20 hover:bg-accent/10'
                          : 'border border-transparent hover:bg-ink/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!n.isRead ? 'font-bold text-ink' : 'font-medium text-ink/80'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink/60 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-ink/40">
                        <span className="font-mono">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.type && (
                          <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                            {n.type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-screen bg-paper">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block"
        data-testid="dashboard-sidebar-desktop"
      >
        <Sidebar />
      </aside>
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[45] bg-ink/50 lg:hidden"
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
              data-testid="dashboard-sidebar-mobile"
            >
              <Sidebar onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="lg:pl-64">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10" data-testid="dashboard-main">
          <Suspense fallback={<DashboardSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
