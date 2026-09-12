## Dashboard, Settings and Navigation  

<!-- The dashboard in its current state won't actually allow users to sign-in with plain TB credentials, one must use the SSO portal, for security, and 'forced' TOTP, via a 3rd party authentication application or offline hardware based TOPT token. There is also currently no physical means to allow a user to create a native TB account, one must use the SSO registration flow in order to receive access to the servers hosted web applications. This was done in an attempt to secure user accounts, prevent leaks, and consolidate all web application accounts into one manageable dashboard for efficient administration. Thank you for your understand. -->

### Authorization Screen  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Auth-Dialog.png" alt="Authorization Screen" width="80%">

### Main Dashboard I  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Main-Dashboard_1.png" alt="Main Dashboard I" width="80%">

### Main Dashboard II  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Main-Dashboard_2.png" alt="Main Dashboard II" width="80%">

### About Dialog  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/About-Dialog.png" alt="About Dialog" width="80%">

### Development Notice Popup  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/DEV-Notice.png" alt="Development Notice Popup" width="80%">

### Live Diagnostics
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/API-Live-Diagnostics.png" alt="Live Diagnostics" width="80%">

### Advanced Settings Dialog  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Settings-Dialog.png" alt="Advanced Settings Dialog" width="80%">

### Device Claiming Dialog  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Claim-Device.png" alt="Device Claiming Dialog" width="80%">

## Theme Support  

### Theme Wizard Presets  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard.png" alt="Theme Wizard Presets" width="80%">

### Theme Wizard Palette  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard-Palette.png" alt="Theme Wizard Palette" width="80%">

### Theme Wizard Font  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard-Font.png" alt="Theme Wizard Font" width="80%">

### Theme Wizard Style  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard-Style.png" alt="Theme Wizard Style" width="80%">

## Dashboard Widgets  

### Timeseries Graph Zoom Preview I  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Zoom-Preview_1.png" alt="Timeseries Graph Zoom Preview I" width="80%">

### Timeseries Graph Zoom Preview II  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Zoom-Preview_2.png" alt="Timeseries Graph Zoom Preview II" width="80%">

## Envelope Notifications  

### Sample Email Correspondence  
<img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Email-Sample.png" alt="Sample Email Correspondence" width="80%">

### Sample Device Export XML (**humid1-test-sensor-b077bd-config.xml**)  

```XML
<?xml version="1.0" encoding="UTF-8"?>
<humid1-device-config version="1.0" exported-at="2026-09-12T02:42:55.300Z">
  <metadata>
    <device-id>4f1d23f0-ac35-11f1-9f5e-ebe16f79bb58</device-id>
    <device-name>Test-Sensor-b077bd</device-name>
    <generator>HUMID1 Telemetry Stack v1.0</generator>
  </metadata>

  <!-- Hardware Operating Parameters -->
  <parameters>
    <sleep-interval-min>15</sleep-interval-min>
    <sleep-interval-sec>900</sleep-interval-sec>
    <device-theme>light</device-theme>
    <sound-enabled>true</sound-enabled>
    <auto-update-enabled>true</auto-update-enabled>
    <manual-ota-trigger>false</manual-ota-trigger>
    <email-alerts-enabled>true</email-alerts-enabled>
    <temp-unit>F</temp-unit>
  </parameters>

  <!-- Environmental & Battery Alarm Threshold Limits -->
  <alarm-thresholds>
    <rh-low-critical>62.0</rh-low-critical>
    <rh-low-warning>65.0</rh-low-warning>
    <rh-high-warning>73.0</rh-high-warning>
    <rh-high-critical>76.0</rh-high-critical>

    <!-- Temperature limits in canonical Kelvin -->
    <temp-low-critical>287.59</temp-low-critical>
    <temp-low-warning>290.93</temp-low-warning>
    <temp-high-warning>295.37</temp-high-warning>
    <temp-high-critical>297.04</temp-high-critical>

    <battery-low-critical>15</battery-low-critical>
    <battery-low-warning>25</battery-low-warning>

    <rh-hist>1.5</rh-hist>
    <temp-hist>0.56</temp-hist>
    <batt-hist>2.0</batt-hist>
  </alarm-thresholds>

  <!-- UI Theme & Color Palette Tokens -->
  <theme-config id="tokyo-night" name="Tokyo Night">
    <author>Omarchy Theme Pack</author>
    <version>1.0.0</version>
    <description>Linux TOML palette theme (Dark mode)</description>
    <colors>
      <background>#0e0e14</background>
      <surface>#1a1b26</surface>
      <surface-elevated>#24283b</surface-elevated>
      <surface-subtle>#08080b</surface-subtle>
      <border>#292e42</border>
      <border-highlight>#414868</border-highlight>
      <text-primary>#c0caf5</text-primary>
      <text-secondary>#b4bee6</text-secondary>
      <text-muted>#616b9b</text-muted>
      <accent>#84a6ee</accent>
      <accent-hover>#ff9e64</accent-hover>
      <accent-text>#020617</accent-text>
      <status-nominal>#9ec276</status-nominal>
      <status-warning>#d2ac76</status-warning>
      <status-critical>#e88598</status-critical>
      <status-info>#50949f</status-info>
    </colors>
    <charts>
      <grid-color>#292e42</grid-color>
      <rh-line>#84a6ee</rh-line>
      <rh-gradient-start>#84a6ee</rh-gradient-start>
      <temp-line>#50949f</temp-line>
      <tooltip-background>#1a1b26</tooltip-background>
      <tooltip-border>#414868</tooltip-border>
    </charts>
    <styles>
      <border-radius>12px</border-radius>
      <card-radius>16px</card-radius>
      <button-radius>8px</button-radius>
      <font-family>&apos;Inter&apos;, sans-serif</font-family>
      <mono-family>ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace</mono-family>
      <backdrop-blur>12px</backdrop-blur>
      <border-width>1px</border-width>
      <density>comfortable</density>
    </styles>
  </theme-config>
</humid1-device-config>
```

## Mobile Platform Snapshots  
<!-- Please note, the wrapper around the dashboard present in the android package may alter the dashboards dynamic layout. I have not yet had the opportunity to 'actually' test the android APK, only the web dashboard, via chrome. 'IF' there is a notable impact to the dashboards layout, a future revision will attempt to addresses any malformations in the UI. Note Recorded at 9/12/2026. -->

> moto g stylus 5G - 2023  
> Android 14 - *Upside Down Cake*  
> 
> Display Size - 6.6" FHD+  
> Resolution - Full HD+ (2400 x 1080)  
> Screen to Body Ratio - Active Area-Touch Panel (AA-TP): 92.42%  
> Display Technology - LTPS l 120Hz refresh rate  
> Aspect Ratio - 20:9  

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_1.png" alt="Mobile UI Snapshot 1"></td>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_2.png" alt="Mobile UI Snapshot 2"></td>
    <td><img src=https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_3.png alt="Mobile UI Snapshot 3"></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_4.png" alt="Mobile UI Snapshot 4"></td>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_5.png" alt="Mobile UI Snapshot 5"></td>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_6.png" alt="Mobile UI Snapshot 6"></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_7.png" alt="Mobile UI Snapshot 7"></td>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_8.png" alt="Mobile UI Snapshot 8"></td>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_9.png" alt="Mobile UI Snapshot 9"></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_10.png" alt="Mobile UI Snapshot 10"></td>
    <td><img src="https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/mobile-platform/mobile_11.png" alt="Mobile UI Snapshot 11"></td>
    <td></td>
  </tr>
</table>
