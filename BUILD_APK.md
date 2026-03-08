# Générer l'APK Vigilink-SOS

## Prérequis
- Android Studio installé sur votre ordinateur
- Java JDK 17+
- Node.js 18+

## Étapes

### 1. Cloner le projet
```bash
git clone https://github.com/izmaghiles-ops/vigilink-sos.git
cd vigilink-sos
npm install
```

### 2. Build le frontend
```bash
npm run build
```

### 3. Ajouter la plateforme Android
```bash
npx cap add android
```

### 4. Enregistrer le plugin NativeSMS
Ouvrir `android/app/src/main/java/com/vigilinksos/app/MainActivity.java` et ajouter :

```java
import com.vigilinksos.plugins.NativeSMSPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSMSPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### 5. Copier le plugin natif
```bash
cp android-plugin/com/vigilinksos/plugins/NativeSMSPlugin.java \
   android/app/src/main/java/com/vigilinksos/plugins/NativeSMSPlugin.java
```

### 6. Ajouter la permission SMS dans AndroidManifest.xml
Le fichier est dans `android/app/src/main/AndroidManifest.xml`.
Ajouter avant `<application>` :
```xml
<uses-permission android:name="android.permission.SEND_SMS" />
```

### 7. Synchroniser et ouvrir dans Android Studio
```bash
npx cap sync android
npx cap open android
```

### 8. Générer l'APK
Dans Android Studio :
- Build > Build Bundle(s) / APK(s) > Build APK(s)
- L'APK sera dans `android/app/build/outputs/apk/debug/`

## Fonctionnement du SMS natif
- L'APK utilise l'API Android `SmsManager` pour envoyer des SMS directement
- Fonctionne SANS internet, juste avec le réseau cellulaire
- La permission SMS est demandée automatiquement au premier SOS
- Le SMS part du numéro de téléphone de l'utilisateur
