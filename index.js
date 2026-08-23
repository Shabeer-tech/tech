const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const ROOT_EMAIL = 'ddu@gmail.com';

function isRootAdmin(request) {
  const email = String(request.auth?.token?.email || '').trim().toLowerCase();
  return email === ROOT_EMAIL;
}

exports.createAdminAccount = onCall(async (request) => {
  if (!isRootAdmin(request)) {
    throw new HttpsError('permission-denied', 'Only ddu@gmail.com can create Admin accounts.');
  }

  const email = String(request.data?.email || '').trim().toLowerCase();
  const password = String(request.data?.password || '');

  if (!email || !password) {
    throw new HttpsError('invalid-argument', 'Email and password are required.');
  }
  if (email === ROOT_EMAIL) {
    throw new HttpsError('failed-precondition', 'The primary Admin already exists.');
  }
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  let userRecord;
  try {
    userRecord = await getAuth().createUser({ email, password });
  } catch (error) {
    console.error('CREATE AUTH USER ERROR:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'This email is already registered.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'Enter a valid Gmail/email address.');
    }
    if (error.code === 'auth/password-does-not-meet-requirements') {
      throw new HttpsError('invalid-argument', 'Password does not meet Firebase password requirements.');
    }
    throw new HttpsError('internal', `Firebase Auth error: ${error.message || error.code || 'unknown error'}`);
  }

  try {
    await getFirestore().collection('users').doc(userRecord.uid).set({
      email,
      name: 'Administrator',
      role: 'admin',
      createdAt: new Date().toISOString(),
      createdBy: request.auth.uid
    });
  } catch (error) {
    console.error('CREATE ADMIN PROFILE ERROR:', error);
    try { await getAuth().deleteUser(userRecord.uid); } catch (rollbackError) {
      console.error('ROLLBACK AUTH USER ERROR:', rollbackError);
    }
    throw new HttpsError('internal', `Admin profile error: ${error.message || error.code || 'unknown error'}`);
  }

  return { success: true, uid: userRecord.uid };
});

async function deleteAdminHandler(request) {
  if (!isRootAdmin(request)) {
    throw new HttpsError('permission-denied', 'Only ddu@gmail.com can delete Admin accounts.');
  }

  const uid = String(request.data?.uid || '').trim();
  const email = String(request.data?.email || '').trim().toLowerCase();
  if (!uid && !email) throw new HttpsError('invalid-argument', 'Admin UID or email is required.');
  if (uid && uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'The primary Admin cannot delete itself.');
  }
  if (email === ROOT_EMAIL) {
    throw new HttpsError('failed-precondition', 'The primary Admin cannot be deleted.');
  }

  const db = getFirestore();
  let targetUid = uid;
  let profileRef = null;
  let profileData = null;

  try {
    // Prefer the supplied UID. If the UID is stale/missing, locate the admin
    // by email in Firestore so an old profile can still be cleaned up.
    if (targetUid) {
      profileRef = db.collection('users').doc(targetUid);
      const snap = await profileRef.get();
      if (snap.exists) profileData = snap.data() || {};
    }

    if (!profileData && email) {
      const q = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!q.empty) {
        profileRef = q.docs[0].ref;
        targetUid = q.docs[0].id;
        profileData = q.docs[0].data() || {};
      }
    }

    if (!profileData) {
      // As a final fallback, resolve the Auth user by email.
      if (!email) throw new HttpsError('not-found', 'Admin profile not found.');
      try {
        const authUser = await getAuth().getUserByEmail(email);
        targetUid = authUser.uid;
        profileRef = db.collection('users').doc(targetUid);
        const snap = await profileRef.get();
        profileData = snap.exists ? (snap.data() || {}) : { email, role: 'admin' };
      } catch (e) {
        if (e?.code === 'auth/user-not-found') {
          throw new HttpsError('not-found', 'Admin account was not found in Firebase Authentication or Firestore.');
        }
        throw e;
      }
    }

    const role = String(profileData.role || '').toLowerCase();
    const profileEmail = String(profileData.email || email || '').trim().toLowerCase();
    if (role !== 'admin') throw new HttpsError('failed-precondition', 'The selected account is not an Admin.');
    if (profileEmail === ROOT_EMAIL) throw new HttpsError('failed-precondition', 'The primary Admin cannot be deleted.');
    if (targetUid === request.auth.uid) throw new HttpsError('failed-precondition', 'The primary Admin cannot delete itself.');

    // Delete Auth account if it exists. If it is already gone, that is fine;
    // the Firestore admin profile is still cleaned up below.
    try {
      const target = await getAuth().getUser(targetUid);
      if (String(target.email || '').trim().toLowerCase() === ROOT_EMAIL) {
        throw new HttpsError('failed-precondition', 'The primary Admin cannot be deleted.');
      }
      await getAuth().deleteUser(targetUid);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      if (e?.code !== 'auth/user-not-found') {
        console.error('DELETE ADMIN AUTH ERROR:', e);
        throw new HttpsError('internal', `Firebase Auth delete failed: ${e?.message || e?.code || String(e)}`);
      }
    }

    if (profileRef) await profileRef.delete();
    return { success: true, uid: targetUid, email: profileEmail };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error('DELETE ADMIN ERROR:', e);
    throw new HttpsError('internal', `Delete Admin failed: ${e?.message || e?.code || String(e)}`);
  }
}

// Keep both names deployed so older cached pages and the current page work.
exports.deleteAdminAccountV2 = onCall(deleteAdminHandler);
exports.deleteAdminAccount = onCall(deleteAdminHandler);
