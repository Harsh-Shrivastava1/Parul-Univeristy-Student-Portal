import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { departmentService, type DepartmentOption } from '../services/departmentService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Mail,
  Hash,
  Building2,
  Layers,
  User as UserIcon,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

// Fallback list used only if the departments API is unavailable; the live
// Admin-owned list from GET /departments takes over when it loads.
const FALLBACK_DEPARTMENTS: DepartmentOption[] = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Computer Applications',
  'Business Administration',
  'Data Science',
].map((name) => ({ id: name, name }));

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Please enter your full name'),
    enrollmentNumber: z
      .string()
      .min(4, 'Enter a valid enrollment number')
      .regex(/^[A-Za-z0-9]+$/, 'Enrollment number must be alphanumeric'),
    department: z.string().min(1, 'Select your department'),
    semester: z.string().min(1, 'Select your semester'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// Shared input styling — identical to the Login page.
const inputClass =
  'h-11 pl-10 border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl shadow-sm bg-zinc-50';
const triggerClass =
  'h-11 pl-10 border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl shadow-sm bg-zinc-50 data-[placeholder]:text-zinc-400';
const iconWrap =
  'absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10';
const labelClass = 'text-zinc-700 font-semibold text-xs uppercase tracking-wider';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>(FALLBACK_DEPARTMENTS);

  // Populate the Department dropdown from the backend (Admin-owned list).
  useEffect(() => {
    let active = true;
    departmentService
      .getDepartments()
      .then((list) => {
        if (active && list.length) setDepartments(list);
      })
      .catch(() => {
        /* keep fallback list */
      });
    return () => {
      active = false;
    };
  }, []);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      enrollmentNumber: '',
      department: '',
      semester: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setRegisterError(null);
    try {
      const user = await authService.register({
        fullName: data.fullName,
        enrollmentNumber: data.enrollmentNumber,
        department: data.department,
        semester: Number(data.semester),
        email: data.email,
        password: data.password,
      });
      // Backend auto-issues the session on register → log straight into the app.
      login(user);
      toast.success('Account created successfully. Welcome to the portal!', { duration: 5000 });
      navigate('/');
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8 border border-zinc-100"
    >
      {/* Mobile Branding (Hidden on large screens) */}
      <div className="flex lg:hidden flex-col items-center mb-6">
        <img src="/pu-logo.png" alt="Parul University" className="h-14 object-contain" />
      </div>

      <div className="mb-6 text-center lg:text-left">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Create Account</h2>
        <p className="text-zinc-500 text-sm mt-1.5 font-medium">Register for your internship portal account</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Full Name</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className={iconWrap}>
                      <UserIcon size={18} />
                    </div>
                    <Input placeholder="As per university records" {...field} disabled={isLoading} className={inputClass} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Enrollment Number */}
          <FormField
            control={form.control}
            name="enrollmentNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Enrollment Number</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className={iconWrap}>
                      <Hash size={18} />
                    </div>
                    <Input placeholder="e.g. 2403031570042" {...field} disabled={isLoading} className={`${inputClass} font-mono`} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Department + Semester */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <div className="relative group">
                        <div className={iconWrap}>
                          <Building2 size={18} />
                        </div>
                        <SelectTrigger className={triggerClass}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </div>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Semester</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <div className="relative group">
                        <div className={iconWrap}>
                          <Layers size={18} />
                        </div>
                        <SelectTrigger className={triggerClass}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </div>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Email Address</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className={iconWrap}>
                      <Mail size={18} />
                    </div>
                    <Input type="email" placeholder="name@paruluniversity.ac.in" {...field} disabled={isLoading} className={inputClass} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password + Confirm Password */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Password</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className={iconWrap}>
                        <Lock size={18} />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className={iconWrap}>
                        <Lock size={18} />
                      </div>
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Error */}
          {registerError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-3 p-3.5 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100"
            >
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="font-medium">{registerError}</span>
            </motion.div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl transition-all duration-300 shadow-sm hover:-translate-y-0.5 group"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Create Account
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>

          {/* Sign in link */}
          <p className="text-center text-sm text-zinc-500 font-medium pt-1">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Sign In
            </Link>
          </p>
        </form>
      </Form>
    </motion.div>
  );
};

export default Register;
