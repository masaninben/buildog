<template>
  <div class="products-view">
    <div class="page-header">
      <h1 class="page-title">商品データベース</h1>
      <span class="badge">{{ displayProducts.length }}件</span>
    </div>

    <!-- 検索 -->
    <div class="search-row">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="商品名・著者・ブランドで検索"
      />
    </div>

    <!-- ツールバー：カテゴリ・ソート・サイズ -->
    <div v-if="!loading && products.length > 0" class="toolbar">
      <div class="filter-pills">
        <button
          class="pill"
          :class="{ active: activeCategory === null }"
          @click="activeCategory = null"
        >すべて <span class="pill-count">{{ products.length }}</span></button>
        <button
          v-for="cat in presentCategories"
          :key="cat"
          class="pill"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ CATEGORY_EMOJI[cat] }} {{ CATEGORY_LABELS[cat] }}
          <span class="pill-count">{{ countByCategory(cat) }}</span>
        </button>
      </div>

      <div class="toolbar-right">
        <select class="sort-select" v-model="sortOrder">
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
          <option value="name">名前順</option>
          <option value="owners">所有者数順</option>
          <option value="category">カテゴリ順</option>
        </select>
        <div class="size-btns">
          <button
            v-for="s in SIZES"
            :key="s.key"
            class="size-btn"
            :class="{ active: gridSize === s.key }"
            :title="s.label"
            @click="setGridSize(s.key)"
          >{{ s.icon }}</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="state-msg">読み込み中…</div>

    <template v-else>
      <div v-if="products.length === 0" class="state-empty">
        商品データがまだありません
      </div>
      <div v-else-if="displayProducts.length === 0" class="state-msg">
        該当する商品がありません
      </div>
      <div
        v-else
        class="cards-grid"
        :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridPx}px, 1fr))` }"
      >
        <div
          v-for="p in displayProducts"
          :key="p.id"
          class="product-card"
          @click="router.push({ name: 'admin-product-detail', params: { id: p.id } })"
        >
          <div class="card-img-wrap">
            <img v-if="p.selectedImageUrl || p.imageUrl" :src="p.selectedImageUrl ?? p.imageUrl" class="card-img" />
            <div v-else class="card-img-empty">
              <span class="card-img-emoji">{{ p.category ? CATEGORY_EMOJI[p.category] : '📦' }}</span>
            </div>
          </div>
          <div class="card-body">
            <p class="card-title">{{ p.name }}</p>
            <p class="card-creator">{{ p.creator || '—' }}</p>
            <div class="card-footer">
              <span class="card-cat" v-if="p.category">{{ CATEGORY_LABELS[p.category] }}</span>
              <div class="card-badges">
                <span class="card-owners" v-if="p.ownerCount">👤{{ p.ownerCount }}</span>
                <span class="card-img-count" v-if="p.imageCount">🖼{{ p.imageCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { CATEGORY_LABELS, CATEGORY_EMOJI, type ItemCategory } from '../../types'

interface Product {
  id: string
  name: string
  creator?: string
  category?: ItemCategory
  brand?: string
  imageUrl?: string
  selectedImageUrl?: string
  ownerCount?: number
  imageCount?: number
  createdAt?: string
}

const router = useRouter()
const products = ref<Product[]>([])
const loading = ref(true)
const searchQuery = ref('')
const activeCategory = ref<ItemCategory | null>(null)
const sortOrder = ref<'newest' | 'oldest' | 'name' | 'owners' | 'category'>('newest')

// ---- グリッドサイズ ----

type GridSize = 'S' | 'M' | 'L'
const SIZES: { key: GridSize; icon: string; label: string; px: number }[] = [
  { key: 'S', icon: '▪▪▪', label: '小', px: 100 },
  { key: 'M', icon: '▪▪',  label: '中', px: 148 },
  { key: 'L', icon: '▪',   label: '大', px: 210 },
]

const STORAGE_KEY = 'penstok_admin_grid_size'
const savedSize = localStorage.getItem(STORAGE_KEY) as GridSize | null
const gridSize = ref<GridSize>(savedSize ?? 'M')
const gridPx = computed(() => SIZES.find(s => s.key === gridSize.value)?.px ?? 148)

function setGridSize(s: GridSize) {
  gridSize.value = s
  localStorage.setItem(STORAGE_KEY, s)
}

// ---- カテゴリ ----

const CATEGORY_ORDER: ItemCategory[] = ['book', 'music', 'video', 'game', 'electronics', 'camera', 'other']

const presentCategories = computed(() => {
  const cats = new Set(products.value.map(p => p.category).filter(Boolean) as ItemCategory[])
  return CATEGORY_ORDER.filter(c => cats.has(c))
})

function countByCategory(cat: ItemCategory) {
  return products.value.filter(p => p.category === cat).length
}

// ---- フィルター & ソート ----

const displayProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()

  let list = products.value.filter(p => {
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.creator ?? '').toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q)
    const matchCat = !activeCategory.value || p.category === activeCategory.value
    return matchSearch && matchCat
  })

  return [...list].sort((a, b) => {
    switch (sortOrder.value) {
      case 'newest':   return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      case 'oldest':   return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      case 'name':     return a.name.localeCompare(b.name, 'ja')
      case 'owners':   return (b.ownerCount ?? 0) - (a.ownerCount ?? 0)
      case 'category': {
        const ci = CATEGORY_ORDER.indexOf(a.category ?? 'other') - CATEGORY_ORDER.indexOf(b.category ?? 'other')
        return ci !== 0 ? ci : a.name.localeCompare(b.name, 'ja')
      }
    }
  })
})

// ---- データ取得 ----

onMounted(async () => {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(200))
  const snap = await getDocs(q)
  products.value = snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString().split('T')[0]
        : data.createdAt ?? '',
    } as Product
  })
  loading.value = false
})
</script>

<style scoped>
.products-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #2c2315;
}

.badge {
  background: #f0ece4;
  color: #8b6914;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}

/* 検索 */
.search-row { margin-bottom: 14px; }

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid #e0dbd0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #2c2315;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.search-input:focus { border-color: #8b6914; }

/* ツールバー */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding: 8px 0;
  border-bottom: 1px solid #f0ece4;
}

.filter-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}
.filter-pills::-webkit-scrollbar { display: none; }

.pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: 1.5px solid #e0dbd0;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: #a09070;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.pill:hover { border-color: #8b6914; color: #8b6914; }
.pill.active { background: #8b6914; border-color: #8b6914; color: #fff; }
.pill-count { font-size: 10px; opacity: 0.75; }

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.sort-select {
  height: 28px;
  padding: 0 8px;
  border: 1.5px solid #e0dbd0;
  border-radius: 6px;
  font-size: 11px;
  font-family: inherit;
  color: #6b5a3a;
  background: #fff;
  outline: none;
  cursor: pointer;
}

.size-btns {
  display: flex;
  gap: 2px;
  background: #f0ece4;
  border-radius: 6px;
  padding: 2px;
}

.size-btn {
  width: 28px;
  height: 24px;
  border: none;
  border-radius: 4px;
  font-size: 9px;
  font-family: monospace;
  color: #a09070;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  letter-spacing: -1px;
}
.size-btn.active { background: #fff; color: #8b6914; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* 状態 */
.state-msg {
  text-align: center;
  padding: 48px 0;
  font-size: 13px;
  color: #b0a090;
}

.state-empty {
  padding: 48px 0;
  text-align: center;
  font-size: 13px;
  color: #b0a090;
}

/* カードグリッド */
.cards-grid {
  display: grid;
  gap: 12px;
}

.product-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}

.card-img-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #f0ece4;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-img { width: 100%; height: 100%; object-fit: cover; display: block; }

.card-img-empty {
  width: 100%;
  height: 100%;
  background: #ede8e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-img-emoji { font-size: 28px; opacity: 0.4; }

.card-body { padding: 8px 10px 10px; }

.card-title {
  font-size: 11px;
  font-weight: 600;
  color: #2c2315;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 2px;
}

.card-creator {
  font-size: 10px;
  color: #a09070;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.card-cat {
  font-size: 9px;
  font-weight: 600;
  color: #8b6914;
  background: #fdf3dc;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 75%;
}

.card-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.card-owners, .card-img-count {
  font-size: 9px;
  color: #b0a090;
  white-space: nowrap;
}

.card-img-count {
  color: #4f65d2;
  font-weight: 600;
}
</style>
