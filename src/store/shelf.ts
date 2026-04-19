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
let notesTimer: ReturnType<typeof setTimeout> | null = null

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

async function syncToProductsDB(payload: ProductPayload): Promise<string | null> {
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
      const ref = await addDoc(collection(db, 'products'), {
        name: payload.name,
        creator: payload.creator,
        imageUrl: payload.imageUrl,
        category: payload.category,
        isbn: '',
        externalSource: '',
        ownerCount: 1,
        createdAt: serverTimestamp(),
      })
      return ref.id
    }

    const snap = await getDoc(productRef)
    if (!snap.exists()) {
      await setDoc(productRef, {
        name: payload.name,
        creator: payload.creator,
        imageUrl: payload.imageUrl,
        category: payload.category,
        isbn: payload.isbn ?? '',
        janCode: payload.janCode ?? '',
        externalSource: payload.externalSource ?? '',
        ownerCount: 1,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(productRef, {
        name: payload.name,
        creator: payload.creator,
        imageUrl: payload.imageUrl,
        category: payload.category,
        ownerCount: increment(1),
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
  isDigital?: boolean
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

    const productId = await syncToProductsDB(payload)

    await addDoc(itemsRef(uid), {
      name: payload.name,
      creator: payload.creator,
      imageUrl: payload.imageUrl,
      category: payload.category,
      ...(payload.isDigital ? { isDigital: true } : {}),
      status: 'owned',
      addedAt: new Date().toISOString().split('T')[0],
      ...(productId ? { productId } : {}),
    })
  },

  async archive(id: string, disposalMethod: NonNullable<ShelfItem['disposalMethod']>) {
    const uid = authState.user?.uid
    if (!uid) return
    await updateDoc(doc(db, 'users', uid, 'items', id), {
      status: 'archived',
      disposalMethod,
      archivedAt: new Date().toISOString().split('T')[0],
    })
  },

  async unarchive(id: string) {
    const uid = authState.user?.uid
    if (!uid) return
    await updateDoc(doc(db, 'users', uid, 'items', id), {
      status: 'owned',
      disposalMethod: deleteField(),
      archivedAt:     deleteField(),
    })
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
}
