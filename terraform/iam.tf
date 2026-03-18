# ── Service Account ───────────────────────────────────────────────────────────

resource "google_service_account" "github_actions" {
  account_id   = var.github_actions_sa
  display_name = "GitHub Actions — Halo Wiki CI/CD"
  description  = "Used by GitHub Actions to push images, generate assets, and deploy to Cloud Run"
}

# ── IAM Bindings ──────────────────────────────────────────────────────────────

locals {
  sa_roles = [
    "roles/run.admin",                # deploy Cloud Run services
    "roles/artifactregistry.writer",  # push Docker images
    "roles/storage.objectAdmin",      # read/write GCS image assets
    "roles/aiplatform.user",          # call Vertex AI Imagen
    "roles/iam.serviceAccountUser",   # act as SA when deploying Cloud Run
  ]
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset(local.sa_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# ── Workload Identity Federation ──────────────────────────────────────────────
# Keyless authentication — GitHub Actions exchanges a short-lived OIDC token for
# a GCP access token. No long-lived JSON key credentials are stored anywhere.

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "WIF pool for GitHub Actions OIDC tokens"

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-repo"
  display_name                       = "GitHub Repo OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  # Restrict token exchange to only this repository.
  attribute_condition = "assertion.repository == '${var.github_repo}'"
}

# Allow the GitHub repo's OIDC tokens to impersonate the service account.
resource "google_service_account_iam_member" "wif_sa_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
