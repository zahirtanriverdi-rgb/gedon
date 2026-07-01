import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon } from 'lucide-react';

interface OperatorLoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function OperatorLogin({ users, onLogin }: OperatorLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      // Find operator where role is vendor and credentials match
      const matchedUser = users.find(
        (u) =>
          u.role === 'vendor' &&
          ((u.username && u.username === username) || u.email === username) &&
          u.password === password
      );

      if (matchedUser) {
        onLogin(matchedUser);
      } else {
        setError('İstifadəçi adı və ya şifrə yanlışdır.');
      }
      setIsLoading(false);
    }, 500);
  };

  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 text-center">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Operator Girişi</h2>
          <p className="text-xs text-slate-400">Təşkilatçı (Vendor) idarəetmə paneli</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                İstifadəçi adı (və ya Email)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition text-sm text-slate-800 font-medium"
                placeholder="istifadeci_adi"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Şifrə
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
              {isLoading ? 'Giriş edilir...' : 'Daxil ol'}
            </button>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-5">
             <div className="text-[10px] text-slate-400 text-center flex flex-col gap-1">
               <span>Daxil olmaq üçün sistem adminindən login məlumatları tələb edin.</span>
               {(window.location.search.includes('admin')) && (
                 <strong className="text-emerald-600 mt-2 block border p-1 rounded bg-emerald-50">
                    Test məlumatı: gedekgorek / password123
                 </strong>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
