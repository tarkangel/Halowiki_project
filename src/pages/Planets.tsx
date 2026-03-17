import { useFetch } from '../hooks/useFetch';
import { fetchPlanets } from '../api/halopedia';
import WikiGrid from '../components/ui/WikiGrid';

export default function Planets() {
  const { data, loading, error } = useFetch(fetchPlanets);
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Planets</h1>
        <p className="text-zinc-400 mt-1">Worlds of the Halo universe</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
