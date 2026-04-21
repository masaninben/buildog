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
        <!-- ── 左カラム: 画像 ───────────────── -->
        <div class="cover-section">
          <div class="cover-wrap">
            <img v-if="mainDisplayUrl" :src="mainDisplayUrl" class="cover-img" />
            <div v-else class="cover-empty">No Image</div>
          </div>
          <p v-if="product.selectedImageUrl" class="curated-label">✓ 編集者選択済み</p>
          <p v-if="imgSource" class="img-source">出典: {{ imgSource }}</p>

          <!-- 画像投稿（編集者のみ） -->
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

          <!-- ギャラリー -->
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
            <p v-if="canEdit" class="gallery-hint">タップしてメインに設定</p>
          </div>
          <p v-else-if="imagesLoaded" class="gallery-empty">画像はまだありません</p>
        </div>

        <!-- ── 右カラム ────────────────────── -->
        <div class="right-col">

          <!-- ════ 編集ブロック ════ -->
          <div class="block edit-block">
            <div class="block-header">
              <span class="block-title">マスターデータ</span>
              <span class="block-badge edit">編集</span>
            </div>

            <!-- 商品名 -->
            <div class="field">
              <label class="field-label">商品名 <span class="required">*</span></label>
              <input v-model="form.name" class="field-input" type="text" :readonly="!canEdit" />
              <!-- ユーザー候補タイトル -->
              <div v-if="nameCandidates.length > 0" class="candidates-wrap">
                <span class="candidates-hint">ユーザー候補：</span>
                <button
                  v-for="c in nameCandidates"
                  :key="c"
                  class="candidate-chip"
                  :class="{ 'candidate-chip--active': form.name === c }"
                  @click="canEdit && (form.name = c)"
                >{{ c }}</button>
              </div>
            </div>

            <!-- 著者 / クリエイター -->
            <div class="field">
              <label class="field-label">著者 / アーティスト / メーカー</label>
              <input v-model="form.creator" class="field-input" type="text"
                placeholder="著者名・アーティスト名・メーカー名" :readonly="!canEdit" />
            </div>

            <!-- カテゴリ（選択式） -->
            <div class="field">
              <label class="field-label">カテゴリ</label>
              <select v-if="canEdit" v-model="form.category" class="field-select">
                <option v-for="(label, val) in CATEGORY_LABELS" :key="val" :value="val">
                  {{ CATEGORY_EMOJI[val as ItemCategory] }} {{ label }}
                </option>
              </select>
              <input v-else :value="categoryDisplayLabel" class="field-input" readonly />
            </div>

            <!-- 発行年 -->
            <div class="field">
              <label class="field-label">発行 / 発売年</label>
              <input v-model="form.publishedYear" class="field-input" type="text"
                placeholder="例: 2023" maxlength="4" :readonly="!canEdit" />
            </div>

            <!-- 概要（SEO用） -->
            <div class="field">
              <label class="field-label">概要・説明</label>
              <textarea v-model="form.description" class="field-textarea"
                placeholder="商品の説明（検索エンジンに表示される内容）…" :readonly="!canEdit" rows="4" />
            </div>

            <!-- タグ -->
            <div class="field">
              <label class="field-label">タグ <span class="field-hint">コンマ区切り</span></label>
              <input v-model="form.tagsRaw" class="field-input" type="text"
                placeholder="例: SF, 小説, 村上春樹" :readonly="!canEdit" />
              <div v-if="parsedTags.length" class="tag-preview">
                <span v-for="t in parsedTags" :key="t" class="tag-chip">{{ t }}</span>
              </div>
            </div>

            <!-- 識別子 -->
            <div class="field identifiers">
              <label class="field-label">識別子</label>
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
                  <label class="field-label-sm">外部ソース ID</label>
                  <input v-model="form.externalSource" class="field-input-sm" type="text"
                    placeholder="googleBooks:xxx" :readonly="!canEdit" />
                </div>
              </div>
            </div>

            <div v-if="canEdit" class="actions">
              <button class="save-btn" :disabled="saving || !form.name.trim()" @click="save">
                {{ saving ? '保存中…' : '変更を保存' }}
              </button>
              <!-- 最終更新タイムスタンプ -->
              <p v-if="lastSavedLabel" class="save-timestamp">最終更新: {{ lastSavedLabel }}</p>
              <!-- 更新履歴（最新5件） -->
              <div v-if="saveHistory.length > 1" class="save-history">
                <p class="save-history-title">更新履歴</p>
                <div class="save-history-list">
                  <div
                    v-for="(h, i) in [...saveHistory].reverse().slice(0, 5)"
                    :key="i"
                    class="save-history-row"
                  >
                    <span class="save-history-at">{{ formatSavedAt(h.at) }}</span>
                    <span class="save-history-uid">{{ h.uid.slice(0, 8) }}…</span>
                  </div>
                </div>
              </div>
            </div>
          </div><!-- /edit-block -->

          <!-- ════ 分析ブロック ════ -->
          <div class="block analysis-block">
            <div class="block-header">
              <span class="block-title">分析・インサイト</span>
              <span class="block-badge analysis">統計</span>
            </div>

            <!-- 数値サマリー -->
            <div class="stats-row">
              <div class="stat">
                <span class="stat-label">所有者数</span>
                <span class="stat-value">{{ product.ownerCount ?? 0 }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">マップ表示</span>
                <span class="stat-value">{{ mapVisibleCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">非公開</span>
                <span class="stat-value">{{ product.hiddenFromMapCount ?? 0 }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">平均所有期間</span>
                <span class="stat-value">{{ avgOwnershipLabel }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">登録日</span>
                <span class="stat-value stat-value--sm">{{ product.createdAt ?? '—' }}</span>
              </div>
            </div>

            <!-- 手放し方の内訳 -->
            <div v-if="hasDisposalData" class="disposal-chart">
              <p class="chart-label">手放し方の内訳</p>
              <div class="disposal-bars">
                <div v-for="d in disposalItems" :key="d.key" class="disposal-row">
                  <span class="disposal-name">{{ d.label }}</span>
                  <div class="disposal-bar-wrap">
                    <div class="disposal-bar" :style="{ width: d.pct + '%', background: d.color }" />
                  </div>
                  <span class="disposal-count">{{ d.count }}</span>
                </div>
              </div>
            </div>

            <!-- 所有者数推移グラフ -->
            <div class="trend-chart">
              <p class="chart-label">所有者数の推移</p>
              <div v-if="sparklinePoints.length >= 2" class="sparkline-wrap">
                <svg class="sparkline-svg" viewBox="0 0 260 60" preserveAspectRatio="none">
                  <!-- グリッド線 -->
                  <line x1="0" y1="56" x2="260" y2="56" stroke="var(--border-subtle)" stroke-width="1"/>
                  <!-- ライン -->
                  <polyline
                    :points="sparklinePolyline"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <!-- 最新ドット -->
                  <circle
                    v-if="sparklineLastDot"
                    :cx="sparklineLastDot.x"
                    :cy="sparklineLastDot.y"
                    r="3"
                    fill="var(--accent)"
                  />
                </svg>
                <div class="sparkline-labels">
                  <span>{{ sparklinePoints[0].date }}</span>
                  <span class="sparkline-latest">{{ product.ownerCount ?? 0 }}人</span>
                  <span>{{ sparklinePoints[sparklinePoints.length - 1].date }}</span>
                </div>
              </div>
              <p v-else class="chart-empty">
                保存するたびにスナップショットが記録されます。<br>データ蓄積後にグラフが表示されます。
              </p>
            </div>

            <!-- 所有分布マップ -->
            <div class="map-section">
              <p class="chart-label">所有分布マップ</p>
              <OwnershipMap :product-id="product.id" />
            </div>
          </div><!-- /analysis-block -->

        </div><!-- /right-col -->
      </div><!-- /detail-body -->
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { userProfileStore } from '../../store/userProfile'
import { productStore, type ProductImage } from '../../store/products'
import { authState } from '../../lib/auth'
import PhotoUpload from '../../components/PhotoUpload.vue'
import OwnershipMap from '../../components/OwnershipMap.vue'
import type { ItemCategory } from '../../types'
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '../../types'

const route  = useRoute()
const router = useRouter()
const loading = ref(true)
const saving  = ref(false)
const canEdit = computed(() => userProfileStore.isEditor)
const showPhotoUpload = ref(false)

// ──────────────────────────────────────────
// Product 型定義
// ──────────────────────────────────────────
interface Product {
  id: string
  name: string
  creator?: string
  category?: string
  imageUrl?: string
  selectedImageUrl?: string
  description?: string
  publishedYear?: string
  tags?: string[]
  isbn?: string
  janCode?: string
  externalSource?: string
  ownerCount?: number
  hiddenFromMapCount?: number
  disposalCounts?: Record<string, number>
  ownershipStats?: { totalDays: number; count: number }
  ownerCountHistory?: Record<string, number>
  saveHistory?: Array<{ at: string; uid: string }>
  createdAt?: string
}

const product        = ref<Product | null>(null)
const nameCandidates = ref<string[]>([])
const saveHistory    = ref<Array<{ at: string; uid: string }>>([])
const lastSavedLabel = ref('')

const form = reactive({
  name:           '',
  creator:        '',
  category:       '' as ItemCategory | '',
  publishedYear:  '',
  description:    '',
  tagsRaw:        '',   // カンマ区切りの入力文字列
  isbn:           '',
  janCode:        '',
  externalSource: '',
})

const productImages = ref<ProductImage[]>([])
const imagesLoaded  = ref(false)

// ──────────────────────────────────────────
// Computed
// ──────────────────────────────────────────
const mainDisplayUrl = computed(() =>
  product.value?.selectedImageUrl ?? product.value?.imageUrl ?? ''
)

// 画像引用元
const imgSource = computed(() => {
  const url = mainDisplayUrl.value
  if (!url || url.includes('firebasestorage.googleapis.com')) return null
  if (url.includes('books.google.com') || url.includes('googleapis.com/books')) return 'Google Books'
  if (url.includes('rakuten') || url.includes('r10s.jp')) return '楽天'
  if (url.includes('amazon') || url.includes('media-amazon.com')) return 'Amazon'
  if (url.includes('ndl.go.jp')) return '国立国会図書館'
  if (url.includes('yahoo.co.jp') || url.includes('yimg.jp')) return 'Yahoo!'
  return null
})

const categoryDisplayLabel = computed(() => {
  const c = product.value?.category as ItemCategory | undefined
  if (!c || !(c in CATEGORY_LABELS)) return product.value?.category ?? ''
  return `${CATEGORY_EMOJI[c]} ${CATEGORY_LABELS[c]}`
})

const parsedTags = computed(() =>
  form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
)

const mapVisibleCount = computed(() =>
  (product.value?.ownerCount ?? 0) - (product.value?.hiddenFromMapCount ?? 0)
)

const avgOwnershipLabel = computed(() => {
  const s = product.value?.ownershipStats
  if (!s || s.count === 0) return '—'
  const avg = Math.round(s.totalDays / s.count)
  if (avg < 30)  return `${avg}日`
  if (avg < 365) return `約${Math.round(avg / 30)}ヶ月`
  return `約${(avg / 365).toFixed(1)}年`
})

// 手放し内訳
const DISPOSAL_META = [
  { key: 'resale',   label: '再販売',    color: '#6b84e8' },
  { key: 'gift',     label: '譲渡',      color: '#52c99e' },
  { key: 'donation', label: '寄付',      color: '#f4a942' },
  { key: 'recycle',  label: 'リサイクル', color: '#4ea87a' },
  { key: 'disposal', label: '廃棄',      color: '#e86b6b' },
]
const hasDisposalData = computed(() =>
  DISPOSAL_META.some(d => (product.value?.disposalCounts?.[d.key] ?? 0) > 0)
)
const disposalTotal = computed(() =>
  DISPOSAL_META.reduce((s, d) => s + (product.value?.disposalCounts?.[d.key] ?? 0), 0)
)
const disposalItems = computed(() =>
  DISPOSAL_META.map(d => {
    const count = product.value?.disposalCounts?.[d.key] ?? 0
    const pct   = disposalTotal.value > 0 ? (count / disposalTotal.value) * 100 : 0
    return { ...d, count, pct }
  })
)

// 推移グラフ
const sparklinePoints = computed(() => {
  const h = product.value?.ownerCountHistory
  if (!h) return []
  return Object.entries(h)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count: count as number })) // MM-DD 表示
})

const sparklinePolyline = computed(() => {
  const pts = sparklinePoints.value
  if (pts.length < 2) return ''
  const maxC = Math.max(...pts.map(p => p.count), 1)
  const W = 260, H = 56, PAD = 4
  return pts
    .map((p, i) => {
      const x = PAD + (i / (pts.length - 1)) * (W - PAD * 2)
      const y = H - PAD - (p.count / maxC) * (H - PAD * 2 - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const sparklineLastDot = computed(() => {
  const pts = sparklinePoints.value
  if (pts.length < 2) return null
  const maxC = Math.max(...pts.map(p => p.count), 1)
  const last = pts[pts.length - 1]
  const W = 260, H = 56, PAD = 4
  return {
    x: PAD + (W - PAD * 2),
    y: H - PAD - (last.count / maxC) * (H - PAD * 2 - 4),
  }
})

// ギャラリー
function detectSource(externalSource?: string): string {
  if (!externalSource) return '手動'
  const s = externalSource.toLowerCase()
  if (s.includes('rakuten')) return '楽天'
  if (s.includes('google'))  return 'Google'
  return '手動'
}

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

// ──────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────
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
      nameCandidates.value = (data.nameCandidates as string[] | undefined) ?? []
      saveHistory.value = (data.saveHistory as Array<{ at: string; uid: string }> | undefined) ?? []
      if (saveHistory.value.length > 0) {
        lastSavedLabel.value = formatSavedAt(saveHistory.value[saveHistory.value.length - 1].at)
      }
      Object.assign(form, {
        name:           product.value.name           ?? '',
        creator:        product.value.creator        ?? '',
        category:       product.value.category       ?? '',
        publishedYear:  product.value.publishedYear  ?? '',
        description:    product.value.description    ?? '',
        tagsRaw:        (product.value.tags ?? []).join(', '),
        isbn:           product.value.isbn           ?? '',
        janCode:        product.value.janCode        ?? '',
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

// ──────────────────────────────────────────
// Actions
// ──────────────────────────────────────────
async function selectImage(url: string) {
  if (!product.value) return
  await productStore.selectMainImage(product.value.id, url)
  product.value.selectedImageUrl = url
}

async function onPhotoDone(url: string) {
  if (!product.value) return
  await productStore.contributeImage(product.value.id, url, authState.user?.uid ?? 'admin')
  try {
    productImages.value = await productStore.fetchImages(product.value.id)
  } catch (e) {
    console.warn('fetchImages error:', e)
  }
  showPhotoUpload.value = false
}

function formatSavedAt(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

async function save() {
  if (!product.value || !form.name.trim()) return
  saving.value = true
  const today = new Date().toISOString().split('T')[0]
  const nowIso = new Date().toISOString()
  const entry  = { at: nowIso, uid: authState.user?.uid ?? '' }
  try {
    const payload: Record<string, unknown> = {
      name:           form.name.trim(),
      creator:        form.creator.trim(),
      category:       form.category,
      publishedYear:  form.publishedYear.trim(),
      description:    form.description.trim(),
      tags:           parsedTags.value,
      isbn:           form.isbn.trim(),
      janCode:        form.janCode.trim(),
      externalSource: form.externalSource.trim(),
      [`ownerCountHistory.${today}`]: product.value.ownerCount ?? 0,
      saveHistory: arrayUnion(entry),
      updatedAt: serverTimestamp(),
    }
    await updateDoc(doc(db, 'products', product.value.id), payload)
    // ローカル更新
    Object.assign(product.value, {
      name:           form.name.trim(),
      creator:        form.creator.trim(),
      category:       form.category,
      publishedYear:  form.publishedYear.trim(),
      description:    form.description.trim(),
      tags:           parsedTags.value,
      isbn:           form.isbn.trim(),
      janCode:        form.janCode.trim(),
      externalSource: form.externalSource.trim(),
    })
    if (!product.value.ownerCountHistory) product.value.ownerCountHistory = {}
    product.value.ownerCountHistory[today] = product.value.ownerCount ?? 0
    saveHistory.value = [...saveHistory.value, entry]
    lastSavedLabel.value = formatSavedAt(nowIso)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.detail-view { max-width: 960px; margin: 0 auto; padding: 20px 24px 80px; }
.state-msg { text-align: center; padding: 48px 0; font-size: 13px; color: var(--text-faint); }

.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }

.back-btn {
  background: none; border: none; color: var(--accent); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; padding: 0;
  text-decoration: underline; text-underline-offset: 2px;
}
.readonly-badge {
  background: var(--bg-surface); color: var(--text-faint);
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
}

/* ── Layout ── */
.detail-body {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
  align-items: start;
}
@media (max-width: 640px) {
  .detail-view  { padding: 16px 14px 80px; }
  .detail-body  { grid-template-columns: 1fr; }
}

/* ── 左カラム ── */
.cover-section { display: flex; flex-direction: column; gap: 10px; }

.cover-wrap {
  width: 100%; aspect-ratio: 3 / 4; background: var(--bg-surface);
  border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;
  padding: 4px; box-sizing: border-box;
}
.cover-img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }
.cover-empty { font-size: 12px; color: var(--text-placeholder); }
.curated-label { font-size: 11px; color: var(--accent); font-weight: 600; text-align: center; }
.img-source { font-size: 9px; color: var(--text-faint); text-align: right; letter-spacing: 0.03em; }

.upload-area { display: flex; flex-direction: column; }
.upload-btn {
  width: 100%; height: 36px; background: var(--bg-subtle);
  border: 1.5px dashed var(--border); border-radius: 7px;
  font-size: 12px; font-weight: 600; color: var(--accent);
  cursor: pointer; font-family: inherit; transition: border-color 0.15s, background 0.15s;
}
.upload-btn:hover { border-color: var(--accent); background: var(--accent-bg); }

.photo-panel {
  background: var(--bg-surface); border-radius: 8px; padding: 12px; border: 1px solid var(--border);
}
.photo-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.photo-panel-title { font-size: 12px; font-weight: 600; color: var(--accent); }
.photo-panel-close { background: none; border: none; font-size: 15px; color: var(--text-faint); cursor: pointer; padding: 2px 4px; }

.gallery-section { display: flex; flex-direction: column; gap: 8px; }
.gallery-title { font-size: 11px; color: var(--text-faint); letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }

.gallery-item {
  position: relative; aspect-ratio: 1 / 1; border-radius: 6px; overflow: hidden;
  border: 2px solid transparent; cursor: pointer; transition: border-color 0.15s; background: var(--bg-surface);
}
.gallery-item:hover { border-color: var(--accent); }
.gallery-item.selected { border-color: var(--accent); }
.gallery-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gallery-check {
  position: absolute; top: 4px; right: 4px; width: 20px; height: 20px;
  background: var(--accent); color: #fff; font-size: 11px; font-weight: 700;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.gallery-source {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: rgba(0,0,0,.55); color: #fff;
  font-size: 9px; font-weight: 600; text-align: center; padding: 2px 4px;
}
.gallery-hint  { font-size: 10px; color: var(--text-placeholder); text-align: center; margin: 0; }
.gallery-empty { font-size: 11px; color: var(--text-placeholder); text-align: center; }

/* ── 右カラム ── */
.right-col { display: flex; flex-direction: column; gap: 20px; }

/* ── ブロック共通 ── */
.block {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 22px 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
}
.block-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  flex: 1;
}
.block-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
}
.block-badge.edit     { background: var(--accent-bg); color: var(--accent); border: 1px solid var(--border-accent); }
.block-badge.analysis { background: var(--bg-surface); color: var(--text-faint); border: 1px solid var(--border); }

/* ── フォームフィールド ── */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label {
  font-size: 11px; color: var(--text-faint); letter-spacing: 0.06em; text-transform: uppercase;
}
.field-hint { font-size: 10px; color: var(--text-placeholder); letter-spacing: 0; text-transform: none; margin-left: 6px; }
.required { color: var(--accent); margin-left: 2px; }

.field-input, .field-textarea, .field-select {
  padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 7px;
  font-size: 13px; font-family: inherit; color: var(--text); background: var(--bg-input);
  outline: none; transition: border-color 0.15s; resize: none;
}
.field-input  { height: 38px; }
.field-select { height: 38px; cursor: pointer; appearance: none; -webkit-appearance: none; }
.field-input:focus, .field-textarea:focus, .field-select:focus { border-color: var(--accent); }
.field-input[readonly], .field-textarea[readonly] { background: var(--bg-surface); cursor: default; }

/* 候補タイトル */
.candidates-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; }
.candidates-hint  { font-size: 10px; color: var(--text-placeholder); flex-shrink: 0; }

.candidate-chip {
  font-size: 11px; font-weight: 500; font-family: inherit;
  padding: 3px 10px; border-radius: 20px;
  border: 1.5px solid var(--border); background: var(--bg-subtle); color: var(--text-sub);
  cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.candidate-chip:hover { border-color: var(--accent); color: var(--accent); }
.candidate-chip--active { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

/* タグプレビュー */
.tag-preview { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px; }
.tag-chip {
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted);
}

/* 識別子グリッド */
.identifiers { gap: 8px; }
.id-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 500px) { .id-grid { grid-template-columns: 1fr; } }

.field-label-sm { font-size: 10px; color: var(--text-placeholder); letter-spacing: 0.05em; text-transform: uppercase; }
.field-input-sm {
  height: 34px; padding: 0 10px; border: 1.5px solid var(--border); border-radius: 6px;
  font-size: 12px; font-family: inherit; color: var(--text); background: var(--bg-input);
  outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box;
}
.field-input-sm:focus { border-color: var(--accent); }
.field-input-sm[readonly] { background: var(--bg-surface); cursor: default; }

/* 保存ボタン */
.actions { margin-top: 4px; }
.save-btn {
  width: 100%; height: 44px; background: var(--accent); color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: background 0.15s;
}
.save-btn:hover:not(:disabled) { background: var(--accent-hover); }
.save-btn:disabled { opacity: 0.4; cursor: default; }

.save-timestamp {
  font-size: 11px; color: var(--text-faint); text-align: center; margin-top: 8px; letter-spacing: 0.03em;
}

.save-history { margin-top: 10px; }
.save-history-title {
  font-size: 10px; color: var(--text-placeholder); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;
}
.save-history-list { display: flex; flex-direction: column; gap: 4px; }
.save-history-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: var(--text-faint); padding: 3px 0;
  border-bottom: 1px solid var(--border-faint);
}
.save-history-uid { color: var(--text-placeholder); font-size: 10px; }

/* ── 分析ブロック ── */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}
.stat { display: flex; flex-direction: column; gap: 3px; }
.stat-label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 18px; font-weight: 700; color: var(--text); }
.stat-value--sm { font-size: 13px; font-weight: 500; color: var(--text-muted); }

/* 手放し内訳 */
.disposal-chart { display: flex; flex-direction: column; gap: 8px; }
.chart-label { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.disposal-bars { display: flex; flex-direction: column; gap: 7px; }
.disposal-row  { display: flex; align-items: center; gap: 10px; }
.disposal-name { font-size: 12px; color: var(--text-muted); width: 44px; flex-shrink: 0; }
.disposal-bar-wrap { flex: 1; height: 10px; background: var(--bg-surface); border-radius: 6px; overflow: hidden; }
.disposal-bar  { height: 100%; border-radius: 6px; transition: width 0.5s ease; min-width: 2px; }
.disposal-count { font-size: 12px; color: var(--text-faint); width: 20px; text-align: right; flex-shrink: 0; }

/* 推移グラフ */
.trend-chart { display: flex; flex-direction: column; gap: 8px; }
.sparkline-wrap { display: flex; flex-direction: column; gap: 4px; }
.sparkline-svg { width: 100%; height: 60px; display: block; }
.sparkline-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-faint);
}
.sparkline-latest { font-weight: 700; color: var(--accent); }
.chart-empty { font-size: 11px; color: var(--text-placeholder); line-height: 1.6; margin: 0; }

/* マップ */
.map-section { display: flex; flex-direction: column; gap: 8px; }
</style>
