'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type State = 'loading' | 'success' | 'error';

export default function ClaimPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [error, setError] = useState('');
  const isLogin = params.get('mode') === 'login';

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('No claim token found in this link.');
      setState('error');
      return;
    }

    api.auth.claim(token)
      .then((res) => {
        localStorage.setItem('nomba_api_key', res.api_key);
        localStorage.setItem('nomba_tenant_id', res.tenant_id);
        setState('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      })
      .catch((err) => {
        setError(err.message ?? 'This link is invalid or has already been used.');
        setState('error');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Plinth</span>
        </div>

        {state === 'loading' && (
          <>
            <Loader2 size={36} className="mx-auto text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {isLogin ? 'Signing you in…' : 'Claiming your account…'}
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {isLogin ? 'Welcome back!' : 'Account claimed!'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Taking you to your dashboard…</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto">
              <XCircle size={28} className="text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Link invalid</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">{error}</p>
            <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
              Request a new link →
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
