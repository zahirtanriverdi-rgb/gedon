'use client';
import React, { useState } from 'react';
import { Mail, ShieldCheck, CheckCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface EmailVerificationCardProps {
  email: string;
  verified: boolean;
  authToken?: string | null;
  onVerified?: (updatedUser: any) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Shared by AdminPortal's own-account settings and VendorPortal's ProfileTab — lets the logged-in
// user prove they control their account's current email (POST /api/auth/send-email-verification +
// /verify-email) before the forgot-password flow will ever mail a reset link to it. Keyed by the
// parent on `email` so it fully remounts (fresh unverified state) whenever the address changes.
export default function EmailVerificationCard({ email, verified, authToken, onVerified, onShowNotification }: EmailVerificationCardProps) {
  const { t } = useLanguage();
  // Mirrors the `verified` prop locally and flips it the moment verify-email succeeds, so the
  // badge/button update immediately even if the parent doesn't thread the updated user back down
  // (AdminPortal has no "sync my own profile" plumbing the way VendorPortal's onUserUpdated does).
  const [localVerified, setLocalVerified] = useState(verified);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const handleSendCode = async () => {
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-email-verification', { method: 'POST', headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setCodeSent(true);
      if (onShowNotification) onShowNotification(t('emailVerification.codeSent'), 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setCodeSent(false);
      setCode('');
      setLocalVerified(true);
      if (onVerified) onVerified(data.user);
      if (onShowNotification) onShowNotification(t('emailVerification.verifySuccess'), 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
        <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          {t('emailVerification.title')}
        </h2>
        <p className="text-emerald-100 text-xs mt-1 max-w-xl">
          {t('emailVerification.subtitle')}
        </p>
      </div>

      <div className="p-6 space-y-4 max-w-md">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{email}</span>
          </div>
          {localVerified ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md text-[10px] font-bold flex-shrink-0">
              <CheckCircle className="w-3 h-3" /> {t('emailVerification.verifiedBadge')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-md text-[10px] font-bold flex-shrink-0">
              {t('emailVerification.unverifiedBadge')}
            </span>
          )}
        </div>

        {!localVerified && (
          codeSent ? (
            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('emailVerification.codeLabel')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tracking-widest font-mono"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={verifying}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
                >
                  {verifying ? t('emailVerification.verifying') : t('emailVerification.verifyButton')}
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleSendCode}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {t('emailVerification.resendCode')}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              disabled={sending}
              onClick={handleSendCode}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
            >
              {sending ? t('emailVerification.sending') : t('emailVerification.sendCodeButton')}
            </button>
          )
        )}
      </div>
    </div>
  );
}