/**
 * Friendly copy for Firebase Auth and Firestore errors. Reads only `code`, so
 * it works on anything thrown and never shows raw "auth/…" strings.
 */

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match. Try again, or reset your password.",
  "auth/invalid-login-credentials": "That email and password don't match. Try again, or reset your password.",
  "auth/wrong-password": "That email and password don't match. Try again, or reset your password.",
  "auth/user-not-found": "No clinic account uses this email. Check it, or create an account.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/missing-email": "Type your email address first.",
  "auth/missing-password": "Type your password.",
  "auth/email-already-in-use": "An account already uses this email. Sign in instead.",
  "auth/weak-password": "Use at least 6 characters for the password.",
  "auth/password-does-not-meet-requirements": "That password is too simple. Use a longer one with letters and numbers.",
  "auth/too-many-requests": "Too many tries. Wait a minute, then try again.",
  "auth/network-request-failed": "No internet connection. Check it and try again.",
  "auth/user-disabled": "This account has been turned off.",
  "auth/operation-not-allowed": "Email sign-in is off for this Firebase project. Turn on Email/Password in the Firebase console.",
  "auth/configuration-not-found": "Email sign-in is off for this Firebase project. Turn on Email/Password in the Firebase console.",
  "permission-denied": "This account isn't allowed to make that change.",
  unavailable: "Couldn't reach the server. Check the internet and try again.",
};

export function errorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}

export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const code = errorCode(error);
  return (code && MESSAGES[code]) || fallback;
}

const WRONG_PASSWORD_CODES = new Set(["auth/invalid-credential", "auth/invalid-login-credentials", "auth/wrong-password"]);

/** For "type the clinic password to confirm" prompts, where the email isn't something the person typed. */
export function passwordCheckError(error: unknown): string {
  const code = errorCode(error);
  if (code && WRONG_PASSWORD_CODES.has(code)) return "That isn't the clinic password. Try again.";
  return friendlyError(error, "Couldn't check the password. Please try again.");
}
