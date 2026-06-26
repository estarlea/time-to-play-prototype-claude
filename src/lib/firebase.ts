import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { PlaydatePreferences, ProposalState } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDwLV-7QDhPzUHo95SgqKp7I6yonysc-no",
  authDomain: "time-to-play-live.firebaseapp.com",
  projectId: "time-to-play-live",
  storageBucket: "time-to-play-live.firebasestorage.app",
  messagingSenderId: "272461249550",
  appId: "1:272461249550:web:3b8b305589cb85f8a8505f",
  measurementId: "G-ESC0THWVED"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Save user profile + preferences to Firestore after signup.
 */
export async function saveUserToFirestore(
  userId: string,
  email: string,
  preferences: PlaydatePreferences,
  proposal: ProposalState | null
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, {
    email,
    parentName: preferences.parentName,
    childName: preferences.childName,
    parentPhone: preferences.parentPhone,
    calendarEmail: preferences.calendarEmail,
    createdAt: serverTimestamp(),
    preferences: {
      rankedSlots: preferences.rankedSlots,
      afterSchoolTime: preferences.afterSchoolTime,
      calendarBlockerActive: preferences.calendarBlockerActive,
      calendarShared: preferences.calendarShared,
      cadencePerMonth: preferences.cadencePerMonth,
      favoriteLocations: preferences.favoriteLocations,
    },
    latestProposal: proposal ? {
      id: proposal.id,
      dayText: proposal.dayText,
      dateText: proposal.dateText,
      timeText: proposal.timeText,
      locationText: proposal.locationText,
      slotIdUsed: proposal.slotIdUsed,
      status: "pending",
      createdAt: serverTimestamp(),
    } : null,
  }, { merge: true });
}

/**
 * Load user preferences from Firestore on login.
 */
export async function loadUserFromFirestore(userId: string): Promise<any | null> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}
