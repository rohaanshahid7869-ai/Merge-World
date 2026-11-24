import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  COIN_BADGE_IDS,
  PLAYER_TITLE_OPTIONS,
  VALID_AVATAR_IDS,
  evaluateUnlockedCoinBadges,
} from './data/gameData';
import {
  AvatarId,
  CoinBadgeId,
  LeaderboardPlayerRecord,
  LeaderboardSortKey,
  SaveState,
} from './types/game';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

let pendingGoogleSignIn: Promise<User> | null = null;

export async function signInWithGoogle(): Promise<User> {
  if (pendingGoogleSignIn) {
    return pendingGoogleSignIn;
  }
  pendingGoogleSignIn = signInWithPopup(auth, googleProvider)
    .then((cred) => cred.user)
    .finally(() => {
      pendingGoogleSignIn = null;
    });
  return pendingGoogleSignIn;
}

export async function signOutPlayer(): Promise<void> {
  await signOut(auth);
}

function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

function sanitizeDisplayName(raw: string, fallback = 'Sanctuary Explorer'): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (trimmed.length >= 2) return trimmed;
  return fallback.slice(0, 24);
}

function sanitizeTitle(raw: string): string {
  const trimmed = raw.trim().slice(0, 32);
  if (trimmed.length >= 2) return trimmed;
  return PLAYER_TITLE_OPTIONS[0];
}

function sanitizeAvatar(raw: string): AvatarId {
  return VALID_AVATAR_IDS.includes(raw as AvatarId) ? (raw as AvatarId) : 'sprout';
}

function buildSanitizedLeaderboardPayload(uid: string, saveState: SaveState) {
  const currentCoins = clampInt(saveState.coins, 0, 1_000_000_000);
  const totalCoinsEarned = clampInt(saveState.stats.totalCoinsEarned, 0, 1_000_000_000);
  const peakCoins = clampInt(Math.max(currentCoins, totalCoinsEarned), 0, 1_000_000_000);

  const coinBadges: CoinBadgeId[] = evaluateUnlockedCoinBadges(
    peakCoins,
    saveState.unlockedCoinBadges
  ).filter((b) => COIN_BADGE_IDS.includes(b));

  const streakBadges = Array.from(
    new Set(
      (saveState.dailyLogin.claimedMilestones || []).filter(
        (n) => n === 7 || n === 30 || n === 100
      )
    )
  ).slice(0, 3);

  return {
    uid,
    displayName: sanitizeDisplayName(saveState.playerProfile.displayName),
    avatarId: sanitizeAvatar(saveState.playerProfile.avatarId),
    title: sanitizeTitle(saveState.playerProfile.title),
    bio: saveState.playerProfile.bio.trim().slice(0, 80),
    coinBadges,
    streakBadges,
    currentCoins,
    totalCoinsEarned,
    peakCoins,
    totalMerges: clampInt(saveState.stats.totalMerges, 0, 10_000_000),
    playerLevel: clampInt(saveState.playerLevel, 1, 999),
    discoveredCount: clampInt(saveState.discoveredLevels.length, 1, 32),
    unlockedAreasCount: clampInt(saveState.unlockedAreas.length, 1, 5),
  };
}

export async function syncPlayerToLeaderboard(
  uid: string,
  saveState: SaveState
): Promise<void> {
  const docPath = `leaderboard/${uid}`;
  const docRef = doc(db, 'leaderboard', uid);
  const payload = buildSanitizedLeaderboardPayload(uid, saveState);

  let existsOnServer = false;
  try {
    const snap = await getDoc(docRef);
    existsOnServer = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  if (!existsOnServer) {
    try {
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  } else {
    try {
      const { uid: _omitUid, ...updatableFields } = payload;
      await updateDoc(docRef, {
        ...updatableFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }
}

export function subscribeTop40Leaderboard(
  sortBy: LeaderboardSortKey,
  onData: (records: LeaderboardPlayerRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'leaderboard'), orderBy(sortBy, 'desc'), limit(40));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: LeaderboardPlayerRecord[] = snapshot.docs.slice(0, 40).map((d) => {
        const data = d.data();
        const ts = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
        return {
          uid: typeof data.uid === 'string' ? data.uid : d.id,
          displayName: typeof data.displayName === 'string' ? data.displayName : 'Player',
          avatarId: sanitizeAvatar(typeof data.avatarId === 'string' ? data.avatarId : 'sprout'),
          title: typeof data.title === 'string' ? data.title : 'Meadow Wanderer',
          bio: typeof data.bio === 'string' ? data.bio : '',
          coinBadges: Array.isArray(data.coinBadges)
            ? data.coinBadges.filter((b): b is CoinBadgeId => COIN_BADGE_IDS.includes(b))
            : [],
          streakBadges: Array.isArray(data.streakBadges)
            ? data.streakBadges.filter((n): n is number => n === 7 || n === 30 || n === 100)
            : [],
          currentCoins: typeof data.currentCoins === 'number' ? data.currentCoins : 0,
          totalCoinsEarned: typeof data.totalCoinsEarned === 'number' ? data.totalCoinsEarned : 0,
          peakCoins: typeof data.peakCoins === 'number' ? data.peakCoins : 0,
          totalMerges: typeof data.totalMerges === 'number' ? data.totalMerges : 0,
          playerLevel: typeof data.playerLevel === 'number' ? data.playerLevel : 1,
          discoveredCount: typeof data.discoveredCount === 'number' ? data.discoveredCount : 1,
          unlockedAreasCount:
            typeof data.unlockedAreasCount === 'number' ? data.unlockedAreasCount : 1,
          updatedAtMs: ts,
        };
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}
