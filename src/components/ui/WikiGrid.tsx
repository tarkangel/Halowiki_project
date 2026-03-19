import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '../../contexts/SearchContext';
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
  affiliations?: string[];
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
  imageObjectFit?: 'cover' | 'contain';
}

const UNKNOWN_VALUES = new Set(['unknown', 'n/a', 'none', '']);

function isKnown(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  return !UNKNOWN_VALUES.has(String(value).toLowerCase().trim());
}

function knownBadges(item: WikiItem): string[] {
  if (item.affiliations && item.affiliations.length > 0) return item.affiliations;
  const single = item.faction ?? item.affiliation ?? item.type;
  return single && isKnown(single) ? [single] : [];
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

interface Field { label: string; value: string }

function buildFields(item: WikiItem): Field[] {
  const candidates: Array<[string, string | number | string[] | undefined]> = [
    ['Faction',      item.faction],
    ['Affiliation',  item.affiliations ? item.affiliations.join(', ') : item.affiliation],
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
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  // Scroll-to-zoom on the image area
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(4, Math.max(0.5, scaleRef.current - e.deltaY * 0.0012));
    scaleRef.current = next;
    setScale(next);
  }

  // Reset zoom on item change
  useEffect(() => {
    scaleRef.current = 1;
    setScale(1);
  }, [item.id]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 280 }}
    >
      {/* Full-screen image background — scroll to zoom */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: '#000' }}
        onWheel={handleWheel}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.08s ease-out' }}
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
      </div>

      {/* Close button — top right, always visible */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Zoom hint — top left, fades after first render */}
      {scale === 1 && (
        <div className="absolute top-4 left-4 z-10 px-2 py-1 rounded bg-black/40 text-zinc-400 text-xs select-none pointer-events-none">
          scroll to zoom
        </div>
      )}

      {/* Click upper area to close */}
      <div className="flex-1 cursor-pointer z-[1]" onClick={onClose} />

      {/* Bottom panel — floating text over image, no scrollbar */}
      <div
        className="relative z-10"
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
            {knownBadges(item).map(b => <Badge key={b} label={b} />)}
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

export default function WikiGrid({ items, loading, error, imageObjectFit = 'cover' }: WikiGridProps) {
  const [selected, setSelected] = useState<WikiItem | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { query } = useSearch();

  const displayItems = useMemo(() => {
    if (!items) return items;
    const q = query.trim().toLowerCase();
    if (q.length < 2) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q),
    );
  }, [items, query]);

  // Auto-open item when navigating from Factions page (?open=item-id)
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || !items) return;
    const match = items.find(item => item.id === openId);
    if (match) setSelected(match);
  }, [items, searchParams]);

  function handleClose() {
    setSelected(null);
    if (searchParams.has('open')) setSearchParams({}, { replace: true });
  }

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

  if (!displayItems || displayItems.length === 0) {
    return (
      <div className="p-8 text-center">
        {query.trim().length >= 2 ? (
          <p className="text-zinc-500">No results for "<span className="text-zinc-300">{query}</span>"</p>
        ) : (
          <p className="text-zinc-500">No items found.</p>
        )}
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
        {displayItems.map(item => (
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
              badges={knownBadges(item)}
              imageObjectFit={imageObjectFit}
              onClick={() => setSelected(item)}
            />
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence>
        {selected && (
          <DetailPanel item={selected} onClose={handleClose} />
        )}
      </AnimatePresence>
    </>
  );
}
