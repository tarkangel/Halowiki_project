import { Link } from 'react-router-dom';

type BadgeVariant = 'unsc' | 'covenant' | 'forerunner' | 'banished' | 'flood' | 'swords' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  href?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  unsc:        'bg-blue-500/20 text-blue-400 border-blue-500/40',
  covenant:    'bg-purple-500/20 text-purple-400 border-purple-500/40',
  forerunner:  'bg-amber-500/20 text-amber-400 border-amber-500/40',
  banished:    'bg-red-500/20 text-red-400 border-red-500/40',
  flood:       'bg-green-500/20 text-green-400 border-green-500/40',
  swords:      'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  default:     'bg-zinc-700/50 text-zinc-300 border-zinc-600',
};

function getVariantFromLabel(label: string): BadgeVariant {
  const lower = label.toLowerCase();
  if (lower.includes('unsc') || lower.includes('human')) return 'unsc';
  if (lower.includes('swords of sanghelios')) return 'swords';
  if (lower.includes('covenant')) return 'covenant';
  if (lower.includes('forerunner') || lower.includes('precursor')) return 'forerunner';
  if (lower.includes('banished')) return 'banished';
  if (lower.includes('flood')) return 'flood';
  return 'default';
}

// Map faction label → faction id for linking
function getFactionId(label: string): string | null {
  const lower = label.toLowerCase();
  if (lower.includes('unsc')) return 'unsc';
  if (lower.includes('swords of sanghelios')) return 'swords';
  if (lower.includes('covenant')) return 'covenant';
  if (lower.includes('forerunner')) return 'forerunner';
  if (lower.includes('banished')) return 'banished';
  if (lower.includes('flood')) return 'flood';
  return null;
}

export default function Badge({ label, variant, href }: BadgeProps) {
  const resolvedVariant = variant ?? getVariantFromLabel(label);
  const className = `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantClasses[resolvedVariant]} whitespace-nowrap`;

  const resolvedHref = href ?? (() => {
    const id = getFactionId(label);
    return id ? `/factions?faction=${id}` : null;
  })();

  if (resolvedHref) {
    return (
      <Link
        to={resolvedHref}
        className={`${className} hover:opacity-80 transition-opacity`}
        onClick={e => e.stopPropagation()}
        title={`Ver facción: ${label}`}
      >
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}
