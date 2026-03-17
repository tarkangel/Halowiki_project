import { useLocation } from 'react-router-dom';
import SearchBar from '../ui/SearchBar';
import { useSearch } from '../../hooks/useSearch';

const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/weapons': 'Weapons',
  '/vehicles': 'Vehicles',
  '/characters': 'Characters',
  '/races': 'Races',
  '/planets': 'Planets',
  '/games': 'Games',
};

export default function Header() {
  const location = useLocation();
  const { query, handleSearch } = useSearch();
  const title = routeTitles[location.pathname] ?? 'Halo Wiki';

  return (
    <header className="fixed top-0 left-16 right-0 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 z-40">
      <h2 className="text-white font-semibold text-lg tracking-wide">{title}</h2>
      <div className="w-72">
        <SearchBar
          value={query}
          onChange={handleSearch}
          placeholder="Search Halo Wiki..."
        />
      </div>
    </header>
  );
}
