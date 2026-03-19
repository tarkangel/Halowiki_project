import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

const GCS = 'https://storage.googleapis.com/halowiki-generated-images/music';

const TRACKS = [
  `${GCS}/halo-2-epilogue.mp3`,
  `${GCS}/brothers-in-arms.mp3`,
  `${GCS}/on-a-pale-horse.mp3`,
  `${GCS}/halo-main-theme.mp3`,
  `${GCS}/spirit-of-fire.mp3`,
  `${GCS}/heavy-price-paid.mp3`,
  `${GCS}/greatest-journey.mp3`,
];

const STORAGE_KEY = 'halowiki-music';
const VOLUME      = 0.15;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface MusicContextValue {
  isPlaying: boolean;
  toggle: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  toggle: () => {},
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
  });

  const playlist        = useRef<string[]>(shuffled(TRACKS));
  const trackIdx        = useRef<number>(0);
  const audio           = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef    = useRef(isPlaying);
  const gestureReceived = useRef(false);

  // Keep ref in sync so the 'ended' closure always sees current value
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Bootstrap Audio instance once
  useEffect(() => {
    const el = new Audio();
    el.volume = VOLUME;
    audio.current = el;

    const handleEnded = () => {
      trackIdx.current = (trackIdx.current + 1) % playlist.current.length;
      el.src = playlist.current[trackIdx.current];
      el.load();
      if (isPlayingRef.current) el.play().catch(() => {});
    };
    el.addEventListener('ended', handleEnded);

    el.src = playlist.current[0];
    el.load();

    return () => {
      el.removeEventListener('ended', handleEnded);
      el.pause();
      el.src = '';
    };
  }, []);

  // React to isPlaying state changes
  useEffect(() => {
    if (!audio.current) return;
    if (isPlaying && gestureReceived.current) {
      audio.current.play().catch(() => {});
    } else if (!isPlaying) {
      audio.current.pause();
    }
  }, [isPlaying]);

  // One-shot document click listener to unlock autoplay
  useEffect(() => {
    function handleFirstClick() {
      gestureReceived.current = true;
      if (isPlayingRef.current && audio.current) {
        audio.current.play().catch(() => {});
      }
      document.removeEventListener('click', handleFirstClick);
    }
    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, []);

  const toggle = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch {}
      if (next && gestureReceived.current && audio.current) {
        audio.current.play().catch(() => {});
      } else if (!next && audio.current) {
        audio.current.pause();
      }
      return next;
    });
  }, []);

  return (
    <MusicContext.Provider value={{ isPlaying, toggle }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
