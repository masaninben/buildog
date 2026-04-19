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
            <p class="title">{{ displayName }}</p>
            <p class="creator">{{ displayCreator }}</p>

            <div class="meta">
              <div class="meta-row">
                <span class="meta-label">追加日</span>
                <span class="meta-value">{{ item.addedAt }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">ステータス</span>
                <span class="meta-value" :class="item.status === 'owned' ? 'status-owned' : 'status-archived'">
                  {{ item.status === 'owned' ? '所有中' : '手放し済み' }}
                </span>
              </div>
              <template v-if="item.status === 'archived'">
                <div class="meta-row">
                  <span class="meta-label">手放した日</span>
                  <span class="meta-value">{{ item.archivedAt }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">手放し方</span>
                  <span class="meta-value">{{ disposalLabel(item.disposalMethod) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 右カラム: マップ → 手放し → アシスト → メモ -->
        <div class="col-right">
          <!-- 所有分布マップ -->
          <div class="map-card">
            <div class="map-header">
              <span class="map-title">所有分布マップ</span>
            </div>
            <OwnershipMap :product-id="item.productId" />
          </div>

          <!-- アクション -->
          <div class="action-card">
            <template v-if="item.status === 'owned'">
              <p class="action-label">手放し方を記録する</p>
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
              <button class="unarchive-btn" @click="store.unarchive(item.id)">
                所有に戻す
              </button>
            </template>
          </div>

          <!-- 手放しアシスト -->
          <div class="assist-card">
            <div class="assist-header">
              <span class="assist-icon">🔄</span>
              <span class="assist-title">手放しアシスト</span>
              <span class="assist-badge">準備中</span>
            </div>
            <p class="assist-desc">
              捨て方・売り方・譲り方を、この商品とあなたの居住地に合わせて案内します。
            </p>
            <div class="assist-chips">
              <span class="assist-chip">自治体の廃棄方法</span>
              <span class="assist-chip">再販価格相場</span>
              <span class="assist-chip">寄付・リユース先</span>
            </div>
          </div>

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
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../store/shelf'
import { productStore } from '../store/products'
import { authState } from '../lib/auth'
import PhotoUpload from '../components/PhotoUpload.vue'
import OwnershipMap from '../components/OwnershipMap.vue'
import type { ShelfItem } from '../types'

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
  product.value?.name ?? item.value?.name ?? ''
)
const displayCreator = computed(() =>
  product.value?.creator ?? item.value?.creator ?? ''
)

const imgFailed = ref(false)
const showPhotoUpload = ref(false)
const showDeleteConfirm = ref(false)

const methods: { value: NonNullable<ShelfItem['disposalMethod']>; label: string; desc: string }[] = [
  { value: 'resale',   label: '再販売',   desc: '売る・フリマ・買取' },
  { value: 'gift',     label: '譲渡',     desc: '知人・家族に渡す' },
  { value: 'donation', label: '寄付',     desc: '団体・施設へ' },
  { value: 'disposal', label: '廃棄',     desc: '捨てる・処分する' },
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
  max-width: 900px;
  margin: 0 auto;
  padding: 12px 16px 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-cols {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* モバイル: 画像と情報を横並び */
.col-left {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
}
.col-left .cover-card {
  width: 110px;
  flex-shrink: 0;
}
.col-left .info-card {
  flex: 1;
  min-width: 0;
}

.col-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (min-width: 700px) {
  .detail-cols {
    flex-direction: row;
    align-items: flex-start;
    gap: 20px;
  }
  .col-left {
    width: 200px;
    flex-shrink: 0;
    flex-direction: column;
  }
  .col-left .cover-card {
    width: auto;
  }
  .col-left .info-card {
    flex: none;
  }
  .col-right {
    flex: 1;
    min-width: 0;
  }
}

.cover-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
}

.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: var(--bg-surface);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  padding: 10px;
  box-sizing: border-box;
}
.cover-wrap:hover .cover-camera-hint { opacity: 1; }

.cover-img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }

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
  padding: 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
  margin-bottom: 4px;
}

.creator {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.meta { border-top: 1px solid var(--border-subtle); }

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-faint);
  font-size: 13px;
}

.meta-label { color: var(--text-faint); }
.meta-value { color: var(--text); font-weight: 500; }
.status-owned { color: var(--accent); }
.status-archived { color: var(--text-muted); }

.assist-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
  border-left: 3px solid var(--warning);
}

.assist-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.assist-icon { font-size: 18px; }

.assist-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  flex: 1;
}

.assist-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--warning);
  background: var(--warning-bg);
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: 0.04em;
}

.assist-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 12px;
}

.assist-chips { display: flex; gap: 6px; flex-wrap: wrap; }

.assist-chip {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-bg);
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.action-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
  border-left: 3px solid var(--accent);
}

.action-label {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.method-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--bg-subtle);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.method-btn:hover { border-color: var(--border-accent); background: var(--accent-bg-dim); }

.method-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.method-desc {
  font-size: 10px;
  color: var(--text-faint);
  line-height: 1.3;
}

.unarchive-btn {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--text-muted);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.unarchive-btn:hover { background: var(--bg-surface); color: var(--text-sub); }

.memo-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 16px 20px;
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

/* 所有分布マップ */
.map-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
}

.map-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.map-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.not-found {
  padding: 40px;
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
}

@media (max-width: 430px) {
  .detail-main { padding: 8px 12px 80px; }
  .info-card, .action-card, .memo-card, .assist-card { padding: 16px; }
  .title { font-size: 16px; }
}
</style>
