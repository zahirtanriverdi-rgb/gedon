import React, { useState } from 'react';
import { User } from '../types';
import { Lock, Mail } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AdminLoginProps {
  onLogin: (user: User, token: string) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // "Forgot password" is a separate mini-view swapped in over the same card, rather than a
  // modal — keeps this screen's footprint (and the OperatorLogin twin below) minimal.
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        // 401 gets the localized message — the server's `error` string is Azerbaijani-only,
        // which looked broken on the EN/RU login screens.
        setError(response.status === 401 ? t('miscWidgets.adminLogin.invalidCredentials') : (data.error || t('miscWidgets.adminLogin.invalidCredentials')));
        return;
      }
      onLogin(data.user, data.token);
    } catch (e: any) {
      setError(t('miscWidgets.adminLogin.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      });
      const data = await response.json();
      if (!response.ok) {
        setForgotError(data.error || t('miscWidgets.adminLogin.connectionError'));
        return;
      }
      setForgotMessage(t('miscWidgets.forgotPassword.successMessage'));
    } catch (e: any) {
      setForgotError(t('miscWidgets.adminLogin.connectionError'));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 text-center">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{t('miscWidgets.adminLogin.title')}</h2>
          <p className="text-xs text-slate-400">
            {showForgotPassword ? t('miscWidgets.forgotPassword.subtitle') : t('miscWidgets.adminLogin.subtitle')}
          </p>
        </div>
        <div className="p-6">
          {showForgotPassword ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              {forgotError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
                  {forgotError}
                </div>
              )}
              {forgotMessage ? (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-xs font-medium border border-emerald-100">
                  {forgotMessage}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {t('miscWidgets.adminLogin.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm text-slate-800 font-medium"
                    placeholder={t('miscWidgets.adminLogin.emailPlaceholder')}
                    required
                  />
                </div>
              )}
              {!forgotMessage && (
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm text-sm transition-all disabled:opacity-70 flex justify-center mt-2"
                >
                  {forgotLoading ? t('miscWidgets.forgotPassword.sending') : t('miscWidgets.forgotPassword.sendButton')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotIdentifier('');
                  setForgotMessage('');
                  setForgotError('');
                }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {t('miscWidgets.forgotPassword.backToLogin')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {t('miscWidgets.adminLogin.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm text-slate-800 font-medium"
                  placeholder={t('miscWidgets.adminLogin.emailPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  {t('miscWidgets.adminLogin.passwordLabel')}
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
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm text-sm transition-all disabled:opacity-70 flex justify-center mt-2"
              >
                {isLoading ? t('miscWidgets.adminLogin.loggingIn') : t('miscWidgets.adminLogin.login')}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                {t('miscWidgets.forgotPassword.link')}
              </button>
            </form>
          )}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="text-[10px] text-slate-400 text-center">
              {t('miscWidgets.adminLogin.footerNote')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
