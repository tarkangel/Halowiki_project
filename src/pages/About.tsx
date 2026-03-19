import { motion } from 'framer-motion';

const STACK = [
  { label: 'React 18 + TypeScript',   tag: 'UI',    color: '#00B4D8' },
  { label: 'Vite',                    tag: 'BUILD', color: '#FFD60A' },
  { label: 'Tailwind CSS',            tag: 'STYLE', color: '#4895EF' },
  { label: 'Framer Motion',           tag: 'ANIM',  color: '#C77DFF' },
  { label: 'Three.js',                tag: '3D',    color: '#00FF9F' },
  { label: 'React Router v6',         tag: 'NAV',   color: '#FF9F00' },
  { label: 'Halopedia MediaWiki API', tag: 'DATA',  color: '#FF3366' },
  { label: 'Vertex AI · Imagen 3',    tag: 'AI',    color: '#FFD60A' },
  { label: 'Google Cloud Run',        tag: 'HOST',  color: '#4895EF' },
  { label: 'GCS · Artifact Registry', tag: 'STORE', color: '#00B4D8' },
  { label: 'Terraform',               tag: 'INFRA', color: '#C77DFF' },
  { label: 'GitHub Actions CI/CD',    tag: 'CI',    color: '#00FF9F' },
  { label: 'Claude · Anthropic',      tag: 'AI',    color: '#FF9F00' },
];

const FEATURES = [
  { icon: '⚡', title: 'Two-phase loading', desc: 'Lore characters appear instantly; full category data loads in the background.' },
  { icon: '🖼', title: 'AI-generated artwork', desc: 'Missing Halopedia images are filled with Vertex AI Imagen 3 illustrations, generated and cached in GCS.' },
  { icon: '🔁', title: 'Official image mirroring', desc: 'Halopedia thumbnails for lore entities are mirrored to GCS at deploy time — no runtime API dependency for images.' },
  { icon: '📝', title: 'Description database', desc: 'Every entity has a guaranteed description: Halopedia extract → GCS text archive → curated hand-written fallback.' },
  { icon: '🏷', title: 'Faction registry', desc: 'Static cross-category catalog linking every character, weapon, vehicle, race, and planet to their faction.' },
  { icon: '☁️', title: 'Full GCP infra as code', desc: 'Cloud Run, Artifact Registry, GCS, Workload Identity — all provisioned and destroyed via Terraform.' },
];

export default function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 pt-6 pb-16 max-w-4xl"
    >
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">
          About{' '}
          <span
            className="text-[#00B4D8]"
            style={{ textShadow: '0 0 20px #00B4D866' }}
          >
            Halo Wiki
          </span>
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
          An unofficial, fan-built encyclopedia of the Halo universe — browsable, beautiful,
          and built to showcase what modern AI-assisted development looks like end-to-end.
        </p>
      </div>

      {/* Creator card */}
      <div
        className="rounded-2xl border border-zinc-800 p-6 mb-8"
        style={{ background: 'linear-gradient(135deg, #00B4D80A 0%, #C77DFF08 100%)' }}
      >
        <p className="text-xs font-black tracking-widest mb-3 uppercase"
          style={{ fontFamily: "'Orbitron', sans-serif", color: '#00B4D8', opacity: 0.8 }}>
          Creator
        </p>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: '#00B4D818', border: '1px solid #00B4D833' }}
          >
            👾
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Angel Calderon</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Full-stack developer and Halo enthusiast. Built this project to combine
              a passion for the Halo universe with a hands-on showcase of modern cloud
              infrastructure, AI image generation, and React SPA architecture — all
              orchestrated through an AI-native development workflow.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-800">
          <p className="text-xs font-black tracking-widest mb-3 uppercase"
            style={{ fontFamily: "'Orbitron', sans-serif", color: '#FF9F00', opacity: 0.8 }}>
            AI Co-pilot
          </p>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: '#FF9F0018', border: '1px solid #FF9F0033' }}
            >
              🤖
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Claude{' '}
                <span className="text-sm font-normal text-zinc-500">by Anthropic</span>
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Claude served as the AI co-pilot throughout this project — writing and debugging
                TypeScript, architecting the GCP infrastructure, crafting curated lore descriptions,
                designing CI/CD pipelines, and iterating on the UI alongside Angel. Every feature
                in this app was built in collaboration between a human developer and an AI assistant.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mb-10">
        <p className="text-xs font-black tracking-widest mb-4 uppercase"
          style={{ fontFamily: "'Orbitron', sans-serif", color: '#C77DFF', opacity: 0.8 }}>
          Key Features
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
            >
              <p className="text-base mb-1">{f.icon} <span className="text-white font-semibold text-sm">{f.title}</span></p>
              <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div>
        <p className="text-xs font-black tracking-widest mb-4 uppercase"
          style={{ fontFamily: "'Orbitron', sans-serif", color: '#4895EF', opacity: 0.8 }}>
          Tech Stack
        </p>
        <div className="flex flex-wrap gap-2">
          {STACK.map(({ label, tag, color }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: `${color}12`,
                border: `1px solid ${color}30`,
                color: '#d4d4d8',
              }}
            >
              <span
                className="font-black tracking-widest text-[10px]"
                style={{ fontFamily: "'Orbitron', sans-serif", color }}
              >
                {tag}
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-zinc-600 leading-relaxed">
        Halo Wiki is a fan project and is not affiliated with, endorsed, or sponsored by
        343 Industries or Microsoft. All Halo IP, characters, and universe content are the
        property of their respective owners. Data sourced from the Halopedia community wiki.
      </p>
    </motion.div>
  );
}
