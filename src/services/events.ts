import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { KarteTimelineEvent, TimelineEventType, EventFilterCategory } from '../types'

// パス: users/{uid}/events/{eventId}

function col(uid: string) {
  return collection(db, `users/${uid}/events`)
}

function docRef(uid: string, eventId: string) {
  return doc(db, `users/${uid}/events/${eventId}`)
}

// ===== イベント一覧購読 =====
export function subscribeEvents(
  uid: string,
  callback: (items: KarteTimelineEvent[]) => void,
): () => void {
  const q = query(col(uid), orderBy('eventDate', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toEvent(d.id, d.data())))
  })
}

// ===== 1件取得 =====
export async function getEvent(uid: string, eventId: string): Promise<KarteTimelineEvent | null> {
  const snap = await getDoc(docRef(uid, eventId))
  if (!snap.exists()) return null
  return toEvent(snap.id, snap.data())
}

// ===== 設備IDに関連するイベント取得 =====
export async function getEventsByEquipmentId(
  uid: string,
  equipmentId: string,
): Promise<KarteTimelineEvent[]> {
  const q = query(
    col(uid),
    where('relatedEquipmentIds', 'array-contains', equipmentId),
    orderBy('eventDate', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => toEvent(d.id, d.data()))
}

// ===== 追加 =====
export interface CreateEventPayload {
  eventType:            TimelineEventType
  filterCategory:       EventFilterCategory
  title:                string
  eventDate:            string          // "YYYY-MM-DD"
  contractor?:          string
  cost?:                number
  memo?:                string
  relatedEquipmentIds:  string[]
}

export async function createEvent(uid: string, payload: CreateEventPayload): Promise<string> {
  const ref = await addDoc(col(uid), {
    ...payload,
    photoUrls: [],
    source:    'manual',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ===== 更新 =====
export async function updateEvent(
  uid: string,
  eventId: string,
  payload: Partial<CreateEventPayload>,
): Promise<void> {
  await updateDoc(docRef(uid, eventId), {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}

// ===== 削除 =====
export async function deleteEvent(uid: string, eventId: string): Promise<void> {
  await deleteDoc(docRef(uid, eventId))
}

// ===== 内部変換 =====
function toEvent(id: string, data: any): KarteTimelineEvent {
  return {
    eventId:             id,
    eventType:           data.eventType,
    filterCategory:      data.filterCategory ?? 'other',
    title:               data.title,
    eventDate:           data.eventDate,
    relatedEquipmentIds: data.relatedEquipmentIds ?? [],
    photoUrls:           data.photoUrls ?? [],
    memo:                data.memo,
    contractor:          data.contractor,
    cost:                data.cost,
    source:              data.source ?? 'manual',
    buildogProjectId:    data.buildogProjectId,
    createdAt:           data.createdAt?.toDate?.()?.toISOString?.() ?? '',
  }
}
