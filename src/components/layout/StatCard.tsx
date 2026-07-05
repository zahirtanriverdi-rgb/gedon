import type { LucideIcon } from 'lucide-react';

const COLOR_CLASSES = {
  primary: 'bg-brand-primary',
  gold: 'bg-accent-orange-500',
  pink: 'bg-accent-pink-500',
  blue: 'bg-cta-blue-500',
  cyan: 'bg-cta-cyan-500',
} as const;

export type StatCardColor = keyof typeof COLOR_CLASSES;

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color: StatCardColor;
}

export default function StatCard({ label, value, subtitle, icon: Icon, color }: StatCardProps) {
  return (
    <div className={`p-5 rounded-2xl text-white flex items-center justify-between gap-3 ${COLOR_CLASSES[color]}`}>
      <div className="space-y-1 min-w-0">
        <span className="text-[11px] text-white/75 font-bold tracking-widest uppercase truncate block">{label}</span>
        <h4 className="text-xl font-extrabold text-white truncate">{value}</h4>
        {subtitle && <p className="text-[11px] text-white/70 truncate">{subtitle}</p>}
      </div>
      <div className="p-2.5 bg-white/15 rounded-lg shrink-0">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}
