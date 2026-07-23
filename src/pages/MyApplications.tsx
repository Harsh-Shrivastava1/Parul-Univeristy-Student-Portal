import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Eye, Trash2, Download, Briefcase, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { applicationService } from '../services/applicationService';
import { useAuth } from '../hooks/useAuth';
import type { Application } from '../types';
import { documentService } from '../services/documentService';
import { PageHeader } from '../components/shared/PageHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';

const SummaryCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; bg: string }> = ({
  label, value, icon, color, bg,
}) => (
  <Card className="border-zinc-200">
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const MyApplications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPDF = async (app: Application) => {
    setDownloadingId(app.id);
    try {
      await documentService.download(app.id, 'application-pdf', `PU_Application_${app.id}.pdf`);
      toast.success(`PDF downloaded: PU_Application_${app.id}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchApps = async () => {
    if (!user) return;
    const apps = await applicationService.getApplications(user.id);
    setApplications(apps);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, [user]);

  const handleWithdraw = async (app: Application) => {
    if (!confirm(`Are you sure you want to withdraw your application for "${app.internship.postName}"?`)) return;
    setWithdrawing(app.id);
    await applicationService.withdrawApplication(app.id);
    toast.success('Application withdrawn successfully.');
    await fetchApps();
    setWithdrawing(null);
  };

  const metrics = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'Applied' || a.status === 'Under Review').length,
    shortlisted: applications.filter((a) => ['Interview Scheduled', 'Interview Completed', 'Selected'].includes(a.status)).length,
    completed: applications.filter((a) => ['Training Completed', 'Internship Completed', 'Final Completion'].includes(a.status)).length,
  };

  return (
    <div>
      <PageHeader
        title="My Applications"
        subtitle="Track and manage all your internship applications"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'My Applications' }]}
        actions={
          <Button onClick={() => navigate('/internships')} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Briefcase size={16} />
            Browse Internships
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Applications" value={metrics.total} icon={<FileText size={18} />} color="text-blue-600" bg="bg-blue-50" />
        <SummaryCard label="In Progress" value={metrics.pending} icon={<Clock size={18} />} color="text-amber-600" bg="bg-amber-50" />
        <SummaryCard label="Shortlisted" value={metrics.shortlisted} icon={<CheckCircle size={18} />} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard label="Completed" value={metrics.completed} icon={<CheckCircle size={18} />} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="No applications yet"
          description="Browse available internships and submit your first application."
          action={
            <Button onClick={() => navigate('/internships')} className="bg-blue-600 hover:bg-blue-700">
              Browse Internships
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left text-xs text-zinc-500 font-semibold px-5 py-3.5 uppercase tracking-wide">App ID</th>
                    <th className="text-left text-xs text-zinc-500 font-semibold px-5 py-3.5 uppercase tracking-wide">Internship</th>
                    <th className="text-left text-xs text-zinc-500 font-semibold px-5 py-3.5 uppercase tracking-wide">Applied</th>
                    <th className="text-left text-xs text-zinc-500 font-semibold px-5 py-3.5 uppercase tracking-wide">Status</th>
                    <th className="text-left text-xs text-zinc-500 font-semibold px-5 py-3.5 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {applications.map((app) => (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-zinc-500">{app.id}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-zinc-900">{app.internship.postName}</p>
                      </td>
                      <td className="px-5 py-4 text-zinc-500">
                        {new Date(app.appliedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedApp(app)}
                            className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye size={14} /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/applications/${app.id}/status`)}
                            className="h-8 text-zinc-500 hover:bg-zinc-100"
                          >
                            Track
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadPDF(app)}
                            disabled={downloadingId === app.id}
                            className="h-8 text-zinc-500 hover:bg-zinc-100"
                            title="Download PDF"
                          >
                            {downloadingId === app.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Download size={14} />}
                          </Button>
                          {app.status === 'Applied' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleWithdraw(app)}
                              disabled={withdrawing === app.id}
                              className="h-8 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {applications.map((app) => (
              <Card key={app.id} className="border-zinc-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm">{app.internship.postName}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
                    <span className="font-mono">{app.id}</span>
                    <span>·</span>
                    <span>{new Date(app.appliedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)} className="flex-1 h-9 text-xs border-zinc-300">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/applications/${app.id}/status`)} className="flex-1 h-9 text-xs border-zinc-300">
                      Track Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* View Application Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {selectedApp?.id} · {selectedApp?.internship.postName}
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-zinc-500 text-xs">Position</p><p className="font-medium">{selectedApp.internship.postName}</p></div>
                {selectedApp.assignedDepartment && (
                  <div><p className="text-zinc-500 text-xs">Training Department</p><p className="font-medium">{selectedApp.assignedDepartment}</p></div>
                )}
                <div><p className="text-zinc-500 text-xs">Applied Date</p><p className="font-medium">{new Date(selectedApp.appliedDate).toLocaleDateString('en-IN')}</p></div>
                <div><p className="text-zinc-500 text-xs">Status</p><StatusBadge status={selectedApp.status} /></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Application Timeline</p>
                <div className="space-y-3">
                  {selectedApp.timeline.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-bold">{i + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-zinc-900">{entry.status}</p>
                        <p className="text-xs text-zinc-500">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>
                        {entry.notes && <p className="text-xs text-zinc-600 mt-1">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => navigate(`/applications/${selectedApp.id}/status`)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  View Full Status
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(selectedApp)}
                  disabled={downloadingId === selectedApp.id}
                  className="gap-2 border-zinc-300 min-w-[90px]"
                >
                  {downloadingId === selectedApp.id
                    ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                    : <><Download size={15} /> PDF</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyApplications;
