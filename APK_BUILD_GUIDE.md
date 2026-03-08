# Vigilink-SOS — Guide de création APK

## Méthode 1 : PWABuilder (la plus simple, recommandée)

### Étapes :

1. **Aller sur** [https://www.pwabuilder.com](https://www.pwabuilder.com)

2. **Entrer l'URL** : `https://vigilink-sos.replit.app`

3. **Cliquer sur "Start"** — PWABuilder analyse votre PWA

4. **Cliquer sur "Package for stores"** puis **"Android"**

5. **Remplir les options** :
   - Package ID : `com.vigilink.sos`
   - App name : `Vigilink-SOS`
   - Version : `1.0.0`
   - Signing key : PWABuilder peut en générer un pour vous

6. **Télécharger le ZIP** qui contient :
   - `vigilink-sos.apk` — APK prêt à installer
   - `vigilink-sos.aab` — Bundle pour le Google Play Store
   - `signing.keystore` — Clé de signature (GARDEZ-LA PRÉCIEUSEMENT)
   - `assetlinks.json` — À copier dans votre projet

### Après le téléchargement :

1. **Copier le contenu de `assetlinks.json`** dans `public/.well-known/assetlinks.json`
   - Remplacer `PLACEHOLDER_SHA256_FINGERPRINT` par la vraie empreinte de votre clé
   - Redéployer l'app

2. **Tester l'APK** sur votre téléphone Android :
   - Envoyer le fichier `.apk` sur votre téléphone
   - Autoriser l'installation depuis des sources inconnues
   - Installer et tester

3. **Publier sur le Play Store** :
   - Aller sur [Google Play Console](https://play.google.com/console)
   - Créer une nouvelle application
   - Uploader le fichier `.aab`
   - Remplir la fiche Play Store

---

## Méthode 2 : Bubblewrap CLI (pour développeurs)

### Prérequis (sur votre machine locale) :
- Node.js 18+
- Java JDK 11+
- Android SDK

### Étapes :

```bash
# Installer Bubblewrap
npm install -g @nicolo-ribaudo/chokidar-2 2>/dev/null || true
npm install -g @bubblewrap/cli

# Initialiser le projet TWA
mkdir vigilink-twa && cd vigilink-twa
bubblewrap init --manifest="https://vigilink-sos.replit.app/manifest.json"

# Construire l'APK
bubblewrap build

# L'APK sera généré dans le dossier courant
```

### Configuration de la clé de signature :

```bash
# Générer un keystore (première fois uniquement)
keytool -genkey -v -keystore vigilink-sos.keystore \
  -alias vigilink-sos -keyalg RSA -keysize 2048 -validity 10000

# Obtenir l'empreinte SHA256
keytool -list -v -keystore vigilink-sos.keystore -alias vigilink-sos | grep SHA256
```

### Mettre à jour assetlinks.json :

Copier l'empreinte SHA256 dans `public/.well-known/assetlinks.json` à la place de `PLACEHOLDER_SHA256_FINGERPRINT`.

---

## Fichiers importants dans le projet

| Fichier | Rôle |
|---------|------|
| `public/manifest.json` | Manifest PWA (requis pour TWA) |
| `public/.well-known/assetlinks.json` | Vérification Digital Asset Links |
| `public/icon-192.png` | Icône 192x192 |
| `public/icon-512.png` | Icône 512x512 |
| `public/sw.js` | Service Worker |
| `twa-manifest.json` | Configuration Bubblewrap |
| `scripts/build-apk.sh` | Script de build automatique |

---

## Checklist avant publication Play Store

- [ ] Manifest PWA valide (tester sur [web.dev/measure](https://web.dev/measure))
- [ ] Service Worker fonctionnel (mode hors-ligne)
- [ ] Icônes 192x192 et 512x512 conformes
- [ ] assetlinks.json mis à jour avec la bonne empreinte SHA256
- [ ] APK testé sur appareil Android
- [ ] Politique de confidentialité rédigée
- [ ] Fiche Play Store remplie (captures d'écran, description)
