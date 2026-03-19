import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchPageSummaries } from '../api/halopedia';
import { useLanguage } from '../contexts/LanguageContext';

const FEATURED = [
  {
    path: '/weapons',
    representative: 'Energy sword',
    imageUrl: undefined as string | undefined,
    objectFit: undefined as string | undefined,
    objectPosition: undefined as string | undefined,
    en: { label: 'Weapons',    description: 'UNSC, Covenant, Forerunner & Banished arsenal' },
    es: { label: 'Armas',      description: 'Arsenal de UNSC, Covenant, Forerunner y Banished' },
  },
  {
    path: '/vehicles',
    representative: 'Scorpion',
    imageUrl: 'https://halo.wiki.gallery/images/a/a3/Scorpion2011.png',
    objectFit: 'contain',
    objectPosition: 'center',
    en: { label: 'Vehicles',   description: 'Ground, air, naval and space craft' },
    es: { label: 'Vehículos',  description: 'Naves terrestres, aéreas, navales y espaciales' },
  },
  {
    path: '/characters',
    representative: 'John-117',
    imageUrl: undefined,
    objectFit: undefined,
    objectPosition: undefined,
    en: { label: 'Characters', description: 'Spartans, Elites, and key figures' },
    es: { label: 'Personajes', description: 'Spartans, Elites y figuras clave' },
  },
  {
    path: '/races',
    representative: 'Sangheili',
    imageUrl: undefined,
    objectFit: undefined,
    objectPosition: 'top',
    en: { label: 'Races',      description: 'Species across the Halo universe' },
    es: { label: 'Razas',      description: 'Especies del universo Halo' },
  },
  {
    path: '/planets',
    representative: 'Reach',
    imageUrl: undefined,
    objectFit: undefined,
    objectPosition: undefined,
    en: { label: 'Planets',    description: 'Worlds, Halos, and installations' },
    es: { label: 'Planetas',   description: 'Mundos, Halos e instalaciones' },
  },
  {
    path: '/games',
    representative: 'Halo: Combat Evolved',
    imageUrl: undefined,
    objectFit: undefined,
    objectPosition: 'top',
    en: { label: 'Games',      description: 'Every Halo title in the franchise' },
    es: { label: 'Juegos',     description: 'Todos los títulos de la saga Halo' },
  },
];

const UI = {
  en: {
    welcome: 'Welcome to',
    subtitle: 'Your interactive encyclopedia for the Halo universe. Explore weapons, vehicles, characters, races, planets, and games.',
    browse: 'Browse Categories',
  },
  es: {
    welcome: 'Bienvenido a',
    subtitle: 'Tu enciclopedia interactiva del universo Halo. Explora armas, vehículos, personajes, razas, planetas y juegos.',
    browse: 'Explorar Categorías',
  },
};

export default function Home() {
  const { lang } = useLanguage();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const t = UI[lang];

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
          {t.welcome} <span className="text-[#00B4D8]">Halo Wiki</span>
        </h1>
        <p className="text-zinc-400 text-lg">{t.subtitle}</p>
      </div>

      <div className="px-8">
        <h2 className="text-xl font-semibold text-zinc-300 mb-4">{t.browse}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURED.map((item, i) => {
            const { label, description } = item[lang];
            const img = item.imageUrl ?? thumbs[item.representative];
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  to={item.path}
                  className="block bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-[#00B4D8] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full h-32 bg-zinc-900 overflow-hidden">
                    {img ? (
                      <motion.img
                        src={img}
                        alt={item.representative}
                        className="w-full h-full"
                        style={{ objectFit: (item.objectFit as 'cover' | 'contain') ?? 'cover', objectPosition: item.objectPosition ?? 'center' }}
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
                        {item.representative}
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
