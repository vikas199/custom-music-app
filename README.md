# Personal Multi-Tool App (Music Player Phase)

This project is a personal, private Android application designed for a Google Pixel device. It starts as a custom music streaming app backed by Google Drive and is architected to expand into a multi-tool utility (including secure storage and biometrics).

## Architecture & Tech Stack

*   **Framework:** React Native (Expo)
*   **Backend Storage:** Google Drive (15GB Free Tier)
*   **Data Strategy:** 
    *   Songs are stored in Google Drive.
    *   A `library.json` file on Drive acts as the database index for fast startup.
    *   An LRU (Least Recently Used) Rolling Cache saves played songs locally via `expo-file-system` to save mobile data.
*   **Future Features Support:**
    *   `expo-secure-store` for encrypted password storage.
    *   `expo-local-authentication` for biometric login (FaceID/Fingerprint).

## Core Features (Music Player)

*   **Dark Mode UI:** Optimized for driving and workouts.
*   **Data Saver Mode:** Toggle to stream only via Wi-Fi or play exclusively from the local cache.
*   **Background Audio:** Uninterrupted playback using `react-native-track-player`.

## Setup Instructions

1. Install Node.js
2. Get the Expo Go app on your phone
3. Run `npm start` to launch the development server
