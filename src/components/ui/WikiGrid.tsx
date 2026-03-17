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
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 280 }}
    >
      {/* Full-screen image background */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ background: '#000' }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
          <span
            className="text-zinc-700 text-[20vw] font-black select-none"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {item.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Close button — top right, always visible */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Click upper area to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Bottom 1/3 — floating text over image */}
      <div className="relative z-10 max-h-[40vh] overflow-y-auto"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.75) 18%, rgba(0,0,0,0.95) 40%)' }}
      >
        <div className="px-6 pt-10 pb-8">
          {/* Title + badge */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2
              className="text-3xl font-black text-white leading-tight"
              style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
            >
              {item.name}
            </h2>
            {knownBadge(item) && <Badge label={knownBadge(item)!} />}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-zinc-200 text-sm leading-relaxed mb-5">{item.description}</p>
          )}

          {/* Fields */}
          {fields.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
              {fields.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-zinc-500 text-xs uppercase tracking-wider">{label}</dt>
                  <dd className="text-zinc-100 text-sm mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </motion.div>
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
