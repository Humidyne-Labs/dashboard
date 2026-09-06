# HUMID1 - ThingsBoard Alarm Rule Chain & Real-Data Testing Guide

This guide details the complete ThingsBoard Rule Chain architecture, automated alarm triggers, notification routing, and end-to-end verification plan using real telemetry data from the ESP32 hardware or the Python test script.

---

## 1. Rule Chain Architecture Overview

ThingsBoard Community Edition (CE) processes all incoming telemetry through the **Root Rule Chain**. To automatically generate alarms and notifications based on threshold parameters stored in **Shared Attributes**, the rule chain implements attribute enrichment, evaluation switch nodes, and alarm processing nodes:


```

[Device Telemetry] ('rh', 'temp', 'battery', 'rssi')
│
▼
[Message Type Switch] (POST_TELEMETRY_REQUEST)
│
▼
[Originator Attributes Enrichment]

* Fetch shared attributes: target_rh_min, target_rh_max,
target_temp_min, target_temp_max, rh_low_warn, rh_high_warn,
temp_high_crit, batt_low_crit
│
├───► [Switch: Humidity Evaluator Node]
│        ├─► 'LowHumidity'     ──► [Create Alarm: HUMIDITY_LOW_WARNING]
│        ├─► 'HighHumidity'    ──► [Create Alarm: HUMIDITY_HIGH_CRITICAL]
│        └─► 'NominalHumidity' ──► [Clear Alarm: HUMIDITY_LOW_WARNING & HUMIDITY_HIGH_CRITICAL]
│
├───► [Switch: Temperature Evaluator Node]
│        ├─► 'HighTemperature' ──► [Create Alarm: TEMPERATURE_CRITICAL]
│        └─► 'NominalTemperature'► [Clear Alarm: TEMPERATURE_CRITICAL]
│
└───► [Switch: Battery Evaluator Node]
├─► 'LowBattery'      ──► [Create Alarm: BATTERY_LOW_WARNING]
└─► 'NominalBattery'  ──► [Clear Alarm: BATTERY_LOW_WARNING]

```

---

## 2. Rule Chain Node Configuration Details

### Node 1: Originator Attributes (Enrichment)
- **Type**: `originator attributes`
- **Configuration**:
  - Check **Shared attributes**
  - Attribute keys to enrich into metadata:
    `target_rh_min`, `target_rh_max`, `target_temp_min`, `target_temp_max`, `rh_low_warn`, `rh_high_warn`, `temp_high_crit`, `batt_low_crit`

---

### Node 2: Humidity Evaluator (Switch Node)
- **Type**: `switch` (Script)
- **JavaScript Code**:
```javascript
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

* **Type**: `create alarm`
* **Link Relation**: `LowHumidity`
* **Alarm type**: `HUMIDITY_LOW_WARNING`
* **Alarm severity**: `WARNING`
* **Alarm details**:

```javascript
var details = {
    current_rh: msg.rh,
    target_min: metadata.shared_target_rh_min || 62.0,
    timestamp: new Date().toISOString(),
    message: "Humidor humidity dropped below safe preservation threshold."
};
return details;

```

### Node 4: Create Alarm (High Humidity)

* **Type**: `create alarm`
* **Link Relation**: `HighHumidity`
* **Alarm type**: `HUMIDITY_HIGH_CRITICAL`
* **Alarm severity**: `CRITICAL`
* **Alarm details**:

```javascript
var details = {
    current_rh: msg.rh,
    target_max: metadata.shared_target_rh_max || 73.0,
    timestamp: new Date().toISOString(),
    message: "Humidor humidity exceeded upper boundary. High risk of mold growth."
};
return details;

```

### Node 5: Clear Alarm (Humidity Nominal)

* **Type**: `clear alarm`
* **Link Relation**: `NominalHumidity`
* **Alarm type**: `HUMIDITY_LOW_WARNING`, `HUMIDITY_HIGH_CRITICAL`

---

### Node 6: Temperature Evaluator (Switch Node)

* **Type**: `switch` (Script)
* **JavaScript Code**:

```javascript
var tempMax = metadata.shared_temp_high_crit ? parseFloat(metadata.shared_temp_high_crit) : 74.0;

if (msg.temp !== undefined) {
    if (msg.temp > tempMax) {
        return ['HighTemperature'];
    } else {
        return ['NominalTemperature'];
    }
}
return ['Ignore'];

```

### Node 7: Create Alarm (High Temperature / Beetle Hazard)

* **Type**: `create alarm`
* **Link Relation**: `HighTemperature`
* **Alarm type**: `TEMPERATURE_CRITICAL`
* **Alarm severity**: `CRITICAL`
* **Alarm details**:

```javascript
var details = {
    current_temp: msg.temp,
    max_threshold: metadata.shared_temp_high_crit || 74.0,
    timestamp: new Date().toISOString(),
    hazard: "Tobacco beetle hatching risk elevated above 74°F."
};
return details;

```

### Node 8: Clear Alarm (Temperature Nominal)

* **Type**: `clear alarm`
* **Link Relation**: `NominalTemperature`
* **Alarm type**: `TEMPERATURE_CRITICAL`

---

### Node 9: Battery Low Evaluator (Switch Node)

* **Type**: `switch` (Script)
* **JavaScript Code**:

```javascript
var battCrit = metadata.shared_batt_low_crit ? parseFloat(metadata.shared_batt_low_crit) : 20;

if (msg.battery !== undefined) {
    if (msg.battery < battCrit) {
        return ['LowBattery'];
    } else {
        return ['NominalBattery'];
    }
}
return ['Ignore'];

```

### Node 10: Create Alarm (Battery Low)

* **Type**: `create alarm`
* **Link Relation**: `LowBattery`
* **Alarm type**: `BATTERY_LOW_WARNING`
* **Alarm severity**: `WARNING`
* **Alarm details**:

```javascript
var details = {
    current_battery: msg.battery,
    crit_threshold: metadata.shared_batt_low_crit || 20,
    timestamp: new Date().toISOString(),
    message: "ESP32 LiPo battery level below minimum operating threshold."
};
return details;

```

### Node 11: Clear Alarm (Battery Nominal)

* **Type**: `clear alarm`
* **Link Relation**: `NominalBattery`
* **Alarm type**: `BATTERY_LOW_WARNING`

---

## 3. End-to-End Real Data Testing Procedure

You can test the entire pipeline using your active Python telemetry script:

```python
# Published telemetry format:
# {'rh': 66.75, 'temp': 71.22, 'battery': 83, 'rssi': -40}

```

### Step 1: Baseline Nominal State Test

1. Open the web dashboard at `https://dash.humid1.com`.
2. Set the target thresholds in the **Hardware Device & Alarm Parameters** control panel:
* Target Sweet Spot Min: **62.0%**
* Target Sweet Spot Max: **73.0%**
* High Temp Critical: **74.0°F**
* Low Battery Critical: **20%**


3. Click **Save Parameters** to push to ThingsBoard shared attributes.
4. Run your debug script sending:
```json
{"rh": 67.5, "temp": 70.5, "battery": 85, "rssi": -42}

```


5. **Expected Outcome**:
* Web app displays telemetry updates immediately.
* All 4 widgets (Relative Humidity, Temperature, Battery, RSSI) refresh.
* The Alarms Feed shows zero active alarms.



### Step 2: Low & High Humidity Alarm Trigger Test

1. Send low humidity telemetry:
```json
{"rh": 58.2, "temp": 70.8, "battery": 85, "rssi": -43}

```


**Expected Outcome**: `HUMIDITY_LOW_WARNING` (WARNING) alarm created.
2. Send high humidity telemetry:
```json
{"rh": 78.0, "temp": 70.8, "battery": 85, "rssi": -43}

```


**Expected Outcome**: `HUMIDITY_HIGH_CRITICAL` (CRITICAL) alarm created; low humidity alarm auto-clears.

### Step 3: Self-Healing & Alarm Auto-Clear Test

1. Run your debug script returning to nominal conditions:
```json
{"rh": 68.2, "temp": 70.2, "battery": 84, "rssi": -41}

```


2. **Expected Outcome**:
* The Root Rule Chain triggers the `clear alarm` nodes.
* Active alarms transition to `CLEARED_UNACK` or clear from feed.
* Humidity gauge returns to normal visual range.



### Step 4: High Temperature / Beetle Hazard & Low Battery Test

1. Send temperature above ceiling and low battery:
```json
{"rh": 67.0, "temp": 75.8, "battery": 15, "rssi": -40}

```


2. **Expected Outcome**:
* Rule chain simultaneously triggers `TEMPERATURE_CRITICAL` and `BATTERY_LOW_WARNING`.
* Web app alerts reflect both critical temperature and low battery conditions.



---

## 4. Rule Chain Installation Steps

1. Log into your ThingsBoard web console as `TENANT_ADMIN`.
2. Navigate to **Rule Chains** $\rightarrow$ Open **Root Rule Chain**.
3. Add the **Originator Attributes** node immediately following `Message Type Switch` (for `POST_TELEMETRY_REQUEST`).
4. Route the outbound `Success` link from **Originator Attributes** into Node 2 (Humidity Switch), Node 6 (Temperature Switch), and Node 9 (Battery Switch) in parallel.
5. Connect the outcome relation links (`LowHumidity`, `HighHumidity`, `NominalHumidity`, etc.) to their matching Create/Clear Alarm nodes as specified in Section 2.
6. Click **Save** in the bottom right corner of the rule chain editor.
