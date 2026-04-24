import { reactive, watch } from 'vue'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  deleteField,
  increment,
  arrayUnion,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { authState } from '../lib/auth'
import type { ShelfItem, ItemCategory } from '../types'

const state = reactive({
  items: [] as ShelfItem[],
  loaded: false,
})

let unsubscribe: Unsubscribe | null = null
let notesTimer:  ReturnType<typeof setTimeout> | null = null
let fieldsTimer: ReturnType<typeof setTimeout> | null = null

function itemsRef(uid: string) {
  return collection(db, 'users', uid, 'items')
}

// ---- Products DB sync ----

interface ProductPayload {
  name: string
  creator: string
  imageUrl: string
  category: ItemCategory
  isbn?: string
  janCode?: string
  externalSource?: string
}

async function syncToProductsDB(
  payload: ProductPayload,
  location?: { prefecture: string; city: string },
): Promise<string | null> {
  try {
    let productRef: ReturnType<typeof doc>

    if (payload.externalSource) {
      const safeId = payload.externalSource.replace(/[^a-zA-Z0-9_-]/g, '_')
      productRef = doc(db, 'products', safeId)
    } else if (payload.janCode) {
      productRef = doc(db, 'products', `jan_${payload.janCode}`)
    } else if (payload.isbn) {
      productRef = doc(db, 'products', `isbn_${payload.isbn}`)
    } else {
      const locationCounts = location?.prefecture && location?.city
        ? { [`${location.prefecture}__${location.city}`]: 1 }
        : {}
      const ref = await addDoc(collection(db, 'products'), {
        name: payload.name,
        creator: payload.creator,
        imageUrl: payload.imageUrl,
        category: payload.category,
        isbn: '',
        externalSource: '',
        ownerCount: 1,
        locationCounts,
        createdAt: serverTimestamp(),
      })
      return ref.id
    }

    const snap = await getDoc(productRef)
    const locationUpdate = location?.prefecture && location?.city
      ? { [`locationCounts.${location.prefecture}__${location.city}`]: increment(1) }
      : {}

    if (!snap.exists()) {
      const locationCounts = location?.prefecture && location?.city
        ? { [`${location.prefecture}__${location.city}`]: 1 }
        : {}
      await setDoc(productRef, {
        name: payload.name,
        creator: payload.creator,
        imageUrl: payload.imageUrl,
        category: payload.category,
        isbn: payload.isbn ?? '',
        janCode: payload.janCode ?? '',
        externalSource: payload.externalSource ?? '',
        ownerCount: 1,
        locationCounts,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(productRef, {
        name: payload.name,
        creator: payload.creator,
        imageUrl: payload.imageUrl,
        category: payload.category,
        ownerCount: increment(1),
        ...locationUpdate,
      })
    }
    return productRef.id
  } catch (e) {
    console.warn('syncToProductsDB failed:', e)
    return null
  }
}

// ---- Auth-scoped listener ----

watch(
  () => authState.user,
  (user) => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    state.items = []
    state.loaded = false

    if (!user) return

    unsubscribe = onSnapshot(itemsRef(user.uid), (snapshot) => {
      state.items = snapshot.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          category: 'other', // フォールバック（旧データ対応）
          ...data,
        } as ShelfItem
      })
      state.loaded = true
    })
  },
  { immediate: true },
)

// ---- Public store ----

export interface AddItemPayload {
  name: string
  creator: string
  imageUrl: string
  category: ItemCategory
  isbn?: string
  janCode?: string
  externalSource?: string
}

export const store = {
  get items()  { return state.items  },
  get loaded() { return state.loaded },

  getById(id: string): ShelfItem | undefined {
    return state.items.find(i => i.id === id)
  },

  async addItem(payload: AddItemPayload) {
    const uid = authState.user?.uid
    if (!uid) return

    const { userProfileStore } = await import('./userProfile')
    const p = userProfileStore.profile
    const location = p?.prefecture && p?.city
      ? { prefecture: p.prefecture, city: p.city }
      : undefined
    const productId = await syncToProductsDB(payload, location)

    await addDoc(itemsRef(uid), {
      name: payload.name,
      creator: payload.creator,
      imageUrl: payload.imageUrl,
      category: payload.category,
      status: 'owned',
      addedAt: new Date().toISOString().split('T')[0],
      ...(productId ? { productId } : {}),
    })
  },

  async archive(id: string, disposalMethod: NonNullable<ShelfItem['disposalMethod']>) {
    const uid = authState.user?.uid
    if (!uid) return
    const item = state.items.find(i => i.id === id)
    await updateDoc(doc(db, 'users', uid, 'items', id), {
      status: 'archived',
      disposalMethod,
      archivedAt: new Date().toISOString().split('T')[0],
    })
    if (item?.productId) {
      const updates: Record<string, unknown> = {
        [`disposalCounts.${disposalMethod}`]: increment(1),
      }
      // 所有期間を集計（取得日 or 追加日から手放し日まで）
      const startDate = item.acquiredAt ?? item.addedAt
      if (startDate) {
        const days = Math.round(
          (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (days >= 0) {
          updates['ownershipStats.totalDays'] = increment(days)
          updates['ownershipStats.count']     = increment(1)
        }
      }
      updateDoc(doc(db, 'products', item.productId), updates).catch(() => {})
    }
  },

  async unarchive(id: string) {
    const uid = authState.user?.uid
    if (!uid) return
    const item = state.items.find(i => i.id === id)
    const prevMethod = item?.disposalMethod
    await updateDoc(doc(db, 'users', uid, 'items', id), {
      status: 'owned',
      disposalMethod: deleteField(),
      archivedAt:     deleteField(),
    })
    if (item?.productId && prevMethod) {
      updateDoc(doc(db, 'products', item.productId), {
        [`disposalCounts.${prevMethod}`]: increment(-1),
      }).catch(() => {})
    }
  },

  async updateItemImage(id: string, customImageUrl: string) {
    const uid = authState.user?.uid
    if (!uid) return
    await updateDoc(doc(db, 'users', uid, 'items', id), { customImageUrl })
  },

  async removeItem(id: string) {
    const uid = authState.user?.uid
    if (!uid) return
    await deleteDoc(doc(db, 'users', uid, 'items', id))
  },

  updateNotes(id: string, notes: string) {
    const uid = authState.user?.uid
    if (!uid) return
    if (notesTimer) clearTimeout(notesTimer)
    notesTimer = setTimeout(() => {
      updateDoc(doc(db, 'users', uid, 'items', id), { notes })
    }, 800)
  },

  // タイトル・日付・金額などの任意フィールドを更新（debounce なし）
  // 空文字・null → deleteField() に変換して Firestore からフィールド自体を削除
  async updateItemFields(
    id: string,
    fields: Partial<Pick<ShelfItem, 'name' | 'creator' | 'category' | 'acquiredAt' | 'archivedAt' | 'acquirePrice' | 'sellPrice'>>,
  ) {
    const uid = authState.user?.uid
    if (!uid) return
    const item = state.items.find(i => i.id === id)

    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
        payload[k] = deleteField()
      } else {
        payload[k] = v
      }
    }
    if (Object.keys(payload).length === 0) return
    await updateDoc(doc(db, 'users', uid, 'items', id), payload)

    // name 変更時は products の候補リストに追加
    if (fields.name?.trim() && item?.productId) {
      updateDoc(doc(db, 'products', item.productId), {
        nameCandidates: arrayUnion(fields.name.trim()),
      }).catch(() => {})
    }
  },

  // debounce 付き（テキスト・数値フィールド用）
  updateItemFieldsDebounced(
    id: string,
    fields: Partial<Pick<ShelfItem, 'name' | 'creator' | 'acquirePrice' | 'sellPrice'>>,
  ) {
    if (fieldsTimer) clearTimeout(fieldsTimer)
    fieldsTimer = setTimeout(() => {
      this.updateItemFields(id, fields)
    }, 800)
  },

  // 公開棚への表示切り替え
  async updatePublicVisibility(id: string, show: boolean) {
    const uid = authState.user?.uid
    if (!uid) return
    const item = state.items.find(i => i.id === id)
    if (!item) return
    const current = item.showOnPublic !== false
    if (current === show) return
    await updateDoc(doc(db, 'users', uid, 'items', id), { showOnPublic: show })
  },

  // マップ表示切り替え
  async updateMapVisibility(id: string, show: boolean) {
    const uid = authState.user?.uid
    if (!uid) return
    const item = state.items.find(i => i.id === id)
    if (!item) return

    const currentShow = item.showOnMap !== false // undefined = true
    if (currentShow === show) return

    await updateDoc(doc(db, 'users', uid, 'items', id), { showOnMap: show })

    if (item.productId) {
      const { userProfileStore } = await import('./userProfile')
      const p = userProfileStore.profile
      if (p?.prefecture && p?.city) {
        updateDoc(doc(db, 'products', item.productId), {
          [`locationCounts.${p.prefecture}__${p.city}`]: increment(show ? 1 : -1),
          hiddenFromMapCount: increment(show ? -1 : 1),
        }).catch(() => {})
      }
    }
  },
}
