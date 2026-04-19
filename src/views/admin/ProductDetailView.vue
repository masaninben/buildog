<template>
  <div class="detail-view">
    <div v-if="loading" class="state-msg">読み込み中…</div>
    <div v-else-if="!product" class="state-msg">商品が見つかりません</div>

    <template v-else>
      <div class="detail-header">
        <button class="back-btn" @click="router.push({ name: 'admin-products' })">← 一覧に戻る</button>
        <span v-if="!canEdit" class="readonly-badge">閲覧のみ</span>
      </div>

      <div class="detail-body">
        <!-- 画像エリア -->
        <div class="cover-section">
          <!-- メイン画像 -->
          <div class="cover-wrap">
            <img v-if="mainDisplayUrl" :src="mainDisplayUrl" class="cover-img" />
            <div v-else class="cover-empty">No Image</div>
          </div>
          <p v-if="product.selectedImageUrl" class="curated-label">✓ 編集者選択済み</p>

          <!-- 投稿ボタン（編集者のみ） -->
          <div v-if="canEdit" class="upload-area">
            <button v-if="!showPhotoUpload" class="upload-btn" @click="showPhotoUpload = true">
              📷 画像を投稿する
            </button>
            <div v-else class="photo-panel">
              <div class="photo-panel-header">
                <span class="photo-panel-title">画像を追加</span>
                <button class="photo-panel-close" @click="showPhotoUpload = false">✕</button>
              </div>
              <PhotoUpload
                :upload-path="`products/${product.id}`"
                @done="onPhotoDone"
                @cancel="showPhotoUpload = false"
              />
            </div>
          </div>

          <!-- 画像ギャラリー -->
          <div v-if="allGalleryImages.length > 0" class="gallery-section">
            <p class="gallery-title">画像 {{ allGalleryImages.length }}枚</p>
            <div class="gallery-grid">
              <div
                v-for="img in allGalleryImages"
                :key="img.id"
                class="gallery-item"
                :class="{ selected: product.selectedImageUrl === img.url }"
                @click="canEdit && selectImage(img.url)"
              >
                <img :src="img.url" class="gallery-img" />
                <div v-if="product.selectedImageUrl === img.url" class="gallery-check">✓</div>
                <span class="gallery-source">{{ img.source }}</span>
              </div>
            </div>
            <p v-if="canEdit" class="gallery-hint">画像をタップしてメインに設定</p>
          </div>
          <p v-else-if="imagesLoaded" class="gallery-empty">画像はまだありません</p>
        </div>

        <!-- 基本情報 -->
        <div class="info-section">
          <div class="field">
            <label class="field-label">商品名 <span class="required">*</span></label>
            <input v-model="form.name" class="field-input" type="text" :readonly="!canEdit" />
          </div>
          <div class="field">
            <label class="field-label">著者 / アーティスト / メーカー</label>
            <input v-model="form.creator" class="field-input" type="text" :readonly="!canEdit" />
          </div>
          <div class="field">
            <label class="field-label">カテゴリ</label>
            <input v-model="form.category" class="field-input" type="text"
              placeholder="本 / 音楽 / 家電 / カメラ / その他" :readonly="!canEdit" />
          </div>
          <div class="field">
            <label class="field-label">ブランド・メーカー</label>
            <input v-model="form.brand" class="field-input" type="text" :readonly="!canEdit" />
          </div>
          <div class="field">
            <label class="field-label">説明</label>
            <textarea v-model="form.description" class="field-textarea"
              placeholder="商品の説明…" :readonly="!canEdit" rows="3" />
          </div>

          <div class="identifiers">
            <p class="field-label">識別子</p>
            <div class="id-grid">
              <div class="field">
                <label class="field-label-sm">ISBN</label>
                <input v-model="form.isbn" class="field-input-sm" type="text" :readonly="!canEdit" />
              </div>
              <div class="field">
                <label class="field-label-sm">JAN / EAN</label>
                <input v-model="form.janCode" class="field-input-sm" type="text" :readonly="!canEdit" />
              </div>
              <div class="field">
                <label class="field-label-sm">外部ソース</label>
                <input v-model="form.externalSource" class="field-input-sm" type="text"
                  placeholder="googleBooks:xxx" :readonly="!canEdit" />
              </div>
            </div>
          </div>

          <!-- 統計（読み取り専用） -->
          <div class="stats-row">
            <div class="stat">
              <span class="stat-label">登録ユーザー数</span>
              <span class="stat-value">{{ product.ownerCount ?? 0 }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">追加日</span>
              <span class="stat-value">{{ product.createdAt ?? '—' }}</span>
            </div>
          </div>

          <div v-if="canEdit" class="actions">
            <button class="save-btn" :disabled="saving || !form.name.trim()" @click="save">
              {{ saving ? '保存中…' : '変更を保存' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { userProfileStore } from '../../store/userProfile'
import { productStore, type ProductImage } from '../../store/products'
import { authState } from '../../lib/auth'
import PhotoUpload from '../../components/PhotoUpload.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const canEdit = computed(() => userProfileStore.isEditor)
const showPhotoUpload = ref(false)

interface Product {
  id: string
  name: string
  creator?: string
  category?: string
  brand?: string
  imageUrl?: string
  selectedImageUrl?: string
  description?: string
  isbn?: string
  janCode?: string
  externalSource?: string
  ownerCount?: number
  createdAt?: string
}

const product = ref<Product | null>(null)
const form = reactive({
  name: '',
  creator: '',
  category: '',
  brand: '',
  description: '',
  isbn: '',
  janCode: '',
  externalSource: '',
})

const productImages = ref<ProductImage[]>([])
const imagesLoaded = ref(false)

const mainDisplayUrl = computed(() =>
  product.value?.selectedImageUrl ?? product.value?.imageUrl ?? ''
)

// ソースラベルの判定
function detectSource(externalSource?: string): string {
  if (!externalSource) return '手動'
  const s = externalSource.toLowerCase()
  if (s.includes('rakuten')) return '楽天'
  if (s.includes('google')) return 'Google'
  return '手動'
}

// 元画像 + 投稿画像をまとめたギャラリーリスト
const allGalleryImages = computed(() => {
  const list: Array<{ id: string; url: string; source: string }> = []
  if (product.value?.imageUrl) {
    list.push({
      id: '__original__',
      url: product.value.imageUrl,
      source: detectSource(product.value.externalSource),
    })
  }
  for (const img of productImages.value) {
    list.push({ id: img.id, url: img.url, source: '投稿' })
  }
  return list
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    const snap = await getDoc(doc(db, 'products', id))
    if (snap.exists()) {
      const data = snap.data()
      product.value = {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString().split('T')[0]
          : data.createdAt ?? '',
      } as Product
      Object.assign(form, {
        name:           product.value.name ?? '',
        creator:        product.value.creator ?? '',
        category:       product.value.category ?? '',
        brand:          product.value.brand ?? '',
        description:    product.value.description ?? '',
        isbn:           product.value.isbn ?? '',
        janCode:        product.value.janCode ?? '',
        externalSource: product.value.externalSource ?? '',
      })
      try {
        productImages.value = await productStore.fetchImages(id)
      } catch (e) {
        console.warn('fetchImages error:', e)
      } finally {
        imagesLoaded.value = true
      }
    }
  } catch (e) {
    console.error('ProductDetailView load error:', e)
  } finally {
    loading.value = false
  }
})

async function selectImage(url: string) {
  if (!product.value) return
  await productStore.selectMainImage(product.value.id, url)
  product.value.selectedImageUrl = url
}

async function onPhotoDone(url: string) {
  if (!product.value) return
  const uid = authState.user?.uid ?? 'admin'
  await productStore.contributeImage(product.value.id, url, uid)
  // ギャラリーを再取得
  try {
    productImages.value = await productStore.fetchImages(product.value.id)
  } catch (e) {
    console.warn('fetchImages error:', e)
  }
  showPhotoUpload.value = false
}

async function save() {
  if (!product.value || !form.name.trim()) return
  saving.value = true
  try {
    await updateDoc(doc(db, 'products', product.value.id), {
      ...form,
      updatedAt: serverTimestamp(),
    })
    Object.assign(product.value, form)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.detail-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 24px 64px;
}

.state-msg {
  text-align: center;
  padding: 48px 0;
  font-size: 13px;
  color: #b0a090;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #8b6914;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.readonly-badge {
  background: #f0ece4;
  color: #b0a090;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}

.detail-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  align-items: start;
}

@media (max-width: 640px) {
  .detail-view { padding: 16px 14px 64px; }
  .detail-body { grid-template-columns: 1fr; }
}

.cover-section { display: flex; flex-direction: column; gap: 10px; }

.cover-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #f0ece4;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-empty { font-size: 12px; color: #c0b8a8; }

.curated-label {
  font-size: 11px;
  color: #8b6914;
  font-weight: 600;
  text-align: center;
}

/* 投稿ボタン */
.upload-area { display: flex; flex-direction: column; }

.upload-btn {
  width: 100%;
  height: 36px;
  background: #fff;
  border: 1.5px dashed #c0b8a8;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: #8b6914;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.upload-btn:hover { border-color: #8b6914; background: #fdf8ee; }

.photo-panel {
  background: #faf8f4;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e8e0d0;
}

.photo-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.photo-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #8b6914;
}

.photo-panel-close {
  background: none;
  border: none;
  font-size: 15px;
  color: #b0a090;
  cursor: pointer;
  padding: 2px 4px;
}

/* ギャラリー */
.gallery-section { display: flex; flex-direction: column; gap: 8px; }

.gallery-title {
  font-size: 11px;
  color: #b0a090;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 0;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s;
  background: #f0ece4;
}
.gallery-item:hover { border-color: #8b6914; }
.gallery-item.selected { border-color: #8b6914; }

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: #8b6914;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-source {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  text-align: center;
  padding: 2px 4px;
  letter-spacing: 0.03em;
}

.gallery-hint {
  font-size: 10px;
  color: #c0b8a8;
  text-align: center;
  margin: 0;
}

.gallery-empty {
  font-size: 11px;
  color: #c0b8a8;
  text-align: center;
}

/* 基本情報 */
.info-section {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: 11px;
  color: #b0a090;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.required { color: #8b6914; margin-left: 2px; }

.field-input, .field-textarea {
  padding: 9px 12px;
  border: 1.5px solid #e0dbd0;
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  color: #2c2315;
  background: #faf8f4;
  outline: none;
  transition: border-color 0.15s;
  resize: none;
}
.field-input { height: 38px; }
.field-input:focus, .field-textarea:focus { border-color: #8b6914; }
.field-input[readonly], .field-textarea[readonly] {
  background: #f5f2ec;
  cursor: default;
}

.identifiers { display: flex; flex-direction: column; gap: 8px; }

.id-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

@media (max-width: 430px) {
  .id-grid { grid-template-columns: 1fr; }
}

.field-label-sm {
  font-size: 10px;
  color: #c0b8a8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.field-input-sm {
  height: 34px;
  padding: 0 10px;
  border: 1.5px solid #e0dbd0;
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: #2c2315;
  background: #faf8f4;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.field-input-sm:focus { border-color: #8b6914; }
.field-input-sm[readonly] { background: #f5f2ec; cursor: default; }

.stats-row {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #f0ece4;
}

.stat { display: flex; flex-direction: column; gap: 3px; }
.stat-label { font-size: 10px; color: #b0a090; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 15px; font-weight: 600; color: #2c2315; }

.actions { margin-top: 4px; }

.save-btn {
  width: 100%;
  height: 44px;
  background: #8b6914;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.save-btn:hover:not(:disabled) { background: #70530f; }
.save-btn:disabled { opacity: 0.4; cursor: default; }
</style>
