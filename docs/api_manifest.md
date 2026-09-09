# HUMID1 — REST API Manifest & JSON Reference

This document serves as the authoritative, technically precise reference of the **actual ThingsBoard CE REST API integrations and JSON payloads** executed by the HUMID1 Dashboard frontend. Every transaction documented here maps directly to the active services and components implemented in `/src/services/thingsboard.ts` and the UI controls.

---

## 1. Authentication & Session Lifecycle

The dashboard connects to ThingsBoard CE utilizing a secure dual-access mechanism: direct username/password credential authentication or OpenID Connect (OIDC) Single Sign-On (SSO) redirects mapped from Authentik.

### 1.1 Direct REST Login
Authenticates a tenant administrator or customer user directly, returning a short-lived access JWT and a long-lived refresh token.

- **Endpoint:** `POST /api/auth/login`
- **Request Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Payload:**
  ```json
  {
    "username": "user@humid1.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsic3VzZXIiXSwidXNlcklkIjoiMWVmZDM5NjAtYTEwYi0xMWYxLWI1MzAtOWI5NjMxZTBjMzY1IiwidGVuYW50SWQiOiIxZWZkMzk2MC1hMTBiLTExZjEtYjUzMC05Yjk2MzFlMGMzNjUiLCJpc3MiOiJUaGluZ3NCb2FyZCIsImlhdCI6MTc4ODA1NTIwMCwiZXhwIjoxNzg4MDU4ODAwfQ.xyz...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsicmVmcmVzaCJdLCJ1c2VySWQiOiIxZWZkMzk2MC1hMTBiLTExZjEtYjUzMC05Yjk2MzFlMGMzNjUiLCJpc3MiOiJUaGluZ3NCb2FyZCIsImlhdCI6MTc4ODA1NTIwMCwiZXhwIjoxNzg4NjYwMDAwfQ.abc..."
  }
  ```

---

### 1.2 Silent Token Refresh
The dashboard's centralized Axios response interceptor (`apiClientInit.ts`) automatically intercepts HTTP `401 Unauthorized` token expiration errors, requests a new access token, and retries the original request seamlessly.

- **Endpoint:** `POST /api/auth/token/refresh`
- **Request Payload:**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsicmVmcmVzaCJd..."
  }
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsic3VzZXIiXSwiaWF0IjoxNzg4MDU4ODAwLCJleHAiOjE3ODgwNjI0MDB9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGh1bWlkMS5jb20iLCJzY29wZXMiOlsicmVmcmVzaCJdLCJpYXQiOjE3ODgwNTg4MDAsImV4cCI6MTc4ODY2MzYwMH0..."
  }
  ```

---

### 1.3 User Profile Query
Obtains current active session details, authority structures (`CUSTOMER_USER` or `TENANT_ADMIN`), and customer identifiers.

- **Endpoint:** `GET /api/auth/user`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "id": {
      "entityType": "USER",
      "id": "1efd3960-a10b-11f1-b530-9b9631e0c365"
    },
    "createdTime": 1700000000000,
    "tenantId": {
      "entityType": "TENANT",
      "id": "1efd3960-a10b-11f1-b530-9b9631e0c365"
    },
    "customerId": {
      "entityType": "CUSTOMER",
      "id": "2efd4510-b21c-22f2-c640-8c8732e1d472"
    },
    "email": "user@humid1.com",
    "authority": "CUSTOMER_USER",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

---

## 2. Device Registry & Claiming Operations

The dashboard manages the lifecycle of customer-owned humidor units.

### 2.1 Fetch Claimed / Customer Devices
Discovers and lists hardware devices bounded to the logged-in user profile. If authenticated as a Customer, it targets customer-specific endpoints; otherwise, it falls back to tenant administrator endpoints.

- **Endpoint (Customer Users):** `GET /api/customer/{customerId}/deviceInfos?pageSize=100&page=0`
- **Alternative Endpoint (Fallback):** `GET /api/customer/{customerId}/devices?pageSize=100&page=0`
- **Endpoint (Tenant Admins):** `GET /api/deviceInfos?pageSize=100&page=0`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "data": [
      {
        "id": {
          "entityType": "DEVICE",
          "id": "3efd88a0-c32d-33f3-d750-7d7632e1f822"
        },
        "createdTime": 1715000000000,
        "name": "humid1-esp32-001",
        "type": "default",
        "label": "Front Counter Cabinet",
        "customerId": {
          "entityType": "CUSTOMER",
          "id": "2efd4510-b21c-22f2-c640-8c8732e1d472"
        }
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "hasNext": false
  }
  ```

---

### 2.2 Claim Hardware Device
Associates a new ESP32 humidor device with the user's customer account. The dashboard supports optional security validation via a secret PIN or key.

- **Endpoint:** `POST /api/customer/device/{deviceName}/claim`
- **Request Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Request Payload:**
  ```json
  {
    "secretKey": "123456"
  }
  ```
- **Response Payload (200 OK / 201 Created):**
  ```json
  {
    "response": "SUCCESS",
    "device": {
      "id": {
        "entityType": "DEVICE",
        "id": "3efd88a0-c32d-33f3-d750-7d7632e1f822"
      },
      "name": "humid1-esp32-001",
      "type": "default",
      "label": "humid1-esp32-001"
    }
  }
  ```

---

### 2.3 Unclaim / Release Device
Gracefully unbinds a hardware unit from the customer user's registry.

- **Endpoint:** `DELETE /api/customer/device/{deviceName}/claim`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Status:** `200 OK` (Indicates unclaiming execution succeeded)

---

## 3. Telemetry & Attribute Synchronization

This section defines how climate readings are gathered and configuration attributes are controlled.

### 3.1 Fetch Latest Telemetry Timeseries
Retrieves the most recent environmental metrics recorded by the selected device.

- **Endpoint:** `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "rh": [
      {
        "ts": 1788055200000,
        "value": "69.4"
      }
    ],
    "temp": [
      {
        "ts": 1788055200000,
        "value": "71.2"
      }
    ],
    "battery": [
      {
        "ts": 1788055195000,
        "value": "88"
      }
    ],
    "rssi": [
      {
        "ts": 1788055195000,
        "value": "-65"
      }
    ]
  }
  ```

---

### 3.2 Query Historical Telemetry for Charting
Queries high-resolution historical timeseries points within the user-defined time range (e.g. 1 hour, 6 hours, 24 hours, 3 days). To ensure precision, the dashboard enforces `agg=NONE` to bypass coarse server-side averages.

- **Endpoint:** `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=rh,temp,battery,rssi&startTs={startTs}&endTs={endTs}&limit=50000&agg=NONE&orderBy=ASC`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "rh": [
      { "ts": 1788051600000, "value": "68.2" },
      { "ts": 1788055200000, "value": "69.4" }
    ],
    "temp": [
      { "ts": 1788051600000, "value": "70.5" },
      { "ts": 1788055200000, "value": "71.2" }
    ],
    "battery": [
      { "ts": 1788051600000, "value": "89" },
      { "ts": 1788055200000, "value": "88" }
    ],
    "rssi": [
      { "ts": 1788051600000, "value": "-67" },
      { "ts": 1788055200000, "value": "-65" }
    ]
  }
  ```

---

### 3.3 Fetch Device Attributes (Client & Shared)
Fetches configuration values and hardware diagnostic details.

- **Endpoint (Client Status):** `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/attributes?scope=CLIENT_SCOPE`
- **Endpoint (Shared Parameters):** `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/attributes?scope=SHARED_SCOPE`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response (CLIENT_SCOPE):**
  ```json
  [
    { "key": "fw_version", "value": "v1.2.0" },
    { "key": "device_name", "value": "humid1-esp32-001" },
    { "key": "mac_address", "value": "A1:B2:C3:D4:E5:F6" },
    { "key": "ssid", "value": "Humidyne Labs HQ" },
    { "key": "ip_address", "value": "192.168.1.144" },
    { "key": "has_sd_card", "value": true },
    { "key": "audio_synced", "value": true }
  ]
  ```
- **Response (SHARED_SCOPE):**
  ```json
  [
    { "key": "sleep_interval_sec", "value": 900 },
    { "key": "device_theme", "value": "DARK" },
    { "key": "sound_enabled", "value": true },
    { "key": "auto_update_enabled", "value": true },
    { "key": "manual_ota_trigger", "value": false }
  ]
  ```

---

### 3.4 Save / Update Shared Attributes
Pushes threshold updates, sleep duration controls, or toggle configurations back to the device.

- **Endpoint:** `POST /api/plugins/telemetry/DEVICE/{deviceId}/SHARED_SCOPE`
- **Request Payload:**
  ```json
  {
    "sleep_interval_sec": 1200,
    "sound_enabled": false,
    "device_theme": "STEALTH",
    "auto_update_enabled": true
  }
  ```
- **Response Status:** `200 OK` (Attribute update successful)

---

## 4. Alarms Management

Enables viewing and modifying system alarms directly inside the dashboard alarms feed.

### 4.1 Fetch Active & Historical Alarms
Queries real-time alarms linked to the active tenant/customer devices.

- **Endpoint:** `GET /api/v2/alarms?pageSize=100&page=0&sortProperty=createdTime&sortOrder=DESC&searchStatus=ANY`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "data": [
      {
        "id": {
          "entityType": "ALARM",
          "id": "5efd91b0-d43e-44f4-e860-8e8732e1f999"
        },
        "createdTime": 1788055205000,
        "originator": {
          "entityType": "DEVICE",
          "id": "3efd88a0-c32d-33f3-d750-7d7632e1f822"
        },
        "originatorName": "Front Counter Cabinet",
        "type": "HUMIDITY_LOW_ALERT",
        "severity": "WARNING",
        "status": "ACTIVE_UNACK",
        "details": {
          "message": "Relative humidity dropped below warning threshold: 61.2% (Target: 69.0%)"
        }
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "hasNext": false
  }
  ```

---

### 4.2 Acknowledge Active Alarm
Acknowledges an unresolved alert, indicating to other operators that attention has been directed.

- **Endpoint:** `POST /api/alarm/{alarmId}/ack`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Status:** `200 OK`

---

### 4.3 Clear Resolved Alarm
Purges or clears an active alarm, resolving its visual warning status.

- **Endpoint:** `POST /api/alarm/{alarmId}/clear`
- **Request Headers:**
  ```http
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Response Status:** `200 OK`

---

## 5. ThingsBoard Remote Procedure Calls (RPC)

Dispatches on-demand commands to the microcontroller.

### 5.1 Two-Way Request-Response RPC Command
Dispatches interactive requests to the device. These block synchronously (with a 4-second timeout) awaiting confirmation back from the hardware.

- **Endpoint:** `POST /api/plugins/rpc/twoway/{deviceId}`
- **Request Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_Access_Token>
  ```
- **Request Payload (Ping Example):**
  ```json
  {
    "method": "ping",
    "params": {},
    "timeout": 4000
  }
  ```
- **Response Payload (200 OK - Device Acknowledged):**
  ```json
  {
    "response": "pong",
    "rssi": -62,
    "uptime_sec": 38450
  }
  ```

- **Request Payload (Buzzer Test Example):**
  ```json
  {
    "method": "testBuzzer",
    "params": {
      "durationMs": 500
    },
    "timeout": 4000
  }
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "response": "BUZZ_ACK"
  }
  ```

- **Request Payload (Time Synchronization Example):**
  ```json
  {
    "method": "syncTime",
    "params": {
      "epoch": 1788055200
    },
    "timeout": 4000
  }
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "response": "RTC_SYNC_SUCCESS",
    "offset_ms": 12
  }
  ```

---

## 6. Over-The-Air (OTA) Updates Triggering

The dashboard initiates hardware over-the-air firmware updates via a simple shared attribute transaction. 

### 6.1 Manual OTA Trigger
Rather than managing intricate server-side binary uploads, clicking **"Push OTA Update Now"** inside the *OTA Update Center* card simply updates the `manual_ota_trigger` shared attribute on the device to `true`. On its next wakeup, the ESP32 registers this trigger, downloads its bin package, completes the flashing routine, and resets the attribute upon successful boot.

- **Endpoint:** `POST /api/plugins/telemetry/DEVICE/{deviceId}/SHARED_SCOPE`
- **Request Payload:**
  ```json
  {
    "manual_ota_trigger": true
  }
  ```
- **Response Status:** `200 OK`
