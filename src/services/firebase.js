import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, increment as fbIncrement } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasFirebaseConfig = !!firebaseConfig.projectId;

let app;
export let db;

// Mock fallback so the app functions even if the user hasn't added .env secrets yet
let mockReports = [];
const mockListeners = new Set();
const notifyMockListeners = () => mockListeners.forEach(cb => cb([...mockReports]));

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn("⚠️ Firebase Config is missing or incomplete in .env! Using Local Memory Mock DB for testing until keys are provided.");
}

// Domain Specific Helpers to abstract Mock vs Real

export const submitReportToDb = async (reportData) => {
  if (!hasFirebaseConfig) {
    const newReport = {
      id: Math.random().toString(36).substring(2, 10),
      ...reportData,
      createdAt: { toDate: () => new Date() } // Simulate Firestore Timestamp
    };
    mockReports = [newReport, ...mockReports]; // Newest first
    notifyMockListeners();
    console.log("MOCK DB: Saved report", newReport);
    return newReport.id;
  }

  // Real Firestore
  const docRef = await addDoc(collection(db, "reports"), {
    ...reportData,
    createdAt: serverTimestamp()
  });
  console.log("FIRESTORE: Saved report with ID", docRef.id);
  return docRef.id;
};

export const listenToReports = (onDataCallback) => {
  if (!hasFirebaseConfig) {
    // Initial call
    onDataCallback(mockReports);
    // Subscribe
    mockListeners.add(onDataCallback);
    return () => mockListeners.delete(onDataCallback);
  }

  // Real Firestore
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    onDataCallback(reports);
  }, (error) => {
    console.error("Firestore onSnapshot error:", error);
  });

  return unsubscribe;
};

export const upvoteReportInDb = async (reportId) => {
  if (!hasFirebaseConfig) {
    mockReports = mockReports.map(r => r.id === reportId ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r);
    notifyMockListeners();
    return;
  }

  // Real Firestore
  const reportRef = doc(db, "reports", reportId);
  await updateDoc(reportRef, {
    upvotes: fbIncrement(1)
  });
};

// ── Report Log ────────────────────────────────────────────────────────────────
// Stores a record each time an AI government report is generated, including
// the per-official notification timestamps.

let mockReportLogs = [];

export const saveReportLog = async (logData) => {
  if (!hasFirebaseConfig) {
    const entry = {
      id: Math.random().toString(36).substring(2, 10),
      ...logData,
      generatedAt: { toDate: () => new Date() },
    };
    mockReportLogs = [entry, ...mockReportLogs];
    console.log('MOCK DB: Report log saved', entry);
    return entry.id;
  }

  const docRef = await addDoc(collection(db, 'reportLogs'), {
    ...logData,
    generatedAt: serverTimestamp(),
  });
  console.log('FIRESTORE: Report log saved', docRef.id);
  return docRef.id;
};
