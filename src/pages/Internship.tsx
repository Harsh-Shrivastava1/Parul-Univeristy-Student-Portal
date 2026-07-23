import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/applicationService';
import { trainingService, type TrainingInfo } from '../services/trainingService';
import type { Application } from '../types';
import { ArrowLeft, Briefcase, CheckCircle, Clock, Calendar, CheckSquare } from 'lucide-react';

export default function Internship() {
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
        <p className="text-red-500 mb-4">Internship module not yet available for this application.</p>
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
        {['Internship Completed', 'Final Completion'].includes(application.status) && (
          <span className="px-3 py-1 bg-green-100 text-green-700 font-medium rounded-full text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-8 h-8 text-teal-200" />
            <h1 className="text-2xl font-bold">Internship Details</h1>
          </div>
          <p className="text-teal-100">
            {application.internship.postName}
            {application.assignedDepartment ? ` · ${application.assignedDepartment}` : ''}
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 border-b pb-2">Overview</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Duration</p>
                    <p className="text-sm text-zinc-600">{application.internship.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Start Date</p>
                    <p className="text-sm text-zinc-600">{training.joiningDate || 'To be decided by Mentor'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900 border-b pb-2">Tasks & Progress</h3>
              <div className="space-y-3">
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100 flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Week 1: Setup & Orientation</p>
                    <p className="text-xs text-zinc-500">Completed</p>
                  </div>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100 flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">Week 2: Core Tasks</p>
                    <p className="text-xs text-zinc-500">In Progress</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
