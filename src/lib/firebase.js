// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail
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

// Facebook App configuration
// You need to create a Facebook App in the Facebook Developer Console
// https://developers.facebook.com/apps/
const facebookAppConfig = {
  appId: "553784173683718" // TODO: Add your Facebook App ID here
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
const facebookProvider = new FacebookAuthProvider();
// Add Facebook app ID and other required parameters
facebookProvider.setCustomParameters({
  'facebook_application_id': facebookAppConfig.appId,
  'display': 'popup'
});

/**
 * Handle backend authentication
 * @param {import('firebase/auth').User} user - The user object from Firebase
 * @param {string} provider - The authentication provider (google, facebook, etc.)
 * @returns {Promise<Object>} The response data
 */
const handleBackendAuth = async (user, provider = 'google') => {
  const response = await fetch(`${WEBUI_API_BASE_URL}/auths/${provider}`, {
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
    throw new Error(`Failed to sign in with ${provider}`);
  }
  const data = await response.json();
  return data;
};

/**
 * Handle email authentication signup
 * @param {import('firebase/auth').User} user - The user object from Firebase
 * @returns {Promise<Object>} The response data
 */
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

/**
 * Handle email authentication login
 * @param {Object} user - The user object from Firebase
 * @returns {Promise<Object>} The response data
 */
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

/**
 * Sign in with Google
 * @returns {Promise<Object>} The response data
 */
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const data = await handleBackendAuth(user, 'google');
    return data;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * Sign in with Facebook
 * @returns {Promise<Object>} The response data
 */
const signInWithFacebook = async () => {
  try {
    // Check if Facebook App ID is configured
    if (!facebookAppConfig.appId) {
      throw new Error("Facebook App ID is not configured. Please add your Facebook App ID in the facebookAppConfig.");
    }
    
    const result = await signInWithPopup(auth, facebookProvider);
    console.log('result from facebook', result);
    const user = result.user;
    const data = await handleBackendAuth(user, 'facebook');
    return data;
  } catch (error) {
    console.error("Error signing in with Facebook:", error);
    throw error;
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} The response data
 */
const signInWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const data = await handleEmailAuthLogin(result.user);
  return data;
};

/**
 * Sign up with email, password and name
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} The response data
 */
const signUpWithEmail = async (name, email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  await updateProfile(user, { displayName: name });
  const data = await handleEmailAuthSingup(user);
  return data;
};

/**
 * Initialize reCAPTCHA verifier
 * @param {string} containerId - The ID of the container element
 * @returns {RecaptchaVerifier} The reCAPTCHA verifier instance
 */
const initRecaptchaVerifier = (containerId) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return null;
  
  // Create a new RecaptchaVerifier instance
  const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': (response) => {
      // reCAPTCHA solved, allow sending OTP
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
      console.log('reCAPTCHA expired');
    }
  });
  
  return recaptchaVerifier;
};

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - The phone number to send OTP to
 * @param {RecaptchaVerifier} recaptchaVerifier - The reCAPTCHA verifier instance
 * @returns {Promise<ConfirmationResult>} The confirmation result
 */
const sendOtpToPhone = async (phoneNumber, recaptchaVerifier) => {
  try {
    // Format phone number if needed
    const formattedPhoneNumber = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;
    
    // Send OTP
    const confirmationResult = await signInWithPhoneNumber(
      auth, 
      formattedPhoneNumber, 
      recaptchaVerifier
    );
    
    return confirmationResult;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
};

/**
 * Verify OTP and sign in
 * @param {ConfirmationResult} confirmationResult - The confirmation result from sendOtpToPhone
 * @param {string} otpCode - The OTP code entered by the user
 * @returns {Promise<Object>} The user data
 */
const verifyOtp = async (confirmationResult, otpCode) => {
  try {
    // Verify OTP
    const result = await confirmationResult.confirm(otpCode);
    const user = result.user;
    
    // Call your backend to handle phone authentication
    const data = await handleBackendAuth(user, 'phone');
    return data;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
};

export { 
  app, 
  auth, 
  analytics, 
  signInWithEmail, 
  signUpWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  initRecaptchaVerifier,
  sendOtpToPhone,
  verifyOtp,
  sendPasswordResetEmail
}; 