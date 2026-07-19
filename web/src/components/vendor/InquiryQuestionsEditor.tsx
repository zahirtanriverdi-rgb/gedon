'use client';
import React from 'react';
import { InquiryQuestion } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';

interface InquiryQuestionsEditorProps {
  questions: InquiryQuestion[];
  onChange: (questions: InquiryQuestion[]) => void;
}

// Tur üzrə əlavə sorğu sualları editoru (TourForm addım 3). Ad/WhatsApp/2 standart sual
// həmişə soruşulur — bura yalnız vendorun bu tura xas əlavə sualları gedir.
export function InquiryQuestionsEditor({ questions, onChange }: InquiryQuestionsEditorProps) {
  const { t } = useLanguage();

  const update = (idx: number, patch: Partial<InquiryQuestion>) =>
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  return (
    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <label className="block text-[11px] font-bold text-indigo-900 tracking-wide">
            ❓ {t('inquiriesPanel.questionsEditor.title')}
          </label>
          <p className="text-[10px] text-indigo-700/70 mt-0.5">{t('inquiriesPanel.questionsEditor.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...questions,
              { id: `q-${Date.now()}`, question: '', options: ['', ''], allowOther: true },
            ])
          }
          className="text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {t('inquiriesPanel.questionsEditor.addQuestion')}
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-[11px] text-indigo-400 text-center py-1">{t('inquiriesPanel.questionsEditor.empty')}</p>
      )}

      {questions.map((q, qi) => (
        <div key={q.id} className="bg-white border border-indigo-100 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={q.question}
              onChange={(e) => update(qi, { question: e.target.value })}
              placeholder={t('inquiriesPanel.questionsEditor.questionPlaceholder')}
              className="flex-1 min-w-0 px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => onChange(questions.filter((_, i) => i !== qi))}
              className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label={t('inquiriesPanel.questionsEditor.removeQuestion')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 pl-1">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => update(qi, { options: q.options.map((o, i) => (i === oi ? e.target.value : o)) })}
                  placeholder={t('inquiriesPanel.questionsEditor.optionPlaceholder', { index: oi + 1 })}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400"
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => update(qi, { options: q.options.filter((_, i) => i !== oi) })}
                    className="text-slate-300 hover:text-red-500 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => update(qi, { options: [...q.options, ''] })}
                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                + {t('inquiriesPanel.questionsEditor.addOption')}
              </button>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={q.allowOther !== false}
                  onChange={(e) => update(qi, { allowOther: e.target.checked })}
                  className="w-3.5 h-3.5 accent-indigo-600"
                />
                {t('inquiriesPanel.questionsEditor.allowOther')}
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
