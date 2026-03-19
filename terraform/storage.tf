# GCS bucket for AI-generated images served publicly as a CDN.
# destroy_images_bucket = false (default) keeps the bucket and all ~500 generated images
# safe during infra teardowns — re-applying just reconnects to the existing bucket.

resource "google_storage_bucket" "images" {
  name          = local.images_bucket
  location      = "US"
  storage_class = "STANDARD"

  # Prevent accidental deletion of the image library.
  # Set var.destroy_images_bucket = true only when you explicitly want to wipe everything.
  force_destroy = var.destroy_images_bucket

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 0 # never auto-delete; images are permanent assets
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }

  depends_on = [google_project_service.apis]
}

# Make all objects in the bucket publicly readable (images are served directly to browsers).
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Explicit bucket-level write access for the GitHub Actions SA.
# The project-level binding in iam.tf is sufficient in most cases, but with
# uniform_bucket_level_access = true, an explicit bucket-level binding avoids
# propagation delays and org-policy edge cases.
resource "google_storage_bucket_iam_member" "github_actions_write" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.github_actions.email}"
}
