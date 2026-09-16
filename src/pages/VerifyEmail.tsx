import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, MailCheck, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

type State = 'working' | 'done' | 'failed';

/**
 * Consumes the emailed verification link.
 *
 * Runs once on mount — React 18 StrictMode double-invokes effects in
 * development, and the token is single-use, so a second call would report
 * "already used" on a link that had just succeeded.
 */
const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<State>(token ? 'working' : 'failed');
  const [error, setError] = useState<string | null>(token ? null : 'This link is incomplete.');
  const [resendTo, setResendTo] = useState('');
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authService
      .verifyEmail(token)
      .then(() => setState('done'))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not verify this link.');
        setState('failed');
      });
  }, [token]);

  const resend = async () => {
    try {
      await authService.resendVerification(resendTo.trim());
      setResent(true);
    } catch {
      setResent(true); // deliberately indistinguishable
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
      {state === 'working' && (
        <>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1e5bce]" />
          <p className="text-sm text-slate-500">Verifying your email…</p>
        </>
      )}

      {state === 'done' && (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Email verified</h1>
          <p className="text-sm text-slate-500">Your account is ready. Sign in to continue.</p>
          <Link to="/login">
            <Button className="h-11 w-full rounded-xl bg-[#1e5bce] text-sm font-semibold hover:bg-blue-700">
              Go to sign in
            </Button>
          </Link>
        </>
      )}

      {state === 'failed' && (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Could not verify</h1>
          <p className="text-sm text-slate-500">{error}</p>

          {resent ? (
            <p className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <MailCheck className="h-4 w-4" /> If that account needs verification, a new link is on its way.
            </p>
          ) : (
            <div className="space-y-2 text-left">
              <label htmlFor="resend" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Send a new link
              </label>
              <Input
                id="resend"
                type="email"
                value={resendTo}
                onChange={(e) => setResendTo(e.target.value)}
                placeholder="your.name@paruluniversity.ac.in"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm focus-visible:bg-white"
              />
              <Button
                onClick={resend}
                disabled={!resendTo.includes('@')}
                className="h-11 w-full rounded-xl bg-[#1e5bce] text-sm font-semibold hover:bg-blue-700"
              >
                Resend verification link
              </Button>
            </div>
          )}
        </>
      )}

      <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </motion.div>
  );
};

export default VerifyEmail;
