<template>
  <div class="add-view">
    <header class="add-header">
      <button class="back-btn" @click="router.back()">←</button>
      <span class="header-title">アイテムを追加</span>
    </header>

    <div class="add-main">

      <!-- バーコードスキャナー -->
      <BarcodeScanner
        v-if="showScanner"
        :scan-feedback="scanFeedback"
        @close="showScanner = false"
        @detected="onBarcodeDetected"
      />

      <!-- 検索モード -->
      <template v-if="mode === 'search'">

        <!-- バーコードスキャンボタン -->
        <button class="scan-btn" @click="openScanner()">
          <svg class="scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9V6a1 1 0 0 1 1-1h3M15 5h3a1 1 0 0 1 1 1v3M21 15v3a1 1 0 0 1-1 1h-3M9 21H6a1 1 0 0 1-1-1v-3"/>
            <line x1="7" y1="12" x2="7" y2="12.01"/>
            <line x1="10" y1="9" x2="10" y2="15"/>
            <line x1="13" y1="7" x2="13" y2="17"/>
            <line x1="16" y1="10" x2="16" y2="14"/>
          </svg>
          <div class="scan-text">
            <span class="scan-label">バーコードをスキャン</span>
            <span class="scan-sub">カメラでISBN・JANコードを読み取り</span>
          </div>
          <svg class="scan-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <!-- スキャン結果リスト（ページ側） -->
        <div v-if="pendingScans.length > 0" class="scan-results-card">
          <div class="scan-results-header">
            <span class="scan-results-title">スキャン結果</span>
            <button class="scan-results-clear" @click="pendingScans = []">クリア</button>
          </div>
          <div
            v-for="(scan, i) in pendingScans"
            :key="scan.barcode + i"
            class="scan-result-row"
            :class="scan.status"
          >
            <div class="scan-result-cover">
              <img v-if="scan.result?.imageUrl" :src="scan.result.imageUrl" />
              <span v-else-if="scan.status === 'loading'" class="scan-result-spinner" />
              <span v-else class="scan-result-emoji">?</span>
            </div>
            <div class="scan-result-info">
              <template v-if="scan.status === 'loading'">
                <p class="scan-result-name loading">検索中…</p>
                <p class="scan-result-sub">{{ scan.barcode }}</p>
              </template>
              <template v-else-if="scan.status === 'found'">
                <p class="scan-result-name">{{ scan.result!.name }}</p>
                <p class="scan-result-sub">{{ scan.result!.creator }}</p>
              </template>
              <template v-else>
                <p class="scan-result-name notfound">見つかりませんでした</p>
                <p class="scan-result-sub">{{ scan.barcode }}</p>
              </template>
            </div>
            <div class="scan-result-actions">
              <button
                v-if="scan.status === 'found'"
                class="scan-add-btn"
                :class="{ added: addedIds.has(scan.barcode) }"
                :disabled="addedIds.has(scan.barcode)"
                @click="addFromScan(scan)"
              >{{ addedIds.has(scan.barcode) ? '✓' : '追加' }}</button>
              <button class="scan-remove-btn" @click="pendingScans.splice(i, 1)">✕</button>
            </div>
          </div>
          <!-- 一括追加 -->
          <div v-if="pendingFoundCount > 1" class="scan-bulk-wrap">
            <button class="scan-bulk-btn" :disabled="saving" @click="addAllFromScan">
              {{ saving ? '追加中…' : `まとめて追加 (${pendingFoundCount}件)` }}
            </button>
          </div>
        </div>

        <!-- URLから取得 -->
        <div class="or-divider"><span>またはURLから情報を取得</span></div>

        <div class="url-section">
          <p class="url-guide">商品の詳細ページURLを貼り付けると、タイトルと画像を自動で取得します。</p>
          <p class="url-examples">Amazon・メルカリ・ヤフオク・ZOZO・楽天・価格.com など</p>
          <div class="url-bar">
            <div class="url-input-wrap">
              <input
                v-model="urlInput"
                type="url"
                class="url-input"
                placeholder="https://..."
                @keydown.enter="fetchFromUrl"
              />
              <button
                v-if="urlInput.length > 0"
                class="url-clear-btn"
                @click="urlInput = ''; urlResult = null; urlError = ''; urlAdded = false"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <button class="url-fetch-btn" :disabled="!urlInput.trim() || urlLoading" @click="fetchFromUrl">
              {{ urlLoading ? '取得中…' : '取得' }}
            </button>
          </div>
          <p v-if="urlError" class="url-error">{{ urlError }}</p>

          <!-- 取得結果プレビュー -->
          <div v-if="urlResult" class="url-result-card">
            <div class="url-result-cover">
              <img v-if="urlResult.imageUrl" :src="urlResult.imageUrl" class="url-result-img" />
              <span v-else class="url-result-emoji">📦</span>
            </div>
            <div class="url-result-info">
              <input v-model="urlResult.name" class="url-edit-input" placeholder="商品名" />
              <input v-model="urlResult.creator" class="url-edit-input url-edit-sub" placeholder="著者 / メーカー（任意）" />
              <select v-model="urlResult.category" class="url-edit-select">
                <option v-for="[val, label] in categoryOptions" :key="val" :value="val">
                  {{ CATEGORY_EMOJI[val] }} {{ label }}
                </option>
              </select>
            </div>
            <button
              class="url-add-btn"
              :class="{ added: urlAdded }"
              :disabled="urlAdded || saving || !urlResult.name.trim()"
              @click="addFromUrl"
            >{{ urlAdded ? '✓' : '追加' }}</button>
          </div>
        </div>

        <div class="or-divider"><span>またはキーワードで検索</span></div>

        <div class="search-card">

          <!-- カテゴリ選択 -->
          <div class="cat-pills">
            <button
              v-for="[val, label] in categoryOptions"
              :key="val"
              class="cat-pill"
              :class="{ active: searchCategory === val }"
              @click="switchCategory(val)"
            >{{ CATEGORY_EMOJI[val] }} {{ label }}</button>
          </div>

          <!-- キーワード / ISBN タブ -->
          <div class="search-tabs">
            <button
              class="search-tab"
              :class="{ active: searchMode === 'keyword' }"
              @click="switchSearchMode('keyword')"
            >キーワード</button>
            <button
              v-if="searchCategory === 'book'"
              class="search-tab"
              :class="{ active: searchMode === 'isbn' }"
              @click="switchSearchMode('isbn')"
            >ISBN</button>
          </div>

          <!-- 検索バー + オートコンプリートドロップダウン -->
          <div class="search-bar-wrap">
            <div class="search-bar">
              <div class="input-wrap">
                <input
                  ref="inputEl"
                  v-if="searchMode === 'keyword'"
                  v-model="query"
                  type="text"
                  class="search-input"
                  :placeholder="searchPlaceholder"
                  autocomplete="off"
                  @keydown.enter="doSearch"
                  @keydown.escape="closeSuggestions"
                  @keydown.down.prevent="moveSuggestion(1)"
                  @keydown.up.prevent="moveSuggestion(-1)"
                  @focus="onInputFocus"
                  @blur="onInputBlur"
                />
                <input
                  ref="isbnInputEl"
                  v-else
                  v-model="isbnQuery"
                  type="text"
                  inputmode="numeric"
                  class="search-input"
                  placeholder="例）9784103534181"
                  @keydown.enter="doSearch"
                />
                <!-- クリアボタン -->
                <button
                  v-if="(searchMode === 'keyword' ? query : isbnQuery).length > 0"
                  class="input-clear-btn"
                  @mousedown.prevent
                  @click="searchMode === 'keyword' ? (query = '', closeSuggestions()) : (isbnQuery = '')"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <button
                class="search-btn"
                :disabled="!(searchMode === 'keyword' ? query.trim() : isbnQuery.trim()) || loading"
                @click="doSearch"
              >検索</button>
            </div>

            <!-- オートコンプリートドロップダウン -->
            <div
              v-if="showSuggestions && searchMode === 'keyword'"
              class="suggestions-dropdown"
            >
              <div v-if="suggestionLoading" class="sug-loading">
                <span class="sug-spinner" />検索中…
              </div>
              <template v-else>
                <button
                  v-for="(s, idx) in suggestions"
                  :key="s.id"
                  class="suggestion-item"
                  :class="{ focused: idx === sugFocusIdx }"
                  @mousedown.prevent="selectSuggestion(s)"
                >
                  <div class="sug-img-wrap">
                    <img v-if="s.imageUrl" :src="s.imageUrl" class="sug-img" />
                    <span v-else class="sug-img-emoji">{{ CATEGORY_EMOJI[s.category] }}</span>
                  </div>
                  <div class="sug-info">
                    <span class="sug-name">{{ s.name }}</span>
                    <span class="sug-creator">{{ s.creator }}</span>
                  </div>
                </button>
              </template>
            </div>
          </div>

          <!-- 絞り込み -->
          <div v-if="results.length" class="filter-bar">
            <input
              v-model="filter"
              type="text"
              class="filter-input"
              placeholder="結果を絞り込む…"
            />
          </div>
        </div>

        <!-- 状態表示 -->
        <div v-if="loading && results.length === 0" class="state-msg">検索中…</div>

        <div v-else-if="searchError" class="error-banner">
          <span>{{ searchError }}</span>
          <div class="error-actions">
            <button class="error-retry-btn" @click="doSearch">再試行</button>
            <button class="error-manual-btn" @click="goManualWithPrefill">手動入力 →</button>
          </div>
        </div>

        <div v-else-if="searched && filteredResults.length === 0 && !filter" class="state-msg">
          見つかりませんでした
          <p class="state-hint">別のキーワードや表記（英語・ひらがな）で試してみてください</p>
          <div class="alt-cats">
            <p class="alt-cats-label">他のカテゴリで試す</p>
            <div class="alt-cat-pills">
              <button
                v-for="[val, label] in categoryOptions.filter(([v]) => v !== searchCategory)"
                :key="val"
                class="alt-cat-pill"
                @click="tryCategorySearch(val)"
              >{{ CATEGORY_EMOJI[val] }} {{ label }}</button>
            </div>
          </div>
        </div>

        <div v-else-if="searched && filteredResults.length === 0 && filter" class="state-msg">
          絞り込み結果が0件です
        </div>

        <!-- 追加済みバナー -->
        <div v-if="addedCount > 0" class="added-banner">
          {{ addedCount }}件追加しました
          <button class="go-shelf-btn" @click="router.push({ name: 'shelf' })">棚を見る →</button>
        </div>

        <!-- Penstok未登録ノーティス -->
        <div
          v-if="searched && filteredResults.length > 0 && penstokCount === 0"
          class="penstok-notice"
        >
          Penstok DBに未登録の商品です。追加すると自動登録されます。
        </div>

        <!-- 検索結果 -->
        <div v-if="filteredResults.length" class="results-card">
          <div
            v-for="book in filteredResults"
            :key="book.id"
            class="result-row"
          >
            <div class="result-cover-wrap">
              <img
                v-if="book.imageUrl"
                :src="book.imageUrl"
                :alt="book.name"
                class="result-cover"
              />
              <div v-else class="result-cover-empty">{{ CATEGORY_EMOJI[book.category] }}</div>
            </div>
            <div class="result-info">
              <p class="result-title">{{ book.name }}</p>
              <p class="result-creator">{{ book.creator || '—' }}</p>
              <span v-if="book.inPenstok" class="penstok-badge">Penstok DB</span>
            </div>
            <div class="result-actions">
              <button
                class="result-add-btn"
                :class="{ added: addedIds.has(book.id) }"
                :disabled="addedIds.has(book.id)"
                @click="addBook(book)"
              >{{ addedIds.has(book.id) ? '✓' : '追加' }}</button>
            </div>
          </div>

          <div v-if="hasMore" class="load-more-wrap">
            <button class="load-more-btn" :disabled="loadingMore" @click="loadMore">
              {{ loadingMore ? '読み込み中…' : 'もっと見る' }}
            </button>
          </div>
        </div>

        <a
          v-if="searched && results.length && sourceApi === 'rakuten'"
          href="https://webservice.rakuten.co.jp/"
          target="_blank"
          rel="noopener"
          class="rakuten-credit"
        >Powered by 楽天ウェブサービス</a>

        <button class="switch-link" @click="mode = 'manual'">
          手動で入力する →
        </button>
      </template>

      <!-- 手動入力モード -->
      <template v-else>
        <div class="form-card">
          <div class="field">
            <label class="field-label">名前<span class="required">*</span></label>
            <input v-model="manual.name" type="text" class="field-input" placeholder="例）ノルウェイの森" />
          </div>
          <div class="field">
            <label class="field-label">著者 / アーティスト / メーカー</label>
            <input v-model="manual.creator" type="text" class="field-input" placeholder="例）村上春樹" />
          </div>
          <div class="field">
            <label class="field-label">カテゴリ<span class="required">*</span></label>
            <select v-model="manual.category" class="field-input field-select">
              <option v-for="[val, label] in categoryOptions" :key="val" :value="val">
                {{ CATEGORY_EMOJI[val] }} {{ label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">画像URL</label>
            <input v-model="manual.imageUrl" type="url" class="field-input" placeholder="https://..." />
          </div>
          <button class="submit-btn" :disabled="!manual.name.trim() || saving" @click="addManual">
            棚に追加する
          </button>
        </div>

        <button class="switch-link" @click="mode = 'search'">← 検索に戻る</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query as fsQuery, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { store } from '../store/shelf'
import type { AddItemPayload } from '../store/shelf'
import { CATEGORY_LABELS, CATEGORY_EMOJI, type ItemCategory } from '../types'
import BarcodeScanner, { type PendingScan } from '../components/BarcodeScanner.vue'

// PendingScanはBarcodeScanner.vueからimport済み

const router = useRouter()

// ---- 状態 ----
const mode = ref<'search' | 'manual'>('search')
const searchMode = ref<'keyword' | 'isbn'>('keyword')
const searchCategory = ref<ItemCategory>('book')
const query = ref('')
const isbnQuery = ref('')
const filter = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const saving = ref(false)
const searched = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const searchError = ref('')
const sourceApi = ref<'rakuten' | 'google' | ''>('')

const showScanner   = ref(false)
const pendingScans  = ref<PendingScan[]>([])
const scanFeedback  = ref<{ status: 'found' | 'notfound'; ts: number; message?: string } | undefined>(undefined)

const pendingFoundCount = computed(() =>
  pendingScans.value.filter(s => s.status === 'found' && !addedIds.has(s.barcode)).length
)

function openScanner() {
  showScanner.value = true  // リセットせずカメラ起動（リストはページ側で保持）
}

const inputEl = ref<HTMLInputElement | null>(null)
const isbnInputEl = ref<HTMLInputElement | null>(null)
const addedIds    = reactive(new Set<string>())
const addedCount  = ref(0)
const penstokCount = ref(0)   // 最後の検索でPenstok DBにヒットした件数

// ---- オートコンプリート ----
const suggestions = ref<BookResult[]>([])
const showSuggestions = ref(false)
const suggestionLoading = ref(false)
const sugFocusIdx = ref(-1)
let suggestTimer: ReturnType<typeof setTimeout> | null = null

const categoryOptions = Object.entries(CATEGORY_LABELS) as [ItemCategory, string][]

const SEARCH_PLACEHOLDER: Record<ItemCategory, string> = {
  book:        'タイトル・著者名で検索',
  music:       'アルバム・アーティスト名で検索',
  video:       '作品タイトル・出演者で検索',
  game:        'ゲームタイトル・メーカーで検索',
  electronics: '商品名・メーカー名で検索',
  camera:      'カメラ・レンズ名で検索',
  shoes:       'ブランド・商品名で検索',
  clothing:    'ブランド・商品名で検索',
  bag:         'ブランド・商品名で検索',
  watch:       'ブランド・モデル名で検索',
  instrument:  '楽器名・メーカーで検索',
  hobby:       '商品名・シリーズ名で検索',
  sports:      'ブランド・商品名で検索',
  furniture:   '商品名・メーカーで検索',
  vehicle:     'メーカー・車種名で検索',
  other:       'キーワードで検索',
}
const searchPlaceholder = computed(() => SEARCH_PLACEHOLDER[searchCategory.value])

interface BookResult {
  id: string
  name: string
  creator: string
  imageUrl: string
  category: ItemCategory
  isbn?: string
  janCode?: string
  externalSource?: string
  inPenstok?: boolean   // Penstok商品DBに登録済み
}

const results = ref<BookResult[]>([])

const filteredResults = computed(() => {
  const f = filter.value.trim().toLowerCase()
  if (!f) return results.value
  return results.value.filter(b =>
    b.name.toLowerCase().includes(f) || b.creator.toLowerCase().includes(f)
  )
})

const manual = reactive({
  name: '', creator: '', imageUrl: '',
  category: 'book' as ItemCategory,
})

onMounted(() => inputEl.value?.focus())

// ---- API 設定 ----

interface ApiConfig {
  endpoint: string
  type: 'books' | 'ichiba'
  getCreator: (item: Record<string, unknown>) => string
  getExternalSource: (item: Record<string, unknown>) => string | undefined
}

const CATEGORY_API: Record<ItemCategory, ApiConfig> = {
  book: {
    endpoint: 'BooksBook/Search/20170404', type: 'books',
    getCreator: i => (i.author as string) ?? '',
    getExternalSource: i => (i.isbn as string) ? `rakutenBooks:${i.isbn}` : undefined,
  },
  music: {
    endpoint: 'BooksCD/Search/20170404', type: 'books',
    getCreator: i => (i.artistName as string) ?? '',
    getExternalSource: i => (i.isbn as string) ? `rakutenCD:${i.isbn}` : undefined,
  },
  video: {
    endpoint: 'BooksDVD/Search/20170404', type: 'books',
    getCreator: i => [(i.cast as string), (i.director as string)].filter(Boolean).join(' / '),
    getExternalSource: i => (i.isbn as string) ? `rakutenDVD:${i.isbn}` : undefined,
  },
  game: {
    endpoint: 'BooksGame/Search/20170404', type: 'books',
    getCreator: i => (i.makerName as string) ?? '',
    getExternalSource: i => (i.isbn as string) ? `rakutenGame:${i.isbn}` : undefined,
  },
  electronics: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  camera: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  shoes: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  clothing: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  bag: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  watch: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  instrument: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  hobby: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  sports: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  furniture: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  vehicle: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
  other: {
    endpoint: 'IchibaItem/Search/20170706', type: 'ichiba',
    getCreator: i => (i.shopName as string) ?? '',
    getExternalSource: i => `rakutenIchiba:${i.itemCode as string}`,
  },
}

const HITS = 20

// ---- カテゴリ / タブ切替 ----

function switchCategory(cat: ItemCategory) {
  searchCategory.value = cat
  resetSearch()
  if (cat !== 'book') searchMode.value = 'keyword'
  setTimeout(() => inputEl.value?.focus(), 0)
}

function switchSearchMode(m: 'keyword' | 'isbn') {
  searchMode.value = m
  resetSearch()
  setTimeout(() => {
    if (m === 'keyword') inputEl.value?.focus()
    else isbnInputEl.value?.focus()
  }, 0)
}

function resetSearch() {
  results.value = []
  filter.value = ''
  searched.value = false
  hasMore.value = false
  currentPage.value = 1
  searchError.value = ''
  sourceApi.value = ''
  penstokCount.value = 0
  closeSuggestions()
}

// ---- オートコンプリート ----

// queryの変化を監視してdebounced提案取得
watch(query, val => {
  if (suggestTimer) clearTimeout(suggestTimer)
  sugFocusIdx.value = -1
  if (val.trim().length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  suggestTimer = setTimeout(() => fetchSuggestions(val.trim()), 380)
})

watch(searchCategory, () => {
  suggestions.value = []
  showSuggestions.value = false
})

// ---- Penstok DB サジェスト ----

async function searchProductsDB(q: string, cat: ItemCategory): Promise<BookResult[]> {
  try {
    const snap = await getDocs(
      fsQuery(
        collection(db, 'products'),
        where('name', '>=', q),
        where('name', '<=', q + '\uf8ff'),
        orderBy('name'),
        limit(5),
      )
    )
    return snap.docs
      .map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: (data.name as string) ?? '',
          creator: (data.creator as string) ?? '',
          imageUrl: (data.imageUrl as string) ?? '',
          category: ((data.category as ItemCategory) ?? cat),
          externalSource: (data.externalSource as string) || undefined,
          isbn: (data.isbn as string) || undefined,
        }
      })
      .filter(r => r.name.length > 0)
  } catch (e) {
    console.warn('searchProductsDB failed:', e)
    return []
  }
}

async function fetchSuggestionsFromRakuten(q: string, config: ApiConfig, cat: ItemCategory): Promise<BookResult[]> {
  const appId = import.meta.env.VITE_RAKUTEN_APP_ID as string
  const accessKey = import.meta.env.VITE_RAKUTEN_ACCESS_KEY as string
  // Ichiba 系は新エンドポイント、Books 系は旧エンドポイント
  const url = config.type === 'ichiba'
    ? `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401` +
      `?format=json&keyword=${encodeURIComponent(q)}&applicationId=${appId}&accessKey=${accessKey}&hits=7&page=1`
    : `https://app.rakuten.co.jp/services/api/${config.endpoint}` +
      `?format=json&formatVersion=2&keyword=${encodeURIComponent(q)}&applicationId=${appId}&hits=7&page=1`
  const res = await fetch(url)
  let data: Record<string, unknown> = {}
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok || data.error) {
    const errDesc = (data.error_description as string) ?? (data.error as string) ?? `HTTP ${res.status}`
    throw new Error(errDesc)
  }
  if (config.type === 'books') return parseBooksItems(data, config, cat).slice(0, 7)
  // Ichiba: Items[n].Item 構造
  const rawItems = (data.Items ?? []) as Record<string, unknown>[]
  return rawItems.slice(0, 7).map(entry => {
    const raw = ((entry.Item ?? entry) as Record<string, unknown>)
    const imgs = (raw.mediumImageUrls as { imageUrl?: string }[]) ?? []
    return {
      id: (raw.itemCode as string) || crypto.randomUUID(),
      name: (raw.itemName as string) ?? '',
      creator: config.getCreator(raw),
      imageUrl: (imgs[0]?.imageUrl ?? '').replace('http://', 'https://'),
      category: cat,
      externalSource: config.getExternalSource(raw),
    }
  })
}

async function fetchSuggestions(q: string) {
  const config = CATEGORY_API[searchCategory.value]
  const cat = searchCategory.value
  suggestionLoading.value = true
  showSuggestions.value = true

  try {
    // DB（高速・インスタント）と Rakuten API を並列実行
    const [dbResult, apiResult] = await Promise.allSettled([
      searchProductsDB(q, cat),
      fetchSuggestionsFromRakuten(q, config, cat),
    ])

    const dbItems = dbResult.status === 'fulfilled' ? dbResult.value : []
    const apiItems = apiResult.status === 'fulfilled' ? apiResult.value : []

    // DB を先頭に、重複を除いてマージ
    const merged: BookResult[] = [...dbItems]
    const seenNames = new Set(dbItems.map(r => r.name.slice(0, 30).toLowerCase()))
    for (const r of apiItems) {
      const key = r.name.slice(0, 30).toLowerCase()
      if (!seenNames.has(key)) {
        seenNames.add(key)
        merged.push(r)
      }
    }
    suggestions.value = merged.slice(0, 8)
  } catch {
    suggestions.value = []
  } finally {
    suggestionLoading.value = false
  }
}

function selectSuggestion(s: BookResult) {
  closeSuggestions()
  results.value = [{ ...s, inPenstok: true }]
  searched.value = true
  hasMore.value = false
  filter.value = ''
  searchError.value = ''
  sourceApi.value = ''
  penstokCount.value = 1
}

function closeSuggestions() {
  showSuggestions.value = false
  sugFocusIdx.value = -1
}

function onInputFocus() {
  if (query.value.trim().length >= 2 && suggestions.value.length > 0) {
    showSuggestions.value = true
  }
}

function onInputBlur() {
  // mousedownで選択するので少し遅延
  setTimeout(closeSuggestions, 200)
}

function moveSuggestion(dir: 1 | -1) {
  if (!showSuggestions.value || suggestions.value.length === 0) return
  sugFocusIdx.value = Math.max(-1,
    Math.min(suggestions.value.length - 1, sugFocusIdx.value + dir))
  if (sugFocusIdx.value >= 0) {
    query.value = suggestions.value[sugFocusIdx.value].name
  }
}

// ---- 検索実行 ----

async function doSearch() {
  closeSuggestions()
  const isIsbn = searchMode.value === 'isbn'
  const q = isIsbn ? isbnQuery.value.trim() : query.value.trim()
  if (!q || loading.value) return

  loading.value = true
  searched.value = false
  results.value = []
  filter.value = ''
  hasMore.value = false
  currentPage.value = 1
  searchError.value = ''

  try {
    if (isIsbn) {
      await searchByIsbn(q.replace(/[\s-]/g, ''))
    } else {
      // Penstok DB と外部API を並列実行
      const [, penstokRes] = await Promise.allSettled([
        fetchByCategory(q, 1, true),
        searchProductsDB(q, searchCategory.value),
      ])
      const penstokKeys = new Set(
        penstokRes.status === 'fulfilled'
          ? penstokRes.value.map(p => p.name.slice(0, 30).toLowerCase())
          : []
      )
      penstokCount.value = penstokKeys.size
      // 外部API結果に inPenstok フラグを付与
      results.value = results.value.map(r => ({
        ...r,
        inPenstok: penstokKeys.has(r.name.slice(0, 30).toLowerCase()),
      }))
    }
  } finally {
    loading.value = false
    searched.value = true
  }
}

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    await fetchByCategory(query.value.trim(), currentPage.value + 1, false)
  } finally {
    loadingMore.value = false
  }
}

async function fetchByCategory(q: string, page: number, replace: boolean) {
  const config = CATEGORY_API[searchCategory.value]
  if (config.type === 'books') {
    await fetchBooksAPI(q, page, replace, config)
  } else {
    await fetchIchibaAPI(q, page, replace, config)
  }
}

// ---- Rakuten Books 系 ----

function parseBooksItems(data: Record<string, unknown>, config: ApiConfig, cat: ItemCategory): BookResult[] {
  const items = ((data.Items ?? []) as Record<string, unknown>[]).map(entry => {
    const item = entry.Item as Record<string, unknown>
    const isbn = (item.isbn as string) ?? ''
    return {
      id: isbn || (item.itemCode as string) || crypto.randomUUID(),
      name: (item.title as string) ?? '',
      creator: config.getCreator(item),
      imageUrl: ((item.largeImageUrl as string) || (item.mediumImageUrl as string) || '').replace('http://', 'https://'),
      category: cat,
      isbn: isbn || undefined,
      externalSource: config.getExternalSource(item),
    }
  })
  // タイトル先頭30文字で重複除去
  const seen = new Set<string>()
  return items.filter(i => {
    const key = i.name.slice(0, 30).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

async function fetchBooksAPI(q: string, page: number, replace: boolean, config: ApiConfig) {
  const appId = import.meta.env.VITE_RAKUTEN_APP_ID as string  // UUID を使う（旧エンドポイント）
  const cat = searchCategory.value
  const url = `https://app.rakuten.co.jp/services/api/${config.endpoint}` +
    `?format=json&keyword=${encodeURIComponent(q)}&applicationId=${appId}&hits=${HITS}&page=${page}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(`楽天API: ${data.error_description ?? data.error}`)

    const deduped = parseBooksItems(data, config, cat)
    if (replace) results.value = deduped
    else results.value = [...results.value, ...deduped]

    hasMore.value = page < ((data.pageCount as number) ?? 1)
    currentPage.value = page
    sourceApi.value = 'rakuten'
    searchError.value = ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('Rakuten Books API failed:', msg)
    if (cat === 'book') {
      // 本のみGoogle Booksにフォールバック
      await fetchByGoogleKeyword(q, replace)
    } else {
      searchError.value = `楽天APIへの接続に失敗しました（${msg}）`
    }
  }
}

// ---- Rakuten Ichiba ----

async function fetchIchibaAPI(q: string, page: number, replace: boolean, config: ApiConfig) {
  const appId = import.meta.env.VITE_RAKUTEN_APP_ID as string
  const accessKey = import.meta.env.VITE_RAKUTEN_ACCESS_KEY as string
  const cat = searchCategory.value
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401` +
    `?format=json&keyword=${encodeURIComponent(q)}&applicationId=${appId}&accessKey=${accessKey}&hits=${HITS}&page=${page}`

  try {
    const res = await fetch(url)
    // ステータスに関わらずbodyを先に読む（Rakutenはエラー詳細をbodyに入れる）
    let data: Record<string, unknown> = {}
    try { data = await res.json() } catch { /* JSON解析不可 */ }

    if (!res.ok || data.error) {
      const errDesc = (data.error_description as string) ?? ''
      const errCode = (data.error as string) ?? `HTTP ${res.status}`
      throw new Error(errDesc || errCode)
    }

    // Items[n].Item 構造
    const rawItems = (data.Items ?? []) as Record<string, unknown>[]
    const items: BookResult[] = rawItems.map(entry => {
      const raw = ((entry.Item ?? entry) as Record<string, unknown>)
      const imgs = (raw.mediumImageUrls as { imageUrl?: string }[]) ?? []
      return {
        id: (raw.itemCode as string) || crypto.randomUUID(),
        name: (raw.itemName as string) ?? '',
        creator: config.getCreator(raw),
        imageUrl: (imgs[0]?.imageUrl ?? '').replace('http://', 'https://'),
        category: cat,
        externalSource: config.getExternalSource(raw),
      }
    })

    if (replace) results.value = items
    else results.value = [...results.value, ...items]

    hasMore.value = page < ((data.pageCount as number) ?? 1)
    currentPage.value = page
    sourceApi.value = 'rakuten'
    searchError.value = ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('Rakuten Ichiba API failed:', msg)
    if (replace) results.value = []

    searchError.value = `この商品カテゴリはAPI検索が利用できません。手動入力で登録できます。`
  }
}

// ---- Google Books ----

async function fetchByGoogleKeyword(q: string, replace: boolean) {
  const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined
  const keyParam = apiKey ? `&key=${apiKey}` : ''
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20${keyParam}`
    )
    const data = await res.json()
    const fetched = parseGoogleBooks(data)
    if (replace) results.value = fetched
    else results.value = [...results.value, ...fetched]
    hasMore.value = false
    sourceApi.value = 'google'
    searchError.value = ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    searchError.value = `検索に失敗しました（${msg}）`
  }
}

async function searchByIsbn(isbn: string) {
  try {
    results.value = await lookupIsbn(isbn)
    hasMore.value  = false
    sourceApi.value = 'google'
  } catch (e) {
    searchError.value = `ISBN検索に失敗しました: ${e instanceof Error ? e.message : e}`
  }
}

function parseGoogleBooks(data: Record<string, unknown>): BookResult[] {
  return ((data.items ?? []) as unknown[]).map(item => {
    const it = item as Record<string, unknown>
    const v = it.volumeInfo as Record<string, unknown>
    const links = v.imageLinks as Record<string, string> | undefined
    const identifiers = (v.industryIdentifiers as { type: string; identifier: string }[] | undefined) ?? []
    const isbn = identifiers.find(i => i.type === 'ISBN_13')?.identifier
      || identifiers.find(i => i.type === 'ISBN_10')?.identifier
    return {
      id: it.id as string,
      name: (v.title as string) ?? '(タイトルなし)',
      creator: ((v.authors as string[]) ?? []).join(', '),
      imageUrl: (links?.thumbnail ?? '').replace('http://', 'https://'),
      category: 'book' as ItemCategory,
      isbn,
      externalSource: `googleBooks:${it.id as string}`,
    }
  })
}

// ---- バーコードスキャン（連続モード） ----

async function onBarcodeDetected(barcode: string) {
  const clean = barcode.replace(/[\s-]/g, '')

  // 同じバーコードが既にリストにあればスキップ
  if (pendingScans.value.some(s => s.barcode === clean)) return

  // 本の価格コード（192始まり）はスキャナーにガイダンスを出すだけ
  if (/^192\d{10}$/.test(clean)) {
    scanFeedback.value = {
      status: 'notfound', ts: Date.now(),
      message: '本の価格コードです。上のISBNバーコードを読んでください',
    }
    return
  }

  // loading 状態でリストに追加
  const scan: PendingScan = { barcode: clean, status: 'loading' }
  pendingScans.value.push(scan)

  try {
    // 978/979 → ISBN（書籍）、その他 → 楽天市場 JAN 検索
    const items = /^97[89]/.test(clean)
      ? await lookupIsbn(clean)
      : await lookupByJan(clean)

    if (items.length >= 1) {
      scan.result = items[0]
      scan.status = 'found'
      scanFeedback.value = { status: 'found', ts: Date.now() }
    } else {
      scan.status = 'notfound'
      scanFeedback.value = { status: 'notfound', ts: Date.now() }
      pendingScans.value = pendingScans.value.filter(s => s !== scan)
    }
  } catch {
    scan.status = 'notfound'
    scanFeedback.value = { status: 'notfound', ts: Date.now() }
    pendingScans.value = pendingScans.value.filter(s => s !== scan)
  }
}

async function addFromScan(scan: PendingScan) {
  if (!scan.result || addedIds.has(scan.barcode)) return
  saving.value = true
  try {
    await store.addItem({
      name:           scan.result.name,
      creator:        scan.result.creator,
      imageUrl:       scan.result.imageUrl,
      category:       scan.result.category as ItemCategory,
      isbn:           scan.result.isbn,
      janCode:        scan.result.janCode,
      externalSource: scan.result.externalSource,
    })
    addedIds.add(scan.barcode)
    addedCount.value++
  } finally {
    saving.value = false
  }
}

async function addAllFromScan() {
  const toAdd = pendingScans.value.filter(
    s => s.status === 'found' && s.result && !addedIds.has(s.barcode)
  )
  if (toAdd.length === 0) return
  saving.value = true
  try {
    for (const scan of toAdd) {
      await store.addItem({
        name:           scan.result!.name,
        creator:        scan.result!.creator,
        imageUrl:       scan.result!.imageUrl,
        category:       scan.result!.category as ItemCategory,
        isbn:           scan.result!.isbn,
        janCode:        scan.result!.janCode,
        externalSource: scan.result!.externalSource,
      })
      addedIds.add(scan.barcode)
    }
    addedCount.value += toAdd.length
  } finally {
    saving.value = false
  }
}

// ISBN → BookResult[]（Rakuten Books 優先 → Google Books フォールバック）
async function lookupIsbn(isbn: string): Promise<BookResult[]> {
  // Rakuten Books API（日本語書籍に強い）
  try {
    const appId = import.meta.env.VITE_RAKUTEN_APP_ID as string
    if (appId) {
      const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404` +
        `?format=json&isbn=${isbn}&applicationId=${appId}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (!data.error && data.Items?.length) {
          const config = CATEGORY_API['book']
          const items = parseBooksItems(data, config, 'book')
          if (items.length) return items
        }
      }
    }
  } catch { /* fall through */ }

  // Google Books フォールバック
  const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined
  const keyParam = apiKey ? `&key=${apiKey}` : ''
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=5${keyParam}`
  )
  const data = await res.json()
  return parseGoogleBooks(data)
}

// ---- 商品名クリーンアップ（楽天市場は名前が長い） ----

function cleanItemName(name: string, source: string): string {
  if (!source.startsWith('rakutenIchiba')) return name
  return name
    .replace(/【[^】]*】/g, '')          // 【送料無料】などを除去
    .replace(/\[[^\]]{6,}\]/g, '')        // [HAC-S-KABAA] など長い角括弧を除去
    .replace(/[（(][^）)]{20,}[）)]/g, '') // 長い丸括弧を除去
    .replace(/　/g, ' ')                  // 全角スペースを半角に
    .replace(/\s{2,}/g, ' ')             // 連続スペースを圧縮
    .trim()
    .slice(0, 60)                         // 最大60文字
}

// ---- JAN コード検索（楽天市場） ----

async function lookupByJan(jan: string): Promise<BookResult[]> {
  const appId     = import.meta.env.VITE_RAKUTEN_APP_ID     as string
  const accessKey = import.meta.env.VITE_RAKUTEN_ACCESS_KEY as string
  if (!appId) return []

  // 新エンドポイント（accessKey 必須）を優先、なければ旧エンドポイント
  const url = accessKey
    ? `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401` +
      `?format=json&jan=${jan}&applicationId=${appId}&accessKey=${accessKey}&hits=5`
    : `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706` +
      `?format=json&jan=${jan}&applicationId=${appId}&hits=5`

  try {
    const res  = await fetch(url)
    const data = await res.json() as Record<string, unknown>
    if (!res.ok || data.error) return []

    const rawItems = (data.Items ?? []) as Record<string, unknown>[]
    const items: BookResult[] = rawItems
      .map(entry => {
        const raw     = ((entry.Item ?? entry) as Record<string, unknown>)
        const imgs    = (raw.mediumImageUrls as { imageUrl?: string }[]) ?? []
        const rawName = (raw.itemName as string) ?? ''
        const extSrc  = `rakutenIchiba:${raw.itemCode as string}`
        const name    = cleanItemName(rawName, extSrc)
        return {
          id:             (raw.itemCode as string) || crypto.randomUUID(),
          name,
          creator:        (raw.shopName as string) ?? '',
          imageUrl:       (imgs[0]?.imageUrl ?? '').replace('http://', 'https://'),
          category:       janCategoryGuess(String(raw.genreId ?? ''), rawName),
          externalSource: extSrc,
          janCode:        jan,
        }
      })
      .filter(i => i.name.length > 0)

    return items

  } catch {
    return []
  }
}

// Rakuten ジャンル ID + 商品名からカテゴリを推定
function janCategoryGuess(genreId: string, name: string): ItemCategory {
  const id = Number(genreId)

  // 大まかなジャンル ID レンジ（Rakuten Books / Ichiba 共通）
  if (id >= 200161 && id <= 200200) return 'book'
  if (id >= 101240 && id <= 101450) return 'music'
  if (id >= 200307 && id <= 200320) return 'video'
  if (id >= 400580 && id <= 400610) return 'game'
  if (id >= 211800 && id <= 211900) return 'camera'
  if (id >= 215000 && id <= 216000) return 'electronics'

  // 商品名でフォールバック
  const n = name
  if (/switch|nintendo|playstation|PS[0-9]|xbox|ゲーム/i.test(n)) return 'game'
  if (/カメラ|lens|レンズ|sony.?α|canon|nikon|fujifilm/i.test(n))  return 'camera'
  if (/iphone|android|スマホ|テレビ|パソコン|充電|ワイヤレス/i.test(n)) return 'electronics'
  if (/\bcd\b|アルバム|シングル|ミュージック/i.test(n))             return 'music'
  if (/dvd|blu.?ray|ブルーレイ/i.test(n))                          return 'video'

  return 'other'
}

// ---- エラー時: 手動入力に切替（検索ワードをプレフィル） ----

function goManualWithPrefill() {
  manual.name = query.value.trim()
  manual.category = searchCategory.value
  mode.value = 'manual'
}

// ---- 0件時: 他カテゴリで試す ----

function tryCategorySearch(cat: ItemCategory) {
  switchCategory(cat)
  // query は resetSearch で消えないため、切替後そのまま検索
  if (query.value.trim()) doSearch()
}

// ---- アイテム追加 ----

async function addBook(book: BookResult) {
  if (addedIds.has(book.id)) return
  saving.value = true
  try {
    const payload: AddItemPayload = {
      name: book.name,
      creator: book.creator,
      imageUrl: book.imageUrl,
      category: book.category,
      isbn: book.isbn,
      janCode: book.janCode,
      externalSource: book.externalSource,
    }
    await store.addItem(payload)
    addedIds.add(book.id)
    addedCount.value++
  } finally {
    saving.value = false
  }
}

// ---- URLから取得 ----

const urlInput   = ref('')
const urlLoading = ref(false)
const urlError   = ref('')
const urlAdded   = ref(false)
const urlResult  = ref<{ name: string; creator: string; imageUrl: string; category: ItemCategory } | null>(null)

async function fetchFromUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  urlLoading.value = true
  urlError.value = ''
  urlResult.value = null
  urlAdded.value = false
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&charset=utf-8`
    const res = await fetch(proxy, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) throw new Error('ページを取得できませんでした')
    const { contents: html } = await res.json() as { contents: string }

    const ogp = (prop: string) => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'),
      ]
      for (const re of patterns) { const m = html.match(re); if (m) return m[1].trim() }
      return ''
    }

    const name = ogp('title') || ogp('site_name') || ''
    if (!name) throw new Error('商品情報を取得できませんでした。商品の詳細ページURLか確認してください。')

    urlResult.value = { name, creator: '', imageUrl: ogp('image'), category: 'other' as ItemCategory }
  } catch (e) {
    urlError.value = e instanceof Error ? e.message : '取得に失敗しました'
  } finally {
    urlLoading.value = false
  }
}

async function addFromUrl() {
  if (!urlResult.value?.name.trim()) return
  saving.value = true
  try {
    await store.addItem({
      name: urlResult.value.name.trim(),
      creator: urlResult.value.creator.trim(),
      imageUrl: urlResult.value.imageUrl,
      category: urlResult.value.category,
    })
    urlAdded.value = true
    addedCount.value++
  } finally {
    saving.value = false
  }
}

async function addManual() {
  if (!manual.name.trim()) return
  saving.value = true
  try {
    await store.addItem({
      name: manual.name.trim(),
      creator: manual.creator.trim(),
      imageUrl: manual.imageUrl.trim(),
      category: manual.category,
    })
    router.push({ name: 'shelf' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.add-view { min-height: 100vh; background: var(--bg); }

.add-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 12px;
  padding: 0 20px; height: 54px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--toolbar-border);
}
.back-btn {
  background: none; border: none; font-size: 22px;
  color: var(--accent); cursor: pointer; padding: 4px 8px 4px 0;
  font-family: inherit; line-height: 1; flex-shrink: 0;
}
.header-title { font-size: 15px; font-weight: 600; color: var(--text); letter-spacing: 0.02em; }

.add-main {
  max-width: 480px; margin: 0 auto;
  padding: 24px 20px 64px;
  display: flex; flex-direction: column; gap: 14px;
}

/* スキャンボタン：常にダーク（視認性確保） */
.scan-btn {
  display: flex; align-items: center; gap: 14px; width: 100%;
  padding: 16px 18px;
  background: linear-gradient(135deg, #1a1208 0%, #2e2010 100%);
  border: 1px solid rgba(201, 148, 42, 0.3);
  border-radius: 12px; cursor: pointer; font-family: inherit;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transition: transform 0.12s, box-shadow 0.12s;
}
.scan-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6); }
.scan-btn:active { transform: translateY(0); }
.scan-icon { width: 28px; height: 28px; color: #f0c040; flex-shrink: 0; }
.scan-text { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.scan-label { font-size: 15px; font-weight: 700; color: #f0ead8; letter-spacing: 0.02em; }
.scan-sub { font-size: 11px; color: rgba(240, 234, 216, 0.5); }
.scan-arrow { width: 18px; height: 18px; color: rgba(240, 234, 216, 0.35); flex-shrink: 0; }

/* スキャン結果カード */
.scan-results-card {
  background: var(--bg-card); border-radius: 10px;
  box-shadow: var(--shadow-md); border: 1px solid var(--border-faint); overflow: hidden;
}
.scan-results-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--border-subtle);
}
.scan-results-title { font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.06em; text-transform: uppercase; }
.scan-results-clear {
  background: none; border: none; font-size: 11px; color: var(--text-faint);
  cursor: pointer; font-family: inherit; text-decoration: underline;
}

.scan-result-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; border-bottom: 1px solid var(--border-faint);
}
.scan-result-row:last-of-type { border-bottom: none; }
.scan-result-row.notfound { background: var(--danger-bg); }

.scan-result-cover {
  width: 38px; height: 52px; border-radius: 3px; flex-shrink: 0;
  background: #ffffff; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.scan-result-cover img { width:100%; height:100%; object-fit:contain; display:block; }
.scan-result-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.scan-result-emoji { font-size: 18px; }

.scan-result-info { flex: 1; min-width: 0; }
.scan-result-name {
  font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.4;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.scan-result-name.loading { color: var(--text-faint); font-weight: 400; }
.scan-result-name.notfound { color: var(--danger); font-weight: 500; }
.scan-result-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.scan-result-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.scan-add-btn {
  min-width: 52px; height: 32px; padding: 0 12px;
  background: transparent; border: 1.5px solid var(--accent); color: var(--accent);
  border-radius: 6px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.scan-add-btn:hover:not(:disabled) { background: var(--accent); color: #fff; }
.scan-add-btn.added { border-color: var(--success); color: var(--success); cursor: default; }
.scan-remove-btn {
  width: 28px; height: 28px; background: none; border: none;
  color: var(--text-placeholder); font-size: 13px; cursor: pointer; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.scan-remove-btn:hover { background: var(--bg-surface); color: var(--accent); }

.scan-bulk-wrap { padding: 12px 16px; border-top: 1px solid var(--border-subtle); }
.scan-bulk-btn {
  width: 100%; height: 42px; background: var(--accent); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: background 0.15s;
}
.scan-bulk-btn:hover:not(:disabled) { background: var(--accent-hover); }
.scan-bulk-btn:disabled { opacity: 0.4; cursor: default; }

.or-divider {
  display: flex; align-items: center; gap: 10px;
  color: var(--text-placeholder); font-size: 11px; letter-spacing: 0.04em;
}
.or-divider::before, .or-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

/* ---- URLから取得 ---- */
.url-section {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.url-guide {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
}
.url-examples {
  font-size: 10px;
  color: var(--text-faint);
  letter-spacing: 0.02em;
}
.url-bar {
  display: flex;
  gap: 8px;
}
.url-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.url-clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--text-faint);
  display: flex;
  align-items: center;
}
.url-clear-btn svg { width: 14px; height: 14px; }
.url-clear-btn:hover { color: var(--text-sub); }
.url-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-input);
  outline: none;
  transition: border-color 0.15s;
}
.url-input:focus { border-color: var(--accent); }
.url-input::placeholder { color: var(--text-placeholder); }
.url-fetch-btn {
  flex-shrink: 0;
  height: 38px;
  padding: 0 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.url-fetch-btn:disabled { opacity: 0.5; cursor: default; }
.url-fetch-btn:hover:not(:disabled) { background: var(--accent-hover); }
.url-error {
  font-size: 11px;
  color: var(--error, #e05252);
  padding: 2px 0;
}
.url-result-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding-top: 6px;
  border-top: 1px solid var(--border-faint);
}
.url-result-cover {
  width: 52px;
  height: 68px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-faint);
}
.url-result-img { width: 100%; height: 100%; object-fit: contain; }
.url-result-emoji { font-size: 22px; }
.url-result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.url-edit-input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-input);
  outline: none;
  box-sizing: border-box;
}
.url-edit-input:focus { border-color: var(--accent); }
.url-edit-sub { font-size: 11px; color: var(--text-sub); }
.url-edit-select {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-sub);
  background: var(--bg-input);
  outline: none;
  cursor: pointer;
}
.url-add-btn {
  flex-shrink: 0;
  align-self: center;
  min-width: 48px;
  height: 34px;
  padding: 0 12px;
  background: transparent;
  border: 1.5px solid var(--accent);
  color: var(--accent);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.url-add-btn:hover:not(:disabled) { background: var(--accent); color: #fff; }
.url-add-btn.added { border-color: var(--success); color: var(--success); cursor: default; }
.url-add-btn:disabled:not(.added) { opacity: 0.4; cursor: default; }

.search-card {
  background: var(--bg-card); border-radius: 10px; padding: 14px 16px;
  box-shadow: var(--shadow-md); border: 1px solid var(--border-faint);
  display: flex; flex-direction: column; gap: 10px;
}

.cat-pills {
  display: flex; gap: 6px;
  overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px;
}
.cat-pills::-webkit-scrollbar { display: none; }
.cat-pill {
  flex-shrink: 0; height: 28px; padding: 0 11px;
  border: 1.5px solid var(--border); border-radius: 20px;
  font-size: 11px; font-weight: 600; font-family: inherit;
  color: var(--text-muted); background: var(--bg-subtle); cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.cat-pill:hover { border-color: var(--accent); color: var(--accent); }
.cat-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.search-tabs {
  display: flex; gap: 4px; background: var(--bg-surface); border-radius: 7px; padding: 3px;
}
.search-tab {
  flex: 1; height: 30px; border: none; border-radius: 5px;
  font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer; background: transparent; color: var(--text-faint);
  transition: background 0.15s, color 0.15s;
}
.search-tab.active { background: var(--bg-card); color: var(--accent); box-shadow: var(--shadow-sm); }

.search-bar-wrap { position: relative; }
.search-bar { display: flex; gap: 10px; }
.input-wrap { flex: 1; position: relative; display: flex; align-items: center; }

.input-clear-btn {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 20px; height: 20px; background: var(--text-muted); border: none;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; flex-shrink: 0; transition: background 0.15s;
}
.input-clear-btn:hover { background: var(--accent); }
.input-clear-btn svg { width: 10px; height: 10px; color: #fff; }

.search-input {
  width: 100%; height: 42px; padding: 0 36px 0 14px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-family: inherit; color: var(--text); background: var(--bg-input);
  outline: none; transition: border-color 0.15s; box-sizing: border-box;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--text-placeholder); }

.search-btn {
  height: 42px; padding: 0 18px; background: var(--accent); color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  font-family: inherit; cursor: pointer; white-space: nowrap; transition: background 0.15s;
}
.search-btn:hover:not(:disabled) { background: var(--accent-hover); }
.search-btn:disabled { opacity: 0.4; cursor: default; }

.suggestions-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 52px;
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 10px;
  box-shadow: var(--shadow-md); z-index: 100; overflow: hidden;
}

.sug-loading {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 16px; font-size: 13px; color: var(--text-faint);
}
.sug-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--border); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

.suggestion-item {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
  border: none; border-bottom: 1px solid var(--border-faint);
  background: var(--bg-card); cursor: pointer; text-align: left; transition: background 0.1s;
}
.suggestion-item:last-child { border-bottom: none; }
.suggestion-item:hover, .suggestion-item.focused { background: var(--bg-hover); }

.sug-img-wrap {
  flex-shrink: 0; width: 32px; height: 44px; border-radius: 3px; overflow: hidden;
  background: var(--bg-surface); display: flex; align-items: center; justify-content: center;
}
.sug-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sug-img-emoji { font-size: 16px; }

.sug-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.sug-name {
  font-size: 13px; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sug-creator { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.filter-bar { display: flex; }
.filter-input {
  flex: 1; height: 36px; padding: 0 12px;
  border: 1.5px solid var(--border); border-radius: 7px;
  font-size: 13px; font-family: inherit; color: var(--text); background: var(--bg-input);
  outline: none; transition: border-color 0.15s;
}
.filter-input:focus { border-color: var(--accent); }
.filter-input::placeholder { color: var(--text-placeholder); }

.state-msg { text-align: center; font-size: 13px; color: var(--text-faint); padding: 16px 0 4px; }
.state-hint { font-size: 11px; color: var(--text-placeholder); margin-top: 6px; }

.alt-cats { margin-top: 14px; }
.alt-cats-label { font-size: 10px; color: var(--text-placeholder); margin-bottom: 8px; letter-spacing: 0.04em; }
.alt-cat-pills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 8px; }
.alt-cat-pill {
  height: 26px; padding: 0 10px; border: 1.5px solid var(--border); border-radius: 20px;
  font-size: 11px; font-weight: 500; font-family: inherit;
  color: var(--text-muted); background: var(--bg-subtle); cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.alt-cat-pill:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

.error-banner {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  background: var(--warning-bg); border: 1px solid var(--warning); border-radius: 8px;
  padding: 12px 16px; font-size: 12px; color: var(--warning); line-height: 1.5; white-space: pre-line;
}
.error-actions { display: flex; gap: 6px; flex-shrink: 0; }
.error-retry-btn {
  background: none; border: 1px solid var(--warning); color: var(--warning);
  border-radius: 5px; font-size: 11px; font-weight: 600;
  padding: 4px 10px; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.error-manual-btn {
  background: var(--warning); border: 1px solid var(--warning); color: #fff;
  border-radius: 5px; font-size: 11px; font-weight: 600;
  padding: 4px 10px; cursor: pointer; font-family: inherit; white-space: nowrap;
}

.added-banner {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--success-bg); border: 1px solid var(--success); border-radius: 8px;
  padding: 10px 16px; font-size: 13px; color: var(--success); font-weight: 500;
}
.go-shelf-btn {
  background: none; border: none; color: var(--success); font-size: 13px;
  font-weight: 600; cursor: pointer; font-family: inherit;
  text-decoration: underline; text-underline-offset: 2px;
}

.results-card {
  background: var(--bg-card); border-radius: 10px;
  box-shadow: var(--shadow-md); border: 1px solid var(--border-faint); overflow: hidden;
}
.result-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); transition: background 0.12s;
}
.result-row:last-child { border-bottom: none; }
.result-row:hover { background: var(--bg-hover); }

.result-cover-wrap {
  flex-shrink: 0; width: 40px; height: 56px; border-radius: 3px; overflow: hidden;
  background: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.result-cover { width: 100%; height: 100%; object-fit: contain; display: block; }

.result-info { flex: 1; min-width: 0; }
.result-title {
  font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.4;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.result-creator { font-size: 11px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.penstok-badge {
  display: inline-block; font-size: 9px; font-weight: 700;
  background: var(--accent); color: #fff;
  padding: 1px 6px; border-radius: 10px; margin-top: 4px; letter-spacing: 0.04em;
}

.penstok-notice {
  font-size: 11px; color: var(--text-faint); text-align: center;
  background: var(--bg-subtle); border: 1px dashed var(--border);
  border-radius: 8px; padding: 8px 14px; margin: 0 0 4px;
}

.result-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }


.result-add-btn {
  flex-shrink: 0; min-width: 52px; padding: 6px 14px;
  background: transparent; border: 1.5px solid var(--accent); color: var(--accent);
  border-radius: 6px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.result-add-btn:hover:not(:disabled) { background: var(--accent); color: #fff; }
.result-add-btn.added { border-color: var(--success); color: var(--success); cursor: default; }

.load-more-wrap { padding: 14px 16px; border-top: 1px solid var(--border-subtle); text-align: center; }
.load-more-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 7px;
  padding: 8px 24px; font-size: 13px; font-weight: 500; color: var(--accent);
  cursor: pointer; font-family: inherit; transition: border-color 0.15s, background 0.15s;
}
.load-more-btn:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-bg); }
.load-more-btn:disabled { opacity: 0.4; cursor: default; }

.rakuten-credit {
  display: block; text-align: center; font-size: 10px;
  color: var(--text-placeholder); text-decoration: none; padding: 4px 0;
}
.rakuten-credit:hover { color: var(--accent); }

.switch-link {
  background: none; border: none; color: var(--text-faint); font-size: 13px;
  font-family: inherit; cursor: pointer; text-align: center; padding: 4px 0;
  text-decoration: underline; text-underline-offset: 3px; transition: color 0.15s;
}
.switch-link:hover { color: var(--accent); }

.form-card {
  background: var(--bg-card); border-radius: 10px; padding: 20px;
  box-shadow: var(--shadow-md); border: 1px solid var(--border-faint);
  display: flex; flex-direction: column; gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 11px; color: var(--text-faint); letter-spacing: 0.06em; text-transform: uppercase; }
.required { color: var(--accent); margin-left: 2px; }
.field-input {
  height: 42px; padding: 0 14px; border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-family: inherit; color: var(--text); background: var(--bg-input);
  outline: none; transition: border-color 0.15s;
}
.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-placeholder); }
.field-select { cursor: pointer; }


.submit-btn {
  height: 46px; background: var(--accent); color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer;
  margin-top: 4px; transition: background 0.15s;
}
.submit-btn:hover:not(:disabled) { background: var(--accent-hover); }
.submit-btn:disabled { opacity: 0.4; cursor: default; }
</style>
