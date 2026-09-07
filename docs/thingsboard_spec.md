# HUMID1 - ThingsBoard Platform Architecture & Infrastructure Specification

## 1. System Role & Scope
ThingsBoard Community Edition (CE) acts as the centralized IoT backend behind a Caddy reverse proxy. It handles ESP32 device telemetry ingestion, client/shared attribute state sync, time synchronization on boot, rule-engine humidor safety alarms, OTA binary delivery, and secure REST/WebSocket access for the PWA/TWA client.

---

## 2. Permissions, User Roles & Security Boundaries

### A. Role Hierarchy in ThingsBoard
ThingsBoard enforces strict Role-Based Access Control (RBAC) across three primary authority tiers:

| Authority Tier | Capabilities | Permitted Endpoints |
| :--- | :--- | :--- |
| **SYS_ADMIN** | Global server configuration, multi-tenant provisioning, mail/SMS gateways | All `/api/admin/*`, global tenant management |
| **TENANT_ADMIN** | Tenant device inventory, fleet device creation/deletion, rule chains, device profiles | `GET /api/tenant/devices`, `GET /api/deviceInfos`, `DELETE /api/device/{deviceId}` |
| **CUSTOMER_USER** | Operates claimed customer hardware, views customer telemetry, acknowledges/clears customer alarms, tunes shared attributes | `GET /api/customer/{customerId}/deviceInfos`, `GET /api/customer/{customerId}/devices`, `POST /api/customer/device/claim`, `DELETE /api/customer/device/{deviceName}/claim` |

### B. Customer Permission Safeguards
Customer users (`CUSTOMER_USER`) do **not** have tenant administrator privileges. Calling tenant endpoints results in HTTP `403 Forbidden` errors:
1. **Device Discovery:** Customer accounts must query `/api/customer/{customerId}/deviceInfos` or `/api/customer/{customerId}/devices`. Tenant endpoints (`/api/deviceInfos` or `/api/tenant/devices`) are forbidden.
2. **Device Removal:** Customer accounts cannot permanently delete device entities from the tenant database (`DELETE /api/device/{deviceId}`). Instead, customer accounts release hardware via the unclaim endpoint (`DELETE /api/customer/device/{deviceName}/claim`), returning the unit to the available pool for future re-claiming.

### C. Continuous Authentication & Token Lifecycle
- **Access Tokens:** Short/medium-lived JWTs (`X-Authorization: Bearer <token>` or `Authorization: Bearer <token>`) passed in API headers.
- **Silent Refresh Endpoint:** `POST /api/auth/token/refresh` with `refreshToken` payload to continuously renew expired JWTs automatically in the background without forcing user re-logins.

---

## 3. Microcontroller Epoch Time Synchronization on Boot
To ensure accurate data timestamping and scheduled deep sleep without requiring a standalone NTP server, the ESP32 synchronizes its internal RTC epoch clock upon waking:

1. **HTTP Telemetry Header Extraction (Fastest):** ESP32 reads the standard `Date` header in the HTTP `200 OK` response during its initial telemetry burst.
2. **Dedicated Time Sync RPC (Alternative):**
   - **Device Request:** `POST /api/v1/{ACCESS_TOKEN}/rpc` $\rightarrow$ `{"method": "getCurrentTime", "params": {}}`
   - **ThingsBoard Response:** `{"epoch_ms": 1788055200000}`
3. **ESP32 Internal Clock Set:** Microcontroller executes `settimeofday()` using the returned epoch timestamp before entering deep sleep.

---

## 4. Unified Data & Attribute Schema

### A. Time-Series Telemetry (Device $\rightarrow$ TB)
| Key | Type | Unit | Description / Bounds |
| :--- | :--- | :--- | :--- |
| `rh` | Numeric (Float) | % | Relative humidity (Monitored against runtime thresholds) |
| `temp` | Numeric (Float) | °F | Ambient temperature (Alert ceiling configurable via dashboard) |
| `battery` | Numeric (Integer) | % | Battery percentage (Alert ceiling configurable via dashboard) |
| `rssi` | Numeric (Integer) | dBm | Wi-Fi Signal Strength (e.g. `-30` to `-90 dBm`) |

### B. Client Attributes (Device $\rightarrow$ TB)
| Key | Type | Description |
| :--- | :--- | :--- |
| `fw_version` | String | Active firmware version build string (e.g. `v1.0.4`) |
| `device_name` | String | Hardware hostname / display identifier |
| `mac_address` | String | Hardware MAC address |
| `ssid` | String | Connected Wi-Fi AP SSID |
| `ip_address` | String | Local IPv4 address |
| `has_sd_card` | Boolean | Hardware SD card slot detection flag (`true`/`false`) |
| `audio_synced` | Boolean | `true` once device downloads and verifies all audio files |

### C. Shared Attributes (TB $\rightarrow$ Device / App $\rightarrow$ TB)
| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `sleep_interval_sec` | Numeric | `900` | Deep-sleep wake interval in seconds |
| `device_theme` | String (Enum) | `DARK` | Display visual mode (`DARK`, `LIGHT`, `STEALTH`) |
| `sound_enabled` | Boolean | `false` | Audio toggle (Gated by `audio_synced` & `has_sd_card`) |
| `auto_update_enabled` | Boolean | `true` | Opt-in toggle for automatic background OTA |
| `manual_ota_trigger` | Boolean | `false` | Set to `true` by Web App to force an immediate OTA flash |
| `rh_target` | Numeric | `69.0` | Target relative humidity percentage |
| `rh_low_crit` | Numeric | `62.0` | Critical low humidity threshold |
| `rh_low_warn` | Numeric | `65.0` | Warning low humidity threshold |
| `rh_high_warn` | Numeric | `73.0` | Warning high humidity threshold |
| `rh_high_crit` | Numeric | `76.0` | Critical high humidity / mold risk threshold |
| `temp_low_warn` | Numeric | `64.0` | Low temperature warning threshold (°F) |
| `temp_high_crit` | Numeric | `74.0` | High temperature / beetle hatch risk threshold (°F) |
| `batt_low_crit` | Numeric | `20.0` | Critical low battery alert threshold (%) |

---

## 5. Runtime Configurable Alarm Thresholds & Rules Pipeline

The dashboard enables runtime configuration of humidor climate thresholds without modifying firmware or backend code:

```
[Incoming Telemetry / State]
       │
       ├──> [Save Telemetry] (rh, temp, battery, rssi)
       │
       ├──> [RH Filter] ─────────> rh < rh_low_warn (Dry) or rh > rh_high_warn (Humid/Mold) ──> [Raise Alarm]
       │                           rh_low_warn <= rh <= rh_high_warn                        ──> [Clear Alarm]
       │
       ├──> [Temp Filter] ───────> temp > temp_high_crit (Beetle Hazard)                    ──> [Raise Alarm]
       │                           temp <= temp_high_crit                                   ──> [Clear Alarm]
       │
       ├──> [Low Battery Filter] ─> battery < batt_low_crit                                 ──> [Raise Alarm]
       │                            battery >= batt_low_crit                                ──> [Clear Alarm]
       │
       └──> [OTA Status Handler] ─> Monitors fw_state / triggers manual_ota_trigger
```

---

## 6. Build Architecture & Asset Distribution
The PWA manifest and Android TWA (Bubblewrap) build system pull branding and icon assets directly from the public repository raw content (`https://raw.githubusercontent.com/Humidyne-Labs/dashboard/main/public/...`). This eliminates the requirement for running a local Python web server during CI/CD builds, simplifying workflows and preventing network timeout issues.
