'use client';
import React, { useState } from 'react';
import { MessageCircle, CheckCircle } from 'lucide-react';
import { DIAL_CODES, DEFAULT_DIAL_CODE, isoToFlagEmoji } from '../../data/dialCodes';
import { useLanguage } from '../../i18n/LanguageContext';

// Splits a stored "+994501234567" / "+994 50 123 45 67" style number into its dial code and
// national digits, matching the longest known dial code prefix first (e.g. so "+995..." isn't
// mistaken for "+99...").
function splitFullNumber(value: string): { dialCode: string; localNumber: string } {
  const compact = (value || '').replace(/\s+/g, '');
  const sorted = [...DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const match = sorted.find((c) => compact.startsWith(c.dialCode));
  if (match) {
    return { dialCode: match.dialCode, localNumber: compact.slice(match.dialCode.length) };
  }
  return { dialCode: DEFAULT_DIAL_CODE, localNumber: compact.replace(/^\+/, '') };
}

interface WhatsAppVerifyFieldProps {
  value: string;
  onChange: (fullNumber: string) => void;
  isVerified: boolean;
  onVerifiedChange: (verified: boolean) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Reusable "is this a real, live WhatsApp number" check — same captcha-gated /api/whatsapp/*
// flow used by the customer booking form (see TourDetailPage), extracted so vendors can prove
// their guide-contact number actually works when they attach it to a tour.
export function WhatsAppVerifyField({ value, onChange, isVerified, onVerifiedChange, onShowNotification }: WhatsAppVerifyFieldProps) {
  const { t } = useLanguage();
  const { dialCode, localNumber } = splitFullNumber(value);

  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const fetchCaptchaChallenge = async () => {
    setCaptchaAnswer('');
    try {
      const res = await fetch('/api/whatsapp/captcha');
      const data = await res.json();
      setCaptchaId(data.id);
      setCaptchaQuestion(data.question);
    } catch {
      setCaptchaId(null);
      setCaptchaQuestion(null);
    }
  };

  React.useEffect(() => {
    if (!isVerified && !captchaQuestion) fetchCaptchaChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerified]);

  const setDialCode = (code: string) => onChange(`${code}${localNumber}`);
  const setLocalNumber = (digits: string) => onChange(`${dialCode}${digits}`);

  const handleVerify = async () => {
    const nationalDigits = localNumber.replace(/\D/g, '').replace(/^0+/, '');
    const fullPhone = `${dialCode}${nationalDigits}`;
    if (fullPhone.replace(/\D/g, '').length < 7) {
      onShowNotification?.(t('tourDetailPage.booking.validation.phoneInvalid'), 'warning');
      return;
    }
    if (!captchaAnswer.trim()) {
      onShowNotification?.(t('tourDetailPage.booking.validation.captchaRequired'), 'warning');
      return;
    }

    setIsChecking(true);
    try {
      const res = await fetch('/api/whatsapp/verify-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, captchaId, captchaAnswer: Number(captchaAnswer) }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.hasWhatsapp) {
        onVerifiedChange(true);
        onShowNotification?.(t('tourDetailPage.booking.validation.otpVerified'), 'success');
        return;
      }

      let message = data.error || t('tourDetailPage.booking.validation.otpSendFailed');
      if (res.status === 422 && data.hasWhatsapp === false) {
        message = t('tourDetailPage.booking.validation.otpNoWhatsapp');
      } else if (data.captchaFailed) {
        message = t('tourDetailPage.booking.validation.captchaWrong');
      } else if (res.status === 429) {
        message = t('tourDetailPage.booking.validation.otpRateLimited');
      } else if (res.status === 503) {
        message = t('tourDetailPage.booking.validation.otpServiceUnavailable');
      }
      onVerifiedChange(false);
      onShowNotification?.(message, 'error');
      fetchCaptchaChallenge();
    } catch {
      onVerifiedChange(false);
      onShowNotification?.(t('tourDetailPage.booking.validation.otpServiceUnavailable'), 'error');
      fetchCaptchaChallenge();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        <select
          value={dialCode}
          onChange={(e) => setDialCode(e.target.value)}
          disabled={isVerified}
          className="w-[6.5rem] shrink-0 px-1.5 py-2 text-xs border border-slate-250 bg-slate-50 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {DIAL_CODES.map((c) => (
            <option key={c.iso2} value={c.dialCode}>
              {isoToFlagEmoji(c.iso2)} {c.dialCode}
            </option>
          ))}
        </select>
        <input
          type="tel"
          required
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value.replace(/[^0-9]/g, ''))}
          disabled={isVerified}
          placeholder="50 123 45 67"
          className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-250 bg-slate-50 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      {!isVerified ? (
        <div className="space-y-2">
          {captchaQuestion && (
            <div className="flex items-center gap-2.5">
              <label className="text-[11px] text-slate-500 leading-normal shrink-0">
                {t('tourDetailPage.otp.captchaPrompt', { question: captchaQuestion })}
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="?"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^0-9-]/g, ''))}
                disabled={isChecking}
                className="w-16 px-2 py-1.5 text-xs text-center font-bold border border-slate-200 bg-white rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleVerify}
            disabled={isChecking}
            className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 font-extrabold text-[11px] rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isChecking ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5 fill-current text-white" />
            )}
            {isChecking ? t('tourDetailPage.otp.sendingButton') : t('tourDetailPage.otp.sendButton')}
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{t('tourDetailPage.otp.verifiedLabel', { phone: `${dialCode}${localNumber}` })}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onVerifiedChange(false);
              fetchCaptchaChallenge();
            }}
            className="text-[10px] text-slate-400 hover:text-red-500 underline cursor-pointer"
          >
            {t('tourDetailPage.otp.changeNumber')}
          </button>
        </div>
      )}
    </div>
  );
}