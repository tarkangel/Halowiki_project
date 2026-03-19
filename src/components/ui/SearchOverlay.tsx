/**
 * Cross-section search overlay.
 * Searches across all LORE entities instantly (static index, no API calls).
 * Non-lore items are covered by WikiGrid's per-page filtering.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LORE_CHARACTERS, LORE_WEAPONS, LORE_VEHICLES, LORE_PLANETS, LORE_RACES,
} from '../../lore-titles';
import characterImages from '../../generated-character-images.json';
import weaponImages    from '../../generated-weapon-images.json';
import vehicleImages   from '../../generated-vehicle-images.json';
import planetImages    from '../../generated-planet-images.json';
import raceImages      from '../../generated-race-images.json';

type Section = 'characters' | 'weapons' | 'vehicles' | 'planets' | 'races';

interface SearchEntry {
  name: string;
  slug: string;
  section: Section;
  imageUrl?: string;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const SECTION_LABELS: Record<Section, string> = {
  characters: 'Character',
  weapons:    'Weapon',
  vehicles:   'Vehicle',
  planets:    'Planet',
  races:      'Species',
};

const SECTION_COLORS: Record<Section, string> = {
  characters: '#4895EF',
  weapons:    '#FF6B35',
  vehicles:   '#FFD60A',
  planets:    '#00B4D8',
  races:      '#C77DFF',
};

function makeEntries(names: string[], section: Section, images: Record<string, string>): SearchEntry[] {
  return names.map(name => ({
    name,
    slug: slugify(name),
    section,
    imageUrl: images[name],
  }));
}

const INDEX: SearchEntry[] = [
  ...makeEntries(LORE_CHARACTERS, 'characters', characterImages as Record<string, string>),
  ...makeEntries(LORE_WEAPONS,    'weapons',    weaponImages    as Record<string, string>),
  ...makeEntries(LORE_VEHICLES,   'vehicles',   vehicleImages   as Record<string, string>),
  ...makeEntries(LORE_PLANETS,    'planets',    planetImages    as Record<string, string>),
  ...makeEntries(LORE_RACES,      'races',      raceImages      as Record<string, string>),
];

interface Props {
  query: string;
  onClose: () => void;
}

export default function SearchOverlay({ query, onClose }: Props) {
  const navigate  = useNavigate();
  const ref       = useRef<HTMLDivElement>(null);
  const q         = query.toLowerCase().trim();

  const results = INDEX.filter(e => e.name.toLowerCase().includes(q)).slice(0, 12);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (results.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute top-full right-0 mt-1 w-80 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm shadow-2xl z-50 px-4 py-3"
      >
        <p className="text-zinc-500 text-sm text-center">No results for "{query}"</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-1 w-80 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm shadow-2xl z-50 overflow-hidden"
    >
      <div className="max-h-[70vh] overflow-y-auto">
        {results.map(entry => (
          <button
            key={`${entry.section}-${entry.slug}`}
            onClick={() => {
              navigate(`/${entry.section}?open=${entry.slug}`);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left"
          >
            {/* Thumbnail */}
            <div className="w-9 h-9 rounded-md flex-shrink-0 overflow-hidden bg-zinc-800 flex items-center justify-center">
              {entry.imageUrl ? (
                <img
                  src={entry.imageUrl}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-zinc-600 text-xs font-bold">
                  {entry.name.charAt(0)}
                </span>
              )}
            </div>

            {/* Name + badge */}
            <div className="flex-1 min-w-0">
              <p className="text-zinc-100 text-sm font-medium truncate">{entry.name}</p>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: SECTION_COLORS[entry.section] }}
              >
                {SECTION_LABELS[entry.section]}
              </span>
            </div>

            {/* Arrow */}
            <span className="text-zinc-600 text-xs flex-shrink-0">→</span>
          </button>
        ))}
      </div>

      {results.length === 12 && (
        <div className="px-3 py-2 border-t border-zinc-800">
          <p className="text-zinc-600 text-xs text-center">Showing top 12 — type more to narrow results</p>
        </div>
      )}
    </div>
  );
}
