import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocFromServer 
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics conditionally to prevent crashes in sandboxed iframes
export const analyticsPromise = isSupported().then((supported) => {
  return supported ? getAnalytics(app) : null;
}).catch((err) => {
  console.warn("Firebase Analytics is not supported in this environment:", err);
  return null;
});

// Analytics tracking helper
export const logFieldSubmission = async (fieldName: string, payload: string) => {
  try {
    const analytics = await analyticsPromise;
    if (analytics) {
      logEvent(analytics, "field_submission", {
        field_name: fieldName,
        payload: payload,
        clientTime: new Date().toISOString()
      });
      console.log(`[Firebase Analytics] Successfully logged "field_submission" for ${fieldName} with "${payload}"`);
    } else {
      console.log(`[Firebase Analytics - Simulator Mode] field_submission: ${fieldName} = "${payload}"`);
    }
  } catch (err) {
    console.error("Error logging field_submission to Firebase Analytics:", err);
  }
};

// --- Firestore Hardened Error Logging & Diagnosis Code as Required by Skill ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: config-check to determine if we run in Sandbox Local Standby mode
const isPlaceholderConfig = !firebaseConfig.projectId || firebaseConfig.projectId.includes("remixed-") || firebaseConfig.apiKey.includes("remixed-") || firebaseConfig.apiKey === "";

// Simulation Storage Manager
const getLocalLeads = (): any[] => {
  try {
    const raw = localStorage.getItem("ttp_leads_sandbox");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Local leads retrieval error", e);
  }
  return [];
};

const saveLocalLeads = (leads: any[]) => {
  try {
    localStorage.setItem("ttp_leads_sandbox", JSON.stringify(leads));
  } catch (e) {
    console.error("Local leads write error", e);
  }
};

const leadSubscribers = new Set<(leads: any[]) => void>();

const notifyLeadSubscribers = () => {
  const currentLeads = getLocalLeads();
  leadSubscribers.forEach((sub) => {
    try {
      sub(currentLeads);
    } catch (e) {
      console.error("Subscriber notification error", e);
    }
  });
};

// CRITICAL CONSTRAINT: connection validation on boot
async function testConnection() {
  if (isPlaceholderConfig) {
    console.log("testConnection bypassed: Operating in Sandbox Local Standby Mode");
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Custom helper: save lead data to Firestore
export const saveLeadToFirestore = async (userId: string | null, data: any) => {
  if (isPlaceholderConfig) {
    console.log("saveLeadToFirestore running in Sandbox Local Standby Mode");
    const mockId = `lead_${Math.random().toString(36).substring(2, 9)}`;
    const mockLead = {
      ...data,
      id: mockId,
      userId: userId || "anonymous",
      timestamp: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: () => new Date()
      },
      clientTime: new Date().toISOString()
    };
    
    const current = getLocalLeads();
    current.unshift(mockLead);
    saveLocalLeads(current);
    notifyLeadSubscribers();
    return mockId;
  }

  const path = "walkthrough_leads";
  try {
    const leadsCol = collection(db, path);
    const payload = {
      ...data,
      userId: userId || "anonymous",
      timestamp: serverTimestamp(),
      clientTime: new Date().toISOString()
    };
    const docRef = await addDoc(leadsCol, payload);
    console.log("Lead synchronized to Firestore with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.warn("Firestore write failed, falling back to Local Storage writing", error);
    // Graceful local sync fallback
    const mockId = `lead_fallback_${Math.random().toString(36).substring(2, 9)}`;
    const mockLead = {
      ...data,
      id: mockId,
      userId: userId || "anonymous",
      timestamp: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: () => new Date()
      },
      clientTime: new Date().toISOString()
    };
    const current = getLocalLeads();
    current.unshift(mockLead);
    saveLocalLeads(current);
    notifyLeadSubscribers();
    return mockId;
  }
};

// Custom helper: save user preferences / current simulator state
export const saveSimulatorStateToFirestore = async (userId: string, state: {
  preferences: any;
  whitneyParent: any;
  currentStep: string;
  activeProposal: any;
}) => {
  if (isPlaceholderConfig) {
    console.log("saveSimulatorStateToFirestore running in Sandbox Local Standby Mode");
    try {
      localStorage.setItem(`ttp_state_${userId}`, JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error(e);
    }
    return;
  }

  const path = `user_states/${userId}`;
  try {
    const userStateDoc = doc(db, "user_states", userId);
    await setDoc(userStateDoc, {
      ...state,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log("Simulator state persists to Firestore under user:", userId);
  } catch (error) {
    console.warn("Firestore state write failed, falling back to Local Storage", error);
    try {
      localStorage.setItem(`ttp_state_${userId}`, JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error(e);
    }
  }
};

// Custom helper: fetch all saved walkthrough files/leads
export const fetchLeadsFromFirestore = (userId: string | null, callback: (leads: any[]) => void) => {
  if (isPlaceholderConfig) {
    console.log("fetchLeadsFromFirestore running in Sandbox Local Standby Mode");
    // Call callback immediately with local data
    const local = getLocalLeads();
    callback(local);
    leadSubscribers.add(callback);
    return () => {
      leadSubscribers.delete(callback);
    };
  }
  
  const path = "walkthrough_leads";
  const leadsCol = collection(db, path);
  
  // If we have a user, we can query, otherwise show all active session leads
  let q = query(leadsCol, orderBy("timestamp", "desc"));
  if (userId) {
    q = query(leadsCol, where("userId", "==", userId), orderBy("timestamp", "desc"));
  }
  
  return onSnapshot(q, (snapshot) => {
    const leads: any[] = [];
    snapshot.forEach((doc) => {
      leads.push({ id: doc.id, ...doc.data() });
    });
    callback(leads);
  }, (error) => {
    console.warn("Firestore snapshot listener failed or was denied, automatically falling back to Local Standby mode.", error);
    const local = getLocalLeads();
    callback(local);
    leadSubscribers.add(callback);
    return () => {
      leadSubscribers.delete(callback);
    };
  });
};
