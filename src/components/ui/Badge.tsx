type BadgeVariant = 'unsc' | 'covenant' | 'forerunner' | 'banished' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  unsc: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  covenant: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  forerunner: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  banished: 'bg-red-500/20 text-red-400 border-red-500/40',
  default: 'bg-zinc-700/50 text-zinc-300 border-zinc-600',
};

function getVariantFromLabel(label: string): BadgeVariant {
  const lower = label.toLowerCase();
  if (lower.includes('unsc')) return 'unsc';
  if (lower.includes('covenant')) return 'covenant';
  if (lower.includes('forerunner')) return 'forerunner';
  if (lower.includes('banished')) return 'banished';
  return 'default';
}

export default function Badge({ label, variant }: BadgeProps) {
  const resolvedVariant = variant ?? getVariantFromLabel(label);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantClasses[resolvedVariant]} whitespace-nowrap`}
    >
      {label}
    </span>
  );
}
