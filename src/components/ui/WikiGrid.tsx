import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import Spinner from './Spinner';
import Badge from './Badge';

interface WikiItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  faction?: string;
  affiliation?: string;
  type?: string;
  species?: string;
  rank?: string;
  status?: string;
  homeworld?: string;
  system?: string;
  crew?: number;
  armament?: string[];
  appearances?: string[];
  wikiUrl?: string;
}

interface WikiGridProps {
  items: WikiItem[] | null;
  loading: boolean;
  error: string | null;
}

const UNKNOWN_VALUES = new Set(['unknown', 'n/a', 'none', '']);

function isKnown(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  return !UNKNOWN_VALUES.has(String(value).toLowerCase().trim());
}

function knownBadge(item: WikiItem): string | undefined {
  const candidate = item.faction ?? item.affiliation ?? item.type;
  return candidate && isKnown(candidate) ? candidate : undefined;
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

interface Field { label: string; value: string }

function buildFields(item: WikiItem): Field[] {
  const candidates: Array<[string, string | number | string[] | undefined]> = [
    ['Faction',      item.faction],
    ['Affiliation',  item.affiliation],
    ['Type',         item.type],
    ['Species',      item.species],
    ['Rank',         item.rank],
    ['Status',       item.status],
    ['Homeworld',    item.homeworld],
    ['System',       item.system],
    ['Crew',         item.crew],
    ['Armament',     item.armament?.join(', ')],
    ['Appearances',  item.appearances?.join(', ')],
  ];

  return candidates
    .filter(([, v]) => Array.isArray(v) ? v.length > 0 : isKnown(v as string | number | undefined))
    .map(([label, v]) => ({ label: label as string, value: String(v) }));
}

function DetailPanel({ item, onClose }: { item: WikiItem; onClose: () => void }) {
  const fields = buildFields(item);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-700 z-50 overflow-y-auto"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Image / placeholder */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
            <span className="text-zinc-500 text-6xl font-bold tracking-tight select-none">
              {item.name.charAt(0)}
            </span>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white leading-tight">{item.name}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors shrink-0 mt-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Badge */}
          {knownBadge(item) && (
            <div className="mb-4">
              <Badge label={knownBadge(item)!} />
            </div>
          )}

          {/* Full description */}
          {item.description && (
            <p className="text-zinc-300 text-sm leading-relaxed mb-6">{item.description}</p>
          )}

          {/* Fields */}
          {fields.length > 0 && (
            <dl className="space-y-3">
              {fields.map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="text-zinc-500 text-sm w-28 shrink-0">{label}</dt>
                  <dd className="text-zinc-200 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          )}

        </div>
      </motion.div>
    </>
  );
}

// ── WikiGrid ──────────────────────────────────────────────────────────────────

export default function WikiGrid({ items, loading, error }: WikiGridProps) {
  const [selected, setSelected] = useState<WikiItem | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 text-lg">Failed to load data</p>
        <p className="text-zinc-500 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">No items found.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {items.map(item => (
          <motion.div
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card
              title={item.name}
              description={item.description}
              imageUrl={item.imageUrl}
              badge={knownBadge(item)}
              onClick={() => setSelected(item)}
            />
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selected && (
          <DetailPanel item={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
