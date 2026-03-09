# Construire l'APK Vigilink-SOS avec Google Colab

## Instructions

1. Ouvrez Google Colab : https://colab.research.google.com
2. Creez un nouveau notebook
3. Collez le code ci-dessous dans une cellule et executez-la
4. L'APK sera generee et telechargeable directement

## Code a copier dans Google Colab

```python
# === CELLULE 1 : Installation des outils ===
!apt-get update -qq
!apt-get install -y -qq default-jdk wget unzip > /dev/null 2>&1

# Installer Node.js 18
!curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
!apt-get install -y -qq nodejs > /dev/null 2>&1

# Installer Android SDK command-line tools
!mkdir -p /opt/android-sdk/cmdline-tools
!wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdtools.zip
!unzip -q /tmp/cmdtools.zip -d /opt/android-sdk/cmdline-tools/
!mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest

import os
os.environ['ANDROID_HOME'] = '/opt/android-sdk'
os.environ['PATH'] += ':/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools'

# Accepter les licences et installer les composants requis
!yes | sdkmanager --licenses > /dev/null 2>&1
!sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1

# Installer Bubblewrap
!npm install -g @nicolo-ribaudo/chokidar-2 > /dev/null 2>&1
!npm install -g @nicolo-ribaudo/chokidar-2 > /dev/null 2>&1
!npm install -g @nicolo-ribaudo/chokidar-2 > /dev/null 2>&1
!npm install -g @bubblewrap/cli > /dev/null 2>&1

print("✅ Outils installes avec succes!")
```

```python
# === CELLULE 2 : Generer l'APK ===
import os
os.environ['ANDROID_HOME'] = '/opt/android-sdk'
os.environ['JAVA_HOME'] = '/usr/lib/jvm/default-java'

!mkdir -p /content/vigilink-apk
%cd /content/vigilink-apk

# Initialiser le projet TWA depuis le manifest en ligne
!bubblewrap init --manifest="https://vigilink-sos.replit.app/manifest.json"

# Construire l'APK
!bubblewrap build

# Trouver et copier l'APK
import glob
apks = glob.glob('/content/vigilink-apk/**/*.apk', recursive=True)
if apks:
    for apk in apks:
        print(f"✅ APK trouvee : {apk}")
    # Copier le premier APK trouve
    !cp {apks[0]} /content/vigilink-sos.apk
    print("\\n📱 APK prete : /content/vigilink-sos.apk")
else:
    print("❌ Aucune APK trouvee. Verifiez les erreurs ci-dessus.")
```

```python
# === CELLULE 3 : Telecharger l'APK ===
from google.colab import files
files.download('/content/vigilink-sos.apk')
print("📥 Telechargement lance!")
```

## Apres la construction

1. **Installer l'APK** : Transferez le fichier sur votre telephone Android
2. **Activer "Sources inconnues"** : Parametres > Securite > Sources inconnues
3. **Installer et ouvrir** : L'app s'ouvrira comme une app native

## Limitations de la version TWA

- Le declencheur vocal fonctionne UNIQUEMENT quand l'app est ouverte au premier plan
- L'ecran en veille suspend le microphone et la reconnaissance vocale
- Les SMS passent par Twilio (serveur) et non par la carte SIM du telephone

## Pour une version avec declencheur vocal en arriere-plan

Il faudrait une version Capacitor avec un service Android natif (foreground service).
Cela necessite Android Studio et du code Java/Kotlin supplementaire.
