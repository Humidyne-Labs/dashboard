# HUMID1 Frontend Dashboard Architecture & Design Spec

Welcome to the frontend system architecture and engineering specification for **HUMID1**, designed and engineered by **HUMIDYNE LABS**. This document outlines the actual structure, state management, security boundaries, and rendering engines powering the HUMID1 client dashboard.

---

## 1. System Topology & Decoupled Frontend

The HUMID1 Dashboard is a production-grade, highly-optimized React Single Page Application (SPA). Rather than directly interfacing with an application database or managing hardware nodes, the dashboard operates as a decoupled, stateless client that interfaces with ThingsBoard CE (IoT Core) and Authentik (Identity Provider) over standard HTTPS and REST interfaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HUMID1 DASHBOARD CORE (React)                   │
├───────────────────────┬───────────────────────┬────────────────────────┤
│     Auth & Session    │     Device Registry   │     Telemetry Feed     │
│   (Authentik OIDC /   │    (Claiming Engine / │    (Latest values &    │
│    ThingsBoard JWT)   │    Discovery Fetch)   │    Historical Charts)  │
└──────────┬────────────┴───────────┬───────────┴───────────┬────────────┘
           │                        │                       │
           ▼                        ▼                       ▼
    [Authentik IdP]          [ThingsBoard CE]        [ThingsBoard CE]
     SSO Portal /             Device Claiming/        Telemetry Engine/
     PKCE Tokens              Unclaim REST APIs       Historical Database
```

* **Client Engine**: Runs entirely in the user's browser, built on React 18, TypeScript, Vite, and styled with Tailwind CSS.
* **API Isolation**: All outbound network communications are abstracted through the central `ThingsBoardService` and `apiClientInit` global interceptors, allowing seamless runtime endpoint binding.
* **Simulated Demo Sandbox**: Implements an interactive **Demo Mode** with realistic synthetic telemetry generation and alarm modeling if external services are unreachable, providing instant trial usability.

---

## 2. Decoupled Visual Identity & UI Hierarchy

HUMID1’s visual architecture is focused on readability, high-contrast diagnostics, and an aesthetic suited for premium humidor units (slate tones with amber/gold accents):

* **Color Foundations**: Uses rich dark tones (`#020617` to `#0f172a`) with subtle warm gray dividers (`#1e293b`) to represent Cedarwood structures, combined with amber alerts (`#f59e0b`).
* **Bento Grid Architecture**: Responsive layout that scales from small mobile screens to large desktop monitors. The widgets are decoupled, containing internal state containers:
  1. **Stock-Ticker Marquee (`HeaderTicker.tsx`)**: An ambient scrolling banner displaying real-time global unit counts, active system-wide alerts, and active connections.
  2. **Device Selection Header (`DeviceStatusHeader.tsx`)**: High-fidelity metadata bar summarizing connection health, active Wi-Fi AP SSID, battery percentage, and firmware build version.
  3. **Precision Climate Gauges (`ClimateGauges.tsx`)**: Displays relative humidity (RH%) and temperature (°F / °C) inside custom-rendered responsive SVG dial indicators with dynamic display unit translation.
  4. **Dynamic Historical Chart (`HistoricalChart.tsx`)**: Implements dual-axis timeseries rendering using `recharts` with Largest-Triangle-Three-Buckets (LTTB) downsampling (`downsample.ts`) for smooth chart performance. Displays temperature and humidity on individual Y-axes with customizable time-windows (1h to 7d) and un-aggregated (`agg=NONE`) high-fidelity data feeds.
  5. **Unit Parameter Controls & Threshold Tuning (`ControlPanel.tsx`)**: Handles on-the-fly parameter tuning (deep-sleep intervals, hardware theme presets, threshold bounds, audibles) and triggers interactive hardware RPC commands (`ping`, `testBuzzer`, `syncTime`).
  6. **Over-The-Air Update Center (`OtaUpdateCenter.tsx`)**: Houses firmware version matrix status panels and renders dynamic OTA download/flash progress loops.
  7. **Alarms Management Feed (`AlarmsFeed.tsx`)**: Reports active and historic hardware warnings, integrating visual trigger bells and manual operators to acknowledge (`POST /api/alarm/{id}/ack`) or clear (`POST /api/alarm/{id}/clear`) alerts.
  8. **Notification & Modal Suite**: Features `PushNotificationModal.tsx` (Web Push API subscription management), `PWAInstallButton.tsx` (native PWA install prompt), `AboutModal.tsx` (system release metadata & credits), and `DevelopmentWarningModal.tsx` (environment diagnostics).

---

## 3. Real-Time State, Canonical Thresholds & Synchronization Lifecycle

The dashboard maintains synchronized device configurations and environmental metrics using reactive polling:

```
[Dashboard Initialized] ──► [Fetch Customer Devices] ──► [Loop: Poll Telemetry (Every 8s)]
                                                                  │
   ┌──────────────────────────────────────────────────────────────┘
   ├─► Query Latest Telemetry (rh, temp, battery, rssi)
   ├─► Query Device Attributes (Client Version, Wi-Fi SSID, Has SD, Temp Unit, Alarm Thresholds)
   ├─► Query Active & Historical System Alarms
   └─► Trigger Reactive Screen Notification / Sound Alerts on New Alarms
```

* **Canonical Kelvin Threshold Engine (`alarmThresholds.ts`)**: Temperature alarm thresholds are stored canonically in Kelvin (K) in both local runtime state and ThingsBoard shared attributes (`alarm_thresholds`). User-facing display is strictly presented in °F or °C (`toDisplayTemp` / `fromDisplayTemp`), preserving threshold integrity and unit-agnostic ThingsBoard rule chain evaluation without rounding drift.
* **LTTB Downsampling Engine (`downsample.ts`)**: High-density time-series history arrays are downsampled client-side using the Largest-Triangle-Three-Buckets (LTTB) visual downsampling algorithm before passing data to Recharts, ensuring 60fps rendering even over multi-day spans.
* **Web Push & Audio Synthesizer (`pushNotifications.ts`, `notificationService.ts`)**: In-app synthesized audio alerts and Web Push API service worker push notifications alert users when humidity or temperature breaches warning/critical envelopes.
* **Memoized Attributes Cache**: To avoid API request flooding, client and shared attributes are cached with a 10-minute Time-To-Live (TTL), except during manual parameter updates which invalidate the cache instantly.
* **Flexible Device Discovery**: Detects the active user profile authority. If a `CUSTOMER_USER`, it queries sandboxed customer directories; if a `TENANT_ADMIN`, it queries global tenant-level indices, completely preventing permission/SSO mismatch exceptions.

---

## 4. OIDC & JWT Authentication Flow

The dashboard implements double-gated token verification to guarantee session security and role-aware features:

1. **Authentik OIDC Protocol**: Users complete authentication directly on the Authentik single-sign-on portal using Authorization Code Flow with PKCE.
2. **ThingsBoard SSO Redirects**: Upon redirect, the dashboard captures native ThingsBoard access JWT and refresh tokens injected in the URL hash/query, storing them securely in local storage.
3. **Reactive Interceptor Routine**: The Axios pipeline monitors outbound network traffic. If an expired token causes an HTTP `401 Unauthorized` response, the interceptor pauses the request pipeline, triggers a token refresh (`POST /api/auth/token/refresh`), updates the local session, and replays the original requests with zero user interruption.

---

## 5. Build, Platform, & Progressive Web App Integration

The frontend code compiles into a standard static distribution or packages into mobile app drawers:

* **Progressive Web App (PWA)**: Implements standard web manifests, offline app shell caching, and responsive viewport guidelines.
* **Android Trusted Web Activity (TWA)**: Wraps the compiled static assets in a full-screen, address-bar-free native Android shell powered by Chrome Custom Tabs, verified with Digital Asset Links (`.well-known/assetlinks.json`).
* **Docker Containerization**: decouples build-time and runtime configurations. At container startup, `docker-entrypoint.sh` injects target environments (`VITE_THINGSBOARD_URL`, `VITE_DASHBOARD_VERSION`, `VITE_DASHBOARD_REVISION`) directly into `window.__ENV__`, allowing the exact same image to run across Dev, Staging, and Production stages.
