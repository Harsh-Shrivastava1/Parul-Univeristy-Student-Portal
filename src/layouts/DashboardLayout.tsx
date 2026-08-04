import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Activity,
  Bell,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../services/notificationService';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { name: 'Internships', path: '/internships', icon: Briefcase, end: false },
  { name: 'My Applications', path: '/applications', icon: FileText, end: false },
  { name: 'App Status', path: '/status', icon: Activity, end: false },
  { name: 'Notifications', path: '/notifications', icon: Bell, end: false },
  { name: 'Profile', path: '/profile', icon: UserIcon, end: false },
];

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      notificationService.getUnreadCount(user.id).then(setUnreadCount);
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user) notificationService.getUnreadCount(user.id).then(setUnreadCount);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-64'} bg-white border-r border-zinc-200 flex flex-col h-full transition-all duration-300 overflow-hidden`}>
      {/* Logo */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-5'} border-b border-zinc-100 flex-shrink-0 bg-white overflow-hidden`}>
        {isCollapsed ? (
          <a 
            href="https://ums.paruluniversity.ac.in/Login.aspx" 
            className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            title="Parul University UMS"
          >
            <span className="text-white font-bold text-sm">PU</span>
          </a>
        ) : (
          <a 
            href="https://ums.paruluniversity.ac.in/Login.aspx"
            className="block cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            title="Parul University UMS"
          >
            <img src="/pu-logo.png" alt="Parul University" className="w-[180px] max-w-none scale-110 origin-left -ml-2" />
          </a>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2 py-4' : 'px-3 py-4'} space-y-1 overflow-y-auto overflow-x-hidden`}>
        {!isCollapsed && <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-2">Menu</p>}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group
                ${isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'
                }`
              }
              title={isCollapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 ${isCollapsed ? 'rounded-r-sm' : 'rounded-r-full'}`} />
                  )}
                  <Icon
                    size={20}
                    className={`${isActive ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-600'} flex-shrink-0`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                    </>
                  )}
                  {/* Notification dot for collapsed state */}
                  {isCollapsed && item.name === 'Notifications' && unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border border-white" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User area */}
      <div className={`p-3 border-t border-zinc-100 flex-shrink-0 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-zinc-900 truncate">{user?.name}</span>
                <span className="text-xs text-zinc-500 truncate">{user?.enrollmentNumber}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Avatar className="w-9 h-9 mb-2 cursor-pointer" onClick={() => navigate('/profile')} title="Profile">
              <AvatarImage src={user?.avatarUrl} alt={user?.name} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-zinc-50 flex flex-col">

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden flex-shrink-0 flex items-center justify-between bg-white border-b border-zinc-200 px-4 h-16">
        <div className="flex items-center">
          <img src="/pu-logo.png" alt="Parul University" className="h-10 object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <SidebarContent isCollapsed={isDesktopCollapsed} />
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                className="fixed top-0 left-0 h-full z-50 md:hidden"
              >
                <SidebarContent isCollapsed={false} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Desktop Top Navbar */}
          <header className="hidden md:flex flex-shrink-0 items-center justify-between h-16 px-4 bg-white border-b border-zinc-200 transition-all duration-300">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                title={isDesktopCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isDesktopCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>
              <div className="text-sm text-zinc-500">
                <span>{dateStr}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className="relative p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="w-px h-6 bg-zinc-200" />

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-zinc-700">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} className="text-zinc-400" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-zinc-100">
                        <p className="text-sm font-semibold text-zinc-900">{user?.name}</p>
                        <p className="text-xs text-zinc-500">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        <UserIcon size={15} />
                        My Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Scrollable page content */}
          <main ref={mainRef} className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 md:p-6 lg:p-8">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};
