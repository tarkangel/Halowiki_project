import { useFetch } from '../hooks/useFetch';
import { fetchGames } from '../api/static';
import { useLanguage } from '../contexts/LanguageContext';
import WikiGrid from '../components/ui/WikiGrid';

const UI = {
  en: { title: 'Games',  sub: 'The Halo game series' },
  es: { title: 'Juegos', sub: 'La saga de juegos Halo' },
};

export default function Games() {
  const { lang } = useLanguage();
  const { data, loading, error } = useFetch(() => fetchGames(lang), [lang]);
  const t = UI[lang];
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="text-3xl font-bold text-white">{t.title}</h1>
        <p className="text-zinc-400 mt-1">{t.sub}</p>
      </div>
      <WikiGrid items={data} loading={loading} error={error} />
    </div>
  );
}
