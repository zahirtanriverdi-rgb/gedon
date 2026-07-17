'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// Reached from the reset link emailed by POST /api/auth/forgot-password (admin or vendor —
// the backend endpoint is role-agnostic, so this single page serves both flows). The token
// itself is opaque here; the server is the only place that validates/consumes it.
export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('miscWidgets.resetPassword.missingToken'));
      return;
    }
    if (password.length < 6) {
      setError(t('miscWidgets.resetPassword.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('miscWidgets.resetPassword.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('miscWidgets.resetPassword.genericError'));
        return;
      }
      setRole(data.role || null);
      setSuccess(true);
    } catch (e: any) {
      setError(t('miscWidgets.resetPassword.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const loginPath = role === 'vendor' ? '/vendor/login' : '/admin/login';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 text-center">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{t('miscWidgets.resetPassword.title')}</h2>
          <p className="text-xs text-slate-400">{t('miscWidgets.resetPassword.subtitle')}</p>
        </div>
        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-700 font-medium">{t('miscWidgets.resetPassword.successMessage')}</p>
              <Link
                href={loginPath}
                className="inline-block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm text-sm transition-all"
              >
                {t('miscWidgets.resetPassword.goToLogin')}
              </Link>
            </div>
          ) : !token ? (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
              {t('miscWidgets.resetPassword.missingToken')}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  {t('miscWidgets.resetPassword.newPasswordLabel')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm text-slate-800 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  {t('miscWidgets.resetPassword.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm text-slate-800 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm text-sm transition-all disabled:opacity-70 flex justify-center mt-2"
              >
                {isLoading ? t('miscWidgets.resetPassword.saving') : t('miscWidgets.resetPassword.saveButton')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}