# Friends 7s Kombanad – Club Ledger (React Native / Expo)

## One-time setup
1. Install Node.js (LTS) from nodejs.org.
2. In a terminal:
   npx create-expo-app@latest ClubLedger --template blank
   cd ClubLedger
   npx expo install @react-native-async-storage/async-storage
3. Copy these files from this zip into the ClubLedger folder, replacing the originals:
   App.js, app.json, eas.json, and the assets folder.

## Try it on your phone
   npx expo start      (scan the QR code with the Expo Go app)

## Build an APK online (no Android Studio)
   npm install -g eas-cli
   eas login           (free account at expo.dev)
   eas build -p android --profile preview
When it finishes, EAS prints a download link for the .apk. Open it on your phone to install.

Data is stored on the phone only. The logo is used as the app icon, splash screen and header.
