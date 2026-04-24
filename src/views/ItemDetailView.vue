<template>
  <div class="detail-view" :class="{ archived: item?.status === 'archived' }">
    <!-- ページ内ヘッダー（戻るボタンのみ） -->
    <div class="page-header">
      <button class="back-btn" @click="router.back()">←</button>
    </div>

    <div v-if="item" class="detail-main">

      <div class="detail-cols">
        <!-- 左カラム: 画像 + 基本情報 -->
        <div class="col-left">
          <!-- 表紙 -->
          <div class="cover-card">
            <div class="cover-wrap" @click="showPhotoUpload = true">
              <img
                v-if="!imgFailed && displayImageUrl"
                :src="displayImageUrl"
                :alt="displayName"
                class="cover-img"
                @error="imgFailed = true"
                @load="onImgLoad"
              />
              <span v-else class="cover-fallback">{{ displayName }}</span>
              <div class="cover-camera-hint">📷</div>
            </div>

            <!-- 画像引用元 -->
            <p v-if="imageSource" class="img-source">出典: {{ imageSource }}</p>

            <div v-if="showPhotoUpload" class="photo-panel">
              <div class="photo-panel-header">
                <span class="photo-panel-title">画像を変更</span>
                <button class="photo-panel-close" @click="showPhotoUpload = false">✕</button>
              </div>
              <PhotoUpload
                :upload-path="`users/${uid}/items/${item.id}`"
                @done="onPhotoDone"
                @cancel="showPhotoUpload = false"
              />
            </div>
          </div>

          <!-- 基本情報 -->
          <div class="info-card">
            <!-- 編集可能タイトル -->
            <textarea
              ref="titleEl"
              class="title-edit"
              :value="editName"
              rows="1"
              maxlength="300"
              @input="onNameInput"
            />

            <!-- 著者・クリエイター（編集可能） -->
            <input
              class="creator-edit"
              type="text"
              :value="editCreator"
              placeholder="著者 / アーティスト / メーカー"
              maxlength="200"
              @input="onCreatorInput"
            />

            <!-- カテゴリ（編集可能） -->
            <select class="category-select" :value="editCategory" @change="onCategoryChange">
              <option v-for="(label, val) in CATEGORY_LABELS" :key="val" :value="val">
                {{ CATEGORY_EMOJI[val as ItemCategory] }} {{ label }}
              </option>
            </select>

            <div class="meta">
              <!-- 取得日（初期値 = 追加日） -->
              <div class="meta-field">
                <span class="meta-label">取得日</span>
                <input type="date" class="meta-date-input" :value="editAcquiredAt" @change="onAcquiredAtChange" />
              </div>

              <!-- ステータス -->
              <div class="meta-row">
                <span class="meta-label">ステータス</span>
                <span class="meta-value" :class="item.status === 'owned' ? 'status-owned' : 'status-archived'">
                  {{ item.status === 'owned' ? '所有中' : '手放し済み' }}
                </span>
              </div>

              <!-- 手放し日（所有中は読み取り専用） -->
              <div class="meta-field">
                <span class="meta-label">手放した日</span>
                <input
                  type="date"
                  class="meta-date-input"
                  :value="editArchivedAt"
                  :disabled="item.status === 'owned'"
                  @change="onArchivedAtChange"
                />
              </div>

              <!-- 手放し方（アーカイブ済みのみ） -->
              <div v-if="item.status === 'archived'" class="meta-row">
                <span class="meta-label">手放し方</span>
                <span class="meta-value">{{ disposalLabel(item.disposalMethod) }}</span>
              </div>

              <!-- 取得金額 -->
              <div class="meta-field">
                <span class="meta-label">取得金額</span>
                <div class="price-wrap">
                  <span class="price-prefix">¥</span>
                  <input type="number" class="meta-price-input" :value="editAcquirePrice" min="0" placeholder="未記録" @input="e => onPriceInput('acquirePrice', e)" />
                </div>
              </div>

              <!-- 売却金額（所有中は読み取り専用） -->
              <div class="meta-field">
                <span class="meta-label">売却金額</span>
                <div class="price-wrap">
                  <span class="price-prefix">¥</span>
                  <input
                    type="number"
                    class="meta-price-input"
                    :value="editSellPrice"
                    min="0"
                    placeholder="未記録"
                    :disabled="item.status === 'owned'"
                    @input="e => onPriceInput('sellPrice', e)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右カラム: マップ → 手放し → アシスト → メモ -->
        <div class="col-right">
          <!-- 所有分布マップ -->
          <div class="map-card">
            <div class="map-header">
              <span class="map-title">所有分布マップ</span>
              <button
                v-if="item.productId"
                class="map-privacy-btn"
                :class="{ 'map-privacy-btn--hidden': !mapVisible }"
                @click="toggleMapVisibility"
              >
                {{ mapVisible ? '👁 公開中' : '🔒 非公開' }}
              </button>
            </div>
            <p v-if="item.productId" class="map-privacy-hint">
              高額商品など居住地の公開が不安な場合は非表示に。自分の位置情報のみ非公開になります。
            </p>
            <OwnershipMap :product-id="item.productId" />
          </div>

          <!-- 公開棚スイッチ（所有中のみ） -->
          <div v-if="item.status === 'owned'" class="public-card">
            <div class="public-row">
              <div class="public-label-wrap">
                <span class="public-label">公開棚に含める</span>
                <span class="public-hint">共有URLでこのアイテムを公開します</span>
              </div>
              <button
                class="toggle-switch"
                :class="{ on: pubVisible }"
                @click="togglePublicVisibility"
                :aria-label="pubVisible ? '公開中' : '非公開'"
              >
                <span class="toggle-thumb" />
              </button>
            </div>
          </div>

          <!-- アクション -->
          <div class="action-card">
            <template v-if="item.status === 'owned'">
              <div class="action-header">
                <p class="action-label">手放し方を記録する</p>
                <p class="action-sublabel">ステータスが「手放し済み」になります。一覧からは消えません。</p>
              </div>
              <div class="method-grid">
                <button
                  v-for="m in methods"
                  :key="m.value"
                  class="method-btn"
                  @click="confirmArchive(m.value)"
                >
                  <span class="method-name">{{ m.label }}</span>
                  <span class="method-desc">{{ m.desc }}</span>
                </button>
              </div>
            </template>

            <template v-else>
              <div class="disposal-log">
                <span class="disposal-log-method">{{ disposalLabel(item.disposalMethod) }}</span>
                <span v-if="item.archivedAt" class="disposal-log-date">{{ item.archivedAt }}</span>
              </div>
              <button class="unarchive-btn" @click="store.unarchive(item.id)">
                所有に戻す
              </button>
            </template>
          </div>

          <!-- 手放しアシスト -->
          <DisposalAssist
            :product-id="item.productId"
            :name="displayName"
            :category="product?.category ?? item.category"
            :user-disposal-method="item.disposalMethod"
          />

          <!-- メモ -->
          <div class="memo-card">
            <p class="section-label">メモ</p>
            <textarea
              class="memo-input"
              placeholder="メモを追加…"
              :value="item.notes ?? ''"
              @input="store.updateNotes(item.id, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>
      </div>

      <!-- 削除 -->
      <div class="danger-zone">
        <button class="delete-btn" @click="handleDelete">
          このアイテムを削除する
        </button>
      </div>

    </div>

    <div v-else class="not-found">アイテムが見つかりません</div>

    <!-- 削除確認ダイアログ -->
    <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="showDeleteConfirm = false">
      <div class="confirm-card">
        <p class="confirm-title">削除しますか？</p>
        <p class="confirm-desc">この操作は取り消せません。</p>
        <div class="confirm-actions">
          <button class="confirm-cancel" @click="showDeleteConfirm = false">キャンセル</button>
          <button class="confirm-delete" @click="doDelete">削除する</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../store/shelf'
import { productStore } from '../store/products'
import { authState } from '../lib/auth'
import PhotoUpload from '../components/PhotoUpload.vue'
import OwnershipMap from '../components/OwnershipMap.vue'
import DisposalAssist from '../components/DisposalAssist.vue'
import type { ShelfItem, ItemCategory } from '../types'
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '../types'

const route = useRoute()
const router = useRouter()

const item = computed(() => store.getById(route.params.id as string))
const uid = computed(() => authState.user?.uid ?? '')

const product = computed(() =>
  item.value?.productId ? productStore.getById(item.value.productId) : undefined
)
const displayImageUrl = computed(() =>
  product.value?.selectedImageUrl
  ?? item.value?.customImageUrl
  ?? product.value?.imageUrl
  ?? item.value?.imageUrl
  ?? ''
)
const displayName = computed(() =>
  item.value?.name || product.value?.name || ''
)
// 画像引用元の判定（カスタム画像・管理者選定画像は表示しない）
const imageSource = computed(() => {
  const url = displayImageUrl.value
  if (!url) return null
  // ユーザーアップロード（Firebase Storage）は非表示
  if (url.includes('firebasestorage.googleapis.com')) return null
  // 管理者が選定した selectedImageUrl でも URL ベースで判定
  if (url.includes('books.google.com') || url.includes('googlebooks') || url.includes('googleapis.com/books'))
    return 'Google Books'
  if (url.includes('rakuten') || url.includes('r10s.jp'))
    return '楽天'
  if (url.includes('amazon.co.jp') || url.includes('media-amazon.com') || url.includes('ssl-images-amazon'))
    return 'Amazon'
  if (url.includes('ndl.go.jp'))
    return '国立国会図書館'
  if (url.includes('openbd.jp') || url.includes('openbd'))
    return 'openBD'
  if (url.includes('yahoo.co.jp') || url.includes('yimg.jp'))
    return 'Yahoo!'
  return null
})

const imgFailed = ref(false)
const showPhotoUpload = ref(false)
const showDeleteConfirm = ref(false)
const titleEl = ref<HTMLTextAreaElement | null>(null)

// ---- 編集フィールド ----
const editName        = ref('')
const editCreator     = ref('')
const editCategory    = ref<ItemCategory>('other')
const editAcquiredAt  = ref('')
const editArchivedAt  = ref('')
const editAcquirePrice = ref('')
const editSellPrice   = ref('')

watch(() => item.value, (v) => {
  if (!v) return
  editName.value         = v.name                        ?? ''
  editCreator.value      = v.creator                     ?? ''
  editCategory.value     = v.category                    ?? 'other'
  editAcquiredAt.value   = v.acquiredAt   ?? v.addedAt   ?? ''
  editArchivedAt.value   = v.archivedAt                  ?? ''
  editAcquirePrice.value = v.acquirePrice != null ? String(v.acquirePrice) : ''
  editSellPrice.value    = v.sellPrice    != null ? String(v.sellPrice)    : ''
  // タイトル textarea の高さを初期化
  nextTick(() => resizeTitleEl())
}, { immediate: true })

// titleEl がマウントされた後も高さを合わせる
watch(titleEl, () => resizeTitleEl())

function resizeTitleEl() {
  const el = titleEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function onNameInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
  editName.value = el.value
  if (!item.value) return
  store.updateItemFieldsDebounced(item.value.id, { name: el.value })
}

function onCreatorInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  editCreator.value = val
  if (!item.value) return
  store.updateItemFieldsDebounced(item.value.id, { creator: val })
}

function onCategoryChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value as ItemCategory
  editCategory.value = val
  if (!item.value) return
  store.updateItemFields(item.value.id, { category: val })
}

function onAcquiredAtChange(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!item.value) return
  store.updateItemFields(item.value.id, { acquiredAt: val || undefined })
}

function onArchivedAtChange(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!item.value) return
  store.updateItemFields(item.value.id, { archivedAt: val || undefined })
}

function onPriceInput(field: 'acquirePrice' | 'sellPrice', e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (field === 'acquirePrice') editAcquirePrice.value = raw
  else editSellPrice.value = raw
  const num = raw === '' ? undefined : parseInt(raw, 10)
  if (!item.value) return
  store.updateItemFieldsDebounced(item.value.id, { [field]: isNaN(num ?? NaN) ? undefined : num })
}

// ---- 公開棚スイッチ ----
const pubVisible = computed(() => item.value?.showOnPublic !== false)

function togglePublicVisibility() {
  if (!item.value) return
  store.updatePublicVisibility(item.value.id, !pubVisible.value)
}

// ---- マッププライバシー ----
const mapVisible = computed(() => item.value?.showOnMap !== false)

function toggleMapVisibility() {
  if (!item.value) return
  store.updateMapVisibility(item.value.id, !mapVisible.value)
}

const methods: { value: NonNullable<ShelfItem['disposalMethod']>; label: string; desc: string }[] = [
  { value: 'resale',   label: '再販売',   desc: 'フリマ・買取' },
  { value: 'gift',     label: '譲渡',     desc: '知人・家族へ' },
  { value: 'donation', label: '寄付',     desc: '団体・施設へ' },
  { value: 'recycle',  label: 'リサイクル', desc: '再資源化' },
  { value: 'disposal', label: '廃棄',     desc: '捨てる' },
]

function disposalLabel(method: ShelfItem['disposalMethod']) {
  return methods.find(m => m.value === method)?.label ?? '—'
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth < 10) imgFailed.value = true
}

function confirmArchive(method: NonNullable<ShelfItem['disposalMethod']>) {
  if (!item.value) return
  store.archive(item.value.id, method)
}

async function onPhotoDone(url: string) {
  if (!item.value) return
  await store.updateItemImage(item.value.id, url)
  if (item.value.productId && uid.value) {
    productStore.contributeImage(item.value.productId, url, uid.value)
  }
  imgFailed.value = false
  showPhotoUpload.value = false
}

function handleDelete() {
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!item.value) return
  await store.removeItem(item.value.id)
  showDeleteConfirm.value = false
  router.replace({ name: 'shelf' })
}
</script>

<style scoped>
.detail-view {
  min-height: 100vh;
  background: var(--bg);
}
.detail-view.archived { filter: grayscale(40%); }

.page-header { padding: 8px 16px 0; }

.back-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--accent);
  cursor: pointer;
  padding: 4px 8px 4px 0;
  font-family: inherit;
  line-height: 1;
}

.detail-main {
  max-width: 1060px;
  margin: 0 auto;
  padding: 6px 8px 80px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 常に横並び（モバイルは小さい左カラム） */
.detail-cols {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
}

.col-left {
  width: 130px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.col-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 600px) {
  .detail-main { padding: 8px 16px 80px; }
  .detail-cols { gap: 14px; }
  .col-left { width: 220px; gap: 12px; }
  .col-right { gap: 12px; }
}

.cover-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 8px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
}

.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #ffffff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  padding: 4px;
  box-sizing: border-box;
}
.cover-wrap:hover .cover-camera-hint { opacity: 1; }

.cover-img { width: 100%; height: 100%; object-fit: contain; display: block; }

.cover-fallback {
  font-size: 14px;
  color: var(--accent);
  font-weight: 500;
  text-align: center;
  padding: 16px;
  line-height: 1.6;
}

.cover-camera-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 18px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

/* 画像引用元ラベル */
.img-source {
  font-size: 9px;
  color: var(--text-faint);
  text-align: right;
  margin-top: 5px;
  letter-spacing: 0.03em;
}

.photo-panel {
  margin-top: 14px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 14px;
}

.photo-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.photo-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
}

.photo-panel-close {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-faint);
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
}

.info-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
}

/* 編集可能タイトル */
.title-edit {
  width: 100%;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.5;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid var(--border-subtle);
  outline: none;
  resize: none;
  font-family: inherit;
  padding: 0 0 5px;
  margin-bottom: 6px;
  overflow: hidden;
  transition: border-color 0.15s;
  display: block;
}
.title-edit:focus { border-bottom-color: var(--accent); }

/* 著者・クリエイター編集 */
.creator-edit {
  width: 100%;
  font-size: 12px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--border-faint);
  outline: none;
  font-family: inherit;
  padding: 0 0 4px;
  margin-bottom: 6px;
  transition: border-color 0.15s;
  display: block;
  box-sizing: border-box;
}
.creator-edit:focus { border-bottom-color: var(--accent); color: var(--text); }
.creator-edit::placeholder { color: var(--text-placeholder); }

/* カテゴリ選択 */
.category-select {
  font-size: 11px;
  color: var(--text-faint);
  background: var(--bg-subtle);
  border: 1px solid var(--border-faint);
  border-radius: 20px;
  padding: 3px 10px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  margin-bottom: 12px;
  transition: border-color 0.15s;
  appearance: none;
  -webkit-appearance: none;
}
.category-select:focus { border-color: var(--accent); color: var(--text); }

.meta { border-top: 1px solid var(--border-subtle); }

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-faint);
  font-size: 13px;
}

.meta-label { color: var(--text-faint); flex-shrink: 0; }
.meta-value { color: var(--text); font-weight: 500; }
.status-owned { color: var(--accent); }
.status-archived { color: var(--text-muted); }

/* 縦積み編集フィールド */
.meta-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-faint);
}
.meta-field .meta-label {
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.meta-date-input {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-input);
  outline: none;
  transition: border-color 0.15s;
  color-scheme: dark;
}
.meta-date-input:focus { border-color: var(--accent); }
.meta-date-input:disabled { opacity: 0.38; cursor: not-allowed; }
[data-theme="light"] .meta-date-input { color-scheme: light; }

.price-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-prefix {
  font-size: 13px;
  color: var(--text-faint);
  flex-shrink: 0;
}

.meta-price-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-input);
  outline: none;
  transition: border-color 0.15s;
}
.meta-price-input:focus { border-color: var(--accent); }
.meta-price-input:disabled { opacity: 0.38; cursor: not-allowed; }
.meta-price-input::-webkit-inner-spin-button,
.meta-price-input::-webkit-outer-spin-button { -webkit-appearance: none; }


.public-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-faint);
}

.public-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.public-label-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.public-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.public-hint {
  font-size: 10px;
  color: var(--text-faint);
}

.toggle-switch {
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: 13px;
  border: none;
  background: var(--border);
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  position: relative;
}
.toggle-switch.on { background: var(--accent); }

.toggle-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 0.2s;
  display: block;
}
.toggle-switch.on .toggle-thumb { transform: translateX(18px); }

.action-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow-md);
  border: 2px solid rgba(197, 140, 20, 0.45);
}

.action-header { margin-bottom: 10px; }

.action-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.02em;
  margin-bottom: 3px;
}

.action-sublabel {
  font-size: 11px;
  color: var(--text-faint);
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

@media (min-width: 600px) {
  .method-grid { grid-template-columns: repeat(5, 1fr); }
}

.method-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 4px;
  border: 1px solid rgba(160,148,128,0.45);
  border-radius: 6px;
  /* ダークモード: パール象牙＋光沢 */
  background: linear-gradient(180deg,
    #faf6ee 0%,
    #ece5d9 22%,
    #d6cfc3 58%,
    #c5beb2 100%
  );
  box-shadow:
    0 3px 0 #98928a,
    0 5px 14px rgba(0,0,0,0.13),
    inset 0 2px 0 rgba(255,255,255,0.95),
    inset 0 0 10px rgba(255,248,230,0.4),
    inset 0 -1px 0 rgba(0,0,0,0.07);
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  transition: box-shadow 0.08s, transform 0.08s, filter 0.08s;
  outline: none;
}
.method-btn:hover {
  filter: brightness(1.05);
  box-shadow:
    0 3px 0 #98928a,
    0 6px 16px rgba(0,0,0,0.11),
    inset 0 2px 0 rgba(255,255,255,0.98),
    inset 0 0 12px rgba(255,248,230,0.5),
    inset 0 -1px 0 rgba(0,0,0,0.06);
}
/* キーを押し込む感覚 */
.method-btn:active {
  transform: translateY(3px);
  filter: brightness(0.96);
  box-shadow:
    0 0 0 #98928a,
    0 2px 4px rgba(0,0,0,0.09),
    inset 0 2px 5px rgba(0,0,0,0.1);
}

.method-name {
  font-size: 11px;
  font-weight: 600;
  color: #1e1608;
  line-height: 1;
  text-shadow: 0 1px 1px rgba(255,255,255,0.7);
  letter-spacing: 0.01em;
}

.method-desc {
  font-size: 8px;
  color: rgba(30,22,8,0.5);
  line-height: 1.3;
}

/* ライトモード: ウォームブラウン＋ゴールド光沢 */
[data-theme="light"] .method-btn {
  border: 1px solid rgba(200,160,40,0.28);
  background: linear-gradient(180deg,
    #7a6035 0%,
    #634e28 25%,
    #4e3d1e 55%,
    #3e3018 100%
  );
  box-shadow:
    0 3px 0 #28200e,
    0 5px 14px rgba(0,0,0,0.3),
    inset 0 1.5px 0 rgba(255,218,80,0.45),
    inset 0 0 10px rgba(180,130,20,0.1),
    inset 0 -1px 0 rgba(0,0,0,0.3);
}
[data-theme="light"] .method-btn:hover {
  filter: brightness(1.18);
  box-shadow:
    0 3px 0 #28200e,
    0 6px 16px rgba(0,0,0,0.28),
    inset 0 1.5px 0 rgba(255,218,80,0.58),
    inset 0 0 12px rgba(180,130,20,0.13),
    inset 0 -1px 0 rgba(0,0,0,0.25);
}
[data-theme="light"] .method-btn:active {
  transform: translateY(3px);
  filter: brightness(0.85);
  box-shadow:
    0 0 0 #28200e,
    0 2px 4px rgba(0,0,0,0.25),
    inset 0 2px 5px rgba(0,0,0,0.3);
}
[data-theme="light"] .method-name {
  color: #faf0d0;
  text-shadow: 0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(220,180,60,0.2);
}
[data-theme="light"] .method-desc {
  color: rgba(250,240,200,0.55);
}

.disposal-log {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-surface);
  border-radius: 8px;
  border: 1px solid var(--border-faint);
  margin-bottom: 8px;
}
.disposal-log-method {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}
.disposal-log-date {
  font-size: 11px;
  color: var(--text-faint);
}

.unarchive-btn {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1.5px solid var(--accent);
  color: var(--accent);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.unarchive-btn:hover {
  background: rgba(201,148,42,0.12);
  color: var(--accent);
}

.memo-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
}

.section-label {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 0.06em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.memo-input {
  width: 100%;
  min-height: 80px;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  color: var(--text);
  font-family: inherit;
  line-height: 1.6;
  background: transparent;
}
.memo-input::placeholder { color: var(--text-placeholder); }

.danger-zone {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--text-faint);
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  padding: 4px 8px;
  transition: color 0.15s;
}
.delete-btn:hover { color: var(--danger); }

.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirm-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 28px 24px;
  width: 100%;
  max-width: 320px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  text-align: center;
}

.confirm-desc {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.confirm-cancel,
.confirm-delete {
  flex: 1;
  height: 42px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.confirm-cancel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-sub);
}
.confirm-cancel:hover { background: var(--bg-hover); }

.confirm-delete {
  background: var(--danger);
  border: none;
  color: #fff;
}
.confirm-delete:hover { opacity: 0.85; }

/* ── 独自機能カード共通ボーダー色 ──────────────────── */
:deep(.da-card) {
  border: 2px solid rgba(197, 140, 20, 0.45) !important;
}

.map-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow-md);
  border: 2px solid rgba(197, 140, 20, 0.45);
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.map-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.map-privacy-btn {
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text-sub);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  flex-shrink: 0;
}
.map-privacy-btn:hover { border-color: var(--accent); color: var(--accent); }
.map-privacy-btn--hidden { border-color: var(--warning); color: var(--warning); background: var(--warning-bg); }

.map-privacy-hint {
  font-size: 10px;
  color: var(--text-faint);
  line-height: 1.5;
  margin-bottom: 10px;
}

.not-found {
  padding: 40px;
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
}

@media (max-width: 360px) {
  .method-grid { gap: 4px; }
  .method-btn { padding: 8px 2px; }
  .method-name { font-size: 10px; }
  .method-desc { display: none; }
}
</style>
