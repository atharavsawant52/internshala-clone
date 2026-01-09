// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration (NEW PROJECT)
const firebaseConfig = {
  apiKey: "AIzaSyDiAZBHVKZO1IEhOffBuwNxr01RvNWwDNw",
  authDomain: "internarea-d622a.firebaseapp.com",
  projectId: "internarea-d622a",
  storageBucket: "internarea-d622a.firebasestorage.app",
  messagingSenderId: "76086933484",
  appId: "1:76086933484:web:fa0f2b4d42b0729950f2c9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth + Google Provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
