# Artifact Registry repository for Docker images.
# CI pushes a new image on every deploy; Cloud Run pulls from here.

resource "google_artifact_registry_repository" "halowiki" {
  repository_id = var.artifact_registry_repo
  location      = var.region
  format        = "DOCKER"
  description   = "Halo Wiki Docker images"

  depends_on = [google_project_service.apis]
}
