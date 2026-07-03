import { useState, useEffect, FormEvent } from 'react';
import { User, Guide } from '../../types';
import { Plus, Trash, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface ProfileTabProps {
  currentUser: User;
  operatorToken?: string | null;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  onCancel: () => void;
}

function passwordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-slate-200' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const bands = [
    { label: 'Çox Zəif', color: 'bg-red-500' },
    { label: 'Zəif', color: 'bg-orange-500' },
    { label: 'Orta', color: 'bg-amber-500' },
    { label: 'Yaxşı', color: 'bg-lime-500' },
    { label: 'Güclü', color: 'bg-emerald-600' },
  ];
  return { score, ...bands[score] };
}

export function ProfileTab({ currentUser, operatorToken, onShowNotification, onCancel }: ProfileTabProps) {
  const [profileName, setProfileName] = useState(currentUser.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileCompanyName, setProfileCompanyName] = useState(currentUser.companyName || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar || '');
  const [profileAbout, setProfileAbout] = useState(currentUser.about || '');
  const [profileGuides, setProfileGuides] = useState<Guide[]>(currentUser.guides || []);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Security card state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setProfileName(currentUser.name || '');
    setProfileEmail(currentUser.email || '');
    setProfilePhone(currentUser.phone || '');
    setProfileCompanyName(currentUser.companyName || '');
    setProfileAvatar(currentUser.avatar || '');
    setProfileAbout(currentUser.about || '');
    setProfileGuides(currentUser.guides || []);
  }, [currentUser]);

  const strength = passwordStrength(newPassword);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(operatorToken ? { Authorization: `Bearer ${operatorToken}` } : {}),
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
          companyName: profileCompanyName,
          avatar: profileAvatar,
          about: profileAbout,
          guides: profileGuides,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Profil yenilənə bilmədi.');

      Object.assign(currentUser, data.user || {
        name: profileName, email: profileEmail, phone: profilePhone,
        companyName: profileCompanyName, avatar: profileAvatar, about: profileAbout, guides: profileGuides
      });

      if (onShowNotification) onShowNotification('Profiliniz uğurla yadda saxlanıldı! ✨', 'success');
    } catch (err: any) {
      if (onShowNotification) onShowNotification(err.message || 'Profil yenilənərkən xəta baş verdi.', 'error');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      if (onShowNotification) onShowNotification('Yeni şifrə və təkrarı uyğun gəlmir.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      if (onShowNotification) onShowNotification('Yeni şifrə ən azı 6 simvol olmalıdır.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(operatorToken ? { Authorization: `Bearer ${operatorToken}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Şifrə yenilənə bilmədi.');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onShowNotification) onShowNotification('Şifrəniz uğurla yeniləndi! 🔐', 'success');
    } catch (err: any) {
      if (onShowNotification) onShowNotification(err.message || 'Şifrə yenilənərkən xəta baş verdi.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
          <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
            👤 Şirkət & Profil Məlumatları
          </h2>
          <p className="text-emerald-100 text-xs mt-1 max-w-xl">
            Müştərilərin təşkilatçı profilinizdə görəcəyi məlumatları buradan yeniləyə bilərsiniz. Şirkət şəklinizi, əlaqə vasitələrini və daxili bələdçilərinizi yoxlayın.
          </p>
        </div>

        <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ad, Soyad <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şirkət Adı <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profileCompanyName}
                onChange={(e) => setProfileCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-poçt</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Əlaqə Nömrəsi <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Haqqında (Müştərilər üçün Bio)</label>
            <textarea
              rows={4}
              value={profileAbout}
              onChange={(e) => setProfileAbout(e.target.value)}
              placeholder="Sizi fərqləndirən xüsusiyyətləriniz, təcrübəniz və komandanız haqqında qısa məlumat verin."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Şirkət Logosu / Şəkil yükləyin</label>
            <div className="flex items-center gap-4">
              {profileAvatar && (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0 bg-slate-50">
                  <img src={profileAvatar} alt="Logo Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfileAvatar(reader.result as string);
                        if (onShowNotification) onShowNotification('Şəkil uğurla yükləndi! 📸', 'success');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-xl text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Şəkil Seçin 📁</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Komandanız (Bələdçilər)</h3>
                <p className="text-xs text-slate-500">Müştərilərin turlara etibarını artırmaq üçün bələdçilərinizi əlavə edin.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileGuides([...profileGuides, { name: '', bio: '', specialty: '', avatar: '' }])}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] tracking-wider rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                Bələdçi Əlavə Et
              </button>
            </div>

            {profileGuides.length > 0 ? (
              <div className="space-y-4">
                {profileGuides.map((guide, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                    <button
                      type="button"
                      onClick={() => setProfileGuides(profileGuides.filter((_, i) => i !== idx))}
                      className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition"
                      title="Bələdçini Sil"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">Bələdçinin Adı *</label>
                        <input
                          type="text"
                          required
                          value={guide.name}
                          onChange={(e) => {
                            const newGuides = [...profileGuides];
                            newGuides[idx].name = e.target.value;
                            setProfileGuides(newGuides);
                          }}
                          className="w-full bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">İxtisas (Məs: Alpinist)</label>
                        <input
                          type="text"
                          value={guide.specialty || ''}
                          onChange={(e) => {
                            const newGuides = [...profileGuides];
                            newGuides[idx].specialty = e.target.value;
                            setProfileGuides(newGuides);
                          }}
                          className="w-full bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">Bio (Qısa tərcümeyi-hal) *</label>
                        <textarea
                          required
                          rows={2}
                          value={guide.bio}
                          onChange={(e) => {
                            const newGuides = [...profileGuides];
                            newGuides[idx].bio = e.target.value;
                            setProfileGuides(newGuides);
                          }}
                          className="w-full bg-white border border-slate-200 text-slate-900 p-2 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 tracking-wide">Bələdçinin Şəkli yükləyin</label>
                        <div className="flex items-center gap-4">
                          {guide.avatar && (
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                              <img src={guide.avatar} alt="Guide Avatar" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="relative flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const newGuides = [...profileGuides];
                                    newGuides[idx].avatar = reader.result as string;
                                    setProfileGuides(newGuides);
                                    if (onShowNotification) onShowNotification('Şəkil uğurla yükləndi! 📸', 'success');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="w-full px-3 py-2 bg-white hover:bg-slate-50 border border-dashed border-emerald-350 hover:border-emerald-500 rounded-lg text-xs flex items-center justify-center gap-2 text-emerald-800 font-bold transition">
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Şəkil Seçin 📁</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 font-medium">Hələ heç bir bələdçi əlavə edilməyib.</p>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setProfileName(currentUser.name || '');
                setProfileEmail(currentUser.email || '');
                setProfilePhone(currentUser.phone || '');
                setProfileCompanyName(currentUser.companyName || '');
                setProfileAvatar(currentUser.avatar || '');
                setProfileAbout(currentUser.about || '');
                setProfileGuides(currentUser.guides || []);
                onCancel();
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-6 rounded-xl transition"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            >
              {profileSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Yadda Saxlanılır...
                </>
              ) : (
                'Profilimi Yadda Saxla'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
          <h2 className="text-sm font-bold flex items-center gap-2 tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Təhlükəsizlik — Giriş Məlumatları
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Hesabınızın şifrəsini buradan yeniləyə bilərsiniz. Dəyişiklik dərhal qüvvəyə minir.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cari Şifrə</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 pr-9 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Şifrə</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 pr-9 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-1.5 space-y-1">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-slate-200'}`} />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-500">{strength.label}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Şifrənin Təkrarı</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-2 pr-9 text-xs rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <span className="text-[10px] font-bold text-red-600 mt-1 block">Şifrələr uyğun gəlmir.</span>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            >
              {isChangingPassword ? 'Yenilənir...' : 'Şifrəni Yenilə'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
