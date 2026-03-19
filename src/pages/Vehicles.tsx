import { useFetch } from '../hooks/useFetch';
import { fetchVehicles } from '../api/static';
import WikiGrid from '../components/ui/WikiGrid';

export default function Vehicles() {
  const { data, loading, error } = useFetch(fetchVehicles);
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Vehicles</h1>
        <p className="text-zinc-400 mt-1">Ground, air, and space vehicles</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
