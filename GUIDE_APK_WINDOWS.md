# Guide : Construire l'APK Vigilink-SOS sur Windows

## Pre-requis a installer

### 1. Node.js
- Telecharger : https://nodejs.org (version LTS)
- Installer en cochant toutes les options par defaut

### 2. Git
- Telecharger : https://git-scm.com/download/win
- Installer avec les options par defaut

### 3. Android Studio
- Telecharger : https://developer.android.com/studio
- Installer avec les options par defaut
- Au premier lancement, accepter toutes les licences SDK
- Verifier que le SDK Android 34 est installe (File > Settings > SDK Manager)

### 4. Java JDK 17
- Android Studio l'installe automatiquement
- Sinon telecharger : https://adoptium.net

---

## Etape 1 : Cloner et preparer le projet

Ouvrir un terminal (PowerShell ou cmd) :

```bash
git clone https://github.com/izmaghiles-ops/vigilink-sos.git
cd vigilink-sos
npm install
npm run build
```

## Etape 2 : Ajouter la plateforme Android

```bash
npx cap add android
npx cap sync
```

## Etape 3 : Copier les plugins natifs

Copier les fichiers Java dans le projet Android genere.
Depuis la racine du projet vigilink-sos :

```bash
mkdir -p android/app/src/main/java/com/vigilinksos/plugins
copy android-plugin\com\vigilinksos\plugins\*.java android\app\src\main\java\com\vigilinksos\plugins\
```

Ou manuellement : copier tous les fichiers .java du dossier
`android-plugin/com/vigilinksos/plugins/` vers
`android/app/src/main/java/com/vigilinksos/plugins/`

## Etape 4 : Enregistrer les plugins

Ouvrir le fichier :
`android/app/src/main/java/com/vigilinksos/app/MainActivity.java`

Remplacer le contenu par :

```java
package com.vigilinksos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.vigilinksos.plugins.NativeSMSPlugin;
import com.vigilinksos.plugins.VoiceTriggerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSMSPlugin.class);
        registerPlugin(VoiceTriggerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

## Etape 5 : Modifier le AndroidManifest.xml

Ouvrir : `android/app/src/main/AndroidManifest.xml`

Ajouter ces permissions AVANT la balise `<application>` :

```xml
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

Ajouter le service DANS la balise `<application>`, apres `</activity>` :

```xml
<service
    android:name="com.vigilinksos.plugins.VoiceTriggerService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="microphone" />
```

## Etape 6 : Ouvrir dans Android Studio

```bash
npx cap open android
```

Android Studio va s'ouvrir avec le projet. Attendre que le Gradle sync se termine (barre de progression en bas).

## Etape 7 : Connecter votre telephone

1. Sur votre telephone Android :
   - Aller dans Parametres > A propos du telephone
   - Appuyer 7 fois sur "Numero de build" pour activer le mode developpeur
   - Aller dans Parametres > Options pour les developpeurs
   - Activer "Debogage USB"

2. Brancher le telephone a votre PC avec un cable USB
3. Sur le telephone, accepter la demande de debogage USB

## Etape 8 : Compiler et installer

Dans Android Studio :
1. Selectionner votre telephone dans la barre en haut (a cote du bouton Play)
2. Cliquer sur le bouton Play vert (Run)
3. Attendre la compilation (~2-5 minutes la premiere fois)
4. L'app s'installe et s'ouvre automatiquement sur votre telephone

## Etape 9 : Generer l'APK de distribution

Pour creer un APK a partager :
1. Dans Android Studio : Build > Build Bundle(s) / APK(s) > Build APK(s)
2. L'APK sera dans : `android/app/build/outputs/apk/debug/app-debug.apk`

Pour un APK signe (Google Play) :
1. Build > Generate Signed Bundle / APK
2. Creer un nouveau keystore (garder le mot de passe!)
3. Selectionner APK > release
4. L'APK signe sera dans `android/app/build/outputs/apk/release/`

---

## Ce qui fonctionne dans l'APK native

| Fonctionnalite                      | PWA (navigateur) | APK native |
|-------------------------------------|-------------------|------------|
| Bouton SOS                          | Oui               | Oui        |
| SMS via Twilio                      | Oui               | Oui        |
| SMS via carte SIM du telephone      | Non               | Oui        |
| Declencheur vocal (app ouverte)     | Oui               | Oui        |
| Declencheur vocal (ecran eteint)    | Non               | Oui        |
| GPS en arriere-plan                 | Non               | Oui        |
| Dead Man's Switch en arriere-plan   | Partiel           | Oui        |
| Notification permanente             | Non               | Oui        |

## Resolution de problemes

### "SDK not found"
- File > Settings > Appearance > System Settings > Android SDK
- Installer SDK Platform 34 et Build Tools 34.0.0

### "Gradle sync failed"
- File > Sync Project with Gradle Files
- Si ca persiste : File > Invalidate Caches / Restart

### L'app crash au demarrage
- Verifier que les plugins sont bien enregistres dans MainActivity.java
- Verifier que le AndroidManifest.xml contient le service

### Le micro ne fonctionne pas en arriere-plan
- Verifier la permission FOREGROUND_SERVICE_MICROPHONE dans le manifest
- Sur le telephone : Parametres > Applications > Vigilink-SOS > Permissions > Microphone > Autoriser
