import { useFetch } from '../hooks/useFetch';
import { fetchWeapons } from '../api/static';
import WikiGrid from '../components/ui/WikiGrid';

export default function Weapons() {
  const { data, loading, error } = useFetch(fetchWeapons);
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Weapons</h1>
        <p className="text-zinc-400 mt-1">Arsenal of the Halo universe</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
