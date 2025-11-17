import { auth, db } from "./firebase-init.js";
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    FacebookAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    doc, setDoc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function loginEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function loginGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureUserDoc(result.user);
}

export async function loginFacebook() {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureUserDoc(result.user);
}

export async function ensureUserDoc(user) {
    // 🔧 BACKEND: ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            email: user.email,
            displayName: user.displayName || "",
            role: "user",
            createdAt: new Date()
        });
    }
}

export async function promoteUser(uid) {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { role: "admin" });
}

export async function demoteUser(uid) {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { role: "user" });
}

export function watchUser(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return callback(null);

        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);

        callback({
            ...user,
            role: snap.exists() ? snap.data().role : "user"
        });
    });
}

export function logout() {
    return signOut(auth);
}
