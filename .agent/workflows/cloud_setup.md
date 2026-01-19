---
description: How to set up Cloudinary for free storage or fix Firebase Rules
---

# Option 1: Fix Firebase Rules (Simplest, Free)

If you use Firebase Storage, you do **not** need the "Pro" plan. You just need to set the rules to allow access.

1. Go to [Firebase Console](https://console.firebase.google.com/) -> Build -> Storage.
2. If it asks you to "Get Started", click it. **Choose "Start in Test Mode"**.
   - If assumes you want production, just click Next, pick a location (e.g. `us-central`), and finish.
3. Once the bucket is created, go to the **Rules** tab.
4. Paste these rules to allow everyone to read/write (for development):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
5. Click **Publish**. This will fix the "permission denied" error for uploads.

### Fix Firestore Rules (Database)
1. Go to Build -> Firestore Database -> Rules.
2. Paste this:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**.

---

# Option 2: Use Cloudinary (Alternative Method)

If you prefer Cloudinary (which has a generous free tier and no credit card requirement):

1. Go to [Cloudinary](https://cloudinary.com/) and Sign Up for free.
2. In the Dashboard, copy your **Cloud Name**.
3. Go to **Settings (Gear Icon) -> Upload**.
4. Scroll down to "Upload presets".
5. Click **Add Upload Preset**.
   - **Signing Mode**: Select **"Unsigned"**. This is crucial.
   - Click Save.
6. Copy the **Upload Preset Name** (it usually looks like `ml_default` or random characters).

### Configure App
1. Open `.env` in your project root.
2. Add these lines:

```ini
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
```

3. Restart your app:
   ```bash
   npx expo start -c
   ```

The app is already configured to automatically detect these keys and switch from Firebase Storage to Cloudinary.
