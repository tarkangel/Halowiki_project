import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchPageSummaries } from '../api/halopedia';

const FEATURED = [
  { label: 'Weapons',    path: '/weapons',    representative: 'Energy sword',          description: 'UNSC, Covenant, Forerunner & Banished arsenal' },
  { label: 'Vehicles',   path: '/vehicles',   representative: 'M12 Warthog',           description: 'Ground, air, naval and space craft' },
  { label: 'Characters', path: '/characters', representative: 'John-117',              description: 'Spartans, Elites, and key figures' },
  { label: 'Races',      path: '/races',      representative: 'Sangheili',             description: 'Species across the Halo universe' },
  { label: 'Planets',    path: '/planets',    representative: 'Reach',                 description: 'Worlds, Halos, and installations' },
  { label: 'Games',      path: '/games',      representative: 'Halo: Combat Evolved',  description: 'Every Halo title in the franchise' },
];

export default function Home() {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    const titles = FEATURED.map(f => f.representative);
    fetchPageSummaries(titles)
      .then(pages => {
        const map: Record<string, string> = {};
        for (const page of pages) {
          if (page.thumbnail?.source) map[page.title] = page.thumbnail.source;
        }
        setThumbs(map);
      })
      .catch(() => {});
  }, []);

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
          {FEATURED.map(({ label, path, representative, description }, i) => {
            const img = thumbs[representative];
            return (
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
                  className="block bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-[#00B4D8] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full h-32 bg-zinc-900 overflow-hidden">
                    {img ? (
                      <motion.img
                        src={img}
                        alt={representative}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                        <span
                          className="text-2xl font-black tracking-widest text-zinc-600"
                          style={{ fontFamily: "'Orbitron', sans-serif" }}
                        >
                          {label.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Label overlay */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-1 bg-gradient-to-t from-zinc-900/90 to-transparent">
                      <span
                        className="text-xs font-bold tracking-widest text-zinc-400"
                        style={{ fontFamily: "'Orbitron', sans-serif" }}
                      >
                        {representative}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3
                      className="text-white font-bold text-base tracking-wide"
                      style={{ fontFamily: "'Orbitron', sans-serif" }}
                    >
                      {label}
                    </h3>
                    <p className="text-zinc-400 text-xs mt-1">{description}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
