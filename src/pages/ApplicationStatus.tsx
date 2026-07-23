import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { applicationService } from '../services/applicationService';
import { useAuth } from '../hooks/useAuth';
import type { Application, ApplicationStatus } from '../types';
import { PageHeader } from '../components/shared/PageHeader';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/shared/EmptyState';
import { FileText } from 'lucide-react';

const TIMELINE_STEPS: ApplicationStatus[] = [
  'Applied',
  'Under Review',
  'Interview Scheduled',
  'Interview Completed',
  'Selected',
  'Assigned to Respective Cell',
  'Training Assigned',
  'Training Starts',
  'Training Completed',
  'Returned to TEC Cell',
  'Internship Starts',
  'Internship Completed',
  'Final Completion',
];

const STATUS_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  Applied: 'Your application has been submitted and is awaiting initial review.',
  'Under Review': 'The department coordinator is reviewing your application and profile.',
  'Interview Scheduled': 'Your interview has been scheduled.',
  'Interview Completed': 'Your interview has been completed. Awaiting results.',
  Selected: 'You have been selected for the position.',
  'Assigned to Respective Cell': 'You have been assigned to your respective cell.',
  'Training Assigned': 'A training program has been assigned to you.',
  'Training Starts': 'Your training has commenced. Please ensure your attendance.',
  'Training Completed': 'Training completed successfully.',
  'Returned to TEC Cell': 'Training is finished, returning control to TEC Cell for final placement.',
  'Internship Starts': 'Your internship has officially started.',
  'Internship Completed': 'Internship completed successfully. Collect your certificate from the Internship Cell office.',
  'Final Completion': 'Internship journey completed. Collect your certificate from the Internship Cell office.',
  Rejected: 'Your application was not selected. Do not be discouraged — apply for other opportunities.',
};

function getProgressPercent(status: ApplicationStatus): number {
  if (status === 'Rejected') return 33;
  const idx = TIMELINE_STEPS.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx) / (TIMELINE_STEPS.length - 1)) * 100);
}

const ApplicationStatus: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    applicationService.getApplications(user.id).then((apps) => {
      setApplications(apps);
      if (apps.length > 0) setSelectedId(apps[0].id);
      setLoading(false);
    });
  }, [user]);

  const currentApp = applications.find((a) => a.id === selectedId);
  const progress = currentApp ? getProgressPercent(currentApp.status) : 0;
  const isRejected = currentApp?.status === 'Rejected';
  const effectiveSteps = isRejected
    ? ['Applied', 'Under Review', 'Rejected'] as ApplicationStatus[]
    : TIMELINE_STEPS;

  return (
    <div>
      <PageHeader
        title="Application Status"
        subtitle="Track the progress of your internship applications"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Application Status' }]}
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 rounded-xl w-72" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="No applications yet"
          description="Apply for internships to track your application status here."
          action={<Button onClick={() => navigate('/internships')} className="bg-blue-600 hover:bg-blue-700">Browse Internships</Button>}
        />
      ) : (
        <div className="space-y-6">
          {/* Application selector */}
          {applications.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-zinc-500 font-medium">Select Application:</p>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-72 border-zinc-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.id} — {app.internship.postName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentApp && (
            <motion.div key={currentApp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Header card */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">{currentApp.internship.postName}</h2>
                    {currentApp.assignedDepartment && (
                      <p className="text-sm text-blue-700 mt-0.5 font-medium">
                        Training Department: {currentApp.assignedDepartment}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1 font-mono">{currentApp.id}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={currentApp.status} />
                    <p className="text-xs text-zinc-400 mt-1">
                      Applied: {new Date(currentApp.appliedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2.5 bg-zinc-100 [&>div]:bg-blue-600"
                  />
                  <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                    {STATUS_DESCRIPTIONS[currentApp.status]}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 mb-6">Application Timeline</h3>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-zinc-100" />

                  <div className="space-y-0">
                    {effectiveSteps.map((step, idx) => {
                      const timelineEntry = currentApp.timeline.find((t) => t.status === step);
                      const currentStepIndex = effectiveSteps.indexOf(currentApp.status);
                      const isDone = idx < currentStepIndex || (idx === currentStepIndex && step !== 'Applied');
                      const isCurrent = idx === currentStepIndex;
                      const isFuture = idx > currentStepIndex;
                      const isReject = step === 'Rejected';

                      return (
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="relative flex gap-6 pb-8 last:pb-0"
                        >
                          {/* Icon */}
                          <div className="relative z-10 flex-shrink-0">
                            {isDone || isCurrent ? (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isReject ? 'bg-red-100' : isCurrent ? 'bg-blue-600' : 'bg-emerald-500'
                              }`}>
                                <CheckCircle2 size={16} className={isReject ? 'text-red-600' : 'text-white'} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border-2 border-zinc-200">
                                <Circle size={14} className="text-zinc-400" />
                              </div>
                            )}
                            {/* Ping animation removed as per user request */}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pt-1 ${isFuture ? 'opacity-40' : ''}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <p className={`font-semibold text-sm ${
                                isCurrent && !isReject ? 'text-blue-700' : isReject ? 'text-red-700' : 'text-zinc-900'
                              }`}>
                                {step}
                                {isCurrent && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                    Current
                                  </span>
                                )}
                              </p>
                              {timelineEntry && (
                                <div className="flex items-center gap-1 text-xs text-zinc-400">
                                  <Clock size={11} />
                                  {new Date(timelineEntry.timestamp).toLocaleString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </div>
                              )}
                            </div>
                            {timelineEntry?.notes && (
                              <p className="text-sm text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100 leading-relaxed">
                                {timelineEntry.notes}
                              </p>
                            )}
                            {/* Completed/current steps without a recorded timeline
                                entry show their meaning — never a misleading
                                "Pending update" under a green check. */}
                            {!timelineEntry && !isFuture && (
                              <p className="text-xs text-zinc-500">{STATUS_DESCRIPTIONS[step]}</p>
                            )}
                            {isFuture && (
                              <p className="text-xs text-zinc-400">{STATUS_DESCRIPTIONS[step]}</p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationStatus;
