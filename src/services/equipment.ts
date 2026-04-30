import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { KarteEquipment, EquipmentCategory, EquipmentStatus } from '../types'

// パス: users/{uid}/equipment/{equipmentId}

function col(uid: string) {
  return collection(db, `users/${uid}/equipment`)
}

function docRef(uid: string, equipmentId: string) {
  return doc(db, `users/${uid}/equipment/${equipmentId}`)
}

// ===== 設備一覧購読 =====
export function subscribeEquipments(
  uid: string,
  callback: (items: KarteEquipment[]) => void,
): () => void {
  const q = query(col(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => {
        const data = d.data()
        return {
          equipmentId:     d.id,
          category:        data.category,
          name:            data.name,
          maker:           data.maker,
          modelNumber:     data.modelNumber,
          installedDate:   data.installedDate,
          warrantyExpiry:  data.warrantyExpiry,
          status:          data.status ?? 'unknown',
          photoUrls:       data.photoUrls ?? [],
          memo:            data.memo,
          buildogSourceId: data.buildogSourceId,
          createdAt:       data.createdAt?.toDate?.()?.toISOString?.() ?? '',
          updatedAt:       data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
        } as KarteEquipment
      }),
    )
  })
}

// ===== 設備1件取得 =====
export async function getEquipment(uid: string, equipmentId: string): Promise<KarteEquipment | null> {
  const snap = await getDoc(docRef(uid, equipmentId))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    equipmentId:     snap.id,
    category:        data.category,
    name:            data.name,
    maker:           data.maker,
    modelNumber:     data.modelNumber,
    installedDate:   data.installedDate,
    warrantyExpiry:  data.warrantyExpiry,
    status:          data.status ?? 'unknown',
    photoUrls:       data.photoUrls ?? [],
    memo:            data.memo,
    buildogSourceId: data.buildogSourceId,
    createdAt:       data.createdAt?.toDate?.()?.toISOString?.() ?? '',
    updatedAt:       data.updatedAt?.toDate?.()?.toISOString?.() ?? '',
  }
}

// ===== 設備追加 =====
export interface CreateEquipmentPayload {
  category:       EquipmentCategory
  name:           string
  maker?:         string
  modelNumber?:   string
  installedDate?: string
  warrantyExpiry?: string
  status:         EquipmentStatus
  memo?:          string
}

export async function createEquipment(uid: string, payload: CreateEquipmentPayload): Promise<string> {
  const ref = await addDoc(col(uid), {
    ...payload,
    photoUrls:  [],
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  })
  return ref.id
}

// ===== 設備更新 =====
export async function updateEquipment(
  uid: string,
  equipmentId: string,
  payload: Partial<CreateEquipmentPayload>,
): Promise<void> {
  await updateDoc(docRef(uid, equipmentId), {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}

// ===== 設備削除 =====
export async function deleteEquipment(uid: string, equipmentId: string): Promise<void> {
  await deleteDoc(docRef(uid, equipmentId))
}
