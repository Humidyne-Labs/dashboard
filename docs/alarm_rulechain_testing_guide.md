# HUMID1 - ThingsBoard Alarm Rule Chain & Real-Data Testing Guide

This guide details the complete ThingsBoard Rule Chain architecture, automated alarm triggers, notification routing, and end-to-end verification plan using real telemetry data from the ESP32 hardware or the Python test script.

---

## 1. Rule Chain Architecture Overview

ThingsBoard Community Edition (CE) processes all incoming telemetry through the **Root Rule Chain**. To automatically generate alarms and notifications based on the user-configured thresholds stored in **Shared Attributes**, the rule chain implements attribute enrichment and rule engine filters:

```
[Device Telemetry] ('rh', 'temp', 'battery', 'rssi')
         │
         ▼
[Message Type Switch] (POST_TELEMETRY_REQUEST)
         │
         ▼
[Originator Attributes Enrichment]
  - Fetch shared attributes: target_rh_min, target_rh_max, 
    target_temp_min, target_temp_max, rh_low_warn, rh_high_warn
         │
         ▼
[Filter: Climate Threshold Evaluator (Script Node)]
         │
 ┌───────┴─────────────────────────────────────────────┐
 │ Low RH (< target_rh_min)                            │ High RH (> target_rh_max)
 ▼                                                     ▼
[Create Alarm: LOW_HUMIDITY]                          [Create Alarm: HIGH_HUMIDITY]
 - Severity: WARNING or CRITICAL                       - Severity: CRITICAL (Mold risk)
         │                                                     │
 ┌───────┴─────────────────────────────────────────────┘
 │ In Nominal Range (target_rh_min <= rh <= target_rh_max)
 ▼
[Clear Alarm: LOW_HUMIDITY / HIGH_HUMIDITY]
         │
         ▼
[Filter: Temperature Evaluator]
 - temp > target_temp_max -> [Create Alarm: HIGH_TEMPERATURE] (Beetle Hazard)
 - temp <= target_temp_max -> [Clear Alarm: HIGH_TEMPERATURE]
         │
         ▼
[Filter: Battery Critical Evaluator]
 - battery < 20 -> [Create Alarm: BATTERY_LOW]
 - battery >= 20 -> [Clear Alarm: BATTERY_LOW]
         │
         ▼
[Notification Delivery Node]
 - Push notification / Webhook / Dashboard SSE Broadcast
```

---

## 2. Rule Chain Node Configuration Details

### Node 1: Originator Attributes (Enrichment)
- **Type**: `originator attributes`
- **Configuration**:
  - Check **Shared attributes**
  - Attribute keys to enrich into metadata:
    `target_rh_min`, `target_rh_max`, `target_temp_min`, `target_temp_max`, `rh_low_warn`, `rh_high_warn`, `temp_high_crit`, `batt_low_crit`

### Node 2: Climate Threshold Filter (Filter Node)
- **Type**: `script`
- **JavaScript Filter Code**:
```javascript
// Defaults if device hasn't set custom shared attributes yet
var rhMin = metadata.shared_target_rh_min ? parseFloat(metadata.shared_target_rh_min) : 62.0;
var rhMax = metadata.shared_target_rh_max ? parseFloat(metadata.shared_target_rh_max) : 73.0;

if (msg.rh !== undefined) {
    if (msg.rh < rhMin) {
        return ['LowHumidity'];
    } else if (msg.rh > rhMax) {
        return ['HighHumidity'];
    } else {
        return ['NominalHumidity'];
    }
}
return ['Ignore'];
```

### Node 3: Create Alarm (Low Humidity)
- **Type**: `create alarm`
- **Alarm type**: `HUMIDITY_LOW_WARNING`
- **Alarm severity**: `WARNING`
- **Alarm details**:
```javascript
var details = {
    current_rh: msg.rh,
    target_min: metadata.shared_target_rh_min || 62.0,
    timestamp: new Date().toISOString(),
    message: "Humidor humidity dropped below safe preservation threshold."
};
return details;
```

### Node 4: Clear Alarm (Low Humidity)
- **Type**: `clear alarm`
- **Alarm type**: `HUMIDITY_LOW_WARNING`

### Node 5: Create Alarm (High Temperature / Beetle Hazard)
- **Type**: `create alarm`
- **Alarm type**: `TEMPERATURE_CRITICAL`
- **Alarm severity**: `CRITICAL`
- **Alarm details**:
```javascript
var details = {
    current_temp: msg.temp,
    max_threshold: metadata.shared_target_temp_max || 74.0,
    timestamp: new Date().toISOString(),
    hazard: "Tobacco beetle hatching risk elevated above 74°F."
};
return details;
```

---

## 3. End-to-End Real Data Testing Procedure

You can test the entire pipeline using your active Python telemetry script:

```python
# Published telemetry format:
# {'rh': 66.75, 'temp': 71.22, 'battery': 83, 'rssi': -40}
```

### Step 1: Baseline Nominal State Test
1. Open the web dashboard at `https://dash.humid1.com` (or local preview).
2. Set the target thresholds in the **Hardware Device & Alarm Parameters** control panel:
   - Target Sweet Spot: **68.0%**
   - Low Alert: **64.0%**
   - High Alert: **72.0%**
   - Low Temp: **64.0°F**
   - High Temp Critical: **74.0°F**
3. Click **Save Parameters** to push to ThingsBoard shared attributes.
4. Run your debug script sending:
   ```json
   {"rh": 67.5, "temp": 70.5, "battery": 85, "rssi": -42}
   ```
5. **Expected Outcome**:
   - Web app displays "New Packet!" badge immediately to the left of the controls.
   - All 4 widgets (Relative Humidity, Temperature, Battery, RSSI) refresh with 0 lag.
   - The Alarms Feed shows zero active alarms.

### Step 2: Low Humidity Alarm Trigger Test
1. Run your debug script with humidity dropped below the low threshold:
   ```json
   {"rh": 61.2, "temp": 70.8, "battery": 85, "rssi": -43}
   ```
2. **Expected Outcome**:
   - The Root Rule Chain triggers `HUMIDITY_LOW_WARNING`.
   - The dashboard top navigation bar updates the Alarms icon badge (`1 Active Alarm`).
   - The Alarms Feed immediately displays the newly created alarm with timestamp and details.
   - Relative Humidity gauge turns amber/red indicating warning condition.

### Step 3: Self-Healing & Alarm Auto-Clear Test
1. Run your debug script returning to nominal conditions:
   ```json
   {"rh": 68.2, "temp": 70.2, "battery": 84, "rssi": -41}
   ```
2. **Expected Outcome**:
   - The Root Rule Chain triggers the `clear alarm` node.
   - The alarm status transitions to `CLEARED_UNACK` (or vanishes if auto-purged).
   - The Relative Humidity gauge returns to green / "In Range".

### Step 4: High Temperature / Beetle Hazard Test
1. Send temperature above the critical ceiling:
   ```json
   {"rh": 67.0, "temp": 75.8, "battery": 82, "rssi": -40}
   ```
2. **Expected Outcome**:
   - Rule chain triggers `TEMPERATURE_CRITICAL`.
   - Web app alerts with red banner indicating temperature exceeded safe boundary.

---

## 4. ThingsBoard Importable Rule Chain Snippet

To install or import this directly into ThingsBoard CE:
1. Log into your ThingsBoard web console as `TENANT_ADMIN`.
2. Navigate to **Rule Chains** $\rightarrow$ Click **+** (Import Rule Chain).
3. Connect the `Post telemetry` relation of `Input Node` to the `Originator Attributes` node.
4. Chain `Originator Attributes` into the Filter scripts.
5. Save the Rule Chain as **Root Rule Chain**.
