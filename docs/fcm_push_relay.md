# HUMID1 — Python FCM Push Relay Microservice Reference

This document provides technical documentation for the Python Push Relay microservice (`webpush-relay`) responsible for serving dynamic Google Firebase Cloud Messaging (FCM) Web Push VAPID credentials and relaying server-side alarms triggered by ThingsBoard.

---

## 1. Architectural Overview

```
 +----------------------------------------------------------------+
 |                  HUMID1 Push Notification Topology             |
 +----------------------------------------------------------------+

   [ ESP32 Sensor ]  --> MQTT/HTTP Telemetry -->  [ ThingsBoard CE ]
                                                          |
                                                  (Threshold breached)
                                                          |
                                              [ Rule Chain REST Node ]
                                                          |
                                            POST /api/v1/notify (internal)
                                                          v
                                             +-------------------------+
                                             | Python Push Relay       |
                                             | (:6000)                 |
                                             +-------------------------+
                                                          |
                                                pywebpush / FCM API
                                                          v
                                                [ Google FCM Push Svc ]
                                                          v
                                                [ User Mobile Device ]
                                                (Wakes sleeping PWA /
                                                 System Notification)
```

The frontend web dashboard only queries the microservice to verify its availability (`GET /healthz`) and fetch the public VAPID encryption key (`GET /api/v1/vapid-public-key`) required to establish the browser's push subscription. All outbound push dispatches (`POST /api/v1/notify`) originate on the server side via ThingsBoard.

---

## 2. Microservice API Specifications

### 2.1 Health Check Ping
- **Method:** `GET /healthz`
- **Purpose:** Fast liveness check queried by the dashboard before subscribing to push events.
- **Request Headers:**
  ```http
  Accept: application/json
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "status": "ok",
    "uptime_seconds": 128420,
    "service": "webpush-relay"
  }
  ```

---

### 2.2 Dynamic VAPID Public Key Query
- **Method:** `GET /api/v1/vapid-public-key`
- **Purpose:** Delivers the public application server key (URL-safe base64) to the browser's `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
- **Request Headers:**
  ```http
  Accept: application/json
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "public_key": "BPCsGTkqZflbV7jYaPUjj5dXE2kcN-lfyfn8anIZOBiqlwjf1r3JB6PMdPEYin4eKXBoFzcesbsTKBTH7FigRFY"
  }
  ```

---

### 2.3 Push Notification Dispatch (ThingsBoard Rule Engine Only)
- **Method:** `POST /api/v1/notify`
- **Caller:** ThingsBoard Server-Side Rule Engine REST Call Node
- **Purpose:** Encrypts and sends the payload to the browser push service using the user's stored FCM subscription.
- **Request Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Payload Schema:**
  ```json
  {
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/c-a_example_token...",
      "keys": {
        "p256dh": "BNcRdreA...key...",
        "auth": "tB8v...auth..."
      }
    },
    "title": "HUMID1 Alert: Critical RH",
    "body": "Humidor 1 relative humidity is 78.4% (Threshold: 75.0%)",
    "icon": "/icon-192.png",
    "badge": "/badge-72.png",
    "tag": "humid1-rh-alert-cabinet-01",
    "data": {
      "deviceId": "788910ab-1234-4567-89ab-cdef01234567",
      "severity": "CRITICAL",
      "timestamp": 1788930400000
    }
  }
  ```
- **Response Payload (200 OK):**
  ```json
  {
    "success": true,
    "message_id": "projects/humid1-fcm/messages/0:1788930400123456"
  }
  ```

---

## 3. ThingsBoard Rule Chain Integration

To configure ThingsBoard CE to invoke this endpoint when sensor thresholds are exceeded:

1. **Filter Node (Script Filter / Switch)**:
   Detect condition, e.g. `msg.humidity > metadata.rh_high_critical`.
2. **Customer Attributes Enrichment Node**:
   Fetch `fcm_subscription` from `SERVER_SCOPE` or `CUSTOMER_SCOPE`.
3. **REST API Call Node**:
   - **Endpoint URL:** `http://webpush-relay:6000/api/v1/notify` (or Docker service DNS name)
   - **Request Method:** `POST`
   - **Body Template:**
     ```json
     {
       "subscription": $[metadata.fcm_subscription],
       "title": "HUMID1 Alert: $[metadata.deviceName]",
       "body": "Relative humidity is $[msg.humidity]% — threshold exceeded!"
     }
     ```

---

## 4. Security & Network Configuration

- **Immutable Host Binding:** The frontend dashboard connects exclusively to the pre-configured microservice environment URI (`VITE_PUSH_MICROSERVICE_URL` or default `http://localhost:6000`). UI override fields are prohibited to prevent Server-Side Request Forgery (SSRF) and unauthorized host redirections.
- **Fail-Safe Fallback:** If the microservice is temporarily offline during cold boot, the dashboard utilizes cached VAPID credentials stored in local storage to prevent subscription disruption.
