import { auth } from './firebase';
import { FirestoreErrorInfo, OperationType } from './types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Robust print helper that handles iframe restrictions
 */
export function triggerPrint() {
  window.focus();
  
  // Check if we are in an iframe
  const isIframe = window.self !== window.top;
  
  if (isIframe) {
    console.warn("Printing inside an iframe may be blocked by browser security. If nothing happens, please open the app in a new window.");
  }

  // Try direct print
  try {
    window.print();
    console.log("Print command sent");
  } catch (e) {
    console.error("Print failed:", e);
    if (isIframe) {
      alert("打印失败：由于浏览器安全限制，在预览窗口中可能无法直接打印。请点击右上角的“在新窗口打开”图标后再试。");
    }
  }
}

