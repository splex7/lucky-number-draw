# Remote Controller Setup

## Prerequisites
To use the remote controller feature, you need a Firebase project with Realtime Database enabled.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup steps to create your project

## Step 2: Enable Realtime Database

1. In your Firebase project, go to "Realtime Database" in the left menu
2. Click "Create Database"
3. Choose "Start in test mode" (for development) or configure security rules appropriately

## Step 3: Get Firebase Configuration

1. In the Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Add a web app if you don't have one already
4. Copy the configuration object values

## Step 4: Create Configuration File

1. Create a file named `firebaseConfig.js` in the root directory of the project
2. Add your Firebase configuration as in the sample below:

```javascript
// Firebase Configuration - Add your own values to firebaseConfig.js
const firebaseConfig = {
    apiKey: "your_actual_api_key",
    authDomain: "your-project-id.firebaseapp.com", 
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your_sender_id",
    appId: "your_app_id"
};

// Export for use in other files (only needed if using Node.js modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig };
}
```

3. This file is automatically included in both the main app and the remote controller
4. The `.gitignore` file will prevent this file from being committed to the repository

## Step 5: Security Rules (For Production)

If you're using the app in production, update your Realtime Database rules to secure access:

```json
{
  "rules": {
    "remoteCommands": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Using the Remote Controller

1. Open the main app on your host device
2. Start a game and navigate to the game screen
3. On another device, open `remote.html` in a web browser
4. Ensure both devices are connected to the internet
5. The remote controller should connect to Firebase and allow you to control the host app

## Commands Available

- Start Flip: Triggers the card flip animation (equivalent to pressing Enter)