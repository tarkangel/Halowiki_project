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

const TRACKS: { url: string; name: string; game: string }[] = [
  { url: `${GCS}/halo-2-epilogue.mp3`,     name: 'Epilogue',          game: 'Halo 2' },
  { url: `${GCS}/brothers-in-arms.mp3`,    name: 'Brothers in Arms',  game: 'Halo 2' },
  { url: `${GCS}/on-a-pale-horse.mp3`,     name: 'On a Pale Horse',   game: 'Halo 3' },
  { url: `${GCS}/halo-main-theme.mp3`,     name: 'Main Menu Theme',   game: 'Halo: CE' },
  { url: `${GCS}/spirit-of-fire.mp3`,      name: 'Spirit of Fire',    game: 'Halo Wars' },
  { url: `${GCS}/heavy-price-paid.mp3`,    name: 'Heavy Price Paid',  game: 'Halo 2' },
  { url: `${GCS}/greatest-journey.mp3`,    name: 'Greatest Journey',  game: 'Halo 3' },
];

const STORAGE_KEY     = 'halowiki-music';
const STORAGE_VOL_KEY = 'halowiki-music-vol';
const DEFAULT_VOLUME  = 0.15;

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
  volume: number;
  setVolume: (v: number) => void;
  trackName: string;
  trackGame: string;
}

const MusicContext = createContext<MusicContextValue>({
  isPlaying: false,
  toggle: () => {},
  volume: DEFAULT_VOLUME,
  setVolume: () => {},
  trackName: '',
  trackGame: '',
});

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
  });

  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = parseFloat(localStorage.getItem(STORAGE_VOL_KEY) ?? '');
      return isNaN(saved) ? DEFAULT_VOLUME : saved;
    } catch { return DEFAULT_VOLUME; }
  });

  const playlist        = useRef<typeof TRACKS>(shuffled(TRACKS));
  const trackIdx        = useRef<number>(0);
  const audio           = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef    = useRef(isPlaying);
  const gestureReceived = useRef(false);

  const [trackName, setTrackName] = useState(playlist.current[0].name);
  const [trackGame, setTrackGame] = useState(playlist.current[0].game);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Bootstrap Audio instance once
  useEffect(() => {
    const el = new Audio();
    el.volume = volume;
    audio.current = el;

    const handleEnded = () => {
      trackIdx.current = (trackIdx.current + 1) % playlist.current.length;
      const next = playlist.current[trackIdx.current];
      el.src = next.url;
      el.load();
      setTrackName(next.name);
      setTrackGame(next.game);
      if (isPlayingRef.current) el.play().catch(() => {});
    };
    el.addEventListener('ended', handleEnded);

    const first = playlist.current[0];
    el.src = first.url;
    el.load();

    return () => {
      el.removeEventListener('ended', handleEnded);
      el.pause();
      el.src = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to isPlaying changes
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

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audio.current) audio.current.volume = clamped;
    try { localStorage.setItem(STORAGE_VOL_KEY, String(clamped)); } catch {}
  }, []);

  return (
    <MusicContext.Provider value={{ isPlaying, toggle, volume, setVolume, trackName, trackGame }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
