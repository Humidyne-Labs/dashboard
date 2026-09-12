#!/bin/sh
set -e

# Robust environment variable sanitization helper
sanitize_val() {
  # 1. Remove trailing carriage returns and hash comments (e.g. # comment)
  val=$(echo "$1" | tr -d '\r' | sed 's/#.*//')
  # 2. Strip any leading or trailing spaces, double quotes, or single quotes
  val=$(echo "$val" | sed -e 's/^[ "'\'']*//' -e 's/[ "'\'']*$//')
  echo "$val"
}

# Resolve and sanitize each configuration variable
RESOLVED_THINGSBOARD_URL=$(sanitize_val "${THINGSBOARD_URL:-${THINGSBOARD_SERVER_URL:-${VITE_THINGSBOARD_URL:-${VITE_THINGSBOARD_SERVER_URL:-https://app.humid1.com}}}}")
RESOLVED_AUTHENTIK_URL=$(sanitize_val "${AUTHENTIK_URL:-${VITE_AUTHENTIK_URL:-https://auth.humid1.com}}")
RESOLVED_AUTHENTIK_APP_SLUG=$(sanitize_val "${AUTHENTIK_APP_SLUG:-${AUTHENTIK_SLUG:-${VITE_AUTHENTIK_APP_SLUG:-${VITE_AUTHENTIK_SLUG:-humid1-dash}}}}")
RESOLVED_AUTHENTIK_CLIENT_ID=$(sanitize_val "${AUTHENTIK_CLIENT_ID:-${VITE_AUTHENTIK_CLIENT_ID:-7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI}}")
RESOLVED_DASHBOARD_URL=$(sanitize_val "${DASHBOARD_URL:-${VITE_DASHBOARD_URL:-https://dash.humid1.com}}")
RESOLVED_DEFAULT_DEVICE_NAME=$(sanitize_val "${DEFAULT_DEVICE_NAME:-${VITE_DEFAULT_DEVICE_NAME:-HUMID1-CABINET-01}}")
RESOLVED_DASHBOARD_VERSION=$(sanitize_val "${DASHBOARD_VERSION:-${VITE_DASHBOARD_VERSION:-1.0.6-beta}}")
RESOLVED_DASHBOARD_REVISION=$(sanitize_val "${DASHBOARD_REVISION:-${VITE_DASHBOARD_REVISION:-dev}}")
RESOLVED_APP_TITLE=$(sanitize_val "${VITE_APP_TITLE:-HUMID1 Telemetry Dashboard}")
RESOLVED_APP_DESCRIPTION=$(sanitize_val "${VITE_APP_DESCRIPTION:-Precision Humidor Monitoring & Telemetry Stack}")
RESOLVED_APP_REDIRECT_URI=$(sanitize_val "${VITE_APP_REDIRECT_URI:-}")

# Dynamically generate runtime configuration for the SPA
cat <<EOF > /usr/share/nginx/html/config.js
window.__HUMID1_CONFIG__ = {
  THINGSBOARD_URL: "${RESOLVED_THINGSBOARD_URL}",
  AUTHENTIK_URL: "${RESOLVED_AUTHENTIK_URL}",
  AUTHENTIK_APP_SLUG: "${RESOLVED_AUTHENTIK_APP_SLUG}",
  AUTHENTIK_CLIENT_ID: "${RESOLVED_AUTHENTIK_CLIENT_ID}",
  DASHBOARD_URL: "${RESOLVED_DASHBOARD_URL}",
  DEFAULT_DEVICE_NAME: "${RESOLVED_DEFAULT_DEVICE_NAME}",
  DASHBOARD_VERSION: "${RESOLVED_DASHBOARD_VERSION}",
  DASHBOARD_REVISION: "${RESOLVED_DASHBOARD_REVISION}"
};
console.info("[HUMID1] Runtime domain config loaded successfully.", window.__HUMID1_CONFIG__);
EOF

cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_APP_TITLE: "${RESOLVED_APP_TITLE}",
  VITE_APP_DESCRIPTION: "${RESOLVED_APP_DESCRIPTION}",
  VITE_DASHBOARD_URL: "${RESOLVED_DASHBOARD_URL}",
  VITE_THINGSBOARD_URL: "${RESOLVED_THINGSBOARD_URL}",
  VITE_AUTHENTIK_URL: "${RESOLVED_AUTHENTIK_URL}",
  VITE_AUTHENTIK_APP_SLUG: "${RESOLVED_AUTHENTIK_APP_SLUG}",
  VITE_AUTHENTIK_CLIENT_ID: "${RESOLVED_AUTHENTIK_CLIENT_ID}",
  VITE_DEFAULT_DEVICE_NAME: "${RESOLVED_DEFAULT_DEVICE_NAME}",
  VITE_APP_REDIRECT_URI: "${RESOLVED_APP_REDIRECT_URI}",
  VITE_DASHBOARD_VERSION: "${RESOLVED_DASHBOARD_VERSION}",
  VITE_DASHBOARD_REVISION: "${RESOLVED_DASHBOARD_REVISION}"
};
EOF

# Execute standard CMD (starts Nginx)
exec "$@"

