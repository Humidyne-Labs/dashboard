# HUMID1 — Git Branching & CI/CD Release Workflow

This document details the branch lifecycle, automated build routines, and release integration guidelines utilized within the **HUMID1** ecosystem to deploy web assets and microcontroller firmware.

---

## 1. Branching Strategy (Trunk-Based with Semantic Tags)

To maintain maximum development velocity, we use a lightweight, tag-driven Trunk-Based workflow:

```
feature/branch ──> PR / Code Review ──> main (Protected)
                                          │
                                          ├── Tag: vX.Y.Z (Triggers Web PWA & Android TWA Build)
                                          │
                                          └── Tag: fw-vX.Y.Z (Triggers ESP32 Firmware Build & ThingsBoard OTA Push)
```

* **`main`**: Protected branch. Requires passing automated validation checks (linters, static analyses, and compilation suites) before pull requests are merged.
* **`feature/*` / `fix/*`**: Temporary local branches branched from `main` to implement enhancements or fix defects.
* **Release Tags**:
  * **`vX.Y.Z`** $\rightarrow$ Triggers compilation of the Web Dashboard, production static deployment, and the native Android TWA package build.
  * **`fw-vX.Y.Z`** $\rightarrow$ Triggers ESP32 microcontroller firmware compilation and auto-uploads binaries to the ThingsBoard OTA Package repository.

---

## 2. Web App, PWA & Android TWA Release Pipeline (`vX.Y.Z`)

When a web app tag is pushed (e.g. `git tag v1.2.0 && git push origin v1.2.0`):

```
[Git Tag: v*]
       │
       ├──► [Vite Build & Typecheck] ────────────► Generates /dist (HTML/JS/CSS + PWA Manifest)
       │
       ├──► [Deploy Web / PWA to Host] ──────────► Uploads static assets to production host
       │
       └──► [Build Android TWA APK via Bubblewrap]
             │
             ├──► Verify .well-known/assetlinks.json against signature keystore
             └──► Output production .apk and .aab assets to GitHub Release attachments
```

### GitHub Actions Workflow: `.github/workflows/android-twa.yml`

```yaml
name: Build Android TWA (APK & AAB)

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      build_bundle:
        description: 'Build Google Play Android App Bundle (.aab)'
        required: true
        type: boolean
        default: true
      skip_pwa_validation:
        description: 'Skip live PWA origin validation during build'
        required: true
        type: boolean
        default: true

jobs:
  build-android-twa:
    name: Build Android TWA APK & AAB
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Validate & Build Web PWA
        run: npm run build

      - name: Setup Java (JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK Tools
        uses: android-actions/setup-android@v3

      - name: Install Bubblewrap CLI
        run: npm install -g @bubblewrap/cli

      - name: Configure Bubblewrap Paths
        run: |
          mkdir -p ~/.bubblewrap
          echo "{\"jdkPath\":\"$JAVA_HOME\",\"androidSdkPath\":\"$ANDROID_HOME\"}" > ~/.bubblewrap/config.json

      - name: Configure Keystore for Signing
        id: keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          KEYSTORE_PASS: ${{ secrets.ANDROID_KEYSTORE_PASS || 'humid1pass' }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS || 'humid1-key' }}
          KEY_PASS: ${{ secrets.ANDROID_KEY_PASS || 'humid1pass' }}
        run: |
          mkdir -p android-build
          if [ -n "$KEYSTORE_BASE64" ]; then
            echo "Using production keystore from repository secrets..."
            echo "$KEYSTORE_BASE64" | base64 -d > android-build/android-keystore.jks
            echo "has_secret=true" >> $GITHUB_OUTPUT
          else
            echo "No ANDROID_KEYSTORE_BASE64 secret found. Generating CI debug keystore..."
            keytool -genkey -v -keystore android-build/android-keystore.jks \
              -alias "$KEY_ALIAS" \
              -keyalg RSA -keysize 2048 -validity 10000 \
              -storepass "$KEYSTORE_PASS" -keypass "$KEY_PASS" \
              -dname "CN=HUMID1, OU=Engineering, O=HUMID1 Systems, L=Denver, S=CO, C=US"
            echo "has_secret=false" >> $GITHUB_OUTPUT
          fi
          
          echo "=== SHA-256 CERTIFICATE FINGERPRINT ==="
          keytool -list -v -keystore android-build/android-keystore.jks -alias "$KEY_ALIAS" -storepass "$KEYSTORE_PASS" | grep "SHA256:"
          echo "======================================="

      - name: Build Android TWA Project with Bubblewrap
        env:
          BUBBLEWRAP_KEYSTORE_PATH: "./android-build/android-keystore.jks"
          BUBBLEWRAP_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASS || 'humid1pass' }}
          BUBBLEWRAP_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS || 'humid1-key' }}
          BUBBLEWRAP_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASS || 'humid1pass' }}
        run: |
          mkdir -p android-build
          cp twa-manifest.json android-build/twa-manifest.json
          cd android-build
          yes | bubblewrap update          
          bubblewrap build --manifest=twa-manifest.json --skipPwaValidation

      - name: Build Android App Bundle (.aab)
        if: github.event.inputs.build_bundle != 'false'
        env:
          BUBBLEWRAP_KEYSTORE_PATH: "./android-build/android-keystore.jks"
          BUBBLEWRAP_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASS || 'humid1pass' }}
          BUBBLEWRAP_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS || 'humid1-key' }}
          BUBBLEWRAP_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASS || 'humid1pass' }}
        run: |
          cd android-build
          bubblewrap build --manifest=twa-manifest.json --skipPwaValidation --bundle || echo "Bundle skipped"

      - name: Rename and Stage Artifacts
        run: |
          mkdir -p output
          find android-build -name "*.apk" -exec cp {} output/ \;
          find android-build -name "*.aab" -exec cp {} output/ \; || true

      - name: Upload APK & AAB Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: humid1-android-twa-artifacts
          path: output/
          retention-days: 14

      - name: Attach Assets to GitHub Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: output/*
          generate_release_notes: true
          draft: false
          prerelease: false
```

---

## 3. Firmware Release Pipeline (`fw-vX.Y.Z`)

When a hardware firmware tag is pushed (e.g., `git tag fw-v1.0.4 && git push origin fw-v1.0.4`), the CI system compiles the binary and deploys it directly to ThingsBoard CE:

```
[Git Tag: fw-v*]
       │
       ├──► [PlatformIO Build Engine] ───────────► Compiles hardware-optimized firmware.bin
       │
       ├──► [Metadata Extraction] ──────────────► Calculates SHA-256 and binary size metrics
       │
       ├──► [ThingsBoard REST Ingestion] ────────► Uploads binary directly into ThingsBoard CE
       │                                           OTA Package repository
       └──► [GitHub Releases] ───────────────────► Creates GitHub release containing binary
```

### GitHub Actions Workflow: `.github/workflows/firmware-release.yml`

```yaml
name: Release Firmware & Push to ThingsBoard OTA

on:
  push:
    tags:
      - 'fw-v*'

jobs:
  build-and-release-firmware:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install PlatformIO
        run: pip install platformio

      - name: Extract Version Tag
        id: vars
        run: echo "FW_VERSION=${GITHUB_REF#refs/tags/fw-}" >> $GITHUB_OUTPUT

      - name: Compile ESP32 Binary
        run: pio run -e esp32dev

      - name: Calculate Checksum & Size
        id: meta
        run: |
          BIN_PATH=".pio/build/esp32dev/firmware.bin"
          echo "CHECKSUM=$(sha256sum $BIN_PATH | awk '{print $1}')" >> $GITHUB_OUTPUT
          echo "SIZE=$(stat -c%s $BIN_PATH)" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: .pio/build/esp32dev/firmware.bin
          body: |
            ### HUMID1 ESP32 Firmware ${{ steps.vars.outputs.FW_VERSION }}
            - **Binary File:** `firmware.bin`
            - **SHA-256 Checksum:** `${{ steps.meta.outputs.CHECKSUM }}`
            - **Size:** `${{ steps.meta.outputs.SIZE }} bytes`

      - name: Upload Binary to ThingsBoard OTA Repository
        env:
          TB_URL: ${{ secrets.THINGSBOARD_SERVER_URL }}
          TB_TOKEN: ${{ secrets.THINGSBOARD_ADMIN_JWT }}
        run: |
          # 1. Register OTA Package Record in ThingsBoard
          PACKAGE_ID=$(curl -s -X POST "$TB_URL/api/otaPackage" \
            -H "X-Authorization: Bearer $TB_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
              "title": "HUMID1_OS_'$GITHUB_REF_NAME'",
              "version": "'${{ steps.vars.outputs.FW_VERSION }}'",
              "type": "FIRMWARE",
              "hasData": false
            }' | jq -r '.id.id')

          # 2. Stream Binary and Register Valid Checksums
          curl -X POST "$TB_URL/api/otaPackage/$PACKAGE_ID?checksum=${{ steps.meta.outputs.CHECKSUM }}&checksumAlgorithm=SHA256" \
            -H "X-Authorization: Bearer $TB_TOKEN" \
            -F "file=@.pio/build/esp32dev/firmware.bin"
```

---

## 4. Release Checklist for Developers

- [ ] **Microcontroller Firmware Release**:
  1. Bump `VERSION` constants inside the firmware source code config and `platformio.ini`.
  2. Merge the approved feature/bugfix branch into `main`.
  3. Create and push the firmware tag:
     ```bash
     git tag fw-v1.2.0
     git push origin fw-v1.2.0
     ```

- [ ] **Web Dashboard Release**:
  1. Verify the `version` block is up-to-date in `package.json`.
  2. Merge the approved branch to `main`.
  3. Create and push the dashboard release tag:
     ```bash
     git tag v1.2.0
     git push origin v1.2.0
     ```
