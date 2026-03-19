import { useState, useEffect, useRef } from 'react';
import { fetchLoreCharacters, fetchCharacters } from '../api/halopedia';
import type { Character } from '../types/character';
import WikiGrid from '../components/ui/WikiGrid';

const PAGE_SIZE = 24;

export default function Characters() {
  const [items, setItems]       = useState<Character[]>([]);
  const [allItems, setAllItems] = useState<Character[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [visible, setVisible]   = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Phase 1 — show LORE characters immediately
  useEffect(() => {
    fetchLoreCharacters()
      .then(lore => {
        setItems(lore);
        setLoading(false);
      })
      .catch(err => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, []);

  // Phase 2 — fetch full list in background, merge keeping lore-first order
  useEffect(() => {
    fetchCharacters(30)
      .then(all => {
        setAllItems(all);
        setItems(all);
      })
      .catch(() => { /* keep phase-1 result on error */ });
  }, []);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const total = allItems?.length ?? items.length;
    if (visible >= total) return;

    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisible(v => v + PAGE_SIZE); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visible, allItems, items.length]);

  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Characters</h1>
        <p className="text-zinc-400 mt-1">Heroes and villains of the Halo universe</p>
      </div>
      <WikiGrid
        items={items.slice(0, visible)}
        loading={loading}
        error={error}
      />
      {/* Scroll sentinel — triggers next batch */}
      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}
