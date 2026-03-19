import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Per-route background wallpapers.
 * All images sourced from halo.wiki.gallery (Halopedia CDN).
 * Swap any URL to update the wallpaper for that section.
 */
const PAGE_BG: Record<string, { url: string; position?: string }> = {
  '/': {
    // Installation 04 — the iconic Halo ring, Halo CE
    url: 'https://halo.wiki.gallery/images/4/43/HCE_Installation04_Exterior.jpg',
    position: 'center 30%',
  },
  '/characters': {
    // Halo Infinite cover art — Master Chief
    url: 'https://halo.wiki.gallery/images/0/00/HInf_Coverart_Large_No_Logo.jpg',
    position: 'center top',
  },
  '/weapons': {
    // Covenant energy sword / combat key art
    url: 'https://halo.wiki.gallery/images/c/ce/H2A-EnergySword-Concept.jpg',
    position: 'center center',
  },
  '/vehicles': {
    // Warthog on a Halo ring landscape
    url: 'https://halo.wiki.gallery/images/b/b3/H3-WarthogJump-Concept.jpg',
    position: 'center 60%',
  },
  '/races': {
    // Covenant alien species gathering
    url: 'https://halo.wiki.gallery/images/1/1e/H3-Brute-ConceptArt.jpg',
    position: 'center center',
  },
  '/planets': {
    // Reach from orbit — planet panorama
    url: 'https://halo.wiki.gallery/images/8/87/Reach-Orbit-HaloReach.jpg',
    position: 'center center',
  },
  '/games': {
    // Halo Anniversary panorama
    url: 'https://halo.wiki.gallery/images/e/e3/HCE-Halo-Anniversary-Panorama.jpg',
    position: 'center 40%',
  },
  '/factions': {
    // UNSC vs Covenant battle scene
    url: 'https://halo.wiki.gallery/images/7/72/H5G-UNSC-vs-Covenant-KeyArt.jpg',
    position: 'center center',
  },
  '/about': {
    // Installation 07 — Zeta Halo scenic, Halo Infinite
    url: 'https://halo.wiki.gallery/images/2/20/HINF-Installation07-Surface.jpg',
    position: 'center 55%',
  },
};

export default function Layout() {
  const location = useLocation();
  const bg = PAGE_BG[location.pathname];

  return (
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
  );
}
