import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  increment,
  writeBatch,
  Timestamp,
  where
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getAppConfig, isConfigValid } from './config';

// Define TS Interfaces
export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  role: 'individual' | 'ngo';
  orgName: string;
  totalXP: number;
  level: number;
  totalCatches: number;
  totalFeeds: number;
}

export interface AdoptionStatus {
  isAdopted: boolean;
  orgName: string | null;
  note: string | null;
  markedAt: Date | null;
  markedByUid: string | null;
}

export interface Cat {
  id: string;
  ownerUid: string;
  ownerDisplayName: string;
  photoURL: string;
  breedGuess: string;
  nickname: string;
  distinguishingFeatures: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  lat: number;
  lng: number;
  caughtAt: Date;
  lastSeenAt: Date;
  timesFed: number;
  lastFedAt: Date | null;
  reSightCount: number;
  adoptionStatus: AdoptionStatus;
}

export interface CatEvent {
  id: string;
  type: 'catch' | 'resight' | 'feed' | 'adoption_marked';
  byUid: string;
  photoURL: string;
  lat: number;
  lng: number;
  xpAwarded: number;
  timestamp: Date;
}

// State variables for Firebase services
let firebaseApp: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isFirebaseLive = false;

// Mock database state for Sandbox Mode
const MOCK_LEADERBOARD_KEY = 'catchdex_mock_leaderboard';
const MOCK_CATCHES_KEY = 'catchdex_mock_catches';
const MOCK_EVENTS_KEY_PREFIX = 'catchdex_mock_events_';
const MOCK_USER_KEY = 'catchdex_mock_user';

const INITIAL_MOCK_LEADERBOARD: UserProfile[] = [
  { uid: 'mock_ngo_1', displayName: 'Paws Shelter 🐾', photoURL: '', role: 'ngo', orgName: 'Paws Shelter', totalXP: 1200, level: 4, totalCatches: 8, totalFeeds: 15 },
  { uid: 'mock_1', displayName: 'TrainerRed 🧢', photoURL: '', role: 'individual', orgName: '', totalXP: 850, level: 4, totalCatches: 12, totalFeeds: 5 },
  { uid: 'mock_2', displayName: 'MeowHunter 🐱', photoURL: '', role: 'individual', orgName: '', totalXP: 450, level: 3, totalCatches: 6, totalFeeds: 10 },
  { uid: 'mock_3', displayName: 'CatWatcher 🕶️', photoURL: '', role: 'individual', orgName: '', totalXP: 150, level: 1, totalCatches: 3, totalFeeds: 2 },
];

export const initFirebase = () => {
  const config = getAppConfig();
  if (!isConfigValid(config)) {
    console.log('Firebase config is incomplete. Running in Demo Sandbox Mode.');
    isFirebaseLive = false;
    auth = null;
    db = null;
    storage = null;
    return false;
  }

  try {
    const apps = getApps();
    if (apps.length > 0) {
      for (const appInstance of apps) {
        deleteApp(appInstance);
      }
    }

    firebaseApp = initializeApp(config.firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);
    isFirebaseLive = true;
    console.log('Firebase successfully initialized in LIVE mode.');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase, falling back to Sandbox Mode:', error);
    isFirebaseLive = false;
    auth = null;
    db = null;
    storage = null;
    return false;
  }
};

// Initialize on load
initFirebase();

export const checkIsFirebaseLive = () => isFirebaseLive;

// Formula: level = floor(sqrt(totalXP / 50))
export const calculateLevel = (xp: number): number => {
  if (xp <= 0) return 0;
  return Math.floor(Math.sqrt(xp / 50));
};

// ==========================================
// AUTHENTICATION FUNCTIONS
// ==========================================

export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  if (isFirebaseLive && auth) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            callback({
              uid: fbUser.uid,
              displayName: data.displayName || fbUser.displayName || 'Trainer',
              photoURL: data.photoURL || fbUser.photoURL || '',
              role: data.role || 'individual',
              orgName: data.orgName || '',
              totalXP: data.totalXP || 0,
              level: data.level || 0,
              totalCatches: data.totalCatches || 0,
              totalFeeds: data.totalFeeds || 0
            });
          } else {
            const profile: Omit<UserProfile, 'uid'> = {
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Trainer',
              photoURL: fbUser.photoURL || '',
              role: 'individual',
              orgName: '',
              totalXP: 0,
              level: 0,
              totalCatches: 0,
              totalFeeds: 0
            };
            await setDoc(userDocRef, profile);
            callback({ uid: fbUser.uid, ...profile });
          }
        } catch (e) {
          console.error("Error setting up user profile in Firestore:", e);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  } else {
    // Sandbox Mode Listener
    const handleStorageChange = () => {
      const userStr = localStorage.getItem(MOCK_USER_KEY);
      if (userStr) {
        callback(JSON.parse(userStr));
      } else {
        callback(null);
      }
    };
    
    handleStorageChange();
    window.addEventListener('mock-auth-change', handleStorageChange);
    return () => {
      window.removeEventListener('mock-auth-change', handleStorageChange);
    };
  }
};

export const signUp = async (
  email: string, 
  password: string, 
  displayName: string,
  role: 'individual' | 'ngo',
  orgName: string
): Promise<UserProfile> => {
  if (isFirebaseLive && auth && db) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const profile: Omit<UserProfile, 'uid'> = {
      displayName: displayName || email.split('@')[0],
      photoURL: '',
      role,
      orgName: role === 'ngo' ? orgName : '',
      totalXP: 0,
      level: 0,
      totalCatches: 0,
      totalFeeds: 0
    };
    await setDoc(userDocRef, profile);
    return {
      uid: cred.user.uid,
      ...profile
    };
  } else {
    // Sandbox sign up
    const mockUid = 'mock_user_' + Math.random().toString(36).substr(2, 9);
    const profile: UserProfile = {
      uid: mockUid,
      displayName: displayName || email.split('@')[0],
      photoURL: '',
      role,
      orgName: role === 'ngo' ? orgName : '',
      totalXP: 0,
      level: 0,
      totalCatches: 0,
      totalFeeds: 0
    };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(profile));
    
    // Add user to leaderboard if not exists
    const leaderboard = getSandboxLeaderboard();
    if (!leaderboard.some(u => u.uid === mockUid)) {
      leaderboard.push(profile);
      saveSandboxLeaderboard(leaderboard);
    }
    
    window.dispatchEvent(new Event('mock-auth-change'));
    return profile;
  }
};

export const signIn = async (email: string, password: string): Promise<UserProfile> => {
  if (isFirebaseLive && auth && db) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);
    const data = userDoc.data();
    return {
      uid: cred.user.uid,
      displayName: data?.displayName || email.split('@')[0],
      photoURL: data?.photoURL || '',
      role: data?.role || 'individual',
      orgName: data?.orgName || '',
      totalXP: data?.totalXP || 0,
      level: data?.level || 0,
      totalCatches: data?.totalCatches || 0,
      totalFeeds: data?.totalFeeds || 0
    };
  } else {
    // Sandbox Sign In (Check if user exists in leaderboard, else create)
    let profile: UserProfile = {
      uid: 'mock_trainer_1',
      displayName: email.split('@')[0] || 'Demo Trainer',
      photoURL: '',
      role: 'individual',
      orgName: '',
      totalXP: 120,
      level: 1,
      totalCatches: 4,
      totalFeeds: 2
    };
    
    const savedUser = localStorage.getItem(MOCK_USER_KEY);
    if (savedUser) {
      profile = JSON.parse(savedUser);
    } else {
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(profile));
      const leaderboard = getSandboxLeaderboard();
      if (!leaderboard.some(u => u.uid === profile.uid)) {
        leaderboard.push(profile);
        saveSandboxLeaderboard(leaderboard);
      }
    }
    
    window.dispatchEvent(new Event('mock-auth-change'));
    return profile;
  }
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  if (isFirebaseLive && auth && db) {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    let profile;
    if (userDoc.exists()) {
      profile = userDoc.data();
    } else {
      profile = {
        displayName: cred.user.displayName || 'Trainer',
        photoURL: cred.user.photoURL || '',
        role: 'individual',
        orgName: '',
        totalXP: 0,
        level: 0,
        totalCatches: 0,
        totalFeeds: 0
      };
      await setDoc(userDocRef, profile);
    }
    
    return {
      uid: cred.user.uid,
      displayName: profile.displayName || cred.user.displayName || 'Trainer',
      photoURL: profile.photoURL || cred.user.photoURL || '',
      role: profile.role || 'individual',
      orgName: profile.orgName || '',
      totalXP: profile.totalXP || 0,
      level: profile.level || 0,
      totalCatches: profile.totalCatches || 0,
      totalFeeds: profile.totalFeeds || 0
    };
  } else {
    return signIn('google-trainer@catchdex.com', 'google-pass');
  }
};

export const signOut = async () => {
  if (isFirebaseLive && auth) {
    await fbSignOut(auth);
  } else {
    localStorage.removeItem(MOCK_USER_KEY);
    window.dispatchEvent(new Event('mock-auth-change'));
  }
};

// ==========================================
// IMAGE UPLOAD FUNCTION
// ==========================================

export const uploadPhoto = async (uid: string, catId: string, base64Data: string): Promise<string> => {
  if (isFirebaseLive && storage) {
    try {
      const fileName = `${Date.now()}.jpg`;
      const storageRef = ref(storage, `users/${uid}/cats/${catId}/${fileName}`);
      await uploadString(storageRef, base64Data, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (e) {
      console.error('Storage upload failed, using local base64 fallback:', e);
      return base64Data;
    }
  } else {
    return base64Data;
  }
};

// ==========================================
// CATCHDEX DATA ACTIONS
// ==========================================

// Get all catches in the database (for the map)
export const getAllCatches = async (): Promise<Cat[]> => {
  if (isFirebaseLive && db) {
    const catchesColRef = collection(db, 'catches');
    const snapshot = await getDocs(catchesColRef);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ownerUid: data.ownerUid,
        ownerDisplayName: data.ownerDisplayName || 'Trainer',
        photoURL: data.photoURL,
        breedGuess: data.breedGuess || 'Domestic Shorthair',
        nickname: data.nickname,
        distinguishingFeatures: data.distinguishingFeatures || '',
        rarity: data.rarity || 'common',
        lat: data.lat || 0,
        lng: data.lng || 0,
        caughtAt: data.caughtAt?.toDate() || new Date(),
        lastSeenAt: data.lastSeenAt?.toDate() || new Date(),
        timesFed: data.timesFed || 0,
        lastFedAt: data.lastFedAt?.toDate() || null,
        reSightCount: data.reSightCount || 0,
        adoptionStatus: data.adoptionStatus || {
          isAdopted: false,
          orgName: null,
          note: null,
          markedAt: null,
          markedByUid: null,
        },
      };
    }) as Cat[];
  } else {
    // Sandbox Mode
    const catchesStr = localStorage.getItem(MOCK_CATCHES_KEY);
    if (catchesStr) {
      const rawCatches = JSON.parse(catchesStr);
      return rawCatches.map((c: any) => ({
        ...c,
        caughtAt: new Date(c.caughtAt),
        lastSeenAt: new Date(c.lastSeenAt),
        lastFedAt: c.lastFedAt ? new Date(c.lastFedAt) : null,
        adoptionStatus: {
          ...c.adoptionStatus,
          markedAt: c.adoptionStatus?.markedAt ? new Date(c.adoptionStatus.markedAt) : null,
        }
      }));
    }
    return [];
  }
};

// Get personal catches for standard user collection
export const getMyCatches = async (uid: string): Promise<Cat[]> => {
  if (isFirebaseLive && db) {
    const catchesColRef = collection(db, 'catches');
    const q = query(catchesColRef, where('ownerUid', '==', uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ownerUid: data.ownerUid,
        ownerDisplayName: data.ownerDisplayName || 'Trainer',
        photoURL: data.photoURL,
        breedGuess: data.breedGuess || 'Domestic Shorthair',
        nickname: data.nickname,
        distinguishingFeatures: data.distinguishingFeatures || '',
        rarity: data.rarity || 'common',
        lat: data.lat || 0,
        lng: data.lng || 0,
        caughtAt: data.caughtAt?.toDate() || new Date(),
        lastSeenAt: data.lastSeenAt?.toDate() || new Date(),
        timesFed: data.timesFed || 0,
        lastFedAt: data.lastFedAt?.toDate() || null,
        reSightCount: data.reSightCount || 0,
        adoptionStatus: data.adoptionStatus || {
          isAdopted: false,
          orgName: null,
          note: null,
          markedAt: null,
          markedByUid: null,
        },
      };
    }) as Cat[];
  } else {
    const all = await getAllCatches();
    return all.filter((c) => c.ownerUid === uid);
  }
};

export const getCatEvents = async (catId: string): Promise<CatEvent[]> => {
  if (isFirebaseLive && db) {
    const eventsColRef = collection(db, 'catches', catId, 'events');
    const q = query(eventsColRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        byUid: data.byUid,
        photoURL: data.photoURL,
        lat: data.lat,
        lng: data.lng,
        xpAwarded: data.xpAwarded || 0,
        timestamp: data.timestamp?.toDate() || new Date(),
      };
    }) as CatEvent[];
  } else {
    // Sandbox Mode
    const eventsStr = localStorage.getItem(`${MOCK_EVENTS_KEY_PREFIX}${catId}`);
    if (eventsStr) {
      const rawEvents = JSON.parse(eventsStr);
      return rawEvents.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    return [];
  }
};

// Create a new catch document
export const addCatchRecord = async (
  uid: string,
  ownerDisplayName: string,
  catData: {
    nickname: string;
    photoURL: string;
    breedGuess: string;
    distinguishingFeatures: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    lat: number;
    lng: number;
  },
  xpAwarded: number,
  isFeedMode: boolean = false
): Promise<{ catchId: string }> => {
  const now = new Date();
  const catchId = 'catch_' + Math.random().toString(36).substr(2, 9);
  
  if (isFirebaseLive && db) {
    const photoURL = await uploadPhoto(uid, catchId, catData.photoURL);
    
    // Cat Document
    const catDocRef = doc(db, 'catches', catchId);
    await setDoc(catDocRef, {
      ownerUid: uid,
      ownerDisplayName,
      photoURL,
      breedGuess: catData.breedGuess,
      nickname: catData.nickname,
      distinguishingFeatures: catData.distinguishingFeatures,
      rarity: catData.rarity,
      lat: catData.lat,
      lng: catData.lng,
      caughtAt: Timestamp.fromDate(now),
      lastSeenAt: Timestamp.fromDate(now),
      timesFed: isFeedMode ? 1 : 0,
      lastFedAt: isFeedMode ? Timestamp.fromDate(now) : null,
      reSightCount: 0,
      adoptionStatus: {
        isAdopted: false,
        orgName: null,
        note: null,
        markedAt: null,
        markedByUid: null,
      }
    });

    // Subcollection events
    const eventsColRef = collection(db, 'catches', catchId, 'events');
    
    // Add Catch Sighting event
    await addDoc(eventsColRef, {
      type: 'catch',
      byUid: uid,
      photoURL,
      lat: catData.lat,
      lng: catData.lng,
      xpAwarded: isFeedMode ? (xpAwarded - 20) : xpAwarded, // deduct feed XP from catch event if combined
      timestamp: Timestamp.fromDate(now),
    });

    // If it's a combined feed action
    if (isFeedMode) {
      await addDoc(eventsColRef, {
        type: 'feed',
        byUid: uid,
        photoURL,
        lat: catData.lat,
        lng: catData.lng,
        xpAwarded: 20,
        timestamp: Timestamp.fromDate(now),
      });
    }

    // Update user stats
    await updateUserProfileXP(uid, xpAwarded, 1, isFeedMode ? 1 : 0);

    return { catchId };
  } else {
    // Sandbox Mode
    const photoURL = catData.photoURL;
    const newCat: Cat = {
      id: catchId,
      ownerUid: uid,
      ownerDisplayName,
      photoURL,
      breedGuess: catData.breedGuess,
      nickname: catData.nickname,
      distinguishingFeatures: catData.distinguishingFeatures,
      rarity: catData.rarity,
      lat: catData.lat,
      lng: catData.lng,
      caughtAt: now,
      lastSeenAt: now,
      timesFed: isFeedMode ? 1 : 0,
      lastFedAt: isFeedMode ? now : null,
      reSightCount: 0,
      adoptionStatus: {
        isAdopted: false,
        orgName: null,
        note: null,
        markedAt: null,
        markedByUid: null,
      }
    };

    // Save Catch
    const all = await getAllCatches();
    all.push(newCat);
    localStorage.setItem(MOCK_CATCHES_KEY, JSON.stringify(all));

    // Save Events
    const events: CatEvent[] = [
      {
        id: 'evt_catch_' + Math.random().toString(36).substr(2, 9),
        type: 'catch',
        byUid: uid,
        photoURL,
        lat: catData.lat,
        lng: catData.lng,
        xpAwarded: isFeedMode ? (xpAwarded - 20) : xpAwarded,
        timestamp: now,
      }
    ];

    if (isFeedMode) {
      events.push({
        id: 'evt_feed_' + Math.random().toString(36).substr(2, 9),
        type: 'feed',
        byUid: uid,
        photoURL,
        lat: catData.lat,
        lng: catData.lng,
        xpAwarded: 20,
        timestamp: now,
      });
    }

    localStorage.setItem(`${MOCK_EVENTS_KEY_PREFIX}${catchId}`, JSON.stringify(events));

    // Update User XP
    await updateUserProfileXP(uid, xpAwarded, 1, isFeedMode ? 1 : 0);

    return { catchId };
  }
};

// Add resight or feeding event to an existing catch
export const addSightingEvent = async (
  uid: string,
  catId: string,
  type: 'feed' | 'resight',
  photoBase64: string,
  lat: number,
  lng: number,
  xpAwarded: number
): Promise<void> => {
  const now = new Date();

  if (isFirebaseLive && db) {
    const photoURL = await uploadPhoto(uid, catId, photoBase64);

    // 1. Add event document in subcollection
    const eventsCol = collection(db, 'catches', catId, 'events');
    await addDoc(eventsCol, {
      type,
      byUid: uid,
      photoURL,
      lat,
      lng,
      xpAwarded,
      timestamp: Timestamp.fromDate(now),
    });

    // 2. Update parent catch details
    const catchRef = doc(db, 'catches', catId);
    const catUpdate: any = {
      lastSeenAt: Timestamp.fromDate(now)
    };
    if (type === 'feed') {
      catUpdate.timesFed = increment(1);
      catUpdate.lastFedAt = Timestamp.fromDate(now);
    } else {
      catUpdate.reSightCount = increment(1);
    }
    await updateDoc(catchRef, catUpdate);

    // 3. Update user profile stats
    await updateUserProfileXP(uid, xpAwarded, 0, type === 'feed' ? 1 : 0);
  } else {
    // Sandbox Mode
    const photoURL = photoBase64;
    
    // Add Event
    const eventsStr = localStorage.getItem(`${MOCK_EVENTS_KEY_PREFIX}${catId}`);
    const events: CatEvent[] = eventsStr ? JSON.parse(eventsStr) : [];
    events.push({
      id: 'evt_' + Math.random().toString(36).substr(2, 9),
      type,
      byUid: uid,
      photoURL,
      lat,
      lng,
      xpAwarded,
      timestamp: now,
    });
    localStorage.setItem(`${MOCK_EVENTS_KEY_PREFIX}${catId}`, JSON.stringify(events));

    // Update Cat
    const all = await getAllCatches();
    const updated = all.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          lastSeenAt: now,
          timesFed: type === 'feed' ? c.timesFed + 1 : c.timesFed,
          lastFedAt: type === 'feed' ? now : c.lastFedAt,
          reSightCount: type === 'resight' ? c.reSightCount + 1 : c.reSightCount,
        };
      }
      return c;
    });
    localStorage.setItem(MOCK_CATCHES_KEY, JSON.stringify(updated));

    // Update User XP
    await updateUserProfileXP(uid, xpAwarded, 0, type === 'feed' ? 1 : 0);
  }
};

// NGO: Mark cat as Adopted / Foster
export const markCatAsAdopted = async (
  uid: string,
  catId: string,
  orgName: string,
  note: string,
  customPhotoBase64?: string
): Promise<void> => {
  const now = new Date();

  if (isFirebaseLive && db) {
    let finalPhoto = null;
    if (customPhotoBase64) {
      finalPhoto = await uploadPhoto(uid, catId, customPhotoBase64);
    }

    const catchRef = doc(db, 'catches', catId);
    const updates: any = {
      'adoptionStatus.isAdopted': true,
      'adoptionStatus.orgName': orgName,
      'adoptionStatus.note': note,
      'adoptionStatus.markedAt': Timestamp.fromDate(now),
      'adoptionStatus.markedByUid': uid,
    };
    if (finalPhoto) {
      updates.photoURL = finalPhoto;
    }
    await updateDoc(catchRef, updates);

    // Add activity event
    const eventsCol = collection(db, 'catches', catId, 'events');
    await addDoc(eventsCol, {
      type: 'adoption_marked',
      byUid: uid,
      photoURL: finalPhoto || '',
      lat: 0,
      lng: 0,
      xpAwarded: 0,
      timestamp: Timestamp.fromDate(now),
    });
  } else {
    // Sandbox Mode
    let finalPhoto = customPhotoBase64 || '';
    
    // Update Cat
    const all = await getAllCatches();
    const updated = all.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          photoURL: finalPhoto || c.photoURL,
          adoptionStatus: {
            isAdopted: true,
            orgName,
            note,
            markedAt: now,
            markedByUid: uid,
          }
        };
      }
      return c;
    });
    localStorage.setItem(MOCK_CATCHES_KEY, JSON.stringify(updated));

    // Add Sighting Event
    const eventsStr = localStorage.getItem(`${MOCK_EVENTS_KEY_PREFIX}${catId}`);
    const events: CatEvent[] = eventsStr ? JSON.parse(eventsStr) : [];
    events.push({
      id: 'evt_adopt_' + Math.random().toString(36).substr(2, 9),
      type: 'adoption_marked',
      byUid: uid,
      photoURL: finalPhoto || '',
      lat: 0,
      lng: 0,
      xpAwarded: 0,
      timestamp: now,
    });
    localStorage.setItem(`${MOCK_EVENTS_KEY_PREFIX}${catId}`, JSON.stringify(events));
  }
};

// Helper: updates XP, recalculates level, bumps catch/feed totals
const updateUserProfileXP = async (
  uid: string, 
  xpEarned: number, 
  catchesBumps: number, 
  feedsBumps: number
) => {
  if (isFirebaseLive && db) {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const newXP = (data.totalXP || 0) + xpEarned;
      const newLevel = calculateLevel(newXP);
      
      await updateDoc(userDocRef, {
        totalXP: increment(xpEarned),
        level: newLevel,
        totalCatches: increment(catchesBumps),
        totalFeeds: increment(feedsBumps)
      });
    }
  } else {
    // Sandbox Mode
    const userStr = localStorage.getItem(MOCK_USER_KEY);
    if (userStr) {
      const user: UserProfile = JSON.parse(userStr);
      if (user.uid === uid) {
        user.totalXP += xpEarned;
        user.level = calculateLevel(user.totalXP);
        user.totalCatches += catchesBumps;
        user.totalFeeds += feedsBumps;
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
        
        // Update leaderboard
        const leaderboard = getSandboxLeaderboard();
        const updatedLeaderboard = leaderboard.map(u => {
          if (u.uid === uid) {
            return {
              ...u,
              totalXP: user.totalXP,
              level: user.level,
              totalCatches: user.totalCatches,
              totalFeeds: user.totalFeeds
            };
          }
          return u;
        });
        saveSandboxLeaderboard(updatedLeaderboard);
        
        window.dispatchEvent(new Event('mock-auth-change'));
      }
    }
  }
};

// ==========================================
// LEADERBOARD FUNCTIONS
// ==========================================

const getSandboxLeaderboard = (): UserProfile[] => {
  const lbStr = localStorage.getItem(MOCK_LEADERBOARD_KEY);
  if (lbStr) {
    return JSON.parse(lbStr);
  }
  localStorage.setItem(MOCK_LEADERBOARD_KEY, JSON.stringify(INITIAL_MOCK_LEADERBOARD));
  return INITIAL_MOCK_LEADERBOARD;
};

const saveSandboxLeaderboard = (lb: UserProfile[]) => {
  localStorage.setItem(MOCK_LEADERBOARD_KEY, JSON.stringify(lb));
};

export const getLeaderboard = async (): Promise<UserProfile[]> => {
  if (isFirebaseLive && db) {
    try {
      const usersColRef = collection(db, 'users');
      const q = query(usersColRef, orderBy('totalXP', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await seedLeaderboardFirestore();
        const snapshot2 = await getDocs(q);
        return snapshot2.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as UserProfile[];
      }

      return snapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'Trainer',
        photoURL: doc.data().photoURL || '',
        role: doc.data().role || 'individual',
        orgName: doc.data().orgName || '',
        totalXP: doc.data().totalXP || 0,
        level: doc.data().level || 0,
        totalCatches: doc.data().totalCatches || 0,
        totalFeeds: doc.data().totalFeeds || 0
      })) as UserProfile[];
    } catch (e) {
      console.error('Error fetching Firestore leaderboard, falling back:', e);
      return getSandboxLeaderboard().sort((a, b) => b.totalXP - a.totalXP);
    }
  } else {
    return getSandboxLeaderboard().sort((a, b) => b.totalXP - a.totalXP);
  }
};

const seedLeaderboardFirestore = async () => {
  if (!isFirebaseLive || !db) return;
  try {
    const batch = writeBatch(db);
    INITIAL_MOCK_LEADERBOARD.forEach((user) => {
      const docRef = doc(db, 'users', user.uid);
      batch.set(docRef, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        orgName: user.orgName,
        totalXP: user.totalXP,
        level: user.level,
        totalCatches: user.totalCatches,
        totalFeeds: user.totalFeeds
      });
    });
    await batch.commit();
    console.log('Successfully seeded database leaderboard in Firestore.');
  } catch (e) {
    console.error('Failed to seed Firestore leaderboard:', e);
  }
};
