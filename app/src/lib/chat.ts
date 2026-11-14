/**
 * Group chats (Firestore). Data model — see /firestore.rules for who may do what:
 *   rooms/{roomId}                 { name, topic, ticker, createdBy, createdAt, members[], memberInfo{uid:{name,photo}}, lastAt, lastMessage }
 *   rooms/{roomId}/messages/{id}   { uid, name, photo, text, at }
 *   invites/{code}                 { roomId, roomName, topic, createdBy, createdAt, expiresAt }   ← unguessable code, shared as a link
 *   reports/{id}                   { by, roomId, messageId, text, author, reason, at }            ← moderation queue
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firebaseHandles } from './auth';
import { useApp, verifiedUid } from './store';

export const MAX_MESSAGE = 1000;
export const MAX_MEMBERS = 50;
const INVITE_DAYS = 7;

export interface Room {
  id: string;
  name: string;
  topic: string;
  ticker: string | null;
  createdBy: string;
  members: string[];
  memberInfo: Record<string, { name: string; photo: string | null }>;
  lastAt: Date | null;
  lastMessage: { text: string; name: string } | null;
}
export interface Message {
  id: string;
  uid: string;
  name: string;
  photo: string | null;
  text: string;
  at: Date | null;
}
export interface Invite {
  code: string;
  roomId: string;
  roomName: string;
  topic: string;
  createdBy: string;
  expiresAt: Date;
}

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

function me() {
  const { auth, db } = firebaseHandles();
  const u = auth?.currentUser;
  if (!db || !u) throw new Error('not-signed-in');
  return { db, uid: u.uid, info: { name: u.displayName || u.email?.split('@')[0] || 'משתמש', photo: u.photoURL ?? null } };
}

export function chatAvailable() {
  return !!firebaseHandles().db;
}

/** Rooms I'm a member of, live, most recent activity first. */
export function useMyRooms() {
  const uid = useApp((s) => verifiedUid(s.account));
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const { db } = firebaseHandles();
    if (!db || !uid) {
      setRooms(null);
      return;
    }
    return onSnapshot(
      query(collection(db, 'rooms'), where('members', 'array-contains', uid)),
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data();
          return { ...(x as Omit<Room, 'id' | 'lastAt'>), id: d.id, lastAt: toDate(x.lastAt) } as Room;
        });
        list.sort((a, b) => (b.lastAt?.getTime() ?? Date.now()) - (a.lastAt?.getTime() ?? Date.now()));
        setRooms(list);
        setError(null);
      },
      (e) => setError(e.code ?? String(e)),
    );
  }, [uid]);
  return { rooms, error, uid };
}

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  useEffect(() => {
    const { db } = firebaseHandles();
    if (!db) return setRoom(null);
    return onSnapshot(
      doc(db, 'rooms', roomId),
      (d) => setRoom(d.exists() ? ({ ...(d.data() as Room), id: d.id, lastAt: toDate(d.data().lastAt) } as Room) : null),
      () => setRoom(null),
    );
  }, [roomId]);
  return room;
}

export function useMessages(roomId: string) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  useEffect(() => {
    const { db } = firebaseHandles();
    if (!db) return;
    return onSnapshot(
      query(collection(db, 'rooms', roomId, 'messages'), orderBy('at', 'desc'), limit(200)),
      (snap) => setMessages(snap.docs.map((d) => ({ ...(d.data() as Message), id: d.id, at: toDate(d.data().at) }))),
      () => setMessages([]),
    );
  }, [roomId]);
  return messages;
}

function randomCode() {
  const abc = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(20);
  globalThis.crypto?.getRandomValues?.(bytes) ?? bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
  return [...bytes].map((b) => abc[b % abc.length]).join('');
}

export async function createRoom(name: string, topic: string, ticker: string | null) {
  const { db, uid, info } = me();
  const ref = await addDoc(collection(db, 'rooms'), {
    name: name.trim().slice(0, 60),
    topic,
    ticker,
    createdBy: uid,
    createdAt: serverTimestamp(),
    members: [uid],
    memberInfo: { [uid]: info },
    lastAt: serverTimestamp(),
    lastMessage: null,
  });
  return ref.id;
}

/** A shareable invite link (valid 7 days). */
export async function createInvite(room: Pick<Room, 'id' | 'name' | 'topic'>) {
  const { db, uid } = me();
  const code = randomCode();
  await setDoc(doc(db, 'invites', code), {
    roomId: room.id,
    roomName: room.name,
    topic: room.topic,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_DAYS * 864e5),
  });
  return inviteUrl(code);
}

export function inviteUrl(code: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '').replace(/\/$/, '');
    return `${window.location.origin}${base}/join/${code}`;
  }
  return `voltix://join/${code}`;
}

export async function getInvite(code: string): Promise<Invite | null> {
  const { db } = me();
  const d = await getDoc(doc(db, 'invites', code));
  if (!d.exists()) return null;
  const x = d.data();
  return { code, roomId: x.roomId, roomName: x.roomName, topic: x.topic, createdBy: x.createdBy, expiresAt: toDate(x.expiresAt) ?? new Date(0) };
}

export async function joinWithInvite(inv: Invite) {
  const { db, uid, info } = me();
  await updateDoc(doc(db, 'rooms', inv.roomId), {
    members: arrayUnion(uid),
    [`memberInfo.${uid}`]: info,
    joinCode: inv.code,
  });
  return inv.roomId;
}

export async function sendMessage(roomId: string, text: string) {
  const { db, uid, info } = me();
  const body = text.trim().slice(0, MAX_MESSAGE);
  if (!body) return;
  await addDoc(collection(db, 'rooms', roomId, 'messages'), { uid, name: info.name, photo: info.photo, text: body, at: serverTimestamp() });
  await updateDoc(doc(db, 'rooms', roomId), { lastAt: serverTimestamp(), lastMessage: { text: body.slice(0, 90), name: info.name } }).catch(() => {});
}

export async function deleteMessage(roomId: string, id: string) {
  const { db } = me();
  await deleteDoc(doc(db, 'rooms', roomId, 'messages', id));
}

export async function reportMessage(roomId: string, m: Message, reason: string) {
  const { db, uid } = me();
  await addDoc(collection(db, 'reports'), { by: uid, roomId, messageId: m.id, text: m.text, author: m.uid, reason, at: serverTimestamp() });
}

export async function leaveRoom(roomId: string) {
  const { db, uid } = me();
  await updateDoc(doc(db, 'rooms', roomId), { members: arrayRemove(uid) });
}

export async function deleteRoom(roomId: string) {
  const { db } = me();
  await deleteDoc(doc(db, 'rooms', roomId));
}

/** Split text into plain parts and $TICKER mentions (rendered as links to the stock page). */
export function tokenize(text: string, known: (s: string) => boolean) {
  const parts: { text: string; ticker?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(/\$([A-Za-z]{1,5}(?:\.[A-Za-z])?)\b/g)) {
    const sym = m[1].toUpperCase();
    if (!known(sym)) continue;
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0].toUpperCase(), ticker: sym });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export const TOPICS = ['stock', 'market', 'portfolio', 'ideas', 'earnings', 'general'] as const;
export type Topic = (typeof TOPICS)[number];

/** Remove me from every room (used before deleting the account). */
export async function leaveAllRooms() {
  const { auth, db } = firebaseHandles();
  const u = auth?.currentUser;
  if (!db || !u) return;
  const snap = await getDocs(query(collection(db, 'rooms'), where('members', 'array-contains', u.uid)));
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { members: arrayRemove(u.uid) }).catch(() => {})));
}
