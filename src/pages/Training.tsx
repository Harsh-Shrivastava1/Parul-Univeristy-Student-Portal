import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/applicationService';
import { trainingService, type TrainingInfo } from '../services/trainingService';
import { documentService } from '../services/documentService';
import type { Application } from '../types';
import { ArrowLeft, BookOpen, Clock, MapPin, User, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function Training() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [training, setTraining] = useState<TrainingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        applicationService.getApplicationById(id),
        trainingService.getMyTraining(),
      ]).then(([app, tr]) => {
        setApplication(app || null);
        setTraining(tr);
        setLoading(false);
      });
    }
  }, [id]);

  const handleDownloadAttendance = async () => {
    if (!application) return;
    try {
      await documentService.download(application.id, 'attendance-form', `PU_Attendance_${application.id}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Attendance form is not available yet.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!application) {
    return <div className="text-center p-8">Application not found</div>;
  }

  if (!training) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">Training module not yet available for this application.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/applications')}
          className="flex items-center text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Applications
        </button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-blue-200" />
            <h1 className="text-2xl font-bold">Training Module</h1>
          </div>
          <p className="text-blue-100">
            {application.internship.postName}
            {application.assignedDepartment ? ` · ${application.assignedDepartment}` : ''}
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 border-b pb-2">Training Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Assigned Mentor</p>
                    <p className="text-sm text-zinc-600">{training.mentorName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Location</p>
                    <p className="text-sm text-zinc-600">{training.reportingLocation || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Reporting Time</p>
                    <p className="text-sm text-zinc-600">{training.reportingTime || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 border-b pb-2">Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleDownloadAttendance}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Attendance Form
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
