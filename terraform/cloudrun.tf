# Cloud Run service.
# Note: CI/CD deploys a new image revision on every push to main.
# Terraform manages the service configuration (scaling, memory, auth);
# the running image is controlled by the pipeline, not by this file.
#
# To pause the project and eliminate all Cloud Run costs:
#   terraform destroy -target=google_cloud_run_v2_service.halowiki
# The service will be recreated automatically on the next git push to main.

resource "google_cloud_run_v2_service" "halowiki" {
  name     = var.cloud_run_service
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      # CI replaces this image on every deploy.
      # On first apply (or after destroy+recreate), the GCP hello-world placeholder
      # serves until the next CI push deploys the real image.
      image = var.cloud_run_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true  # only charge for CPU during request processing
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "VITE_APP_TITLE"
        value = "Halo Wiki"
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.halowiki,
  ]
}

# Allow unauthenticated public access to the Cloud Run service.
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.halowiki.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
