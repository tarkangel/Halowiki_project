# Cloud Run Domain Mappings — reemplaza el Global Load Balancer (~$25 USD/mes)
# Arquitectura: Cloudflare (DNS + TLS proxy, gratis) → domain mapping → Cloud Run
#
# Después de aplicar, obtener los CNAME targets con:
#   terraform output domain_mapping_cname_root
#   terraform output domain_mapping_cname_www
# y pegarlos en Cloudflare DNS como registros CNAME con proxy ON.
#
# Cloudflare maneja: HTTP→HTTPS redirect, CDN, DDoS protection.
# Google maneja: cert TLS del dominio personalizado.

# ── halo-wiki.com (raíz) ──────────────────────────────────────────────────────

resource "google_cloud_run_domain_mapping" "root" {
  location = var.region
  name     = "halo-wiki.com"

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = var.cloud_run_service
  }

  depends_on = [google_project_service.apis]
}

# ── www.halo-wiki.com ─────────────────────────────────────────────────────────

resource "google_cloud_run_domain_mapping" "www" {
  location = var.region
  name     = "www.halo-wiki.com"

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = var.cloud_run_service
  }

  depends_on = [google_project_service.apis]
}
