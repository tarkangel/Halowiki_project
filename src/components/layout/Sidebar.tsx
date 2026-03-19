import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/',          label: 'Home',       tag: 'HM',  color: '#00B4D8', end: true  },
  { to: '/weapons',   label: 'Weapons',    tag: 'WPN', color: '#FF3366', end: false },
  { to: '/vehicles',  label: 'Vehicles',   tag: 'VHL', color: '#00FF9F', end: false },
  { to: '/characters',label: 'Characters', tag: 'CHR', color: '#C77DFF', end: false },
  { to: '/races',     label: 'Races',      tag: 'RCE', color: '#FF9F00', end: false },
  { to: '/planets',   label: 'Planets',    tag: 'PLN', color: '#4895EF', end: false },
  { to: '/games',     label: 'Games',      tag: 'GME', color: '#FFD60A', end: false },
  { to: '/factions',  label: 'Factions',   tag: 'FCT', color: '#FF6B35', end: false },
];

const bottomItems = [
  { to: '/about', label: 'About', tag: 'ABT', color: '#888888', end: false },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.aside
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-full bg-zinc-900 flex flex-col z-50 overflow-hidden border-r border-zinc-800"
    >
      {/* Logo / Toggle */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-3 px-4 py-5 focus:outline-none"
        aria-label="Toggle sidebar"
      >
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
      </button>

      <nav className="flex-1 flex flex-col gap-1 mt-2">
        {navItems.map(({ to, label, tag, color, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
                    color: color,
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
        ))}
      </nav>

      {/* Bottom: About link */}
      <div className="border-t border-zinc-800 py-2">
        {bottomItems.map(({ to, label, tag, color, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
                    textShadow: isActive ? `0 0 6px ${color}` : `0 0 4px ${color}66`,
                    opacity: isActive ? 1 : 0.6,
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
                    fontSize: '0.7rem',
                  }}
                >
                  {label}
                </motion.span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </motion.aside>
  );
}
