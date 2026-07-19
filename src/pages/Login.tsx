import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Loader2, Eye, EyeOff, AlertCircle, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  enrollmentNumber: z.string().min(1, 'Enrollment number is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { enrollmentNumber: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const user = await authService.login(data.enrollmentNumber || '', data.password || '');
      login(user);
      navigate('/');
    } catch {
      setLoginError('Invalid enrollment number or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8 border border-zinc-100"
    >
      {/* Mobile Branding (Hidden on large screens) */}
      <div className="flex lg:hidden flex-col items-center mb-6">
        <img src="/pu-logo.png" alt="Parul University" className="h-14 object-contain" />
      </div>

      <div className="mb-8 text-center lg:text-left">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Sign In</h2>
        <p className="text-zinc-500 text-sm mt-1.5 font-medium">Continue to your internship portal account</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Enrollment Number */}
          <FormField
            control={form.control}
            name="enrollmentNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-700 font-semibold text-xs uppercase tracking-wider">Enrollment Number</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors">
                      <UserIcon size={18} />
                    </div>
                    <Input
                      placeholder="e.g. 2403031570042"
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

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-zinc-700 font-semibold text-xs uppercase tracking-wider">Password</FormLabel>
                  <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                      className="h-11 pl-10 pr-11 border-zinc-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl shadow-sm bg-zinc-50"
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

          {/* Remember me */}
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-1">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                    className="w-5 h-5 rounded-md border-zinc-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shadow-sm transition-colors"
                  />
                </FormControl>
                <FormLabel className="font-medium text-sm text-zinc-600 cursor-pointer select-none">
                  Keep me signed in
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Error */}
          {loginError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-3 p-3.5 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100"
            >
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="font-medium">{loginError}</span>
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
                Signing in...
              </>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Continue
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>

          {/* Create account link */}
          <p className="text-center text-sm text-zinc-500 font-medium pt-1">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Create Account
            </Link>
          </p>
        </form>
      </Form>

    </motion.div>
  );
};

export default Login;
