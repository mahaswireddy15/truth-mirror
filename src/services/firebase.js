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

// ─── Realistic mock data for Telangana / Andhra Pradesh ───────────────────────
// Loaded when Firebase is not configured OR when Firestore returns 0 documents.
const _d = (daysAgo) => ({ toDate: () => new Date(Date.now() - daysAgo * 86400000) });

const MOCK_COMPLAINTS = [
  // ── Hyderabad (12) ──────────────────────────────────────────────────────────
  { id:'mock-hyd-1',  district:'Hyderabad', ward:'Madhapur Ward 15',      category:'water',       severity:9, status:'PENDING',  upvotes:24, description:'No water supply for 3 consecutive days',          createdAt:_d(2)  },
  { id:'mock-hyd-2',  district:'Hyderabad', ward:'Ameerpet Ward 8',       category:'roads',       severity:8, status:'PENDING',  upvotes:18, description:'Large pothole near junction causing accidents',    createdAt:_d(5)  },
  { id:'mock-hyd-3',  district:'Hyderabad', ward:'Kukatpally Ward 3',     category:'electricity', severity:7, status:'RESOLVED', upvotes:11, description:'Power outage 8 hours daily for a week',           createdAt:_d(8)  },
  { id:'mock-hyd-4',  district:'Hyderabad', ward:'Dilsukhnagar Ward 19',  category:'sanitation',  severity:8, status:'PENDING',  upvotes:31, description:'Garbage pile-up near school entrance',            createdAt:_d(1)  },
  { id:'mock-hyd-5',  district:'Hyderabad', ward:'Secunderabad Ward 22',  category:'health',      severity:9, status:'PENDING',  upvotes:42, description:'Sewage overflow flooding residential roads',       createdAt:_d(3)  },
  { id:'mock-hyd-6',  district:'Hyderabad', ward:'Mehdipatnam Ward 11',   category:'water',       severity:7, status:'PENDING',  upvotes:15, description:'Contaminated water supply causing illness',        createdAt:_d(7)  },
  { id:'mock-hyd-7',  district:'Hyderabad', ward:'Charminar Ward 6',      category:'roads',       severity:6, status:'RESOLVED', upvotes:8,  description:'Road cave-in near old city mosque',               createdAt:_d(12) },
  { id:'mock-hyd-8',  district:'Hyderabad', ward:'Uppal Ward 28',         category:'electricity', severity:8, status:'PENDING',  upvotes:19, description:'Street lights non-functional for 2 weeks',        createdAt:_d(14) },
  { id:'mock-hyd-9',  district:'Hyderabad', ward:'Gachibowli Ward 31',    category:'roads',       severity:7, status:'PENDING',  upvotes:22, description:'Broken footpath injuring pedestrians daily',      createdAt:_d(4)  },
  { id:'mock-hyd-10', district:'Hyderabad', ward:'LB Nagar Ward 17',      category:'water',       severity:9, status:'PENDING',  upvotes:37, description:'Water pipe burst, road flooded for 2 days',       createdAt:_d(1)  },
  { id:'mock-hyd-11', district:'Hyderabad', ward:'Alwal Ward 42',         category:'sanitation',  severity:6, status:'RESOLVED', upvotes:7,  description:'Open drain blocking road access to colony',       createdAt:_d(18) },
  { id:'mock-hyd-12', district:'Hyderabad', ward:'Miyapur Ward 5',        category:'health',      severity:8, status:'PENDING',  upvotes:29, description:'Mosquito breeding in stagnant water on road',     createdAt:_d(6)  },
  // ── Warangal (10) ───────────────────────────────────────────────────────────
  { id:'mock-wgl-1',  district:'Warangal',  ward:'Hanamkonda Ward 4',     category:'water',       severity:9, status:'PENDING',  upvotes:33, description:'Drinking water shortage for 5 days in summer',    createdAt:_d(2)  },
  { id:'mock-wgl-2',  district:'Warangal',  ward:'Kazipet Ward 7',        category:'roads',       severity:8, status:'PENDING',  upvotes:21, description:'NH-163 pothole causing truck accidents',          createdAt:_d(4)  },
  { id:'mock-wgl-3',  district:'Warangal',  ward:'Warangal Ward 2',       category:'electricity', severity:7, status:'PENDING',  upvotes:14, description:'6-hour load shedding every day in peak summer',   createdAt:_d(7)  },
  { id:'mock-wgl-4',  district:'Warangal',  ward:'Subedari Ward 9',       category:'sanitation',  severity:8, status:'PENDING',  upvotes:26, description:'No garbage collection for 2 weeks',               createdAt:_d(3)  },
  { id:'mock-wgl-5',  district:'Warangal',  ward:'Mulugu Road Ward 12',   category:'health',      severity:9, status:'PENDING',  upvotes:45, description:'Sewage water mixing with drinking supply',        createdAt:_d(1)  },
  { id:'mock-wgl-6',  district:'Warangal',  ward:'Bheemaram Ward 3',      category:'water',       severity:8, status:'RESOLVED', upvotes:17, description:'Burst main pipeline flooding entire colony',       createdAt:_d(15) },
  { id:'mock-wgl-7',  district:'Warangal',  ward:'Station Ward 1',        category:'roads',       severity:7, status:'PENDING',  upvotes:12, description:'Damaged road near railway station unrepaired',    createdAt:_d(9)  },
  { id:'mock-wgl-8',  district:'Warangal',  ward:'Naimnagar Ward 6',      category:'electricity', severity:8, status:'PENDING',  upvotes:23, description:'Transformer blown, no power for 4 days',          createdAt:_d(5)  },
  { id:'mock-wgl-9',  district:'Warangal',  ward:'Hanmakonda Ward 11',    category:'sanitation',  severity:7, status:'RESOLVED', upvotes:9,  description:'Drain overflow onto road during rains',           createdAt:_d(20) },
  { id:'mock-wgl-10', district:'Warangal',  ward:'Dharmasagar Ward 8',    category:'roads',       severity:9, status:'PENDING',  upvotes:38, description:'Bridge approach road collapsed, danger to traffic',createdAt:_d(2)  },
  // ── Karimnagar (5) ──────────────────────────────────────────────────────────
  { id:'mock-kgr-1',  district:'Karimnagar',ward:'Karimnagar Ward 3',     category:'water',       severity:8, status:'PENDING',  upvotes:19, description:'No water supply for 4 consecutive days',          createdAt:_d(3)  },
  { id:'mock-kgr-2',  district:'Karimnagar',ward:'Jagtial Ward 5',        category:'roads',       severity:7, status:'RESOLVED', upvotes:11, description:'State highway riddled with potholes after rains', createdAt:_d(10) },
  { id:'mock-kgr-3',  district:'Karimnagar',ward:'Peddapalli Ward 2',     category:'electricity', severity:6, status:'PENDING',  upvotes:8,  description:'Persistent low voltage damaging appliances',      createdAt:_d(7)  },
  { id:'mock-kgr-4',  district:'Karimnagar',ward:'Huzurabad Ward 1',      category:'sanitation',  severity:7, status:'PENDING',  upvotes:16, description:'Illegal garbage dump near residential colony',     createdAt:_d(5)  },
  { id:'mock-kgr-5',  district:'Karimnagar',ward:'Karimnagar Ward 8',     category:'health',      severity:8, status:'PENDING',  upvotes:24, description:'Malaria outbreak spreading in slum area',          createdAt:_d(2)  },
  // ── Khammam (4) ─────────────────────────────────────────────────────────────
  { id:'mock-khm-1',  district:'Khammam',   ward:'Khammam Ward 6',        category:'water',       severity:8, status:'PENDING',  upvotes:22, description:'Main pipeline broken, no water for 6 days',       createdAt:_d(4)  },
  { id:'mock-khm-2',  district:'Khammam',   ward:'Bhadrachalam Ward 3',   category:'health',      severity:9, status:'PENDING',  upvotes:35, description:'Flood water contaminating open wells',            createdAt:_d(2)  },
  { id:'mock-khm-3',  district:'Khammam',   ward:'Yellandu Ward 1',       category:'roads',       severity:7, status:'RESOLVED', upvotes:9,  description:'Forest road washed away by rain',                 createdAt:_d(14) },
  { id:'mock-khm-4',  district:'Khammam',   ward:'Kothagudem Ward 4',     category:'electricity', severity:7, status:'PENDING',  upvotes:13, description:'No power in mining township for 3 days',          createdAt:_d(6)  },
  // ── Nalgonda (4) ────────────────────────────────────────────────────────────
  { id:'mock-nlg-1',  district:'Nalgonda',  ward:'Nalgonda Ward 5',       category:'water',       severity:9, status:'PENDING',  upvotes:41, description:'Fluoride-contaminated drinking water affecting health',createdAt:_d(1) },
  { id:'mock-nlg-2',  district:'Nalgonda',  ward:'Miryalaguda Ward 2',    category:'sanitation',  severity:7, status:'PENDING',  upvotes:16, description:'Open defecation near drinking water source',      createdAt:_d(6)  },
  { id:'mock-nlg-3',  district:'Nalgonda',  ward:'Suryapet Ward 7',       category:'roads',       severity:6, status:'RESOLVED', upvotes:7,  description:'Village road completely eroded after floods',      createdAt:_d(18) },
  { id:'mock-nlg-4',  district:'Nalgonda',  ward:'Nalgonda Ward 9',       category:'health',      severity:8, status:'PENDING',  upvotes:28, description:'Dental fluorosis affecting children in village',   createdAt:_d(3)  },
  // ── Mahbubnagar (3) ─────────────────────────────────────────────────────────
  { id:'mock-mbn-1',  district:'Mahbubnagar',ward:'Mahbubnagar Ward 3',   category:'water',       severity:9, status:'PENDING',  upvotes:36, description:'Summer water scarcity, tankers demanded urgently', createdAt:_d(1)  },
  { id:'mock-mbn-2',  district:'Mahbubnagar',ward:'Wanaparthy Ward 1',    category:'electricity', severity:7, status:'PENDING',  upvotes:12, description:'Frequent outages damaging irrigation pump sets',   createdAt:_d(8)  },
  { id:'mock-mbn-3',  district:'Mahbubnagar',ward:'Gadwal Ward 4',        category:'health',      severity:8, status:'PENDING',  upvotes:21, description:'PHC without a doctor for over 2 weeks',           createdAt:_d(5)  },
  // ── Nizamabad (3) ───────────────────────────────────────────────────────────
  { id:'mock-nzb-1',  district:'Nizamabad', ward:'Nizamabad Ward 4',      category:'roads',       severity:7, status:'PENDING',  upvotes:15, description:'SH-1 bridge approach crumbling, danger to vehicles',createdAt:_d(5) },
  { id:'mock-nzb-2',  district:'Nizamabad', ward:'Bodhan Ward 2',         category:'water',       severity:8, status:'RESOLVED', upvotes:11, description:'River intake disrupted, supply cut for 3 days',   createdAt:_d(12) },
  { id:'mock-nzb-3',  district:'Nizamabad', ward:'Armoor Ward 6',         category:'sanitation',  severity:6, status:'PENDING',  upvotes:8,  description:'No dustbins in busy market area for months',      createdAt:_d(9)  },
  // ── Adilabad (2) ────────────────────────────────────────────────────────────
  { id:'mock-adb-1',  district:'Adilabad',  ward:'Adilabad Ward 2',       category:'roads',       severity:8, status:'PENDING',  upvotes:18, description:'Tribal village road washed away by floods',       createdAt:_d(3)  },
  { id:'mock-adb-2',  district:'Adilabad',  ward:'Mancherial Ward 3',     category:'health',      severity:9, status:'PENDING',  upvotes:32, description:'No ambulance accessible in remote tribal area',   createdAt:_d(1)  },
  // ── Vijayawada (3) ──────────────────────────────────────────────────────────
  { id:'mock-vjw-1',  district:'Vijayawada',ward:'Vijayawada Ward 8',     category:'water',       severity:8, status:'PENDING',  upvotes:27, description:'Krishna river supply interrupted for 4 days',     createdAt:_d(4)  },
  { id:'mock-vjw-2',  district:'Vijayawada',ward:'Benz Circle Ward 3',    category:'roads',       severity:7, status:'RESOLVED', upvotes:13, description:'Post-flood road damage still unrepaired',         createdAt:_d(16) },
  { id:'mock-vjw-3',  district:'Vijayawada',ward:'Auto Nagar Ward 11',    category:'electricity', severity:6, status:'PENDING',  upvotes:9,  description:'Voltage fluctuations damaging motors and pumps',   createdAt:_d(7)  },
  // ── Guntur (2) ──────────────────────────────────────────────────────────────
  { id:'mock-gnt-1',  district:'Guntur',    ward:'Guntur Ward 6',         category:'sanitation',  severity:7, status:'PENDING',  upvotes:17, description:'Hospital biomedical waste dumped in open ground',  createdAt:_d(5)  },
  { id:'mock-gnt-2',  district:'Guntur',    ward:'Tenali Ward 4',         category:'roads',       severity:6, status:'PENDING',  upvotes:10, description:'Newly tarred road already breaking up',           createdAt:_d(9)  },
  // ── Visakhapatnam (1) ───────────────────────────────────────────────────────
  { id:'mock-vzg-1',  district:'Visakhapatnam',ward:'Gajuwaka Ward 7',    category:'health',      severity:9, status:'PENDING',  upvotes:48, description:'Industrial pollution causing respiratory illness in colony', createdAt:_d(2) },
  // ── Kurnool (1) ─────────────────────────────────────────────────────────────
  { id:'mock-knl-1',  district:'Kurnool',   ward:'Kurnool Ward 5',        category:'water',       severity:8, status:'PENDING',  upvotes:22, description:'Tungabhadra water supply scheme failed',           createdAt:_d(6)  },
];

// Mock fallback so the app functions even if the user hasn't added .env secrets yet
let mockReports = [...MOCK_COMPLAINTS];
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
    // Prepend real submission; keep mock data at the tail so map always has content
    mockReports = [newReport, ...mockReports];
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
    // Fall back to mock data when Firestore has no complaints yet,
    // so the map always shows data visually.
    onDataCallback(reports.length > 0 ? reports : MOCK_COMPLAINTS);
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
