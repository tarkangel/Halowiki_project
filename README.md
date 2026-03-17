# Halo Wiki

A modern, interactive encyclopedia for the Halo universe. Built with React, TypeScript, and TailwindCSS — deployed on GCP Cloud Run.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS v4 |
| Animation | Framer Motion |
| Routing | React Router v6 |
| 3D | Three.js via @react-three/fiber + @react-three/drei |
| Data | Halopedia MediaWiki API |
| Container | Docker (nginx) |
| Deploy | GCP Cloud Run |

## Architecture

```
Browser
  └── React SPA (Vite)
        ├── React Router v6 (client-side routing)
        ├── Framer Motion (page/component animations)
        ├── @react-three/fiber (3D model viewer)
        └── Halopedia API (MediaWiki REST)
              └── https://www.halopedia.org/api.php
```

## Local Development

### Prerequisites
- Node.js 20+
- Docker (optional, for container preview)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd halowiki
npm install

# Copy env
cp .env.example .env.local
# Edit .env.local with your values

# Start dev server
npm run dev
# → http://localhost:5173
```

### Using Docker Compose

```bash
# Dev server with hot reload
docker compose up dev

# Production build preview
docker compose up preview
# → http://localhost:8080
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_HALOPEDIA_API_URL` | Halopedia MediaWiki API base URL | `https://www.halopedia.org/api.php` |
| `VITE_APP_TITLE` | App title shown in browser | `Halo Wiki` |
| `GCP_PROJECT_ID` | GCP project ID (CI/CD only) | — |
| `GCP_REGION` | Cloud Run region | `us-central1` |
| `CLOUD_RUN_SERVICE` | Cloud Run service name | `halowiki` |

## Deployment (GCP Cloud Run)

### One-time GCP setup

```bash
# Enable APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Create Artifact Registry repo
gcloud artifacts repositories create halowiki \
  --repository-format=docker \
  --location=us-central1

# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions-halowiki \
  --display-name="GitHub Actions — Halo Wiki"

# Grant required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-halowiki@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-halowiki@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### GitHub Secrets required

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Federation provider |
| `GCP_SERVICE_ACCOUNT` | Service account email |

### CI/CD Pipeline

Push to `main` triggers:
1. **Lint** — TypeScript type-check
2. **Build** — Vite production build
3. **Docker push** — Build image, push to Artifact Registry
4. **Deploy** — Deploy to Cloud Run

## Project Structure

```
src/
├── api/            # Halopedia API client
├── components/
│   ├── layout/     # Sidebar, Header, Layout
│   └── ui/         # Card, Badge, Spinner, SearchBar
├── hooks/          # useFetch, useSearch
├── pages/          # Weapons, Vehicles, Characters, Races, Planets, Games
├── router/         # React Router configuration
└── types/          # TypeScript interfaces
public/
└── models/         # GLTF 3D models (see public/models/README.md)
```

## 3D Models

The app includes a Three.js model viewer. Placeholder geometric shapes are used by default.
See `public/models/README.md` for instructions on adding real Halo GLTF models.

## License

MIT
