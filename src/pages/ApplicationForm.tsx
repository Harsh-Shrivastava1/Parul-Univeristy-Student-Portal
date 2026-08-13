import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Loader2, Send, ArrowLeft, CheckCircle2, RotateCcw,
  AlertCircle, User, GraduationCap, Languages, Briefcase,
  MessageSquare, Users2, ShieldCheck, PenLine, Info,
} from 'lucide-react';
import { internshipService } from '../services/internshipService';
import { applicationService } from '../services/applicationService';
import { profileService } from '../services/profileService';
import { instituteService, type InstituteOption } from '../services/departmentService';
import { useAuth } from '../hooks/useAuth';
import type { Internship, User as StudentUser } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';

// ─── Schema ───────────────────────────────────────────────────────────────────

const spiNum = z.preprocess(
  (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v)),
  z.number().min(0, 'Min 0').max(10, 'Max 10').optional(),
);

const schema = z.object({
  date: z.string(),
  instituteName: z.string().min(2, 'Required'),
  departmentName: z.string().min(2, 'Required'),
  degree: z.string().min(2, 'Required'),
  passingYear: z.string().min(4, 'Required'),
  position: z.string().min(2, 'Required'),
  fullName: z.string().min(2, 'Full name is required'),
  enrollmentNumber: z.string().min(5, 'Enrollment number is required'),
  contact: z.string().min(10, 'Valid 10-digit number required'),
  email: z.string().regex(/^[A-Za-z0-9._%+-]+@paruluniversity\.ac\.in$/i, 'Only official Parul University email addresses (@paruluniversity.ac.in) are allowed.'),
  presentAddress: z.string().min(10, 'Full address required'),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  languagesKnown: z.string().min(1, 'At least one language required'),
  sem1: spiNum, sem2: spiNum, sem3: spiNum, sem4: spiNum,
  sem5: spiNum, sem6: spiNum, sem7: spiNum, sem8: spiNum,
  cgpa: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().min(0).max(10, 'Max 10')),
  backlogs: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().min(0, 'Cannot be negative').int()),
  semester: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().min(1).max(8)),
  attendance: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().min(0).max(100, 'Max 100%')),
  tasksCanPerform: z.string().min(20, 'Provide at least 20 characters'),
  supportInformation: z.string().optional(),
  reference1Name: z.string().optional(),
  reference1Designation: z.string().optional(),
  reference1Contact: z.string().optional(),
  reference2Name: z.string().optional(),
  reference2Designation: z.string().optional(),
  reference2Contact: z.string().optional(),
  declarationAccepted: z.boolean().refine((v) => v === true, { message: 'You must accept the declaration' }),
  digitalSignature: z.string().min(2, 'Digital signature (your full name) is required'),
}).superRefine((data, ctx) => {
  // SGPA is mandatory only for semesters whose results are declared — i.e. up to
  // (current semester − 2). A student in Sem 5 must fill Sem 1–3; the most recent
  // one or two semesters' results may not be out yet, so they stay optional. This
  // still guarantees the printed form carries the per-semester SGPA the officer needs.
  const current = Number(data.semester);
  if (!Number.isFinite(current) || current < 1) return; // handled by `semester` rule
  const requiredUpto = Math.min(current - 2, 8);
  for (let i = 1; i <= requiredUpto; i++) {
    const val = data[`sem${i}` as keyof typeof data];
    if (val === undefined || val === null || typeof val !== 'number' || Number.isNaN(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Required',
        path: [`sem${i}`],
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

// ─── Section Card ─────────────────────────────────────────────────────────────

const Section: React.FC<{
  id: string;
  num: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, num, icon, title, children }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
  >
    <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
      <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {num}
      </div>
      <div className="text-zinc-400 flex-shrink-0">{icon}</div>
      <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
    </div>
    <div className="p-6 md:p-8 space-y-6">{children}</div>
  </motion.section>
);

// ─── Field ────────────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, required, error, hint, children, className = '' }) => (
  <div className={className}>
    <Label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle size={11} className="flex-shrink-0" />{error}
      </p>
    )}
  </div>
);

const inp = 'h-10 px-3 border-zinc-200 bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 text-sm rounded-lg w-full transition-colors text-zinc-800 placeholder:text-zinc-300';
const ta = 'p-3 border-zinc-200 bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 text-sm rounded-lg w-full resize-none transition-colors text-zinc-800 min-h-[100px]';

// ─── Main ─────────────────────────────────────────────────────────────────────

const ApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as any, defaultValues: { date: today, declarationAccepted: false } });

  // Institute → department master data for the cascading dropdowns.
  const [institutes, setInstitutes] = useState<InstituteOption[]>([]);
  useEffect(() => {
    instituteService.getInstitutes().then(setInstitutes).catch(() => setInstitutes([]));
  }, []);
  const selectedInstitute = watch('instituteName');
  const selectedDept = watch('departmentName');
  // How many SPI cells are mandatory: Sem 1 through (current semester − 2), i.e.
  // only the semesters whose results are declared. Drives the `*` markers and
  // required placeholders on the table.
  const currentSemester = Number(watch('semester'));
  const spiRequiredUpto =
    Number.isFinite(currentSemester) && currentSemester >= 1
      ? Math.max(0, Math.min(currentSemester - 2, 8))
      : 0;
  const instituteDepts = institutes.find((i) => i.code === selectedInstitute)?.departments ?? [];
  // Always include the student's already-saved department as an option, even if
  // the institute list hasn't loaded yet or the stored value differs slightly —
  // so the autofilled value always shows and never silently blanks out.
  const deptOptions =
    selectedDept && !instituteDepts.includes(selectedDept)
      ? [selectedDept, ...instituteDepts]
      : instituteDepts;

  // Load internship + check existing application + prefill
  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      internshipService.getInternshipById(id),
      applicationService.getApplications(user.id).catch(() => []),
    ]).then(([data, existingApps]) => {
      setInternship(data ?? null);
      const existing = existingApps.find(
        (a) => a.internshipId === id || a.internship?.id === id
      );
      if (existing) {
        setSubmittedAppId(existing.id);
      }
      setLoading(false);
      if (data && user) {
        reset({
          date: today,
          instituteName: (user as any).institute || '',
          // Prefilled from signup, but freely editable on the form.
          departmentName: user.department ?? '',
          // Autofilled from the student's saved profile (editable each time).
          degree: (user as any).degree ?? '',
          passingYear: (user as any).passingYear ?? '',
          position: data.postName,
          fullName: user.name ?? '',
          enrollmentNumber: user.enrollmentNumber ?? '',
          contact: user.contact ?? '',
          email: user.email ?? '',
          presentAddress: user.address ?? '',
          fatherName: user.fatherName ?? '',
          motherName: user.motherName ?? '',
          dateOfBirth: user.dateOfBirth ? (!isNaN(new Date(user.dateOfBirth).getTime()) ? new Date(user.dateOfBirth).toISOString().split('T')[0] : user.dateOfBirth) : '',
          gender: user.gender ?? '',
          languagesKnown: (user.languages ?? []).join(', '),
          cgpa: user.cgpa ?? undefined,
          backlogs: user.backlogs ?? 0,
          semester: user.semester ?? undefined,
          attendance: user.attendance ?? undefined,
          sem1: user.spiScores?.sem1, sem2: user.spiScores?.sem2,
          sem3: user.spiScores?.sem3, sem4: user.spiScores?.sem4,
          sem5: user.spiScores?.sem5, sem6: user.spiScores?.sem6,
          sem7: user.spiScores?.sem7, sem8: user.spiScores?.sem8,
          declarationAccepted: false,
        });
      }
    });
  }, [id, user]);

  const onSubmit = async (data: FormValues) => {
    if (!user || !internship) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const formData = {
        fullName: data.fullName, enrollmentNumber: data.enrollmentNumber,
        contact: data.contact, email: data.email, presentAddress: data.presentAddress,
        fatherName: data.fatherName, motherName: data.motherName,
        dateOfBirth: data.dateOfBirth, gender: data.gender,
        instituteName: data.instituteName, departmentName: data.departmentName,
        degree: data.degree, passingYear: data.passingYear,
        position: data.position,
        semester: Number(data.semester), cgpa: Number(data.cgpa),
        backlogs: Number(data.backlogs), attendance: Number(data.attendance),
        spiScores: {
          sem1: data.sem1, sem2: data.sem2, sem3: data.sem3, sem4: data.sem4,
          sem5: data.sem5, sem6: data.sem6, sem7: data.sem7, sem8: data.sem8
        },
        languagesKnown: data.languagesKnown,
        tasksCanPerform: data.tasksCanPerform,
        supportInformation: data.supportInformation ?? '',
        reference1Name: data.reference1Name, reference1Designation: data.reference1Designation,
        reference1Contact: data.reference1Contact,
        reference2Name: data.reference2Name, reference2Designation: data.reference2Designation,
        reference2Contact: data.reference2Contact,
        declarationAccepted: data.declarationAccepted,
        digitalSignature: data.digitalSignature,
      };
      const app = await applicationService.submitApplication(internship.id, user.id, internship, formData);

      // Persist the academic + personal details to the student profile so they
      // are filled once and every future application pre-fills from here — no
      // re-typing SPI etc. Non-blocking: a sync failure never fails the apply.
      try {
        const updated = await profileService.updateUserProfile(user.id, {
          contact: data.contact,
          address: data.presentAddress,
          cgpa: Number(data.cgpa),
          fatherName: data.fatherName,
          motherName: data.motherName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          languages: (data.languagesKnown || '').split(',').map((s) => s.trim()).filter(Boolean),
          backlogs: Number(data.backlogs),
          attendance: Number(data.attendance),
          degree: data.degree,
          passingYear: data.passingYear,
          spiScores: {
            sem1: data.sem1, sem2: data.sem2, sem3: data.sem3, sem4: data.sem4,
            sem5: data.sem5, sem6: data.sem6, sem7: data.sem7, sem8: data.sem8,
          },
        } as Partial<StudentUser>);
        if (updated) login(updated);
      } catch {
        /* profile sync is best-effort */
      }

      // The confirmation email/notification is sent server-side by the owning
      // backend when the application is created.
      const targetId = app?.id || (app as any)?.data?.id || `app_${Date.now()}`;
      setSubmittedAppId(targetId);
      toast.success('Application submitted');
    } catch (err: any) {
      toast.error(err?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (!id || !user || !internship) return;
    reset({
      date: today, instituteName: (user as any).institute || '',
      departmentName: user.department ?? '', degree: (user as any).degree ?? '', passingYear: (user as any).passingYear ?? '', position: internship.postName,
      fullName: user.name ?? '', enrollmentNumber: user.enrollmentNumber ?? '',
      contact: user.contact ?? '', email: user.email ?? '',
      presentAddress: user.address ?? '', declarationAccepted: false
    });
    setResetDialog(false);
    toast.info('Form reset.');
  };

  if (loading) return (
    <div className="w-full space-y-3">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
    </div>
  );

  if (!internship) return (
    <div className="text-center py-20">
      <AlertCircle size={36} className="text-zinc-300 mx-auto mb-3" />
      <p className="text-zinc-500">Internship not found.</p>
      <Button variant="ghost" onClick={() => navigate('/internships')} className="mt-4">Back</Button>
    </div>
  );

  if (submittedAppId) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
        <CheckCircle2 size={44} className="text-emerald-500" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-md">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Application Submitted!</h2>
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg py-3 px-4 mb-4">
          <p className="text-sm text-zinc-500 mb-1">Application ID</p>
          <p className="text-lg font-mono font-semibold text-zinc-800">{submittedAppId}</p>
        </div>
        <p className="text-zinc-600 text-sm mb-8 leading-relaxed">
          A confirmation email has been sent to your registered email address.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/applications')} className="w-full sm:w-auto h-10 bg-zinc-900 hover:bg-zinc-800 text-white gap-2">
            View My Applications
          </Button>
          <Button variant="outline" onClick={() => navigate('/internships')} className="w-full sm:w-auto h-10 border-zinc-200 gap-2">
            Browse More Internships
          </Button>
        </div>
      </motion.div>
    </div>
  );

  const displayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="w-full pb-4">

      {/* ── Back ── */}
      <Button variant="ghost" type="button" onClick={() => navigate(`/internships/${internship.id}`)}
        className="text-zinc-500 hover:text-zinc-800 gap-2 -ml-2 mb-4 h-8 text-sm">
        <ArrowLeft size={15} /> Back to Internship
      </Button>

      {/* ── Form Header ── */}
      <div className="bg-white border border-zinc-200 rounded-xl mb-5 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-100">
          <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">PU</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Parul University</p>
            <h1 className="text-base font-bold text-zinc-900 leading-tight">Internship Application Form</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Candidate Information — Academic Year 2026–27</p>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <p className="text-xs text-zinc-400">Date</p>
            <p className="text-sm font-semibold text-zinc-700">{displayDate}</p>
          </div>
        </div>
        {/* Position strip */}
        <div className="px-5 py-2.5 bg-zinc-50 flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            <span className="font-semibold text-zinc-700">Position: </span>{internship.postName}
          </p>
        </div>
      </div>

      {/* ── Section breadcrumb ── */}
      <div className="flex items-center gap-1 text-xs text-zinc-400 mb-5 overflow-x-auto pb-0.5 flex-nowrap">
        {['Candidate Info', 'Languages', 'Education', 'Experience', 'Support', 'References', 'Declaration', 'Signature'].map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <span className="text-zinc-300 flex-shrink-0">›</span>}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(`sec-${i + 1}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="whitespace-nowrap hover:text-zinc-700 transition-colors flex-shrink-0 cursor-pointer text-xs"
            >
              {s}
            </button>
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} noValidate className="space-y-8">

        {/* ── 1: Candidate Info ── */}
        <Section id="sec-1" num={1} icon={<User size={14} />} title="Candidate Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Date">
              <Input value={displayDate} readOnly className={`${inp} bg-zinc-50 text-zinc-500 cursor-default`} />
            </Field>
            <Field label="Institute Name" required error={errors.instituteName?.message}>
              {/* Controlled selects: they display the RHF value (autofilled from
                  the student's profile) reliably, regardless of when the
                  institute list finishes loading. */}
              <select
                value={selectedInstitute ?? ''}
                onChange={(e) => {
                  setValue('instituteName', e.target.value, { shouldValidate: true });
                  setValue('departmentName', '', { shouldValidate: true });
                }}
                className={`${inp} w-full h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm`}
              >
                <option value="">Select institute…</option>
                {/* Include the saved institute even before the list loads. */}
                {selectedInstitute && !institutes.some((i) => i.code === selectedInstitute) && (
                  <option value={selectedInstitute}>{selectedInstitute}</option>
                )}
                {institutes.map((i) => (
                  <option key={i.code} value={i.code}>{i.code}</option>
                ))}
              </select>
            </Field>
            <Field label="Department" required error={errors.departmentName?.message}>
              <select
                value={selectedDept ?? ''}
                onChange={(e) => setValue('departmentName', e.target.value, { shouldValidate: true })}
                disabled={deptOptions.length === 0}
                className={`${inp} w-full h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:bg-zinc-50 disabled:text-zinc-400`}
              >
                <option value="">{selectedInstitute || selectedDept ? 'Select department…' : 'Select institute first'}</option>
                {deptOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Degree" required error={errors.degree?.message}>
              <Input {...register('degree')} placeholder="B.Tech, BCA, etc." className={inp} />
            </Field>
            <Field label="Passing Year" required error={errors.passingYear?.message}>
              <Input {...register('passingYear')} placeholder="2026" className={inp} />
            </Field>
            <Field label="Position Applied For" required>
              <Input {...register('position')} readOnly className={`${inp} bg-zinc-50 text-zinc-500 cursor-default`} />
            </Field>
          </div>

          <div className="border-t border-zinc-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Full Name" required error={errors.fullName?.message}>
              <Input {...register('fullName')} placeholder="As per university records" className={inp} />
            </Field>
            <Field label="Enrollment Number" required error={errors.enrollmentNumber?.message}>
              <Input {...register('enrollmentNumber')} placeholder="210303105001" className={`${inp} font-mono`} />
            </Field>
            <Field label="Contact Number" required error={errors.contact?.message}>
              <Input {...register('contact')} type="tel" placeholder="+91 9876543210" className={inp} />
            </Field>
            <Field label="Parul Email ID" required error={errors.email?.message}>
              <Input {...register('email')} type="email" placeholder="name@paruluniversity.ac.in" className={inp} />
            </Field>
            <Field label="Father's Name" error={errors.fatherName?.message}>
              <Input {...register('fatherName')} className={inp} />
            </Field>
            <Field label="Mother's Name" error={errors.motherName?.message}>
              <Input {...register('motherName')} className={inp} />
            </Field>
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <Input {...register('dateOfBirth')} type="date" className={inp} />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <Input {...register('gender')} placeholder="Male / Female / Other" className={inp} />
            </Field>
          </div>

          <Field label="Present Address" required error={errors.presentAddress?.message} hint="Include city, state and PIN code">
            <Textarea {...register('presentAddress')} placeholder="House No, Street, Area, City, State — PIN Code" className={ta} rows={3} />
          </Field>
        </Section>

        {/* ── 2: Languages ── */}
        <Section id="sec-2" num={2} icon={<Languages size={14} />} title="Languages Known">
          <Field label="Languages" required error={errors.languagesKnown?.message} hint="Comma-separated — e.g. English, Hindi, Gujarati">
            <Input {...register('languagesKnown')} placeholder="English, Hindi, Gujarati…" className={inp} />
          </Field>
        </Section>

        {/* ── 3: Education ── */}
        <Section id="sec-3" num={3} icon={<GraduationCap size={14} />} title="Education Information">
          {/* SPI Table */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Semester Performance Index (SPI)
              <span className="ml-2 normal-case font-normal text-zinc-400">{spiRequiredUpto >= 1 ? `SGPA is required up to two semesters before your current one (Sem 1–${spiRequiredUpto}).` : 'SGPA is optional at your current semester — fill whatever results are declared.'}</span>
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 bg-zinc-50/60 border border-zinc-200 rounded-xl">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                const hasErr = !!errors[`sem${s}` as keyof typeof errors];
                return (
                  <div key={s} className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-zinc-600 mb-1.5 text-center">
                      Sem {s}{s <= spiRequiredUpto ? <span className="text-red-500 ml-0.5">*</span> : null}
                    </p>
                    <input
                      {...register(`sem${s}` as any)}
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder={s <= spiRequiredUpto ? 'req' : '—'}
                      className={`w-full text-center text-sm font-mono h-9 rounded-lg border px-1 outline-none transition-all bg-white ${
                        hasErr
                          ? 'border-red-400 bg-red-50 focus:ring-1 focus:ring-red-300'
                          : 'border-zinc-200 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].some((s) => errors[`sem${s}` as keyof typeof errors]) ? (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle size={11} className="flex-shrink-0" />
                Enter SGPA up to two semesters before your current one (Sem 1–{spiRequiredUpto}).
              </p>
            ) : null}
          </div>

          {/* Academic stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
            <Field label="Overall CGPA" required error={errors.cgpa?.message} hint="0 – 10">
              <Input {...register('cgpa')} type="number" step="0.01" min="0" max="10" placeholder="0.00" className={`${inp} text-center font-mono`} />
            </Field>
            <Field label="Live Backlogs" required error={errors.backlogs?.message} hint="0 if none">
              <Input {...register('backlogs')} type="number" min="0" placeholder="0" className={`${inp} text-center font-mono`} />
            </Field>
            <Field label="Current Semester" required error={errors.semester?.message}>
              <Input {...register('semester')} type="number" min="1" max="8" placeholder="1–8" className={`${inp} text-center font-mono`} />
            </Field>
            <Field label="Attendance %" required error={errors.attendance?.message} hint="Previous sem">
              <Input {...register('attendance')} type="number" min="0" max="100" placeholder="75" className={`${inp} text-center font-mono`} />
            </Field>
          </div>
        </Section>

        {/* ── 4: Tasks ── */}
        <Section id="sec-4" num={4} icon={<Briefcase size={14} />} title="Relevant Tasks / Experience">
          <Field label="Tasks You Can Perform" required error={errors.tasksCanPerform?.message}
            hint="Describe skills, projects, or experience relevant to this role (min. 20 characters)">
            <Textarea {...register('tasksCanPerform')}
              placeholder="List tasks you can do or have done in work that might relate to this position…"
              className={ta} rows={5} />
          </Field>
        </Section>

        {/* ── 5: Support ── */}
        <Section id="sec-5" num={5} icon={<MessageSquare size={14} />} title="Support Information">
          <Field label="Additional Statement" error={errors.supportInformation?.message} hint="Optional">
            <Textarea {...register('supportInformation')}
              placeholder="Any information you wish to provide in support of your application…"
              className={ta} rows={3} />
          </Field>
        </Section>

        {/* ── 6: References ── */}
        <Section id="sec-6" num={6} icon={<Users2 size={14} />} title="References">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {([1, 2] as const).map((num) => (
              <div key={num} className="space-y-4 p-5 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Reference {num}</p>
                <Field label="Full Name" error={(errors as any)[`reference${num}Name`]?.message}>
                  <Input {...register(`reference${num}Name` as any)} placeholder="Prof. / Dr. Full Name" className={inp} />
                </Field>
                <Field label="Designation" error={(errors as any)[`reference${num}Designation`]?.message}>
                  <Input {...register(`reference${num}Designation` as any)} placeholder="HOD, Faculty, Industry Mentor…" className={inp} />
                </Field>
                <Field label="Contact" error={(errors as any)[`reference${num}Contact`]?.message}>
                  <Input {...register(`reference${num}Contact` as any)} placeholder="+91 XXXXXXXXXX" className={inp} />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 7: Declaration ── */}
        <Section id="sec-7" num={7} icon={<ShieldCheck size={14} />} title="Declaration">
          <div className="flex gap-2.5 p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg">
            <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              I hereby declare that the information provided by me is true and accurate to the best of my knowledge.
              Any false or misleading information may result in immediate disqualification from the internship program
              and disciplinary action as per Parul University norms.
            </p>
          </div>
          <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-lg border border-zinc-200">
            <Checkbox
              id="declaration"
              onCheckedChange={(c) => setValue('declarationAccepted', !!c)}
              className="mt-0.5 border-zinc-300 data-[state=checked]:bg-zinc-800 data-[state=checked]:border-zinc-800"
            />
            <Label htmlFor="declaration" className="text-sm text-zinc-700 cursor-pointer leading-relaxed">
              I agree to the above declaration and confirm all information is accurate.
              <span className="text-red-500 ml-0.5">*</span>
            </Label>
          </div>
          {errors.declarationAccepted && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={11} />{errors.declarationAccepted.message}
            </p>
          )}
        </Section>

        {/* ── 8: Signature ── */}
        <Section id="sec-8" num={8} icon={<PenLine size={14} />} title="Digital Signature">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
            <Field label="Signature (Type Full Name)" required error={errors.digitalSignature?.message}
              hint="Acts as your official digital signature">
              <Input
                {...register('digitalSignature')}
                placeholder="Type your full name…"
                className={`${inp} italic text-base text-zinc-700 font-medium placeholder:not-italic placeholder:text-zinc-300 placeholder:text-sm`}
              />
            </Field>
            <div className="text-sm text-zinc-500 space-y-1 pb-0.5">
              <p><span className="font-medium text-zinc-700">Place:</span> Vadodara, Gujarat</p>
              <p><span className="font-medium text-zinc-700">Date:</span> {displayDate}</p>
            </div>
          </div>
        </Section>

        {/* ── Action Bar ── */}
        <div>
          <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-center gap-2.5 w-full">
            <Button type="button" variant="ghost" onClick={() => setResetDialog(true)}
              className="w-full sm:w-auto h-9 gap-2 text-zinc-500 hover:text-zinc-700 text-sm order-3 sm:order-1" disabled={submitting}>
              <RotateCcw size={14} />Reset
            </Button>
            <Button type="submit"
              className="w-full sm:flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 font-semibold gap-2 text-white order-1 sm:order-3 text-sm"
              disabled={submitting}>
              {submitting ? <><Loader2 size={15} className="animate-spin" />Submitting…</> : <><Send size={15} />Submit Application</>}
            </Button>
          </div>
        </div>

      </form>

      {/* Reset Dialog */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RotateCcw size={16} className="text-amber-500" /> Reset Form?
            </DialogTitle>
            <DialogDescription className="text-sm">
              This clears all entries and restores profile defaults. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-1">
            <Button variant="outline" onClick={() => setResetDialog(false)} className="border-zinc-200 h-9">Cancel</Button>
            <Button variant="destructive" onClick={handleReset} className="h-9">Yes, Reset</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationForm;
