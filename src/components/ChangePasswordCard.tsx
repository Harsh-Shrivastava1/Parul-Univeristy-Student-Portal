import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services/authService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current (or temporary) password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Must include a letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });

type FormValues = z.infer<typeof schema>;

const PasswordInput: React.FC<{
  id: string;
  placeholder: string;
  autoComplete: string;
  register: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  disabled?: boolean;
}> = ({ id, placeholder, autoComplete, register, disabled }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
        <Lock size={16} />
      </div>
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        {...register}
        className="h-11 pl-10 pr-11 border-zinc-200 bg-zinc-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-xl shadow-sm"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const ChangePasswordCard: React.FC = () => {
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setStatus(null);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      reset();
      setStatus({ type: 'success', message: 'Your password has been updated successfully.' });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not update password. Please try again.',
      });
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-blue-600" />
        <h3 className="font-semibold text-zinc-900">Change Password</h3>
      </div>
      <p className="text-sm text-zinc-500 mb-5">
        Enter your current password — or the temporary password from your email — and choose a new one.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md" noValidate>
        <div>
          <Label htmlFor="currentPassword" className="text-sm text-zinc-700 font-medium mb-1.5 block">
            Current / Temporary Password
          </Label>
          <PasswordInput
            id="currentPassword"
            placeholder="Enter current password"
            autoComplete="current-password"
            disabled={isSubmitting}
            register={register('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="text-xs text-red-600 mt-1">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="newPassword" className="text-sm text-zinc-700 font-medium mb-1.5 block">
            New Password
          </Label>
          <PasswordInput
            id="newPassword"
            placeholder="At least 8 characters, a letter & a number"
            autoComplete="new-password"
            disabled={isSubmitting}
            register={register('newPassword')}
          />
          {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-sm text-zinc-700 font-medium mb-1.5 block">
            Confirm New Password
          </Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter new password"
            autoComplete="new-password"
            disabled={isSubmitting}
            register={register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {status && (
          <div
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{status.message}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 gap-2 h-11 rounded-xl font-semibold"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </div>
  );
};

export default ChangePasswordCard;
