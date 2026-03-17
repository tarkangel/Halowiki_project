import { useFetch } from '../hooks/useFetch';
import { fetchRaces } from '../api/halopedia';
import WikiGrid from '../components/ui/WikiGrid';

export default function Races() {
  const { data, loading, error } = useFetch(fetchRaces);
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Races</h1>
        <p className="text-zinc-400 mt-1">Sentient species of the Halo universe</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
