# 📱 Build Android APK - Nusantara AI

Panduan lengkap untuk convert web app menjadi Android APK menggunakan Capacitor.

## 📋 Prerequisites

1. **Node.js** (v18+) - [Download](https://nodejs.org/)
2. **Android Studio** - [Download](https://developer.android.com/studio)
3. **Java JDK 17+** - Biasanya bundled dengan Android Studio

### Setup Android Studio
1. Buka Android Studio → SDK Manager
2. Install:
   - Android SDK Platform 34 (atau terbaru)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools

---

## 🚀 Langkah Build APK

### Step 1: Install Dependencies
```bash
cd "d:\Master Project\nusantara-ai"
npm install
```

### Step 2: Build Web App
```bash
npm run build
```
Ini akan membuat folder `dist/` dengan production build.

### Step 3: Initialize Capacitor (Pertama kali saja)
```bash
npx cap init "Nusantara AI" "com.rebelion16.nusantaraai" --web-dir dist
```
Jika sudah ada `capacitor.config.ts`, skip langkah ini.

### Step 4: Add Android Platform
```bash
npx cap add android
```

### Step 5: Sync Web to Android
```bash
npx cap sync android
```

### Step 6: Open di Android Studio
```bash
npx cap open android
```

---

## 🔨 Build APK di Android Studio

1. Android Studio terbuka dengan project `android/`
2. Tunggu Gradle sync selesai
3. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. Tunggu build selesai
5. APK ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release APK (Untuk Play Store)
1. Menu: **Build → Generate Signed Bundle / APK**
2. Pilih **APK**
3. Create new keystore atau gunakan yang ada
4. Build **release**
5. APK ada di: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔄 Update APK Setelah Perubahan Code

Setiap kali ada perubahan di web app:
```bash
npm run build
npx cap sync android
```
Lalu build ulang di Android Studio.

Atau gunakan shortcut:
```bash
npm run android
```

---

## 📝 Troubleshooting

### Error: JAVA_HOME not set
```bash
# Windows - tambahkan ke System Environment Variables
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

### Error: SDK location not found
Buat file `android/local.properties`:
```
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Error: Gradle sync failed
1. File → Invalidate Caches → Restart
2. Atau hapus folder `android/.gradle` dan sync ulang

---

## 🎨 Customization

### App Icon
Ganti file di:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

Gunakan [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) untuk generate semua ukuran.

### Splash Screen
Edit `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#0a0f1d',
    androidSplashResourceName: 'splash',
  }
}
```

### App Name
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Nusantara AI</string>
```

---

## ✅ Checklist Final

- [ ] `npm install` sukses
- [ ] `npm run build` menghasilkan folder `dist/`
- [ ] `npx cap add android` sukses
- [ ] Android Studio bisa buka project
- [ ] Build APK sukses
- [ ] Test di device/emulator

---

**Selamat! 🎉 Nusantara AI sekarang tersedia sebagai Android APK!**
