# LEAD Mobile App (Flutter / Dart)

This is the official mobile application codebase built with **Flutter (Dart)** for Android & iOS. It features the exact same dark theme aesthetics, PIN security, active goals setup, task manager, sticky notes, and native Android system notifications.

## Project Structure
```
mobile/
  ├── lib/
  │   ├── main.dart                   # Application Entry point
  │   ├── theme/app_theme.dart        # Colors (#0A0A0A, #151515, card-purple, etc.)
  │   ├── models/models.dart          # Profile, Ego, Task, Note, NotificationLog
  │   ├── services/
  │   │   ├── supabase_service.dart   # Supabase DB & Auth client
  │   │   └── notification_service.dart # Android native notification popups
  │   └── screens/
  │       ├── pin_screen.dart         # Security PIN pad lock
  │       ├── dashboard_screen.dart   # Streak, Goal Card, Tasks (Short/Long/Events)
  │       ├── notes_screen.dart       # Color-coded sticky notes grid
  │       ├── account_screen.dart     # Profile edit, System Notifications & Test Push
  │       └── ego_setup_screen.dart   # Master Goal & Reason editor
  └── pubspec.yaml
```

## How to Build the APK for Android

1. Install **Flutter SDK** on your machine: [https://docs.flutter.dev/get-started/install](https://docs.flutter.dev/get-started/install)
2. Open terminal in the `mobile` folder:
   ```bash
   cd c:\Me\Lead\mobile
   ```
3. Install dependencies:
   ```bash
   flutter pub get
   ```
4. Build the release APK:
   ```bash
   flutter build apk --release
   ```
5. The generated APK will be available at:
   `mobile/build/app/outputs/flutter-apk/app-release.apk`
