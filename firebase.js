import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-functions.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBiWBqeEe64_G5TNPPVDTVuR_p-QNqNUeY',
  authDomain: 'college-attendance-syste-ce19d.firebaseapp.com',
  projectId: 'college-attendance-syste-ce19d',
  storageBucket: 'college-attendance-syste-ce19d.firebasestorage.app',
  messagingSenderId: '143740522803',
  appId: '1:143740522803:web:815f781b92493316b62e46',
  measurementId: 'G-KZHRNGEP4L'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where, serverTimestamp, writeBatch, getCountFromServer,  };


export const ROOT_ADMIN_EMAIL = 'ddu@gmail.com';

// Create an Admin without changing/logging out the currently signed-in Primary Admin.
// A secondary Firebase app/auth instance creates the new account, so the Primary Admin
// session remains active. Firestore rules still ensure only ddu@gmail.com can create
// the admin profile.
export async function createAdminAccount(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  const current = await waitForAuthUser();
  if (!current || String(current.email || '').toLowerCase() !== ROOT_ADMIN_EMAIL) {
    throw { code: 'permission-denied', message: 'Only the Primary Admin (ddu@gmail.com) can create an Admin.' };
  }

  const appName = 'adminCreator_' + Date.now();
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: cleanEmail,
      name: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString(),
      createdBy: current.uid
    });
    await signOut(secondaryAuth);
    return { success: true, uid: cred.user.uid };
  } catch (error) {
    // If the profile write fails, remove the newly-created Auth account.
    try {
      if (secondaryAuth.currentUser) await secondaryAuth.currentUser.delete();
    } catch (_) {}
    throw error;
  }
}


export function isRootAdmin(profile) {
  return String(profile?.email || profile?.authEmail || '').toLowerCase() === ROOT_ADMIN_EMAIL;
}

export async function deleteAdminAccount(uid, email = '') {
  const fn = httpsCallable(functions, 'deleteAdminAccountV2');
  return await fn({ uid, email });
}

export async function waitForAuthUser() {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function currentProfile() {
  const user = await waitForAuthUser();
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return null;
  return { uid: user.uid, ...snap.data(), authEmail: user.email };
}

export async function requireStaff() {
  const user = await waitForAuthUser();
  if (!user) { location.href = 'login.html'; throw new Error('Not signed in'); }
  const profile = await currentProfile();
  if (!profile || !['admin', 'teacher'].includes(profile.role)) {
    await signOut(auth);
    alert('Your account does not have staff access.');
    location.href = 'login.html';
    throw new Error('No staff profile');
  }
  return profile;
}


export async function requireStudent() {
  const user = await waitForAuthUser();
  if (!user) { location.href = 'login.html'; throw new Error('Not signed in'); }
  const profile = await currentProfile();
  if (!profile || profile.role !== 'student') {
    alert('Student access required.');
    location.href = 'login.html';
    throw new Error('Not a student');
  }
  return profile;
}

export async function requireAdmin() {
  const profile = await requireStaff();
  if (profile.role !== 'admin') {
    alert('Admin access required.');
    location.href = 'admin.html';
    throw new Error('Admin required');
  }
  return profile;
}

export function firebaseErrorMessage(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-login-credentials': 'Invalid email or password.',
    'auth/user-not-found': 'No account exists with this email.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/requires-recent-login': 'Please log out, log in again, and retry this change.',
    'permission-denied': 'Firestore denied access. Check that the Firestore Rules were published and your user profile exists in users/{UID}.',
    'auth/network-request-failed': 'Network error. Check your internet connection.'
  };
  return map[code] || error?.details || error?.message || 'Something went wrong.';
}
