import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

const navItems = [
  { to: '/',           color: '#00B4D8', end: true,
    en: { label: 'Home',       tag: 'HM'  },
    es: { label: 'Inicio',     tag: 'IN'  } },
  { to: '/weapons',    color: '#FF3366', end: false,
    en: { label: 'Weapons',    tag: 'WPN' },
    es: { label: 'Armas',      tag: 'ARM' } },
  { to: '/vehicles',   color: '#00FF9F', end: false,
    en: { label: 'Vehicles',   tag: 'VHL' },
    es: { label: 'Vehículos',  tag: 'VHC' } },
  { to: '/characters', color: '#C77DFF', end: false,
    en: { label: 'Characters', tag: 'CHR' },
    es: { label: 'Personajes', tag: 'PRS' } },
  { to: '/races',      color: '#FF9F00', end: false,
    en: { label: 'Races',      tag: 'RCE' },
    es: { label: 'Razas',      tag: 'RZS' } },
  { to: '/planets',    color: '#4895EF', end: false,
    en: { label: 'Planets',    tag: 'PLN' },
    es: { label: 'Planetas',   tag: 'PLN' } },
  { to: '/games',      color: '#FFD60A', end: false,
    en: { label: 'Games',      tag: 'GME' },
    es: { label: 'Juegos',     tag: 'JGS' } },
  { to: '/factions',   color: '#FF6B35', end: false,
    en: { label: 'Factions',   tag: 'FCT' },
    es: { label: 'Facciones',  tag: 'FCC' } },
];

const bottomItems = [
  { to: '/about', color: '#888888', end: false,
    en: { label: 'About',      tag: 'ABT' },
    es: { label: 'Acerca de',  tag: 'ACR' } },
];

export default function Sidebar() {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  // Collapse on click outside
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  function NavItem({ to, color, end, en, es }: typeof navItems[0]) {
    const { label, tag } = lang === 'es' ? es : en;
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={() => setExpanded(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 transition-colors duration-200 rounded-r-lg mr-2 ${
            isActive
              ? 'bg-zinc-800/80 border-l-2'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border-l-2 border-transparent'
          }`
        }
        style={({ isActive }) =>
          isActive ? { borderLeftColor: color } : undefined
        }
      >
        {({ isActive }) => (
          <motion.div
            className="flex items-center gap-3 w-full"
            whileHover={{ x: 3 }}
            transition={{ duration: 0.15 }}
          >
            <span
              className="text-xs font-black tracking-widest flex-shrink-0 w-8 text-center select-none"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color,
                textShadow: isActive
                  ? `0 0 6px ${color}, 0 0 18px ${color}88`
                  : `0 0 4px ${color}66`,
                opacity: isActive ? 1 : 0.7,
              }}
            >
              {tag}
            </span>
            <motion.span
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="whitespace-nowrap text-sm font-semibold tracking-wide"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: isActive ? color : undefined,
                textShadow: isActive ? `0 0 8px ${color}88` : undefined,
                fontSize: '0.7rem',
              }}
            >
              {label}
            </motion.span>
          </motion.div>
        )}
      </NavLink>
    );
  }

  return (
    <>
      {/* Click-outside backdrop (invisible, behind sidebar) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onMouseDown={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={asideRef}
        animate={{ width: expanded ? 240 : 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 h-full bg-zinc-900 flex flex-col z-50 overflow-hidden border-r border-zinc-800"
      >
        {/* Logo / Toggle */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="flex flex-col items-center px-4 pt-4 pb-3 gap-1 focus:outline-none w-full"
          aria-label="Toggle sidebar"
        >
          {/* Row: HW + (HALO WIKI + ring when expanded) */}
          <div className="flex items-center gap-2 w-full">
            <span
              className="text-sm font-black tracking-widest flex-shrink-0 select-none"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: '#00B4D8',
                textShadow: '0 0 8px #00B4D8, 0 0 20px #00B4D888',
              }}
            >
              HW
            </span>
            <motion.span
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-base font-black tracking-widest whitespace-nowrap"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: '#00B4D8',
                textShadow: '0 0 10px #00B4D8, 0 0 30px #00B4D866',
              }}
            >
              HALO WIKI
            </motion.span>
            {/* Ring — right of HALO WIKI when expanded */}
            <motion.img
              src="https://halo.wiki.gallery/images/8/83/HW2-Halo.png"
              alt=""
              aria-hidden
              animate={{ opacity: expanded ? 0.85 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 object-contain"
              style={{ width: 18, height: 18, filter: 'drop-shadow(0 0 5px #00B4D8aa)' }}
            />
          </div>
          {/* Ring — below HW when collapsed */}
          <motion.img
            src="https://halo.wiki.gallery/images/8/83/HW2-Halo.png"
            alt=""
            aria-hidden
            animate={{ opacity: expanded ? 0 : 0.75 }}
            transition={{ duration: 0.2 }}
            className="object-contain"
            style={{ width: 20, height: 20, filter: 'drop-shadow(0 0 5px #00B4D8aa)' }}
          />
        </button>

        <nav className="flex-1 flex flex-col gap-1 mt-2">
          {navItems.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Bottom: About link */}
        <div className="border-t border-zinc-800 py-2">
          {bottomItems.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </motion.aside>
    </>
  );
}
