import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(data.email.trim());
      setSent(true);
    } catch {
      // Backend returns a generic success; only network/unexpected errors land here.
      setError('Something went wrong. Please try again in a moment.');
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
      {/* Mobile Branding */}
      <div className="flex lg:hidden flex-col items-center mb-6">
        <img src="/pu-logo.png" alt="Parul University" className="h-14 object-contain" />
      </div>

      {sent ? (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Check your email</h2>
          <p className="text-zinc-500 text-sm mt-2 font-medium leading-relaxed">
            If an account exists for <span className="font-semibold text-zinc-700">{form.getValues('email')}</span>,
            we've sent a temporary password to it. Sign in with that temporary password, then set a new one
            from your profile.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 h-12 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl transition-all duration-300 shadow-sm hover:-translate-y-0.5"
          >
            <ArrowLeft size={18} /> Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 hidden lg:inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <KeyRound size={22} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Forgot your password?</h2>
            <p className="text-zinc-500 text-sm mt-1.5 font-medium leading-relaxed">
              Enter your registered email and we'll send you a temporary password to sign in with.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-700 font-semibold text-xs uppercase tracking-wider">
                      Registered Email
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors">
                          <Mail size={18} />
                        </div>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          {...field}
                          disabled={isLoading}
                          className="h-11 pl-10 border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl shadow-sm bg-zinc-50"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl transition-all duration-300 shadow-sm hover:-translate-y-0.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send temporary password'
                )}
              </Button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-700 transition-colors pt-1"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </form>
          </Form>
        </>
      )}
    </motion.div>
  );
};

export default ForgotPassword;
