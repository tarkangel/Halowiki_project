import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SearchBar from '../ui/SearchBar';
import SearchOverlay from '../ui/SearchOverlay';
import { useSearch } from '../../contexts/SearchContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMusic } from '../../contexts/MusicContext';

const routeTitles: Record<string, Record<string, string>> = {
  en: { '/': 'Home', '/weapons': 'Weapons', '/vehicles': 'Vehicles', '/characters': 'Characters', '/races': 'Races', '/planets': 'Planets', '/games': 'Games', '/factions': 'Factions', '/about': 'About' },
  es: { '/': 'Inicio', '/weapons': 'Armas', '/vehicles': 'Vehículos', '/characters': 'Personajes', '/races': 'Razas', '/planets': 'Planetas', '/games': 'Juegos', '/factions': 'Facciones', '/about': 'Acerca de' },
};

export default function Header() {
  const location              = useLocation();
  const { query, setQuery }   = useSearch();
  const { lang, toggleLang }  = useLanguage();
  const { isPlaying, toggle: toggleMusic } = useMusic();
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
      {/* Music toggle */}
      <motion.button
        onClick={toggleMusic}
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="flex items-center justify-center w-7 h-7 rounded-full border transition-colors duration-300 cursor-pointer"
        style={{
          borderColor:     isPlaying ? '#00B4D8' : '#3f3f46',
          backgroundColor: isPlaying ? 'rgba(0,180,216,0.1)' : 'transparent',
          boxShadow:       isPlaying ? '0 0 8px #00B4D866, 0 0 16px #00B4D833' : 'none',
          color:           isPlaying ? '#00B4D8' : '#52525b',
        }}
      >
        <span className="text-sm leading-none select-none">
          {isPlaying ? '♪' : '🔇'}
        </span>
      </motion.button>

      {/* 2-position language toggle */}
      <button
        onClick={toggleLang}
        aria-label={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
        className="relative flex items-center h-7 rounded-full border border-zinc-700 bg-zinc-900 p-0.5 gap-0 cursor-pointer"
        style={{ width: 104 }}
      >
        {/* sliding pill */}
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          className="absolute top-0.5 bottom-0.5 w-[48px] rounded-full bg-[#00B4D8]/20 border border-[#00B4D8]"
          style={{ left: lang === 'en' ? 2 : 'calc(100% - 50px)' }}
        />
        {/* EN label */}
        <span
          className="relative z-10 flex items-center justify-center gap-1 w-[50px] text-[10px] font-black tracking-widest transition-colors"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: lang === 'en' ? '#00B4D8' : '#52525b',
          }}
        >
          <span>🇺🇸</span> EN
        </span>
        {/* ES label */}
        <span
          className="relative z-10 flex items-center justify-center gap-1 w-[50px] text-[10px] font-black tracking-widest transition-colors"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: lang === 'es' ? '#00B4D8' : '#52525b',
          }}
        >
          <span>🇲🇽</span> ES
        </span>
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
