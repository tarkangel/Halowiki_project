import { motion } from 'framer-motion';
import Card from './Card';
import Spinner from './Spinner';

interface WikiItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  faction?: string;
  type?: string;
}

interface WikiGridProps {
  items: WikiItem[] | null;
  loading: boolean;
  error: string | null;
}

export default function WikiGrid({ items, loading, error }: WikiGridProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 text-lg">Failed to load data</p>
        <p className="text-zinc-500 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">No items found.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {items.map(item => (
        <motion.div
          key={item.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <Card
            title={item.name}
            description={item.description}
            imageUrl={item.imageUrl}
            badge={item.faction ?? item.type}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
