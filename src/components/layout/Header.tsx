import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import SearchBar from '../ui/SearchBar';
import SearchOverlay from '../ui/SearchOverlay';
import { useSearch } from '../../contexts/SearchContext';

const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/weapons': 'Weapons',
  '/vehicles': 'Vehicles',
  '/characters': 'Characters',
  '/races': 'Races',
  '/planets': 'Planets',
  '/games': 'Games',
  '/factions': 'Factions',
  '/about': 'About',
};

export default function Header() {
  const location              = useLocation();
  const { query, setQuery }   = useSearch();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const title                 = routeTitles[location.pathname] ?? 'Halo Wiki';

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setOverlayOpen(value.trim().length >= 2);
  }, [setQuery]);

  return (
    <header className="fixed top-0 left-16 right-0 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 z-40">
      <h2 className="text-white font-semibold text-lg tracking-wide">{title}</h2>
      <div className="relative w-72">
        <SearchBar
          value={query}
          onChange={handleChange}
          placeholder="Search Halo Wiki..."
        />
        {overlayOpen && query.trim().length >= 2 && (
          <SearchOverlay
            query={query}
            onClose={() => {
              setOverlayOpen(false);
              setQuery('');
            }}
          />
        )}
      </div>
    </header>
  );
}
