import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, MapPin, Code2, Languages, Briefcase, Edit3, Save, X, Star, FileText } from 'lucide-react';
import { profileService } from '../services/profileService';
import { applicationService } from '../services/applicationService';
import { documentService } from '../services/documentService';
import { useAuth } from '../hooks/useAuth';
import type { User as UserType, Application } from '../types';
import { PageHeader } from '../components/shared/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import ChangePasswordCard from '../components/ChangePasswordCard';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  contact: z.string().min(10, 'Valid contact required'),
  address: z.string().min(5, 'Address is required'),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  skills: z.string(),
  languages: z.string(),
});

type FormValues = z.infer<typeof schema>;

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | number }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
    <div className="text-zinc-400 mt-0.5 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-zinc-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-zinc-900 mt-0.5">{value || '—'}</p>
    </div>
  </div>
);

const Profile: React.FC = () => {
  const { user: authUser, login } = useAuth();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  });

  const loadProfile = async () => {
    if (!authUser) return;
    // Option B: fetch from MongoDB students by enrollmentNumber.
    // Falls back to authUser session data if not found in DB.
    const dbData = await profileService.getUserProfile(authUser.enrollmentNumber);
    const data = dbData ?? authUser;

    if (data) {
      const apps = await applicationService.getApplications(data.enrollmentNumber || data.id);
      setApplications(apps);
    }

    setProfile(data);
    reset({
      name: data.name,
      contact: data.contact,
      address: data.address ?? '',
      fatherName: data.fatherName ?? '',
      motherName: data.motherName ?? '',
      dateOfBirth: data.dateOfBirth ?? '',
      gender: data.gender ?? '',
      skills: (data.skills ?? []).join(', '),
      languages: (data.languages ?? []).join(', '),
    });
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [authUser]);

  const onSave = async (data: FormValues) => {
    if (!authUser || !profile) return;
    setSaving(true);
    try {
      const updated = await profileService.updateUserProfile(authUser.enrollmentNumber, {
        ...data,
        skills: data.skills.split(',').map((s) => s.trim()).filter(Boolean),
        languages: data.languages.split(',').map((l) => l.trim()).filter(Boolean),
      });
      if (updated) {
        setProfile(updated);
        login(updated);
      }
      setEditing(false);
      toast.success('Profile saved. Full editing is managed via the Cell Coordinator portal.');
    } catch {
      toast.error('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      reset({
        name: profile.name,
        contact: profile.contact,
        address: profile.address,
        fatherName: profile.fatherName ?? '',
        motherName: profile.motherName ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: profile.gender ?? '',
        skills: (profile.skills ?? []).join(', '),
        languages: (profile.languages ?? []).join(', '),
      });
    }
    setEditing(false);
  };

  const getInitials = (name?: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!profile) return null;

  const attendanceApp = applications.find((app) =>
    ['Training Starts', 'Training Completed', 'Returned to TEC Cell', 'Internship Starts', 'Internship Completed', 'Final Completion'].includes(app.status)
  );

  const handleDownloadAttendance = async () => {
    if (!attendanceApp) return;
    try {
      await documentService.download(attendanceApp.id, 'attendance-form', `PU_Attendance_${attendanceApp.id}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Attendance form is not available yet.');
    }
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal and academic information"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Profile' }]}
        actions={
          !editing ? (
            <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Edit3 size={16} />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="gap-2 border-zinc-300">
                <X size={16} />
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSave)} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )
        }
      />

      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white rounded-2xl p-6 mb-6 text-zinc-900 overflow-hidden border border-zinc-200"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 pointer-events-none" />
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-blue-100/50 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[100%] bg-indigo-100/50 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-5 flex-wrap">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-white">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{profile.name}</h2>
            <p className="text-zinc-500 text-sm mt-0.5">{profile.email}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-zinc-600 font-medium">
              <span>{profile.department}</span>
              <span>Sem {profile.semester}</span>
              <span className="flex items-center gap-1">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                CGPA {profile.cgpa.toFixed(2)}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-1 font-mono tracking-wide">ID: {profile.enrollmentNumber}</p>
            {applications.some(app => ['Training Starts', 'Training Completed', 'Returned to TEC Cell', 'Internship Starts', 'Internship Completed', 'Final Completion'].includes(app.status)) && (
              <Button
                variant="outline"
                className="mt-3 gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                onClick={handleDownloadAttendance}
              >
                <FileText size={16} />
                Download Attendance Form PDF
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList className="bg-zinc-100 mb-6">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white text-sm">Personal</TabsTrigger>
          <TabsTrigger value="academic" className="data-[state=active]:bg-white text-sm">Academic</TabsTrigger>
          <TabsTrigger value="skills" className="data-[state=active]:bg-white text-sm">Skills & Experience</TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Personal Information</h3>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name', required: true },
                  { label: 'Contact Number', key: 'contact', required: true },
                  { label: "Father's Name", key: 'fatherName' },
                  { label: "Mother's Name", key: 'motherName' },
                  { label: 'Date of Birth', key: 'dateOfBirth', type: 'date' },
                  { label: 'Gender', key: 'gender' },
                ].map(({ label, key, required, type }) => (
                  <div key={key}>
                    <Label className="text-sm text-zinc-700 font-medium mb-1.5 block">
                      {label} {required && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      {...register(key as any)}
                      type={type ?? 'text'}
                      className="h-10 border-zinc-300"
                    />
                    {errors[key as keyof typeof errors] && (
                      <p className="text-xs text-red-600 mt-1">{(errors[key as keyof typeof errors] as any)?.message}</p>
                    )}
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Label className="text-sm text-zinc-700 font-medium mb-1.5 block">
                    Present Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea {...register('address')} className="border-zinc-300 resize-none" rows={3} />
                  {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <InfoRow icon={<User size={16} />} label="Full Name" value={profile.name} />
                <InfoRow icon={<Mail size={16} />} label="Email Address" value={profile.email} />
                <InfoRow icon={<Phone size={16} />} label="Contact Number" value={profile.contact} />
                <InfoRow icon={<MapPin size={16} />} label="Present Address" value={profile.address} />
                <InfoRow icon={<User size={16} />} label="Father's Name" value={profile.fatherName} />
                <InfoRow icon={<User size={16} />} label="Mother's Name" value={profile.motherName} />
                <InfoRow icon={<User size={16} />} label="Date of Birth" value={profile.dateOfBirth} />
                <InfoRow icon={<User size={16} />} label="Gender" value={profile.gender} />
                <InfoRow icon={<User size={16} />} label="Category" value={profile.category} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-zinc-900 mb-4">Academic Information</h3>
              {/* Academic fields are owned by the institution and are read-only in
                  the Student Portal (enrollment, department, semester, CGPA,
                  backlogs, attendance). Always rendered as read-only cards. */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Department', value: profile.department },
                  { label: 'Current Semester', value: `Semester ${profile.semester}` },
                  { label: 'Overall CGPA', value: profile.cgpa.toFixed(2) },
                  { label: 'Live Backlogs', value: profile.backlogs ?? 0 },
                  { label: 'Attendance %', value: `${profile.attendance ?? 0}%` },
                  { label: 'Institute', value: (profile as any).institute || 'PIET' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-xs text-zinc-500 mb-1">{label}</p>
                    <p className="font-bold text-zinc-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SPI Scores */}
            {!editing && profile.spiScores && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-zinc-900 mb-4">SPI Scores (Semester-wise)</h4>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {([1,2,3,4,5,6,7,8] as const).map((sem) => {
                      const score = profile.spiScores?.[`sem${sem}` as keyof typeof profile.spiScores];
                      return (
                        <div key={sem} className={`text-center p-3 rounded-xl border ${score ? 'bg-blue-50 border-blue-200' : 'bg-zinc-50 border-zinc-200'}`}>
                          <p className="text-xs text-zinc-500 mb-1">Sem {sem}</p>
                          <p className="font-bold text-zinc-900">{score ? score.toFixed(2) : '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Skills & Experience Tab */}
        <TabsContent value="skills">
          <div className="space-y-5">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Code2 size={16} className="text-blue-600" />
                Technical Skills
              </h3>
              {editing ? (
                <div>
                  <Label className="text-sm text-zinc-700 font-medium mb-1.5 block">Skills (comma-separated)</Label>
                  <Input {...register('skills')} placeholder="React, Python, SQL..." className="h-10 border-zinc-300" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(profile.skills ?? []).length > 0 ? (
                    profile.skills!.map((skill) => (
                      <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium border border-blue-100">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-400">No skills added yet.</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Languages size={16} className="text-blue-600" />
                Languages Known
              </h3>
              {editing ? (
                <div>
                  <Label className="text-sm text-zinc-700 font-medium mb-1.5 block">Languages (comma-separated)</Label>
                  <Input {...register('languages')} placeholder="English, Hindi..." className="h-10 border-zinc-300" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(profile.languages ?? []).map((lang) => (
                    <span key={lang} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-sm rounded-lg font-medium">
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Experience */}
            {!editing && (profile.experience ?? []).length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-6">
                <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600" />
                  Experience
                </h3>
                <div className="space-y-4">
                  {profile.experience!.map((exp, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Briefcase size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 text-sm">{exp.title}</p>
                        <p className="text-xs text-zinc-500">{exp.company}</p>
                        <p className="text-xs text-blue-600 mt-0.5">{exp.duration}</p>
                        <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{exp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Account security — self-service password change */}
      <ChangePasswordCard />
    </div>
  );
};

export default Profile;
