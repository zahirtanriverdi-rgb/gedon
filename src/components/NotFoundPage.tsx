import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <>
      <Helmet>
        <title>{`${t('notFoundPage.title')} | GədəkGörək`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4 py-24">
        <h1 className="text-4xl font-black text-brand-primary">404</h1>
        <p className="text-lg font-bold text-slate-700">{t('notFoundPage.heading')}</p>
        <p className="text-sm text-slate-500 max-w-md">{t('notFoundPage.description')}</p>
        <Link
          to="/"
          className="mt-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-5 rounded-full transition-colors text-sm shadow-sm"
        >
          {t('notFoundPage.backHome')}
        </Link>
      </div>
    </>
  );
}
