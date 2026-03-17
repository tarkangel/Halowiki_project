import { motion } from 'framer-motion';

export default function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <motion.div
        className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-[#00B4D8]"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
