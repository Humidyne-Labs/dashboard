## Dashboard, Settings and Navigation  

### Authorization Screen  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Auth-Dialog.png)  

### Main Dashboard I  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Main-Dashboard_1.png)  

### Main Dashboard II  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Main-Dashboard_2.png)  

### About Dialog  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/About-Dialog.png)  

### Development Notice Popup  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/DEV-Notice.png)  

### Live Diagnostics
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/API-Live-Diagnostics.png)  

### Advanced Settings Dialog  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Settings-Dialog.png)  

### Device Claiming Dialog  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Claim-Device.png)  

## Theme Support  

### Theme Wizard Presets  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard.png)  

### Theme Wizard Palette  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard-Palette.png)  

### Theme Wizard Font  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard-Font.png)  

### Theme Wizard Style  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Theme-Wizard-Style.png)  

## Dashboard Widgets  

### Timeseries Graph Zoom Preview I  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Zoom-Preview_1.png)  

### Timeseries Graph Zoom Preview II  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Zoom-Preview_2.png)  

## Envelope Notifications  

### Sample Email Correspondence  
![image](https://raw.githubusercontent.com/Humidyne-Labs/assets/main/Images/dashboard-snapshot/Email-Sample.png)  

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
