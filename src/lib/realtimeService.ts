'use client';

import { rtdb, db } from './firebase';
import {
  ref, set, push, onValue, off, remove, get,
  serverTimestamp as rtdbTimestamp,
  onDisconnect,
  query as rtdbQuery,
  orderByChild,
  limitToFirst,
} from 'firebase/database';
import {
  doc, getDoc, setDoc, updateDoc, increment,
} from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────
export interface PlayerInfo {
  odId: string;
  displayName: string;
  photoURL: string;
  stars: number;
}

export interface MatchData {
  gameType: 'match' | 'quiz';
  status: 'waiting' | 'playing' | 'finished';
  players: {
    [odId: string]: PlayerInfo;
  };
  gameData?: unknown; // questions or pairs
  progress: {
    [odId: string]: { completed: number; total: number };
  };
  result?: {
    winner: string | null;
    finishedAt: number;
  };
  createdAt: unknown;
}

export interface ChallengeData {
  from: PlayerInfo;
  to: string; // target userId
  gameType: 'match' | 'quiz';
  status: 'pending' | 'accepted' | 'declined';
  matchId?: string;
  createdAt: unknown;
}

// ─── Matchmaking ─────────────────────────────────────────────

/**
 * Join the matchmaking queue. Returns a cleanup function.
 * When matched, calls onMatched(matchId).
 */
export function joinQueue(
  gameType: 'match' | 'quiz',
  player: PlayerInfo,
  onMatched: (matchId: string, matchData: MatchData) => void,
  onWaiting?: () => void,
): () => void {
  const queueRef = ref(rtdb, `queue/${gameType}`);
  const myEntryRef = push(queueRef);
  
  // Write my entry to queue
  set(myEntryRef, {
    ...player,
    timestamp: rtdbTimestamp(),
  });

  // Auto-remove on disconnect
  onDisconnect(myEntryRef).remove();

  // Listen for queue changes - try to pair up
  const unsubscribe = onValue(queueRef, async (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const entries = Object.entries(data) as [string, PlayerInfo & { timestamp: number }][];
    
    // Filter out myself
    const others = entries.filter(([key]) => key !== myEntryRef.key);
    
    if (others.length === 0) {
      onWaiting?.();
      return;
    }

    // I'm the one who initiates pairing if my key comes first alphabetically
    // This prevents both players from creating a match simultaneously
    const allKeys = entries.map(([key]) => key).sort();
    const myIndex = allKeys.indexOf(myEntryRef.key!);
    
    if (myIndex === 0 && allKeys.length >= 2) {
      // I'm first in queue, pair with the second person
      const opponentKey = allKeys[1];
      const opponentData = data[opponentKey];

      // Create a match
      const matchRef = push(ref(rtdb, 'matches'));
      const matchId = matchRef.key!;
      
      const matchData: MatchData = {
        gameType,
        status: 'waiting',
        players: {
          [player.odId]: player,
          [opponentData.odId]: opponentData,
        },
        progress: {
          [player.odId]: { completed: 0, total: 0 },
          [opponentData.odId]: { completed: 0, total: 0 },
        },
        createdAt: rtdbTimestamp(),
      };

      await set(matchRef, matchData);

      // Remove both from queue
      await remove(ref(rtdb, `queue/${gameType}/${myEntryRef.key}`));
      await remove(ref(rtdb, `queue/${gameType}/${opponentKey}`));

      onMatched(matchId, matchData);
    } else if (myIndex > 0) {
      // I'm not first, wait to be picked. Listen for matches that contain me
      const matchesRef = ref(rtdb, 'matches');
      const matchListener = onValue(matchesRef, (matchSnap) => {
        const matches = matchSnap.val();
        if (!matches) return;
        
        for (const [mId, mData] of Object.entries(matches) as [string, MatchData][]) {
          if (mData.players && mData.players[player.odId] && mData.status === 'waiting') {
            off(matchesRef, 'value', matchListener);
            onMatched(mId, mData);
            return;
          }
        }
      });
    }
  });

  return () => {
    off(queueRef);
    remove(myEntryRef);
  };
}

/**
 * Leave the queue
 */
export function leaveQueue(gameType: 'match' | 'quiz', entryKey: string) {
  remove(ref(rtdb, `queue/${gameType}/${entryKey}`));
}

// ─── Match Lifecycle ────────────────────────────────────────

/**
 * Listen to match updates
 */
export function listenToMatch(
  matchId: string,
  callback: (data: MatchData | null) => void,
): () => void {
  const matchRef = ref(rtdb, `matches/${matchId}`);
  const listener = onValue(matchRef, (snap) => {
    callback(snap.val());
  });
  return () => off(matchRef, 'value', listener);
}

/**
 * Set the game data (questions/pairs) for the match
 */
export async function setGameData(matchId: string, gameData: unknown) {
  await set(ref(rtdb, `matches/${matchId}/gameData`), gameData);
  await set(ref(rtdb, `matches/${matchId}/status`), 'playing');
}

/**
 * Update player progress in a match
 */
export async function updateProgress(
  matchId: string,
  userId: string,
  completed: number,
  total: number,
) {
  await set(ref(rtdb, `matches/${matchId}/progress/${userId}`), {
    completed,
    total,
  });
}

/**
 * Mark myself as finished. If I'm first, I win.
 */
export async function finishMatch(
  matchId: string,
  userId: string,
) {
  const matchRef = ref(rtdb, `matches/${matchId}`);
  const snap = await get(matchRef);
  const data = snap.val() as MatchData;
  
  if (!data) return;
  
  if (data.status === 'finished') {
    // Other player already finished first, I lose
    return { won: false, winnerId: data.result?.winner || null };
  }

  // I'm first to finish - I win!
  await set(ref(rtdb, `matches/${matchId}/status`), 'finished');
  await set(ref(rtdb, `matches/${matchId}/result`), {
    winner: userId,
    finishedAt: Date.now(),
  });

  return { won: true, winnerId: userId };
}

// ─── Star System ────────────────────────────────────────────

/**
 * Update star count in Firestore. delta: +1 for win, -1 for loss
 */
export async function updateStars(userId: string, delta: number) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const current = snap.data().stars || 0;
    const newStars = Math.max(0, current + delta); // Don't go below 0
    await updateDoc(userRef, { stars: newStars });
    return newStars;
  }
  return 0;
}

/**
 * Get user's star count
 */
export async function getStars(userId: string): Promise<number> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data().stars || 0;
  }
  return 0;
}

// ─── Challenge System ────────────────────────────────────────

/**
 * Send a challenge to another user
 */
export async function sendChallenge(
  from: PlayerInfo,
  toUserId: string,
  gameType: 'match' | 'quiz',
): Promise<string> {
  const challengeRef = push(ref(rtdb, 'challenges'));
  const challengeId = challengeRef.key!;
  
  const challenge: ChallengeData = {
    from,
    to: toUserId,
    gameType,
    status: 'pending',
    createdAt: rtdbTimestamp(),
  };

  await set(challengeRef, challenge);
  
  // Auto-remove after 30 seconds if not responded
  setTimeout(async () => {
    const snap = await get(challengeRef);
    if (snap.exists() && snap.val().status === 'pending') {
      await remove(challengeRef);
    }
  }, 30000);

  return challengeId;
}

/**
 * Listen for incoming challenges
 */
export function listenForChallenges(
  userId: string,
  callback: (challengeId: string, data: ChallengeData) => void,
): () => void {
  const challengeRef = ref(rtdb, 'challenges');
  const listener = onValue(challengeRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    
    for (const [id, challenge] of Object.entries(data) as [string, ChallengeData][]) {
      if (challenge.to === userId && challenge.status === 'pending') {
        callback(id, challenge);
      }
    }
  });

  return () => off(challengeRef, 'value', listener);
}

/**
 * Accept a challenge — creates a match and updates the challenge
 */
export async function acceptChallenge(
  challengeId: string,
  acceptingPlayer: PlayerInfo,
): Promise<string> {
  const challengeRef = ref(rtdb, `challenges/${challengeId}`);
  const snap = await get(challengeRef);
  if (!snap.exists()) throw new Error('Challenge not found');
  
  const challenge = snap.val() as ChallengeData;
  
  // Create match
  const matchRef = push(ref(rtdb, 'matches'));
  const matchId = matchRef.key!;
  
  const matchData: MatchData = {
    gameType: challenge.gameType,
    status: 'waiting',
    players: {
      [challenge.from.odId]: challenge.from,
      [acceptingPlayer.odId]: acceptingPlayer,
    },
    progress: {
      [challenge.from.odId]: { completed: 0, total: 0 },
      [acceptingPlayer.odId]: { completed: 0, total: 0 },
    },
    createdAt: rtdbTimestamp(),
  };

  await set(matchRef, matchData);
  
  // Update challenge with matchId
  await set(challengeRef, {
    ...challenge,
    status: 'accepted',
    matchId,
  });

  return matchId;
}

/**
 * Decline a challenge
 */
export async function declineChallenge(challengeId: string) {
  await set(ref(rtdb, `challenges/${challengeId}/status`), 'declined');
  // Clean up after 3 seconds
  setTimeout(() => {
    remove(ref(rtdb, `challenges/${challengeId}`));
  }, 3000);
}

/**
 * Listen to a challenge status change (for the sender)
 */
export function listenToChallenge(
  challengeId: string,
  callback: (data: ChallengeData | null) => void,
): () => void {
  const challengeRef = ref(rtdb, `challenges/${challengeId}`);
  const listener = onValue(challengeRef, (snap) => {
    callback(snap.val());
  });
  return () => off(challengeRef, 'value', listener);
}

// ─── Cleanup ────────────────────────────────────────────────

/**
 * Clean up a match (remove from RTDB after game is done)
 */
export async function cleanupMatch(matchId: string) {
  // Keep match data for 5 minutes then remove
  setTimeout(() => {
    remove(ref(rtdb, `matches/${matchId}`));
  }, 5 * 60 * 1000);
}
