import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const FEATURED = [
  { label: 'Weapons', emoji: '⚔️', path: '/weapons', description: 'UNSC, Covenant, Forerunner & Banished arsenal' },
  { label: 'Vehicles', emoji: '🚗', path: '/vehicles', description: 'Ground, air, naval and space craft' },
  { label: 'Characters', emoji: '👤', path: '/characters', description: 'Spartans, Elites, and key figures' },
  { label: 'Races', emoji: '👾', path: '/races', description: 'Species across the Halo universe' },
  { label: 'Planets', emoji: '🪐', path: '/planets', description: 'Worlds, Halos, and installations' },
  { label: 'Games', emoji: '🎮', path: '/games', description: 'Every Halo title in the franchise' },
];

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-8"
    >
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to <span className="text-[#00B4D8]">Halo Wiki</span>
        </h1>
        <p className="text-zinc-400 text-lg">
          Your interactive encyclopedia for the Halo universe.
          Explore weapons, vehicles, characters, races, planets, and games.
        </p>
      </div>

      <div className="px-8">
        <h2 className="text-xl font-semibold text-zinc-300 mb-4">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURED.map(({ label, emoji, path, description }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                to={path}
                className="block bg-zinc-800 rounded-lg p-5 border border-zinc-700 hover:border-[#00B4D8] transition-colors"
              >
                <div className="text-3xl mb-2">{emoji}</div>
                <h3 className="text-white font-semibold text-lg">{label}</h3>
                <p className="text-zinc-400 text-sm mt-1">{description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
