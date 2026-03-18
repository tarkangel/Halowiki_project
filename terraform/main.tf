terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Uncomment to store state in GCS (recommended for shared use):
  # backend "gcs" {
  #   bucket = "<your-tfstate-bucket>"
  #   prefix = "halowiki/terraform.tfstate"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  images_bucket = var.images_bucket != "" ? var.images_bucket : "${var.project_id}-generated-images"
  image_uri     = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/${var.cloud_run_service}:latest"
}
