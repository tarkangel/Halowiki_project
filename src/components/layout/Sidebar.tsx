import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/weapons', label: 'Weapons', icon: '⚔️', end: false },
  { to: '/vehicles', label: 'Vehicles', icon: '🚗', end: false },
  { to: '/characters', label: 'Characters', icon: '👤', end: false },
  { to: '/races', label: 'Races', icon: '👾', end: false },
  { to: '/planets', label: 'Planets', icon: '🪐', end: false },
  { to: '/games', label: 'Games', icon: '🎮', end: false },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.aside
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-full bg-zinc-900 flex flex-col z-50 overflow-hidden"
    >
      {/* Logo / Toggle */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-3 px-4 py-5 focus:outline-none"
        aria-label="Toggle sidebar"
      >
        <span className="text-2xl select-none">🌐</span>
        <motion.span
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-bold tracking-widest text-[#00B4D8] whitespace-nowrap"
          style={{ textShadow: '0 0 10px #00B4D8aa' }}
        >
          HALO WIKI
        </motion.span>
      </button>

      <nav className="flex-1 flex flex-col gap-1 mt-2">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 transition-colors duration-200 rounded-r-lg mr-2 ${
                isActive
                  ? 'bg-[#00B4D8]/20 text-[#00B4D8] border-l-2 border-[#00B4D8]'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`
            }
          >
            {({ isActive }) => (
              <motion.div
                className="flex items-center gap-3 w-full"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.15 }}
              >
                <span className="text-xl select-none flex-shrink-0">{icon}</span>
                <motion.span
                  animate={{ opacity: expanded ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className={`whitespace-nowrap text-sm font-medium ${isActive ? 'text-[#00B4D8]' : ''}`}
                >
                  {label}
                </motion.span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
}
