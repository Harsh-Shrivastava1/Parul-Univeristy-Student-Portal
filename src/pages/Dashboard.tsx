import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  Calendar,
  MapPin,
  TrendingUp,
  Bell,
  Star,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { internshipService } from '../services/internshipService';
import { applicationService } from '../services/applicationService';
import { notificationService } from '../services/notificationService';
import type { Internship, Application, Notification } from '../types';
// Dashboard metrics are computed from live API data.
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

// Skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-32 w-full rounded-2xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

const statsCards = [
  {
    key: 'availableInternships',
    label: 'Available Internships',
    icon: Briefcase,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    trend: '+3 this week',
  },
  {
    key: 'applicationsSubmitted',
    label: 'Applications Submitted',
    icon: FileText,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    trend: 'Total applied',
  },
  {
    key: 'shortlisted',
    label: 'Shortlisted',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    trend: 'Interview pending',
  },
  {
    key: 'pendingReviews',
    label: 'Pending Reviews',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    trend: 'Awaiting response',
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allInternshipsCount, setAllInternshipsCount] = useState(0);
  const [recommended, setRecommended] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      if (!user) return;
      try {
        const [internships, apps, notifs] = await Promise.all([
          internshipService.getInternships(),
          applicationService.getApplications(user.id),
          notificationService.getNotifications(user.id),
        ]);
        if (!mounted) return;
        const openInternships = internships.filter((i) => i.status === 'Open');
        setAllInternshipsCount(openInternships.length);
        setRecommended(openInternships.slice(0, 3));
        setApplications(apps);
        setNotifications(notifs.slice(0, 3));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAll();
    const intervalId = window.setInterval(fetchAll, 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  const metrics = {
    availableInternships: allInternshipsCount,
    applicationsSubmitted: applications.length,
    shortlisted: applications.filter((a) => ['Interview Scheduled', 'Interview Completed', 'Selected'].includes(a.status)).length,
    pendingReviews: applications.filter((a) => a.status === 'Under Review' || a.status === 'Applied').length,
    upcomingInterviews: applications
      .filter((a) => a.status === 'Interview Scheduled' && a.internship?.interviewDate)
      .map((a) => ({
        internshipId: a.internshipId,
        postName: a.internship.postName,
        department: a.internship.department,
        interviewDate: a.internship.interviewDate,
        interviewTime: a.internship.interviewTime,
        venue: a.internship.venue,
      })),
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero / Welcome Banner */}
      <motion.div variants={item}>
        <div className="relative bg-white rounded-2xl p-6 md:p-8 text-zinc-900 overflow-hidden border border-zinc-200">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 pointer-events-none" />
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-blue-100/50 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[100%] bg-indigo-100/50 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-blue-600 text-sm font-bold mb-1 tracking-wide uppercase">{getGreeting()}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">{user?.name} <span className="inline-block"></span></h1>
            <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 text-sm text-zinc-600 font-medium">
              <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-zinc-400" />{user?.department}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} className="text-zinc-400" />Semester {user?.semester}</span>
              <span className="flex items-center gap-1.5">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                CGPA {user?.cgpa.toFixed(2)}
              </span>
              <span className="text-zinc-500">ID: {user?.enrollmentNumber}</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button
                size="sm"
                onClick={() => navigate('/internships')}
                className="bg-blue-600 text-white hover:bg-blue-700 font-bold h-10 px-5"
              >
                Browse Internships
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/applications')}
                className="text-zinc-700 border-zinc-200 bg-white hover:bg-zinc-50 font-medium h-10 px-5"
              >
                My Applications
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const value = metrics[stat.key as keyof typeof metrics];
          return (
            <motion.div key={stat.key} variants={item}>
              <Card className="border-zinc-200 transition-shadow duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-zinc-500 font-medium">{stat.label}</p>
                      <p className="text-3xl font-bold text-zinc-900 mt-1">
                        {typeof value === 'number' ? value : '-'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">{stat.trend}</p>
                    </div>
                    <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon size={20} className={stat.color} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Internships */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold text-zinc-900">Recommended For You</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/internships')} className="text-blue-600 text-sm">
                View all <ArrowRight size={14} className="ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {recommended.map((internship) => (
                <div
                  key={internship.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-150 cursor-pointer group"
                  onClick={() => navigate(`/internships/${internship.id}`)}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Briefcase size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-zinc-900 text-sm truncate">{internship.postName}</p>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs flex-shrink-0">
                        {internship.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{internship.department}</p>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mt-3 text-xs text-zinc-500">
                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{internship.stipend}</span>
                      <span className="flex items-center gap-1"><Clock size={12} className="text-zinc-400" /> {internship.duration}</span>
                      <span className="flex items-center gap-1"><Users size={12} className="text-zinc-400" /> {internship.vacancy} seats</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {internship.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="px-2.5 py-1 bg-zinc-100/80 text-zinc-600 text-[11px] font-medium rounded-md">
                          {skill}
                        </span>
                      ))}
                      {internship.skills.length > 3 && (
                        <span className="px-2.5 py-1 bg-zinc-100/80 text-zinc-600 text-[11px] font-medium rounded-md">
                          +{internship.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Upcoming Interviews */}
          <motion.div variants={item}>
            <Card className="border-zinc-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  Upcoming Interviews
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {metrics.upcomingInterviews.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.upcomingInterviews.map((interview) => (
                      <div key={interview.internshipId} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="font-semibold text-blue-900 text-sm">{interview.postName}</p>
                        <p className="text-xs text-blue-600 mt-0.5">{interview.department}</p>
                        <div className="mt-2 space-y-1 text-xs text-blue-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            {new Date(interview.interviewDate).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })} · {interview.interviewTime}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} />
                            {interview.venue}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">No upcoming interviews</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Notifications */}
          <motion.div variants={item}>
            <Card className="border-zinc-200">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Bell size={16} className="text-blue-600" />
                  Notifications
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')} className="text-blue-600 text-xs">
                  See all
                </Button>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {notifications.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-4">No notifications</p>
                )}
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors text-sm ${notif.read ? 'bg-zinc-50' : 'bg-blue-50 border border-blue-100'
                      }`}
                    onClick={() => navigate(notif.link ?? '/notifications')}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-800 leading-snug text-xs">{notif.title}</p>
                        <p className="text-zinc-500 text-xs mt-0.5 truncate">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Recent Applications */}
      {applications.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                Recent Applications
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/applications')} className="text-blue-600 text-sm">
                View all <ArrowRight size={14} className="ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-xs text-zinc-500 font-medium pb-3">App ID</th>
                      <th className="text-left text-xs text-zinc-500 font-medium pb-3">Position</th>
                      <th className="text-left text-xs text-zinc-500 font-medium pb-3 hidden sm:table-cell">Department</th>
                      <th className="text-left text-xs text-zinc-500 font-medium pb-3 hidden md:table-cell">Applied</th>
                      <th className="text-left text-xs text-zinc-500 font-medium pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {applications.slice(0, 3).map((app) => (
                      <tr
                        key={app.id}
                        className="cursor-pointer hover:bg-zinc-50 transition-colors"
                        onClick={() => navigate(`/applications/${app.id}/status`)}
                      >
                        <td className="py-3 font-mono text-xs text-zinc-500">{app.id}</td>
                        <td className="py-3 font-medium text-zinc-900 max-w-[160px] truncate">{app.internship.postName}</td>
                        <td className="py-3 text-zinc-500 hidden sm:table-cell">{app.internship.department}</td>
                        <td className="py-3 text-zinc-500 hidden md:table-cell">
                          {new Date(app.appliedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={app.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;