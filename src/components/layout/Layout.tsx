import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { SearchProvider } from '../../contexts/SearchContext';
import { LanguageProvider } from '../../contexts/LanguageContext';

/**
 * Per-route background wallpapers.
 * All images sourced from halo.wiki.gallery (Halopedia CDN).
 * Swap any URL to update the wallpaper for that section.
 */
const PAGE_BG: Record<string, { url: string; position?: string }> = {
  '/': {
    // Spirit of Fire in deep space — Halo Wars cinematic 4K
    url: 'https://halo.wiki.gallery/images/3/3d/HaloWars-SOF-Space.jpg',
    position: 'center center',
  },
  '/characters': {
    // Spartan under fire — Halo Wars 2 cinematic
    url: 'https://halo.wiki.gallery/images/5/59/HW2-Banished_ejected.png',
    position: 'center 40%',
  },
  '/weapons': {
    // Atriox cinematic — Halo Wars 2 dark Brute warriors
    url: 'https://halo.wiki.gallery/images/3/3f/HW2-Atriox-01.jpg',
    position: 'center center',
  },
  '/vehicles': {
    // Atriox vs Sangheili — Halo Wars 2 announcement cinematic
    url: 'https://halo.wiki.gallery/images/b/bb/HW2-Atriox-02.jpg',
    position: 'center center',
  },
  '/races': {
    // Banished warriors — Halo Wars 2 cinematic
    url: 'https://halo.wiki.gallery/images/2/21/HW2-Banishedtrio.png',
    position: 'center center',
  },
  '/planets': {
    // Spirit of Fire approaching a planet — Halo Wars 1
    url: 'https://halo.wiki.gallery/images/f/fc/HaloWars-SOF-Sunset.jpg',
    position: 'center center',
  },
  '/games': {
    // Anders meets a Guardian — Halo Wars 2 cinematic
    url: 'https://halo.wiki.gallery/images/9/97/HW2-Anders_meets_a_Guardian.png',
    position: 'center bottom',
  },
  '/factions': {
    // Banished fleet above a planet — Halo Wars 2
    url: 'https://halo.wiki.gallery/images/f/fb/HW2-Banishedfleet.png',
    position: 'center center',
  },
  '/about': {
    // Anders & Cutter at holotable above the Ark — Halo Wars 2
    url: 'https://halo.wiki.gallery/images/a/a9/HW2-Anders%26CutteraboveArk.png',
    position: 'center center',
  },
};

export default function Layout() {
  const location = useLocation();
  const bg = PAGE_BG[location.pathname];

  return (
    <LanguageProvider>
    <SearchProvider>
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <Header />

      {/* Fixed background layer — changes per route with a crossfade */}
      <AnimatePresence>
        {bg && (
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="fixed inset-0 ml-16 pt-14 z-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bg.url})`,
              backgroundSize: 'cover',
              backgroundPosition: bg.position ?? 'center center',
              backgroundRepeat: 'no-repeat',
            }}
            aria-hidden
          >
            {/* Dark vignette overlay — keeps text readable */}
            <div className="absolute inset-0 bg-zinc-950/72" />
            {/* Subtle bottom fade into zinc-950 so cards feel grounded */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-zinc-950 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="ml-16 pt-14 min-h-screen relative z-10">
        <Outlet />
      </main>
    </div>
    </SearchProvider>
    </LanguageProvider>
  );
}
