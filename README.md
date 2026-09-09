# HUMID1 Dashboard

> **Production-Grade IoT Telemetry & Climate Control Platform for Precision Cigar Humidors**

HUMID1 is a modern, high-performance web dashboard built with React 18, TypeScript, Tailwind CSS, and Vite. It connects directly to the ThingsBoard IoT engine and Authentik Identity Provider to provide real-time climate monitoring, dual-axis telemetry visualization, hardware claiming, shared-attribute remote controls, over-the-air (OTA) firmware update orchestration, and real-time alarms.

[![Donate to Humid1](https://custom-icon-badges.demolab.com/badge/Donate-Humid1.com-4A154B?style=plastic&logo=signupgenius&logoColor=white)](https://tools.signupgenius.com/c/support-humid1-project)  

### 🎞️ [Screen Captures (Beta Preview)](/SNAPSHOTS.md)

## 🏛️ Architecture Overview

```
├── public/                             # Static assets, Web Manifest, Favicons, Runtime Config Placeholders
├── docs/                               # Production architecture, API manifest, and workflow guides
│   ├── architecture.md                 # System topology, visual design identity, data schemas
│   ├── api_manifest.md                 # Complete JSON request/response reference manifest
│   ├── twa_bubblewrap_guide.md         # Android TWA & Bubblewrap build steps
│   └── release_workflow.md             # CI/CD git tags & automatic build workflows
├── src/
│   ├── components/                     # Modular, isolated UI and modal components
│   │   ├── AboutModal.tsx              # System release details, credits, and support modal
│   │   ├── AlarmsFeed.tsx              # Active & historic alarms feed with Ack/Clear actions
│   │   ├── ApiInspectorModal.tsx       # Live HTTP transaction inspector, raw logs & token decoder
│   │   ├── AuthModal.tsx               # ThingsBoard REST & SSO authentication manager
│   │   ├── ClaimDeviceModal.tsx        # Hardware device claiming workflow modal
│   │   ├── ClimateGauges.tsx           # Real-time RH%, Temperature, Battery, and RSSI gauges
│   │   ├── ControlPanel.tsx            # Remote hardware parameters & threshold adjustment panel
│   │   ├── DevelopmentWarningModal.tsx # Demo mode and mock environment alert banner
│   │   ├── DeviceStatusHeader.tsx      # Active hardware unit selector & health diagnostics
│   │   ├── HeaderTicker.tsx            # Stock-ticker style live multi-device status marquee
│   │   ├── HistoricalChart.tsx         # Synchronized Recharts dual-axis climate history with LTTB downsampling
│   │   ├── HumidorTelemetryWidget.tsx  # Direct @enerlab/thingsboard-client timeseries monitor
│   │   ├── OtaUpdateCenter.tsx         # OTA firmware release manager and live progress bar
│   │   ├── ProtectedRoute.tsx          # Auth-guard gate supporting Authentik OIDC & ThingsBoard JWT
│   │   ├── PushNotificationModal.tsx   # Web Push API configuration and test trigger dialog
│   │   ├── PWAInstallButton.tsx        # Dynamic Progressive Web App install prompt button
│   │   ├── RemoveDeviceModal.tsx       # Device unclaim / delete confirmation dialog
│   │   └── ServerConfigModal.tsx       # Runtime endpoints & domain configuration modal
│   ├── config/
│   │   └── env.ts                      # Domain aggregator & runtime environment loader
│   ├── hooks/
│   │   ├── usePWAInstall.ts            # PWA install prompt lifecycle and event listener
│   │   └── useThingsBoardTelemetry.ts  # Typed telemetry hook with delta-detection & sleep tracking
│   ├── services/
│   │   ├── alarmThresholds.ts          # Canonical Kelvin threshold engine, presets & °F/°C/K converters
│   │   ├── apiClientInit.ts            # Global interceptors with reactive token refresh
│   │   ├── apiLogger.ts                # In-memory & localStorage HTTP network transaction recorder
│   │   ├── notificationService.ts      # Audio sound generator and notification dispatcher
│   │   ├── oidcConfig.ts               # Authentik OpenID Connect client configuration
│   │   ├── pushNotifications.ts        # Web Push API service worker subscription manager
│   │   ├── tbClientService.ts          # @enerlab/thingsboard-client singleton & Zod schema parser
│   │   └── thingsboard.ts              # Unified ThingsBoard IoT engine (telemetry, RPC, claiming)
│   ├── utils/
│   │   ├── authTokens.ts               # JWT normalization, expiration check & token discovery
│   │   ├── downsample.ts               # LTTB time-series downsampling algorithm for high performance
│   │   ├── env.ts                      # Universal environment variable accessor
│   │   └── url.ts                      # Domain and URL normalization helpers
│   ├── types.ts                        # Centralized TypeScript interface & enum definitions
│   ├── App.tsx                         # Root application orchestrator
│   └── main.tsx                        # Application entry point with OIDC AuthProvider wrapping
├── Dockerfile                          # Multi-stage optimized production build (Node builder + Alpine Nginx)
├── docker-compose.yml                  # Container orchestration with environment variable passing
├── docker-entrypoint.sh                # Dynamic runtime environment injector (generates config.js at boot)
└── nginx.conf                          # Production Nginx reverse-proxy configuration with SPA fallback
```

---

## ⚡ Key Features

- **Multi-Device Live Marquee Ticker:** Continuously scrolling top-bar ticker displaying real-time humidity, temperature, battery, and connection status across all claimed units.
- **Precision Climate Gauges & Mobile Layout:** Responsive, touch-friendly climate cards and gauges with dynamic °F/°C switching and comfort range boundaries optimized for phones and tablets.
- **Runtime Configurable Alarm Thresholds:** Configure target relative humidity, warning/critical RH bounds, high/low temperature limits, and low battery thresholds directly in the UI during runtime, syncing with ThingsBoard shared attributes.
- **Synchronized Historical Analytics:** High-resolution dual-axis time-series charts (12h, 24h, 3d, 7d ranges) powered by Recharts with dynamic threshold reference lines.
- **Role-Aware Permission Safeguards:** Automatic handling of `CUSTOMER_USER` privileges—preventing unauthorized calls to tenant admin endpoints and seamlessly delegating device removal to safe claiming/unclaiming workflows.
- **ThingsBoard SDK & REST Integration:** Powered by `@enerlab/thingsboard-client` with proactive and reactive 401 token refresh interceptors.
- **Authentik SSO & OIDC Security:** Unified authentication gate supporting OAuth2 SSO redirects and direct REST token inspection.
- **Remote Hardware Control:** Adjust RTC deep-sleep wake intervals, visual device themes, and sound alert toggles with hardware safety lockout rules.
- **Live OTA Firmware Updates:** Track firmware release states (`DOWNLOADING`, `VERIFIED`, `UPDATING`) with real-time percentage progress indicators.
- **Real-Time Alarms Management:** Acknowledge and clear active humidor threshold violations and system warnings with one click.
- **Decoupled Asset CI/CD Workflows:** Manifests and Bubblewrap TWA builds pull brand assets directly from public repository URLs, eliminating local runner server overhead.
- **Built-in API Transaction Inspector:** Real-time diagnostics modal recording every outbound request, response status, duration, and payload.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Local Development

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🐳 Docker Deployment

The application is bundled into a lightweight, secure container image running Nginx Alpine with runtime environment variable injection:

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

Container runtime variables are dynamically compiled into `window.__HUMID1_CONFIG__` and `window.__ENV__` by `docker-entrypoint.sh` upon container start.

---

## 🔧 Environment Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_THINGSBOARD_URL` | `https://app.humid1.com` | ThingsBoard IoT platform endpoint |
| `VITE_AUTHENTIK_URL` | `https://auth.humid1.com` | Authentik Identity Provider endpoint |
| `VITE_AUTHENTIK_APP_SLUG`| `humid1-dash` | Authentik Application provider slug |
| `VITE_AUTHENTIK_CLIENT_ID`| `7nvidWHfM8C3wE3VKGqFNGFNnl9aou46mL5kporI`| Authentik OAuth2 Client ID |
| `VITE_DASHBOARD_URL` | `https://dash.humid1.com` | Origin URL for this dashboard instance |
| `VITE_APP_REDIRECT_URI` | `https://dash.humid1.com/auth/callback` | OIDC redirect callback URL |
| `VITE_DEFAULT_DEVICE_NAME`| `CEDAR-CABINET-X9` | Default hardware unit identifier when none claimed |
| `VITE_APP_TITLE` | `HUMID1` | Application Title |
| `VITE_APP_DESCRIPTION` | `<SEE ENV FILE>` | Application description |
| `VITE_DASHBOARD_VERSION` | `1.0.6-beta` | Current release build version |
| `VITE_DASHBOARD_REVISION` | `dev` | Current revision name |

---

## 📱 Progressive Web App (PWA) & Android TWA

HUMID1 is fully compliant with Google PWA and **Trusted Web Activity (TWA)** specifications:
- **Service Worker:** Powered by `vite-plugin-pwa` with Workbox v7 precaching & automatic background updates.
- **Web Push API:** Push notification service for high-priority humidity breaches, temperature alarms, and low battery alerts.
- **Digital Asset Links:** Served at `/.well-known/assetlinks.json` linking `dash.humid1.com` to `com.humid1.app` for address-bar-free native Android execution.
- **Bubblewrap Build Guide:** Step-by-step instructions to compile the native Android APK/AAB are documented in:
  👉 **[`docs/twa_bubblewrap_guide.md`](docs/twa_bubblewrap_guide.md)**

---

## 📡 API Transaction & JSON Manifest

A full catalog of real request/response payloads, headers, curl examples, and WebSocket formats across ThingsBoard REST, Authentik OIDC PKCE, ESP32 telemetry ingestion, shared attribute sync, device claiming, and 2-way RPC commands is documented in:

👉 **[`docs/api_manifest.md`](docs/api_manifest.md)**

---

## 🧪 Quality & Verification

Run the TypeScript type checker and linter:
```bash
npm run lint
```

Build the production distribution:
```bash
npm run build
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

[![none](https://wsrv.nl/?url=github.com/Humiditron.png&w=32&h=32&fit=cover&mask=circle&filt=greyscale "@Humiditron")](https://github.com/Humiditron/)
[![none](https://wsrv.nl/?url=github.com/google-gemini.png&w=32&h=32&fit=cover&mask=circle&filt=greyscale "@google-gemini")](https://github.com/google-gemini/)

© 2026 **Humidyne-Labs**
