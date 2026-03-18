variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all regional resources"
  type        = string
  default     = "us-central1"
}

variable "github_repo" {
  description = "GitHub repository in owner/name format (used for Workload Identity Federation)"
  type        = string
  # e.g. "tarkangel/Halowiki_project"
}

variable "cloud_run_service" {
  description = "Cloud Run service name"
  type        = string
  default     = "halowiki"
}

variable "artifact_registry_repo" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "halowiki"
}

variable "github_actions_sa" {
  description = "Service account name for GitHub Actions"
  type        = string
  default     = "github-actions-halowiki"
}

variable "images_bucket" {
  description = "GCS bucket name for AI-generated images"
  type        = string
  default     = ""  # defaults to {project_id}-generated-images in storage.tf
}

variable "destroy_images_bucket" {
  description = <<-EOT
    Set to true to allow 'terraform destroy' to delete the GCS images bucket and all its contents.
    Default false — keeps generated images safe when tearing down the rest of the infra to save costs.
  EOT
  type    = bool
  default = false
}

variable "cloud_run_image" {
  description = <<-EOT
    Docker image URI for the Cloud Run service.
    CI/CD overrides this on every deploy — set to the latest pushed image to import existing service,
    or leave as the placeholder to let Terraform create the service on first apply.
  EOT
  type    = string
  default = "us-docker.pkg.dev/cloudrun/container/hello"  # GCP hello-world placeholder
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances (0 = scale to zero, eliminates idle cost)"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 10
}
