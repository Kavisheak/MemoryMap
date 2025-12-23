Optional dependencies and setup

To enable picking images/videos from device and persistent storage, install the following packages:

For Expo-managed projects (recommended):

```bash
expo install expo-image-picker @react-native-async-storage/async-storage expo-av
```

Then rebuild/run the app.

Notes:
- `expo-image-picker` enables the "Pick from device" button in the Add Memory modal.
- `@react-native-async-storage/async-storage` enables saving and loading memories between app restarts.
- `expo-av` enables in-app video playback for video memories.

I used dynamic requires in the code so these packages are optional — the app will still run without them and will show useful instructions when functionality is unavailable.
