import { motion } from 'framer-motion';
import ModelShowcase from '../components/ModelViewer/ModelShowcase';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-8"
    >
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to <span className="text-[#00B4D8]">Halo Wiki</span>
        </h1>
        <p className="text-zinc-400 text-lg">
          Your interactive encyclopedia for the Halo universe.
          Explore weapons, vehicles, characters, races, planets, and games.
        </p>
      </div>
      <ModelShowcase />
    </motion.div>
  );
}
