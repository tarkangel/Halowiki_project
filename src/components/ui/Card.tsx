import { motion } from 'framer-motion';
import Badge from './Badge';

interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;
  badge?: string;
  badges?: string[];
  imageObjectFit?: 'cover' | 'contain';
  onClick?: () => void;
}

export default function Card({ title, description, imageUrl, badge, badges, imageObjectFit = 'cover', onClick }: CardProps) {
  const allBadges = badges ?? (badge ? [badge] : []);
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,180,216,0.15)' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`bg-zinc-800 rounded-lg overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-40"
          style={{ objectFit: imageObjectFit, objectPosition: imageObjectFit === 'contain' ? 'center' : 'top' }}
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
          <span className="text-zinc-500 text-4xl">🌐</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white font-semibold text-base leading-tight">{title}</h3>
          {allBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {allBadges.map(b => <Badge key={b} label={b} />)}
            </div>
          )}
        </div>
        <p className="text-zinc-400 text-sm line-clamp-3">{description}</p>
      </div>
    </motion.div>
  );
}
