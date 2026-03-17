import ModelViewer, { ModelId } from './ModelViewer';

const SHOWCASES: Array<{ modelId: ModelId; label: string; description: string }> = [
  {
    modelId: 'warthog',
    label: 'M12 Warthog',
    description: 'UNSC light utility vehicle — replace with warthog.glb',
  },
  {
    modelId: 'helmet',
    label: 'MJOLNIR Helmet',
    description: 'Master Chief\'s iconic armor — replace with helmet.glb',
  },
  {
    modelId: 'sword',
    label: 'Energy Sword',
    description: 'Covenant plasma blade — replace with sword.glb',
  },
];

export default function ModelShowcase() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">3D Showcase</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Placeholder geometry — drop{' '}
        <code className="text-[#00B4D8] bg-zinc-800 px-1 rounded">.glb</code>{' '}
        files in <code className="text-[#00B4D8] bg-zinc-800 px-1 rounded">public/models/</code>{' '}
        to replace with real models (see{' '}
        <a
          href="/models/README.md"
          className="text-[#00B4D8] underline"
          target="_blank"
          rel="noreferrer"
        >
          models/README.md
        </a>
        ).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SHOWCASES.map(({ modelId, label, description }) => (
          <div key={modelId} className="bg-zinc-800 rounded-lg p-3">
            <ModelViewer modelId={modelId} height="220px" autoRotate />
            <h3 className="text-white font-semibold mt-2">{label}</h3>
            <p className="text-zinc-400 text-xs mt-1">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
