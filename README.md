# Halo Wiki

A production-grade, AI-powered encyclopedia for the Halo universe — built end-to-end as a showcase of modern cloud engineering, AI agent orchestration, and DevOps practices.

Live at: [halowiki on Cloud Run](https://halowiki-*.run.app)

---

## What this project demonstrates

This is not a tutorial clone or a template project. Every architectural decision, pipeline stage, and AI integration was designed and implemented from scratch — including the tooling to generate, validate, and serve thousands of AI-generated assets at scale.

### AI Agent Orchestration

The most technically distinctive aspect of this project is the **AI-driven asset pipeline** — a system that uses Google Vertex AI (Imagen 3) to generate contextually accurate images for every entity in the wiki (characters, weapons, vehicles, races, planets, locations). This required building a full orchestration layer on top of the raw API:

- **Two-pass faction detection engine** — a deterministic classifier in TypeScript that identifies which Halo faction an entity belongs to (UNSC, Covenant, Banished, Forerunner, Flood) using structural name patterns first, then keyword scanning of live Halopedia descriptions. Priority ordering prevents false positives across 400+ entities.
- **Prompt engineering pipeline** — a `buildPrompt()` function that constructs faction-aware, species-aware, type-aware art direction prompts. Jiralhanae characters get gorilla-primate anatomy descriptions; Forerunner monitors get floating-orb construct prompts; Flood entities get biomass horror framing — all automatically, from Halopedia metadata alone.
- **Lore override system** — a curated `lore-prompts.ts` library of hand-crafted prompts for canonical named entities (Gravemind, Atriox, Master Chief, iconic vehicles) that override the automatic pipeline when a character warrants bespoke art direction.
- **Resume-safe regeneration scripts** — CLI tools (`regenerate-titles.ts`, `regenerate-species.ts`) with progress-sidecar JSON files so long batch runs survive interruption and restart exactly where they left off.
- **Species-targeted batch regeneration** — given a set of species tokens (e.g. `jiralhanae kig-yar unggoy flood`), the system fetches all Halopedia descriptions in batches of 50, filters to matching characters, and regenerates only those images — without touching the rest of the asset library.

### GCP Infrastructure

The entire stack runs on Google Cloud Platform with zero manual deployment steps after the initial setup:

| Service | Role |
|---|---|
| **Cloud Run** | Serverless container hosting — scales to zero, zero ops overhead |
| **Artifact Registry** | Private Docker image registry |
| **Cloud Storage (GCS)** | Public CDN for AI-generated images (~500+ assets) |
| **Vertex AI — Imagen 3** | `imagen-3.0-generate-002` model for image generation |
| **Workload Identity Federation** | Keyless authentication from GitHub Actions to GCP — no long-lived credentials stored anywhere |

### CI/CD Pipeline (GitHub Actions)

Four-stage pipeline triggers on every push to `main`:

```
1. Lint       → TypeScript type-check (tsc -b)
2. Build      → Vite production bundle
3. Docker     → Build image, push to Artifact Registry,
                run image generation script for any new wiki entities
4. Deploy     → Zero-downtime deploy to Cloud Run
```

Key pipeline decisions:
- **Workload Identity Federation** instead of service account JSON keys — the pipeline authenticates to GCP using short-lived OIDC tokens, eliminating credential rotation risk.
- **Content-hashed JS bundles + `no-cache` on `index.html`** — ensures browsers always fetch the latest entry point while aggressively caching immutable assets.
- **Incremental image generation in CI** — the Docker build step runs the generation script, which checks GCS for existing images and only generates missing ones, keeping build times bounded as the wiki grows.

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

---

## Architecture

```
Browser
  └── React SPA (Vite — content-hashed bundles)
        ├── React Router v6 (client-side routing)
        ├── Framer Motion (page transitions)
        ├── Three.js (3D model viewer)
        └── src/api/halopedia.ts
              ├── Halopedia MediaWiki API  (live wiki data + descriptions)
              └── GCS public CDN           (AI-generated images)

CI/CD (GitHub Actions)
  ├── tsc + vite build
  ├── Docker → Artifact Registry
  ├── scripts/generate-missing-images.ts
  │     └── Vertex AI Imagen 3 → GCS
  └── gcloud run deploy → Cloud Run

Image Generation Pipeline
  scripts/
  ├── prompt-builder.ts        ← faction + species detection + prompt construction
  ├── lore-prompts.ts          ← curated overrides for canonical entities
  ├── generate-missing-images.ts   ← CI entrypoint (incremental, GCS-checked)
  ├── regenerate-titles.ts     ← targeted regeneration by title list
  └── regenerate-species.ts    ← species-targeted batch regeneration
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
├── api/                    # Halopedia API client + faction detection
├── components/
│   ├── layout/             # Sidebar, Header, Layout
│   └── ui/                 # Card, Badge, Spinner, SearchBar
├── hooks/                  # useFetch, useSearch
├── pages/                  # Weapons, Vehicles, Characters, Races, Planets, Games
├── types/                  # TypeScript interfaces
└── generated-*-images.json # GCS image URL maps (committed, updated by CI)

scripts/
├── prompt-builder.ts       # Core: faction detection + prompt construction
├── lore-prompts.ts         # Curated prompts for canonical entities
├── generate-missing-images.ts   # CI image generation entrypoint
├── regenerate-titles.ts    # Targeted regeneration by title
└── regenerate-species.ts   # Species-targeted batch regeneration
```

---

## License

MIT
