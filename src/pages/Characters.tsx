import { useState, useEffect, useRef } from 'react';
import { fetchLoreCharacters, fetchCharacters } from '../api/halopedia';
import type { Character } from '../types/character';
import WikiGrid from '../components/ui/WikiGrid';

const PAGE_SIZE = 32;

export default function Characters() {
  const [items, setItems]         = useState<Character[]>([]);
  const [totalItems, setTotal]    = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [visible, setVisible]     = useState(PAGE_SIZE);
  const [fullLoaded, setFullLoaded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Phase 1 — show LORE characters immediately (fast, ~1s)
  useEffect(() => {
    fetchLoreCharacters()
      .then(lore => {
        setItems(lore);
        setTotal(lore.length);
        setLoading(false);
      })
      .catch(err => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, []);

  // Phase 2 — full category fetch in background; merge keeping order
  useEffect(() => {
    fetchCharacters(30)
      .then(all => {
        if (all.length > 0) {
          setItems(all);
          setTotal(all.length);
          setFullLoaded(true);
        }
      })
      .catch(() => { /* keep phase-1 result */ });
  }, []);

  // Infinite scroll — load more cards as user scrolls down
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visible >= totalItems) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(v => Math.min(v + PAGE_SIZE, totalItems));
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visible, totalItems]);

  const shown = items.slice(0, visible);
  const hasMore = visible < totalItems;

  return (
    <div>
      <div className="px-6 pt-6 flex items-baseline gap-4">
        <h1 className="text-3xl font-bold text-white">Characters</h1>
        {totalItems > 0 && (
          <span className="text-zinc-500 text-sm">
            {Math.min(visible, totalItems)} / {totalItems}
            {!fullLoaded && ' · loading more…'}
          </span>
        )}
      </div>
      <p className="px-6 text-zinc-400 mt-1 mb-2">Heroes and villains of the Halo universe</p>

      <WikiGrid items={shown} loading={loading} error={error} />

      {/* Sentinel + manual load-more fallback */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <button
            onClick={() => setVisible(v => Math.min(v + PAGE_SIZE, totalItems))}
            className="px-6 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
          >
            Load more ({totalItems - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
