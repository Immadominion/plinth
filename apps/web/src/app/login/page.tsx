'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

type Step = 'form' | 'sent';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await api.auth.magicLink(email.trim());
      setStep('sent');
    } catch (err: any) {
      setError(err.message ?? 'No account found for this email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Plinth</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {step === 'form' ? 'Enter your email to log in' : 'Check your inbox'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Business email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@acme.ng"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? 'Sending…' : 'Send login link →'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mx-auto">
                <Mail size={22} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Login link sent</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                We sent a link to <strong>{email}</strong>. Click it to log in — it expires in 7 days.
              </p>
              <button
                onClick={() => { setStep('form'); setEmail(''); }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-5">
          Don't have an account?{' '}
          <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline">Apply for access</Link>
        </p>
      </div>
    </div>
  );
}
