import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services/authService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/\d/, 'Include at least one number'),
    confirm: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

/**
 * Consumes a single-use reset link.
 *
 * The token arrives in the query string and is never stored client-side — it is
 * posted once and the server clears it in the same write that sets the new
 * password, so a replayed link fails.
 */
const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">This link is incomplete</h1>
        <p className="text-sm text-slate-500">
          Open the link exactly as it appears in your email, or request a new one.
        </p>
        <Link to="/forgot-password" className="inline-flex items-center gap-2 text-sm font-medium text-[#1e5bce]">
          <ArrowLeft className="h-4 w-4" /> Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Password updated</h1>
        <p className="text-sm text-slate-500">Taking you to the sign-in page…</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
          <KeyRound className="h-6 w-6 text-[#1e5bce]" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="text-sm text-slate-500">This link can be used once and expires shortly.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  New password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pr-10 text-sm focus-visible:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Confirm password
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm focus-visible:bg-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl bg-[#1e5bce] text-sm font-semibold hover:bg-blue-700">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
          </Button>
        </form>
      </Form>

      <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </motion.div>
  );
};

export default ResetPassword;
