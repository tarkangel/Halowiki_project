import { useFetch } from '../hooks/useFetch';
import { fetchGames } from '../api/static';
import WikiGrid from '../components/ui/WikiGrid';

export default function Games() {
  const { data, loading, error } = useFetch(fetchGames);
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Games</h1>
        <p className="text-zinc-400 mt-1">The Halo game series</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
