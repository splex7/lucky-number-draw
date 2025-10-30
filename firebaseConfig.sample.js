// Sample Firebase Configuration - Copy this to firebaseConfig.js and add your own values
const firebaseConfig = {
    apiKey: "your_actual_api_key_here",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your_sender_id_here",
    appId: "your_app_id_here"
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig };
}