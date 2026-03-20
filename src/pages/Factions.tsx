import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { FACTIONS, FACTION_MAP, type FactionEntry } from '../faction-registry';

const CATEGORY_META: Array<{ key: keyof FactionEntry; label: string; path: string }> = [
  { key: 'characters', label: 'Characters', path: '/characters' },
  { key: 'weapons',    label: 'Weapons',    path: '/weapons'    },
  { key: 'vehicles',   label: 'Vehicles',   path: '/vehicles'   },
  { key: 'races',      label: 'Races',      path: '/races'      },
  { key: 'planets',    label: 'Planets',    path: '/planets'    },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function EntityTag({ name, color, path }: { name: string; color: string; path: string }) {
  return (
    <Link
      to={`${path}?open=${slugify(name)}`}
      title={`View ${name}`}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors duration-150 hover:opacity-90"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {name}
    </Link>
  );
}

function CategorySection({
  label, names, color, path,
}: { label: string; names: string[]; color: string; path: string }) {
  if (names.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold tracking-widest mb-2 uppercase" style={{ color, opacity: 0.7 }}>
        {label}
        <span className="ml-2 text-zinc-600 normal-case tracking-normal font-normal">
          ({names.length})
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {names.map(n => (
          <EntityTag key={n} name={n} color={color} path={path} />
        ))}
      </div>
    </div>
  );
}

function FactionCard({ faction, isSelected, onSelect }: {
  faction: FactionEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const total =
    faction.characters.length + faction.weapons.length +
    faction.vehicles.length + faction.races.length + faction.planets.length;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`w-full text-left rounded-xl p-5 border transition-colors duration-200 ${
        isSelected ? 'border-opacity-80' : 'border-zinc-800 hover:border-zinc-700'
      }`}
      style={isSelected ? {
        borderColor: `${faction.color}55`,
        background: `${faction.color}09`,
        boxShadow: `0 0 24px ${faction.color}18`,
      } : {}}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-black tracking-widest px-2 py-1 rounded"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: faction.color,
              background: `${faction.color}18`,
              textShadow: `0 0 8px ${faction.color}88`,
            }}
          >
            {faction.tag}
          </span>
          <h3
            className="font-bold text-base"
            style={{ color: isSelected ? faction.color : '#e4e4e7' }}
          >
            {faction.name}
          </h3>
        </div>
        <span className="text-xs text-zinc-500 flex-shrink-0 mt-1">{total} entries</span>
      </div>
      <p className="mt-3 text-sm text-zinc-400 leading-relaxed line-clamp-2">
        {faction.description}
      </p>
    </motion.button>
  );
}

export default function Factions() {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<FactionEntry>(() => {
    const id = searchParams.get('faction');
    return FACTION_MAP.get(id ?? '') ?? FACTIONS[0];
  });

  // Sync when URL param changes (e.g. navigating from a badge link)
  useEffect(() => {
    const id = searchParams.get('faction');
    if (id) {
      const faction = FACTION_MAP.get(id);
      if (faction) setSelected(faction);
    }
  }, [searchParams]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 pt-6 pb-12"
    >
      <h1 className="text-3xl font-bold text-white mb-1">Factions</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Major powers of the Halo universe — and every entry they own.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faction selector column */}
        <div className="flex flex-col gap-3">
          {FACTIONS.map(f => (
            <FactionCard
              key={f.id}
              faction={f}
              isSelected={selected.id === f.id}
              onSelect={() => setSelected(f)}
            />
          ))}
        </div>

        {/* Detail column */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border p-6 sticky top-20"
              style={{
                borderColor: `${selected.color}33`,
                background: `${selected.color}06`,
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-sm font-black tracking-widest px-3 py-1 rounded"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    color: selected.color,
                    background: `${selected.color}20`,
                    textShadow: `0 0 10px ${selected.color}88`,
                    boxShadow: `0 0 16px ${selected.color}22`,
                  }}
                >
                  {selected.tag}
                </span>
                <h2 className="text-2xl font-bold" style={{ color: selected.color }}>
                  {selected.name}
                </h2>
              </div>

              {/* Description + image side by side */}
              <div className="flex gap-5 mb-6">
                <p className="text-sm text-zinc-300 leading-relaxed flex-1">
                  {selected.description}
                </p>
                {selected.imageUrl && (
                  <div className="flex-shrink-0 w-64 xl:w-80 rounded-lg overflow-hidden border" style={{ borderColor: `${selected.color}33` }}>
                    <img
                      src={selected.imageUrl}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                      style={{ maxHeight: 180 }}
                    />
                  </div>
                )}
              </div>

              <div
                className="h-px mb-6"
                style={{ background: `linear-gradient(to right, ${selected.color}44, transparent)` }}
              />

              {/* Entity catalog */}
              {CATEGORY_META.map(({ key, label, path }) => {
                const names = selected[key] as string[];
                return (
                  <CategorySection
                    key={key}
                    label={label}
                    names={names}
                    color={selected.color}
                    path={path}
                  />
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
