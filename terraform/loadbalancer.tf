# Global Load Balancer — routes halo-wiki.com → Cloud Run
# Architecture: Static IP → HTTPS Forwarding Rule → Target HTTPS Proxy → URL Map
#               → Backend Service → Serverless NEG → Cloud Run
# HTTP (port 80) is automatically redirected to HTTPS.

# ── 1. Static external IP ─────────────────────────────────────────────────────

resource "google_compute_global_address" "halowiki_ip" {
  name       = "halowiki-ip"
  depends_on = [google_project_service.apis]
}

# ── 2. Serverless NEG (Network Endpoint Group) pointing to Cloud Run ──────────

resource "google_compute_region_network_endpoint_group" "halowiki_neg" {
  name                  = "halowiki-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.halowiki.name
  }
}

# ── 3. Backend service ────────────────────────────────────────────────────────

resource "google_compute_backend_service" "halowiki_backend" {
  name                  = "halowiki-backend"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.halowiki_neg.id
  }
}

# ── 4. URL map (HTTPS traffic) ────────────────────────────────────────────────

resource "google_compute_url_map" "halowiki_https" {
  name            = "halowiki-https"
  default_service = google_compute_backend_service.halowiki_backend.id
}

# ── 5. Google-managed SSL certificate ─────────────────────────────────────────

resource "google_compute_managed_ssl_certificate" "halowiki_cert" {
  name       = "halowiki-cert"
  depends_on = [google_project_service.apis]

  managed {
    domains = [
      "halo-wiki.com",
      "www.halo-wiki.com",
    ]
  }
}

# ── 6. HTTPS proxy + forwarding rule (port 443) ───────────────────────────────

resource "google_compute_target_https_proxy" "halowiki_https_proxy" {
  name             = "halowiki-https-proxy"
  url_map          = google_compute_url_map.halowiki_https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.halowiki_cert.id]
}

resource "google_compute_global_forwarding_rule" "halowiki_https" {
  name                  = "halowiki-https"
  ip_address            = google_compute_global_address.halowiki_ip.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.halowiki_https_proxy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ── 7. HTTP → HTTPS redirect (port 80) ───────────────────────────────────────

resource "google_compute_url_map" "halowiki_http_redirect" {
  name       = "halowiki-http-redirect"
  depends_on = [google_project_service.apis]

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "halowiki_http_proxy" {
  name    = "halowiki-http-proxy"
  url_map = google_compute_url_map.halowiki_http_redirect.id
}

resource "google_compute_global_forwarding_rule" "halowiki_http" {
  name                  = "halowiki-http"
  ip_address            = google_compute_global_address.halowiki_ip.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.halowiki_http_proxy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
