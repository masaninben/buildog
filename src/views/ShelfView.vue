<template>
  <div class="shelf-view">
    <!-- ツールバー：フィルター・ソート・サイズ -->
    <div v-if="store.loaded && allItems.length > 0" class="toolbar">
      <div class="filter-pills">
        <button
          class="pill"
          :class="{ active: activeCategory === null }"
          @click="activeCategory = null"
        >すべて <span class="pill-count">{{ allItems.length }}</span></button>
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
          <option value="newest">所有→アーカイブ順</option>
          <option value="oldest">古い順</option>
          <option value="name">名前順</option>
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

    <main class="shelf-main">
      <div v-if="!store.loaded" class="state-msg">読み込み中…</div>

      <div v-else-if="allItems.length === 0" class="state-empty">
        <p class="empty-icon">📦</p>
        <p class="empty-text">まだアイテムがありません</p>
        <button class="empty-add-btn" @click="router.push({ name: 'add-item' })">
          + 最初のアイテムを追加
        </button>
      </div>

      <div v-else-if="displayItems.length === 0" class="state-msg">
        このカテゴリのアイテムはありません
      </div>

      <div
        v-else
        class="shelf-grid"
        :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridPx}px, 1fr))` }"
      >
        <ShelfCard
          v-for="item in displayItems"
          :key="item.id"
          :item="item"
          @click="handleCardClick"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import ShelfCard from '../components/ShelfCard.vue'
import { store } from '../store/shelf'
import { productStore } from '../store/products'
import { userProfileStore } from '../store/userProfile'
import { CATEGORY_LABELS, CATEGORY_EMOJI, type ShelfItem, type ItemCategory } from '../types'

const router = useRouter()

// ---- グリッドサイズ ----

type GridSize = 'S' | 'M' | 'L'
const SIZES: { key: GridSize; icon: string; label: string; px: number }[] = [
  { key: 'S', icon: '▪▪▪', label: '小', px: 72  },
  { key: 'M', icon: '▪▪',  label: '中', px: 104 },
  { key: 'L', icon: '▪',   label: '大', px: 148 },
]

const STORAGE_KEY_SIZE = 'penstok_grid_size'
const savedSize = localStorage.getItem(STORAGE_KEY_SIZE) as GridSize | null
const gridSize = ref<GridSize>(savedSize ?? 'M')
const gridPx = computed(() => SIZES.find(s => s.key === gridSize.value)?.px ?? 104)

function setGridSize(s: GridSize) {
  gridSize.value = s
  localStorage.setItem(STORAGE_KEY_SIZE, s)
}

// ---- フィルター・ソート ----

const activeCategory = ref<ItemCategory | null>(null)
const sortOrder = ref<'newest' | 'oldest' | 'name' | 'category'>('newest')

const allItems = computed(() => store.items)

watch(allItems, (items) => {
  const ids = items.map(i => i.productId).filter(Boolean) as string[]
  if (ids.length) productStore.prefetch(ids)
}, { immediate: true })

const presentCategories = computed(() => {
  const cats = new Set(allItems.value.map(i => i.category))
  return (Object.keys(CATEGORY_LABELS) as ItemCategory[]).filter(c => cats.has(c))
})

function countByCategory(cat: ItemCategory) {
  return allItems.value.filter(i => i.category === cat).length
}

const CATEGORY_ORDER: ItemCategory[] = ['book', 'music', 'video', 'game', 'electronics', 'camera', 'other']

const displayItems = computed(() => {
  let items = activeCategory.value
    ? allItems.value.filter(i => i.category === activeCategory.value)
    : allItems.value

  return [...items].sort((a, b) => {
    switch (sortOrder.value) {
      case 'newest': {
        // 所有中→アーカイブ済みの順、各グループ内は更新日降順
        const statusDiff = (a.status === 'owned' ? 0 : 1) - (b.status === 'owned' ? 0 : 1)
        if (statusDiff !== 0) return statusDiff
        const dateA = a.status === 'archived' ? (a.archivedAt ?? a.addedAt ?? '') : (a.addedAt ?? '')
        const dateB = b.status === 'archived' ? (b.archivedAt ?? b.addedAt ?? '') : (b.addedAt ?? '')
        return dateB.localeCompare(dateA)
      }
      case 'oldest':   return (a.addedAt ?? '').localeCompare(b.addedAt ?? '')
      case 'name':     return a.name.localeCompare(b.name, 'ja')
      case 'category': {
        const ci = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
        if (ci !== 0) return ci
        return (b.addedAt ?? '').localeCompare(a.addedAt ?? '')
      }
    }
  })
})

function handleCardClick(item: ShelfItem) {
  router.push({ name: 'item-detail', params: { id: item.id } })
}

// userProfileStore を参照して未使用警告を回避
void userProfileStore
</script>

<style scoped>
.shelf-view {
  min-height: 100vh;
  background: var(--bg);
}

.toolbar {
  position: sticky;
  top: 54px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  height: 48px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-subtle);
}

.filter-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 4px 0;
}
.filter-pills::-webkit-scrollbar { display: none; }

.pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-muted);
  background: var(--bg-subtle);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.pill:hover { border-color: var(--accent); color: var(--accent); }
.pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
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
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-sub);
  background: var(--bg-card);
  outline: none;
  cursor: pointer;
}

.size-btns {
  display: flex;
  gap: 2px;
  background: var(--bg-surface);
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
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  letter-spacing: -1px;
}
.size-btn.active { background: var(--bg-card); color: var(--accent); box-shadow: var(--shadow-sm); }

.shelf-main {
  padding: 16px 16px 80px;
}

.state-msg {
  text-align: center;
  padding: 64px 0;
  font-size: 13px;
  color: var(--text-faint);
}

.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0 0;
  gap: 12px;
}

.empty-icon { font-size: 40px; line-height: 1; opacity: 0.4; }
.empty-text { font-size: 14px; color: var(--text-faint); }

.empty-add-btn {
  margin-top: 8px;
  padding: 9px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.empty-add-btn:hover { background: var(--accent-hover); }

.shelf-grid {
  display: grid;
  gap: 3px;
}

@media (max-width: 430px) {
  .toolbar { padding: 0 12px; gap: 8px; }
  .shelf-main { padding: 12px 12px 80px; }
}
</style>
