import { reactive } from 'vue'
import {
  collection, getDocs, query, where, documentId,
  doc, addDoc, updateDoc, increment, serverTimestamp, orderBy,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { ItemCategory } from '../types'

export interface ProductRecord {
  id: string
  name: string
  creator: string
  imageUrl: string
  category: ItemCategory
  imageCount?: number        // ユーザー投稿画像の総枚数
  selectedImageUrl?: string  // 編集者が選択したメイン画像
}

export interface ProductImage {
  id: string
  url: string
  uploadedBy: string
  uploadedAt: string
}

// メモリキャッシュ（セッション中は再取得しない）
const cache = reactive(new Map<string, ProductRecord>())
const fetching = new Set<string>()

async function batchFetch(ids: string[]): Promise<void> {
  const needed = ids.filter(id => id && !cache.has(id) && !fetching.has(id))
  if (!needed.length) return

  needed.forEach(id => fetching.add(id))

  const chunks: string[][] = []
  for (let i = 0; i < needed.length; i += 10) {
    chunks.push(needed.slice(i, i + 10))
  }

  await Promise.all(chunks.map(async chunk => {
    try {
      const snap = await getDocs(
        query(collection(db, 'products'), where(documentId(), 'in', chunk))
      )
      snap.docs.forEach(d => {
        const data = d.data()
        cache.set(d.id, {
          id:               d.id,
          name:             (data.name             as string)      ?? '',
          creator:          (data.creator          as string)      ?? '',
          imageUrl:         (data.imageUrl         as string)      ?? '',
          category:         (data.category         as ItemCategory) ?? 'other',
          imageCount:       (data.imageCount        as number)      ?? 0,
          selectedImageUrl: (data.selectedImageUrl as string)      || undefined,
        })
      })
    } catch (e) {
      console.warn('productStore batchFetch error:', e)
    } finally {
      chunk.forEach(id => fetching.delete(id))
    }
  }))
}

export const productStore = {
  getById(id: string): ProductRecord | undefined {
    return cache.get(id)
  },

  prefetch(ids: string[]): Promise<void> {
    return batchFetch(ids.filter(Boolean))
  },

  // ユーザーが撮影した画像を商品DBのimagesサブコレクションに追加
  async contributeImage(productId: string, imageUrl: string, uploadedBy: string): Promise<void> {
    try {
      await addDoc(collection(db, 'products', productId, 'images'), {
        url: imageUrl,
        uploadedBy,
        uploadedAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'products', productId), {
        imageCount: increment(1),
      })
      // キャッシュ更新
      const cached = cache.get(productId)
      if (cached) {
        cache.set(productId, { ...cached, imageCount: (cached.imageCount ?? 0) + 1 })
      }
    } catch (e) {
      console.warn('contributeImage error:', e)
    }
  },

  // 編集者がメイン画像を選択
  async selectMainImage(productId: string, imageUrl: string): Promise<void> {
    await updateDoc(doc(db, 'products', productId), {
      selectedImageUrl: imageUrl,
    })
    const cached = cache.get(productId)
    if (cached) {
      cache.set(productId, { ...cached, selectedImageUrl: imageUrl })
    }
  },

  // 商品の画像一覧を取得
  async fetchImages(productId: string): Promise<ProductImage[]> {
    const snap = await getDocs(
      query(
        collection(db, 'products', productId, 'images'),
        orderBy('uploadedAt', 'desc'),
      )
    )
    return snap.docs.map(d => {
      const data = d.data()
      return {
        id:         d.id,
        url:        (data.url         as string) ?? '',
        uploadedBy: (data.uploadedBy  as string) ?? '',
        uploadedAt: data.uploadedAt?.toDate
          ? data.uploadedAt.toDate().toISOString().split('T')[0]
          : '',
      }
    })
  },
}
