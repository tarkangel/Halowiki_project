# Halo Wiki

A production-grade, AI-powered encyclopedia for the Halo universe — built end-to-end as a showcase of modern cloud engineering, AI agent orchestration, full-stack development, and DevOps practices.

Live at: **[halo-wiki.com](https://halo-wiki.com)**

---

## What this project demonstrates

This is not a tutorial clone or a template project. Every architectural decision, pipeline stage, and AI integration was designed and implemented from scratch — including the tooling to generate, validate, and serve thousands of AI-generated assets at scale.

### AI Agent Orchestration

The most technically distinctive aspect of this project is the **AI-driven asset pipeline** — a system that uses Google Vertex AI (Imagen 3) to generate contextually accurate images for every entity in the wiki (characters, weapons, vehicles, races, planets, locations). This required building a full orchestration layer on top of the raw API:

- **Two-pass faction detection engine** — a deterministic classifier in TypeScript that identifies which Halo faction an entity belongs to (UNSC, Covenant, Banished, Forerunner, Flood) using structural name patterns first, then keyword scanning of live Halopedia descriptions. A `FACTION_OVERRIDES` table short-circuits inference for canonical characters (Master Chief, Cortana, Atriox, etc.) preventing description keywords from polluting the classifier. Priority ordering prevents false positives across 400+ entities.
- **Prompt engineering pipeline** — a `buildPrompt()` function that constructs faction-aware, species-aware, type-aware art direction prompts. Jiralhanae characters get gorilla-primate anatomy descriptions; Forerunner monitors get floating-orb construct prompts; Flood entities get biomass horror framing — all automatically, from Halopedia metadata alone.
- **Lore override system** — a curated `lore-prompts.ts` library of hand-crafted prompts for canonical named entities (Gravemind, Atriox, Master Chief, iconic vehicles) that override the automatic pipeline when a character warrants bespoke art direction.
- **Resume-safe regeneration scripts** — CLI tools (`regenerate-titles.ts`, `regenerate-species.ts`) with progress-sidecar JSON files so long batch runs survive interruption and restart exactly where they left off.
- **Species-targeted batch regeneration** — given a set of species tokens (e.g. `jiralhanae kig-yar unggoy flood`), the system fetches all Halopedia descriptions in batches of 50, filters to matching characters, and regenerates only those images — without touching the rest of the asset library.
- **Faction audit tooling** — `scripts/faction-audit.ts` fetches live Halopedia descriptions for all 400+ entities and reports coverage, likely-wrong detections, and zero-faction entries — enabling continuous verification of classifier accuracy.

### Description & Image Infrastructure

Beyond image generation, a full **data reliability layer** ensures every entity in the wiki always has both an image and a description — regardless of Halopedia API availability:

- **Multi-tier description resolution** — `resolveDescription()` tries Halopedia live extract first, falls back to a GCS-backed text archive (`descriptions/{type}/{slug}.txt`), then to curated hand-written overrides. Descriptions contain faction keywords so the classifier works even when the API is down.
- **Official image mirroring** — Halopedia thumbnails for all lore entities (characters, weapons, vehicles, races, planets) are mirrored to GCS at deploy time via `scripts/mirror-halopedia-images.ts`. The script follows MediaWiki redirects, maps resolved titles back to canonical keys, and never re-downloads already-mirrored assets.
- **Description database sync** — `scripts/sync-descriptions.ts` fetches Halopedia extracts, falls back to curated content, writes `descriptions/{type}/{slug}.txt` to GCS as a source-of-truth archive, and updates `src/generated-descriptions.json` for bundling — all in one CI step.
- **Build-time JSON maps** — `generated-{type}-images.json` files are committed and updated by CI, so the SPA resolves images with zero runtime API calls.

### Faction Registry

A static cross-category catalog linking every character, weapon, vehicle, race, and planet to their faction — with zero runtime cost:

- **`src/faction-registry.ts`** — six factions (UNSC, Covenant, Forerunner, Banished, Flood, Swords of Sanghelios), each with a full entity catalog across all categories.
- **Factions page** — animated detail panel per faction showing every associated entity as deep-linked colored tags, navigating to the relevant catalog section.
- **Continuous accuracy verification** — `faction-audit.ts` cross-references live Halopedia data against detected factions and flags mismatches. Reduced likely-wrong detections from 56 → 29 and no-faction entries from 224 → 118 through iterative classifier improvements.

### GCP Infrastructure

The entire stack runs on Google Cloud Platform with zero manual deployment steps after the initial setup:

| Service | Role |
|---|---|
| **Cloud Run** | Serverless container hosting — scales to zero, zero ops overhead |
| **Global Load Balancer + Cloud CDN** | Custom domain (`halo-wiki.com`) with SSL, global edge caching |
| **Artifact Registry** | Private Docker image registry |
| **Cloud Storage (GCS)** | Public CDN for AI-generated images (~500+ assets) |
| **Vertex AI — Imagen 3** | `imagen-3.0-generate-002` model for image generation |
| **Workload Identity Federation** | Keyless authentication from GitHub Actions to GCP — no long-lived credentials stored anywhere |

### CI/CD Pipeline (GitHub Actions)

Five-stage pipeline triggers on every push to `main`:

```
1. Lint              → TypeScript type-check (tsc -b)
2. Build             → Vite production bundle
3. Mirror images     → Halopedia thumbnails → GCS (incremental, redirect-aware)
4. Sync descriptions → Halopedia extracts → GCS text archive → generated-descriptions.json
5. Docker            → Build image, push to Artifact Registry,
                       run generate-missing-images for any new entities
6. Deploy            → Zero-downtime deploy to Cloud Run
```

Key pipeline decisions:
- **Workload Identity Federation** instead of service account JSON keys — the pipeline authenticates to GCP using short-lived OIDC tokens, eliminating credential rotation risk.
- **Content-hashed JS bundles + `no-cache` on `index.html`** — ensures browsers always fetch the latest entry point while aggressively caching immutable assets.
- **Incremental image generation in CI** — the Docker build step runs the generation script, which checks GCS for existing images and only generates missing ones, keeping build times bounded as the wiki grows.
- **Auto-commit of generated assets** — CI commits updated `generated-*-images.json` and `generated-descriptions.json` back to `main` after each run, keeping the image maps in sync with the live asset library without manual intervention.

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | TailwindCSS v4 |
| Animation | Framer Motion |
| Routing | React Router v6 |
| 3D | Three.js via @react-three/fiber |
| Data | Halopedia MediaWiki API |
| Container | Docker (nginx) |

Key frontend engineering decisions:

- **Two-phase character loading** — curated lore characters (Master Chief, Cortana, Thel 'Vadam…) appear instantly via a fast targeted fetch. The full category load runs in the background and merges without wiping the initial render — users see content in ~1s regardless of API latency.
- **IntersectionObserver infinite scroll** — a sentinel element 400px below the viewport triggers progressive disclosure of large entity lists, with a manual Load More fallback for environments where IntersectionObserver is unavailable.
- **Per-route animated backgrounds** — each wiki section (characters, weapons, vehicles, factions…) renders a distinct Halo scene wallpaper as a fixed background layer. `AnimatePresence` crossfades between wallpapers (0.6s) on navigation. A layered dark overlay + bottom vignette keep all content readable over the image.
- **Animated collapsible sidebar** — Framer Motion drives the expand/collapse with neon Orbitron tags that glow on active routes. Width transitions smoothly between icon-only (64px) and full-label (240px) modes.

---

## Architecture

```
Browser
  └── React SPA (Vite — content-hashed bundles)
        ├── React Router v6 (client-side routing)
        ├── Framer Motion (page transitions + animated backgrounds)
        ├── Three.js (3D model viewer)
        └── src/api/halopedia.ts
              ├── Halopedia MediaWiki API  (live wiki data + descriptions)
              ├── GCS public CDN           (AI-generated + mirrored images)
              └── inferFaction()           (classifier — name patterns + keyword scan)

CI/CD (GitHub Actions)
  ├── tsc + vite build
  ├── scripts/mirror-halopedia-images.ts   → GCS
  ├── scripts/sync-descriptions.ts         → GCS + generated-descriptions.json
  ├── Docker → Artifact Registry
  ├── scripts/generate-missing-images.ts
  │     └── Vertex AI Imagen 3 → GCS
  └── gcloud run deploy → Cloud Run

Image & Description Pipeline
  scripts/
  ├── prompt-builder.ts          ← faction + species detection + prompt construction
  ├── lore-prompts.ts            ← curated overrides for canonical entities
  ├── generate-missing-images.ts ← CI entrypoint (incremental, GCS-checked)
  ├── mirror-halopedia-images.ts ← official image mirroring (all entity types)
  ├── sync-descriptions.ts       ← description sync to GCS + JSON
  ├── faction-audit.ts           ← coverage + accuracy verification tool
  ├── regenerate-titles.ts       ← targeted regeneration by title list
  └── regenerate-species.ts      ← species-targeted batch regeneration

Static Data
  src/
  ├── faction-registry.ts        ← cross-category faction catalog (zero runtime cost)
  ├── generated-descriptions.json← bundled description fallback DB
  └── generated-*-images.json    ← GCS image URL maps (updated by CI, committed)
```

---

## Local Development

### Prerequisites

- Node.js 20+
- GCP project with Vertex AI and GCS enabled (for image generation scripts)

### Setup

```bash
git clone <repo-url>
cd halowiki
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:5173
```

### Docker

```bash
docker compose up dev      # dev server with hot reload
docker compose up preview  # production build preview → http://localhost:8080
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_HALOPEDIA_API_URL` | Halopedia MediaWiki API base URL |
| `VITE_APP_TITLE` | App title shown in browser tab |
| `GCP_PROJECT_ID` | GCP project (CI + image generation scripts) |
| `GCP_REGION` | Cloud Run region (`us-central1`) |
| `GCS_BUCKET` | GCS bucket for generated images (defaults to `{PROJECT_ID}-generated-images`) |

---

## Infrastructure as Code (Terraform)

All GCP infrastructure is fully codified under `terraform/`. A single `terraform apply` provisions everything from scratch; `terraform destroy` tears it all down to eliminate costs when the project is paused.

### Resources managed

| File | Resources |
|---|---|
| `apis.tf` | All required GCP project service APIs |
| `storage.tf` | GCS bucket for AI-generated images (public CDN) |
| `registry.tf` | Artifact Registry Docker repository |
| `iam.tf` | GitHub Actions service account, IAM bindings, Workload Identity Federation pool + provider |
| `cloudrun.tf` | Cloud Run v2 service (scale-to-zero, public ingress) |
| `lb.tf` | Global Load Balancer, Cloud CDN, SSL certificate, custom domain routing |

### Bring the project up

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# fill in project_id and github_repo
terraform init
terraform apply
# outputs the GitHub secret values to paste into repo settings
```

Then trigger CI to deploy the app:

```bash
git commit --allow-empty -m "chore: trigger deploy" && git push
```

### Pause the project (eliminate costs)

```bash
terraform destroy
```

The GCS images bucket is **preserved by default** — your generated image library survives the teardown. Only Cloud Run, Artifact Registry, WIF, and the service account are destroyed. Storage cost while paused: ~$0.02/GB/month.

To also wipe the images bucket:

```bash
terraform destroy -var="destroy_images_bucket=true"
```

### GitHub Secrets (output by Terraform)

After `terraform apply`, run:

```bash
terraform output github_secrets_summary
```

Paste the three values into `github.com/<you>/<repo>/settings/secrets/actions`:

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_SERVICE_ACCOUNT` | Service account email (from Terraform output) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name (from Terraform output) |

---

## Project Structure

```
src/
├── api/                       # Halopedia API client, faction classifier, image resolution
├── components/
│   ├── layout/                # Sidebar, Header, Layout (animated per-route backgrounds)
│   └── ui/                    # Card, Badge, Spinner, SearchBar, WikiGrid
├── hooks/                     # useFetch, useSearch
├── pages/                     # Weapons, Vehicles, Characters, Races, Planets, Games,
│                              # Factions, About
├── types/                     # TypeScript interfaces
├── faction-registry.ts        # Static cross-category faction catalog
├── generated-descriptions.json# Bundled description fallback database
└── generated-*-images.json    # GCS image URL maps (committed, updated by CI)

scripts/
├── prompt-builder.ts          # Core: faction detection + prompt construction
├── lore-prompts.ts            # Curated prompts for canonical entities
├── generate-missing-images.ts # CI image generation entrypoint
├── mirror-halopedia-images.ts # Official image mirroring (characters, weapons, vehicles, races, planets)
├── sync-descriptions.ts       # Description sync → GCS archive + generated-descriptions.json
├── faction-audit.ts           # Faction coverage + accuracy audit tool
├── regenerate-titles.ts       # Targeted regeneration by title
└── regenerate-species.ts      # Species-targeted batch regeneration

terraform/
├── apis.tf                    # GCP service API enablement
├── storage.tf                 # GCS bucket (public CDN)
├── registry.tf                # Artifact Registry
├── iam.tf                     # Service account, IAM, Workload Identity Federation
├── cloudrun.tf                # Cloud Run v2 service
└── lb.tf                      # Global Load Balancer + custom domain + SSL
```

---

## License

MIT
