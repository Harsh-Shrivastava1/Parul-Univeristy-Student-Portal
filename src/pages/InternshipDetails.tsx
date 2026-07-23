import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowLeft,
  Send,
  Tag,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react';
import { internshipService } from '../services/internshipService';
import { applicationService } from '../services/applicationService';
import { useAuth } from '../hooks/useAuth';
import type { Internship } from '../types';
import { PageHeader } from '../components/shared/PageHeader';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const InternshipDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [checkingApp, setCheckingApp] = useState(true);

  useEffect(() => {
    if (!id) return;
    internshipService.getInternshipById(id).then((data) => {
      setInternship(data ?? null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    applicationService.getApplications(user.id).then((apps) => {
      setAlreadyApplied(apps.some((a) => a.internshipId === id));
      setCheckingApp(false);
    });
  }, [user, id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={40} className="text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500">Internship not found.</p>
        <Button variant="ghost" onClick={() => navigate('/internships')} className="mt-4">
          Back to Internships
        </Button>
      </div>
    );
  }

  const handleApply = () => {
    if (internship.status === 'Closed') {
      toast.error('This internship is no longer accepting applications.');
      return;
    }
    navigate(`/internships/${internship.id}/apply`);
  };

  const ApplyCard = (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-2xl font-bold text-blue-700">₹{internship.stipend}</p>
        <p className="text-zinc-500 text-sm mt-0.5">Monthly Stipend</p>
      </div>
      <div className="space-y-3 text-sm">
        {[
          { icon: Clock, label: 'Duration', value: internship.duration },
          { icon: Users, label: 'Vacancies', value: `${internship.vacancy} seat${internship.vacancy !== 1 ? 's' : ''}` },
          { icon: Calendar, label: 'Interview', value: new Date(internship.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
          { icon: Clock, label: 'Time', value: internship.interviewTime },
          { icon: MapPin, label: 'Venue', value: internship.venue },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <Icon size={16} className="text-zinc-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-zinc-500 text-xs">{label}</p>
              <p className="font-medium text-zinc-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
      {checkingApp ? (
        <Skeleton className="h-11 rounded-xl" />
      ) : alreadyApplied ? (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-200">
          <CheckCircle2 size={16} />
          Already Applied
        </div>
      ) : (
        <Button
          onClick={handleApply}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-semibold"
          disabled={internship.status === 'Closed'}
        >
          <Send size={16} className="mr-2" />
          {internship.status === 'Closed' ? 'Applications Closed' : 'Apply Now'}
        </Button>
      )}
      {internship.contactPerson && (
        <div className="pt-3 border-t border-zinc-100 space-y-1.5 text-sm">
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Contact</p>
          <div className="flex items-center gap-2 text-zinc-700">
            <User size={14} className="text-zinc-400" />
            {internship.contactPerson}
          </div>
          {internship.contactEmail && (
            <div className="flex items-center gap-2 text-zinc-700">
              <Mail size={14} className="text-zinc-400" />
              <a href={`mailto:${internship.contactEmail}`} className="text-blue-600 hover:underline text-xs">
                {internship.contactEmail}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Internships', href: '/internships' },
          { label: internship.postName },
        ]}
        title=""
        actions={
          <Button variant="ghost" onClick={() => navigate('/internships')} className="text-zinc-600 gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        }
      />

      {/* Hero */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Briefcase size={26} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-zinc-900">{internship.postName}</h1>
              <Badge
                variant="secondary"
                className={internship.status === 'Open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600'}
              >
                {internship.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">₹{internship.stipend}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} />{internship.duration}</span>
              <span className="flex items-center gap-1.5"><Users size={14} />{internship.vacancy} vacancies</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} />Posted {new Date(internship.postedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            {internship.minCGPA && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-amber-700">
                <AlertCircle size={14} />
                Minimum CGPA: {internship.minCGPA} · {internship.eligibility}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {internship.description && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <h2 className="font-semibold text-zinc-900 mb-3">About This Internship</h2>
              <p className="text-zinc-600 text-sm leading-relaxed">{internship.description}</p>
            </div>
          )}

          {/* Responsibilities */}
          {internship.responsibilities && internship.responsibilities.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <h2 className="font-semibold text-zinc-900 mb-4">Key Responsibilities</h2>
              <ul className="space-y-2.5">
                {internship.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-700">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tasks */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-4">Tasks You'll Perform</h2>
            <ul className="space-y-2.5">
              {internship.tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-700">
                  <span className="w-5 h-5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Skills */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Tag size={16} className="text-blue-600" />
              Required Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {internship.skills.map((skill) => (
                <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium border border-blue-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Other info */}
          {internship.otherInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Additional Information</p>
              <p className="text-sm text-amber-800 leading-relaxed">{internship.otherInfo}</p>
            </div>
          )}
        </div>

        {/* Right: Apply Sidebar (desktop sticky, mobile top) */}
        <div className="order-first lg:order-last">
          <div className="lg:sticky lg:top-24">{ApplyCard}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default InternshipDetails;
