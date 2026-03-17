import { useFetch } from '../hooks/useFetch';
import { fetchCharacters } from '../api/halopedia';
import WikiGrid from '../components/ui/WikiGrid';

export default function Characters() {
  const { data, loading, error } = useFetch(fetchCharacters);
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">Characters</h1>
        <p className="text-zinc-400 mt-1">Heroes and villains of the Halo universe</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
