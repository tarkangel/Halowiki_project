import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import SearchBar from '../ui/SearchBar';
import SearchOverlay from '../ui/SearchOverlay';
import { useSearch } from '../../contexts/SearchContext';
import { useLanguage } from '../../contexts/LanguageContext';

const routeTitles: Record<string, Record<string, string>> = {
  en: { '/': 'Home', '/weapons': 'Weapons', '/vehicles': 'Vehicles', '/characters': 'Characters', '/races': 'Races', '/planets': 'Planets', '/games': 'Games', '/factions': 'Factions', '/about': 'About' },
  es: { '/': 'Inicio', '/weapons': 'Armas', '/vehicles': 'Vehículos', '/characters': 'Personajes', '/races': 'Razas', '/planets': 'Planetas', '/games': 'Juegos', '/factions': 'Facciones', '/about': 'Acerca de' },
};

export default function Header() {
  const location              = useLocation();
  const { query, setQuery }   = useSearch();
  const { lang, toggleLang }  = useLanguage();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const title                 = routeTitles[lang][location.pathname] ?? 'Halo Wiki';

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setOverlayOpen(value.trim().length >= 2);
  }, [setQuery]);

  return (
    <header className="fixed top-0 left-16 right-0 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 z-40">
      <h2 className="text-white font-semibold text-lg tracking-wide">{title}</h2>
      <div className="flex items-center gap-3">
      <button
        onClick={toggleLang}
        title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
        className="flex items-center gap-1.5 px-3 py-1 rounded border border-zinc-700 bg-zinc-900 hover:border-[#00B4D8] hover:text-[#00B4D8] text-zinc-400 text-xs font-bold tracking-widest transition-colors"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        <span>{lang === 'en' ? '🇲🇽' : '🇺🇸'}</span>
        <span>{lang === 'en' ? 'ES' : 'EN'}</span>
      </button>
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
      </div>
    </header>
  );
}
