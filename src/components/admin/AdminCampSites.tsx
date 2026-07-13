import React, { useEffect, useState } from 'react';
import { AdminCampSite, CampContributor } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Tent, Check, X, Trash2, MapPin, Gift, Save, Phone, Power } from 'lucide-react';

type TabId = 'pending' | 'approved' | 'rejected' | 'contributors';

interface AdminCampSitesProps {
  authToken?: string | null;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

// Admin "Kamp yerləri" section: moderation queue for community camp-site submissions,
// contributor points leaderboard with reward redemption, and the server-persisted points
// settings (unlike the localStorage-backed pcConfig, these live in the DB because the
// server stamps points at approval time).
export default function AdminCampSites({ authToken, onShowNotification }: AdminCampSitesProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [campSites, setCampSites] = useState<AdminCampSite[]>([]);
  const [contributors, setContributors] = useState<CampContributor[]>([]);
  const [rejectingSite, setRejectingSite] = useState<AdminCampSite | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pointsPerSite, setPointsPerSite] = useState<number | ''>('');
  const [threshold, setThreshold] = useState<number | ''>('');
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(true);
  const [togglingFeature, setTogglingFeature] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const loadCampSites = async () => {
    try {
      const res = await fetch('/api/admin/camp-sites', { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCampSites(Array.isArray(data.campSites) ? data.campSites : []);
    } catch {
      onShowNotification?.(t('adminPortal.campSites.actionError'), 'error');
    }
  };

  const loadContributors = async () => {
    try {
      const res = await fetch('/api/admin/camp-contributors', { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContributors(Array.isArray(data.contributors) ? data.contributors : []);
    } catch {
      onShowNotification?.(t('adminPortal.campSites.actionError'), 'error');
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPointsPerSite(Number(data.campPointsPerSite) || 10);
      setThreshold(Number(data.campRewardThreshold) || 100);
      setFeatureEnabled(data.campSitesEnabled !== false);
    } catch {
      // Settings card just stays empty — save is still possible after a manual entry.
    }
  };

  useEffect(() => {
    loadCampSites();
    loadContributors();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const handleApprove = async (site: AdminCampSite) => {
    setBusyId(site.id);
    try {
      const res = await fetch(`/api/admin/camp-sites/${site.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) throw new Error();
      onShowNotification?.(t('adminPortal.campSites.approvedNotification'), 'success');
      await Promise.all([loadCampSites(), loadContributors()]);
    } catch {
      onShowNotification?.(t('adminPortal.campSites.actionError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingSite || !rejectReason.trim()) return;
    setBusyId(rejectingSite.id);
    try {
      const res = await fetch(`/api/admin/camp-sites/${rejectingSite.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'rejected', rejectionReason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error();
      onShowNotification?.(t('adminPortal.campSites.rejectedNotification'), 'info');
      setRejectingSite(null);
      setRejectReason('');
      await Promise.all([loadCampSites(), loadContributors()]);
    } catch {
      onShowNotification?.(t('adminPortal.campSites.actionError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (site: AdminCampSite) => {
    if (!window.confirm(t('adminPortal.campSites.deleteConfirm'))) return;
    setBusyId(site.id);
    try {
      const res = await fetch(`/api/admin/camp-sites/${site.id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error();
      onShowNotification?.(t('adminPortal.campSites.deletedNotification'), 'info');
      await Promise.all([loadCampSites(), loadContributors()]);
    } catch {
      onShowNotification?.(t('adminPortal.campSites.actionError'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRedeem = async (contributor: CampContributor) => {
    const fullName = `${contributor.submitterName} ${contributor.submitterSurname}`.trim();
    if (!window.confirm(t('adminPortal.campSites.redeemConfirm', { name: fullName }))) return;
    try {
      const res = await fetch('/api/admin/camp-rewards/redeem', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ phoneNormalized: contributor.phoneNormalized }),
      });
      if (!res.ok) throw new Error();
      onShowNotification?.(t('adminPortal.campSites.redeemedNotification'), 'success');
      await loadContributors();
    } catch {
      onShowNotification?.(t('adminPortal.campSites.actionError'), 'error');
    }
  };

  // The on/off switch saves immediately (unlike the number inputs' explicit Save button):
  // an admin flipping visibility expects it to take effect right away.
  const handleToggleFeature = async () => {
    const next = !featureEnabled;
    setTogglingFeature(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          campPointsPerSite: Number(pointsPerSite) || 10,
          campRewardThreshold: Number(threshold) || 100,
          campSitesEnabled: next,
        }),
      });
      if (!res.ok) throw new Error();
      setFeatureEnabled(next);
      onShowNotification?.(
        t(next ? 'adminPortal.campSites.featureEnabledNotification' : 'adminPortal.campSites.featureDisabledNotification'),
        next ? 'success' : 'info'
      );
    } catch {
      onShowNotification?.(t('adminPortal.campSites.settingsError'), 'error');
    } finally {
      setTogglingFeature(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ campPointsPerSite: Number(pointsPerSite), campRewardThreshold: Number(threshold) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onShowNotification?.(data.error || t('adminPortal.campSites.settingsError'), 'error');
        return;
      }
      onShowNotification?.(t('adminPortal.campSites.settingsSaved'), 'success');
    } catch {
      onShowNotification?.(t('adminPortal.campSites.settingsError'), 'error');
    }
  };

  const filtered = campSites.filter((s) =>
    activeTab === 'pending' ? s.status === 'pending_approval'
    : activeTab === 'approved' ? s.status === 'approved'
    : activeTab === 'rejected' ? s.status === 'rejected'
    : false
  );

  const pendingCount = campSites.filter((s) => s.status === 'pending_approval').length;

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'pending', label: t('adminPortal.campSites.tabPending'), count: pendingCount },
    { id: 'approved', label: t('adminPortal.campSites.tabApproved') },
    { id: 'rejected', label: t('adminPortal.campSites.tabRejected') },
    { id: 'contributors', label: t('adminPortal.campSites.tabContributors') },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wide">
              <Tent className="w-5 h-5 text-brand-accent" />
              {t('adminPortal.campSites.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">{t('adminPortal.campSites.description')}</p>
          </div>
          {/* Feature on/off switch: hides/shows the whole camp sites feature on the customer side */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-xs font-black ${featureEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                {t(featureEnabled ? 'adminPortal.campSites.featureOn' : 'adminPortal.campSites.featureOff')}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold max-w-[220px]">
                {t('adminPortal.campSites.featureToggleHint')}
              </div>
            </div>
            <button
              onClick={handleToggleFeature}
              disabled={togglingFeature}
              role="switch"
              aria-checked={featureEnabled}
              title={t('adminPortal.campSites.featureToggleHint')}
              className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer disabled:opacity-60 shrink-0 ${
                featureEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center transition-all ${
                  featureEnabled ? 'left-7' : 'left-1'
                }`}
              >
                <Power className={`w-3.5 h-3.5 ${featureEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 bg-brand-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Camp site cards */}
        {activeTab !== 'contributors' && (
          filtered.length === 0 ? (
            <p className="text-sm text-slate-400 font-semibold text-center py-8">{t('adminPortal.campSites.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
              {filtered.map((site) => (
                <div key={site.id} className="border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-slate-800 text-sm">{site.name}</h3>
                    {site.status === 'approved' && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full shrink-0">
                        {t('adminPortal.campSites.pointsAwarded', { points: site.pointsAwarded })}
                      </span>
                    )}
                  </div>
                  {site.photos.length > 0 && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto">
                      {site.photos.map((photo, i) => (
                        <img key={i} src={photo} alt="" className="w-24 h-18 object-cover rounded-lg border border-slate-200 shrink-0" />
                      ))}
                    </div>
                  )}
                  {site.description && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed max-h-20 overflow-y-auto">{site.description}</p>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p><span className="font-bold">{t('adminPortal.campSites.submitter')}:</span> {site.submitterName} {site.submitterSurname}</p>
                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {site.submitterPhone}</p>
                    <p className="flex items-center gap-1.5">
                      <span className="font-bold">{t('adminPortal.campSites.coordinates')}:</span> {site.lat.toFixed(5)}, {site.lon.toFixed(5)}
                      <a
                        href={`https://www.google.com/maps?q=${site.lat},${site.lon}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-brand-cta hover:underline font-semibold"
                      >
                        <MapPin className="w-3 h-3" /> {t('adminPortal.campSites.openInMap')}
                      </a>
                    </p>
                    {site.status === 'rejected' && site.rejectionReason && (
                      <p className="text-rose-600 font-semibold">{t('adminPortal.campSites.rejectionReason', { reason: site.rejectionReason })}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    {site.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(site)}
                        disabled={busyId === site.id}
                        className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> {t('adminPortal.campSites.approve')}
                      </button>
                    )}
                    {site.status !== 'rejected' && (
                      <button
                        onClick={() => { setRejectingSite(site); setRejectReason(''); }}
                        disabled={busyId === site.id}
                        className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> {t('adminPortal.campSites.reject')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(site)}
                      disabled={busyId === site.id}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-600 text-xs font-bold px-4 py-2 rounded-full transition-colors cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t('adminPortal.campSites.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Contributors leaderboard */}
        {activeTab === 'contributors' && (
          contributors.length === 0 ? (
            <p className="text-sm text-slate-400 font-semibold text-center py-8">{t('adminPortal.campSites.empty')}</p>
          ) : (
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="py-2 pr-3 font-bold">{t('adminPortal.campSites.contributorName')}</th>
                    <th className="py-2 pr-3 font-bold">{t('adminPortal.campSites.phone')}</th>
                    <th className="py-2 pr-3 font-bold text-center">{t('adminPortal.campSites.contributorSites')}</th>
                    <th className="py-2 pr-3 font-bold text-center">{t('adminPortal.campSites.contributorPoints')}</th>
                    <th className="py-2 pr-3 font-bold text-center">{t('adminPortal.campSites.contributorRewards')}</th>
                    <th className="py-2 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((c) => (
                    <tr
                      key={c.phoneNormalized}
                      className={`border-b border-slate-100 ${c.rewardsAvailable > 0 ? 'bg-amber-50' : ''}`}
                    >
                      <td className="py-2.5 pr-3 font-bold text-slate-800">
                        {c.submitterName} {c.submitterSurname}
                        {c.rewardsAvailable > 0 && (
                          <span className="block text-[10px] text-amber-700 font-bold mt-0.5">
                            {t('adminPortal.campSites.rewardAvailableBadge')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">+{c.phoneNormalized}</td>
                      <td className="py-2.5 pr-3 text-center font-bold text-slate-700">{c.approvedCount}</td>
                      <td className="py-2.5 pr-3 text-center font-black text-brand-primary">{c.points}</td>
                      <td className="py-2.5 pr-3 text-center text-slate-600">{c.rewardsEarned} / {c.rewardsRedeemed}</td>
                      <td className="py-2.5 text-right">
                        {c.rewardsAvailable > 0 && (
                          <button
                            onClick={() => handleRedeem(c)}
                            className="inline-flex items-center gap-1 bg-brand-accent hover:opacity-90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-opacity cursor-pointer"
                          >
                            <Gift className="w-3 h-3" /> {t('adminPortal.campSites.markRedeemed')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Points settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{t('adminPortal.campSites.settingsTitle')}</h3>
        <p className="text-xs text-slate-500 mt-1.5 mb-4">{t('adminPortal.campSites.settingsHint')}</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">{t('adminPortal.campSites.pointsPerSiteLabel')}</label>
            <input
              type="number" min={1}
              value={pointsPerSite}
              onChange={(e) => setPointsPerSite(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-32 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">{t('adminPortal.campSites.thresholdLabel')}</label>
            <input
              type="number" min={1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-32 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {t('adminPortal.campSites.settingsSave')}
          </button>
        </div>
      </div>

      {/* Reject-with-reason modal */}
      {rejectingSite && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => setRejectingSite(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-800">{t('adminPortal.campSites.rejectTitle')}</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">{rejectingSite.name}</p>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">{t('adminPortal.campSites.rejectReasonLabel')}</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder={t('adminPortal.campSites.rejectReasonPlaceholder')}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectingSite(null)}
                className="text-xs font-bold px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                {t('adminPortal.campSites.rejectCancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || busyId === rejectingSite.id}
                className="text-xs font-bold px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-full transition-colors cursor-pointer"
              >
                {t('adminPortal.campSites.rejectConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
