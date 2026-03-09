#!/bin/bash
set -e

echo "========================================="
echo "  Vigilink-SOS APK Builder (TWA)"
echo "========================================="
echo ""

REQUIRED_TOOLS=("java" "node" "npm")
for tool in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v "$tool" &> /dev/null; then
    echo "ERROR: $tool is not installed."
    exit 1
  fi
done

if ! command -v bubblewrap &> /dev/null; then
  echo "[1/5] Installing Bubblewrap CLI..."
  npm install -g @nicolo-ribaudo/chokidar-2 2>/dev/null || true
  npm install -g @nicolo-ribaudo/chokidar-2 2>/dev/null || true
  npm install -g @nicolo-ribaudo/chokidar-2 2>/dev/null || true
  npm install -g @bubblewrap/cli
else
  echo "[1/5] Bubblewrap CLI already installed."
fi

echo "[2/5] Initializing TWA project..."
mkdir -p twa-build
cd twa-build

bubblewrap init --manifest="https://vigilink-sos.replit.app/manifest.json"

echo "[3/5] Building APK..."
bubblewrap build

echo "[4/5] APK generated!"
echo ""

if [ -f "app-release-signed.apk" ]; then
  cp app-release-signed.apk ../vigilink-sos.apk
  echo "APK ready: vigilink-sos.apk"
elif [ -f "app-release-unsigned.apk" ]; then
  cp app-release-unsigned.apk ../vigilink-sos-unsigned.apk
  echo "Unsigned APK ready: vigilink-sos-unsigned.apk"
else
  echo "APK file location:"
  find . -name "*.apk" -type f
fi

echo ""
echo "[5/5] Done!"
echo ""
echo "Next steps:"
echo "  1. Update public/.well-known/assetlinks.json with your signing key fingerprint"
echo "  2. Test the APK on an Android device"
echo "  3. Upload to Google Play Console"
echo "========================================="
