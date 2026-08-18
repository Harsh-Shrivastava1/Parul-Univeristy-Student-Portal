import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';
import type { Notification } from '../types';
import { PageHeader } from '../components/shared/PageHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { formatDate } from '../lib/dateUtils';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeConfig = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  info: { icon: Info, bg: 'bg-blue-100', text: 'text-blue-600' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-600' },
  error: { icon: XCircle, bg: 'bg-red-100', text: 'text-red-600' },
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    if (!user) return;
    const data = await notificationService.getNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const handleMarkRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read.');
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification deleted.');
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Notifications' }]}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={handleMarkAllRead} className="gap-2 border-zinc-300 text-sm h-9">
              <CheckCheck size={16} />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="mb-5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList className="bg-zinc-100">
            <TabsTrigger value="all" className="text-sm data-[state=active]:bg-white">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-sm data-[state=active]:bg-white">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description={filter === 'unread' ? 'You\'re all caught up! Check back later.' : 'You have no notifications at the moment.'}
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((notif) => {
              const config = typeConfig[notif.type] ?? typeConfig.info;
              const Icon = config.icon;
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer group ${
                    notif.read
                      ? 'bg-white border-zinc-200 hover:border-zinc-300'
                      : 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
                  }`}
                  onClick={() => {
                    if (!notif.read) handleMarkRead(notif.id);
                    if (notif.link) navigate(notif.link);
                  }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={18} className={config.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold text-sm ${notif.read ? 'text-zinc-700' : 'text-zinc-900'}`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                        <span className="text-xs text-zinc-400" title={formatDate(notif.date)}>{timeAgo(notif.date)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-zinc-400 mt-1">{formatDate(notif.date)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                        className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      className="p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Notifications;
