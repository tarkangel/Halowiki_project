output "domain_mapping_cname_root" {
  description = "CNAME target para halo-wiki.com — pegar en Cloudflare DNS (registro @)"
  value       = length(google_cloud_run_domain_mapping.root.status) > 0 ? google_cloud_run_domain_mapping.root.status[0].resource_records[0].rrdata : "provisioning — re-run terraform output en ~5 minutos"
}

output "domain_mapping_cname_www" {
  description = "CNAME target para www.halo-wiki.com — pegar en Cloudflare DNS (registro www)"
  value       = length(google_cloud_run_domain_mapping.www.status) > 0 ? google_cloud_run_domain_mapping.www.status[0].resource_records[0].rrdata : "provisioning — re-run terraform output en ~5 minutos"
}

output "cloud_run_url" {
  description = "Public URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.halowiki.uri
}

output "images_bucket_url" {
  description = "Public base URL for AI-generated images"
  value       = "https://storage.googleapis.com/${google_storage_bucket.images.name}"
}

output "artifact_registry_repo" {
  description = "Full Artifact Registry repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}"
}

output "github_actions_sa_email" {
  description = "Service account email — add as GCP_SERVICE_ACCOUNT GitHub secret"
  value       = google_service_account.github_actions.email
}

output "workload_identity_provider" {
  description = "WIF provider resource name — add as GCP_WORKLOAD_IDENTITY_PROVIDER GitHub secret"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_secrets_summary" {
  description = "Copy these values into your GitHub repository secrets"
  value = {
    GCP_PROJECT_ID                 = var.project_id
    GCP_SERVICE_ACCOUNT            = google_service_account.github_actions.email
    GCP_WORKLOAD_IDENTITY_PROVIDER = google_iam_workload_identity_pool_provider.github.name
  }
}
