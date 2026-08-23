COLLEGE ATTENDANCE SYSTEM - ADMIN HIERARCHY

PRIMARY ADMIN
- Fixed primary admin email: ddu@gmail.com
- Only this account can create or permanently delete Admin accounts.
- The primary Admin cannot be deleted.

NORMAL ADMIN
- Newly created Admin accounts use role: admin.
- Normal Admins can use normal Admin features such as managing students, attendance and settings.
- Normal Admins cannot create or delete Admin accounts.

REGISTRATION
- Public registration creates STUDENT accounts only.
- There is no public Admin/Teacher role selector.

FIRESTORE RULES
1. Firebase Console -> Firestore Database -> Rules.
2. Replace the rules with the included firestore.rules.
3. Click Publish.

CLOUD FUNCTION FOR PERMANENT ADMIN DELETION
The functions folder contains deleteAdminAccount.
It verifies that the caller's Firebase Authentication email is exactly ddu@gmail.com,
prevents deleting the caller/primary Admin, verifies that the target profile has role=admin,
then deletes the Firebase Authentication account and its users/{uid} profile.

Deploy from the project root:

firebase login
firebase deploy --only firestore:rules,functions

If you only changed the function:
firebase deploy --only functions

If you only changed rules:
firebase deploy --only firestore:rules

IMPORTANT
- Install Firebase CLI if it is not already installed.
- Cloud Functions deployment may require a Firebase/Google Cloud billing-enabled project depending on the current Firebase plan and deployment requirements.
- Do not remove the secondary Firebase app in public/firebase.js; it keeps the current Admin signed in while creating another Admin account.
- Replace public/logo.png with your real logo if needed for reports.
