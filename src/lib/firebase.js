// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup 
} from "firebase/auth";
import { WEBUI_API_BASE_URL } from "$lib/constants";
import { generateInitialsImage } from "$lib/utils";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBdItr94RE5XLBTfK_LQrUK0xzQ99mVo_E",
  authDomain: "bullbillion-f5997.firebaseapp.com",
  projectId: "bullbillion-f5997",
  storageBucket: "bullbillion-f5997.firebasestorage.app",
  messagingSenderId: "135105655235",
  appId: "1:135105655235:web:5952cae49f1f5dc3244d76",
  measurementId: "G-9S7FZ7W38V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;

// Only initialize analytics in browser environment
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const handleBackendAuth = async (user) => {
  const response = await fetch(`${WEBUI_API_BASE_URL}/auths/google`, {
    method: 'POST',
    body: JSON.stringify({
      user
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to sign in with Google');
  }
  const data = await response.json();
  return data;
};

const handleEmailAuthSingup = async (user) => {
  console.log('user from firebase',user);
  const response = await fetch(`${WEBUI_API_BASE_URL}/auths/email`, {
    method: 'POST',
    body: JSON.stringify({
      user: {...user, profile_image_url: generateInitialsImage(user.displayName)}
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to sign in with Google');
  }
  const data = await response.json();
  return data;
};

const handleEmailAuthLogin = async (user) => {
  console.log('user from firebase',user);
  const response = await fetch(`${WEBUI_API_BASE_URL}/auths/email`, {
    method: 'POST',
    body: JSON.stringify({
      user: user
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to sign in with Google');
  }
  const data = await response.json();
  return data;
};

// Function to handle Google sign-in
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const data = await handleBackendAuth(user);
    return data;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

const signInWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const data = await handleEmailAuthLogin(result.user);
  return data;
};

const signUpWithEmail = async (name,email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  user.displayName = name;
  const data = await handleEmailAuthSingup(user);
  return data;
};

export { 
  app, 
  auth, 
  analytics, 
  signInWithEmail, 
  signUpWithEmail,
  signInWithGoogle
}; 