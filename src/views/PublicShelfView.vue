<template>
  <div class="pub-view">
    <header class="pub-header">
      <span class="pub-logo">Penstok</span>
      <a href="/login" class="pub-login-btn">ログインして始める →</a>
    </header>

    <div v-if="!loading && items.length > 0" class="pub-toolbar">
      <span class="pub-count">{{ items.length }}件</span>
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

    <main class="pub-main">
      <div v-if="loading" class="state-msg">読み込み中…</div>
      <div v-else-if="items.length === 0" class="state-msg">公開中のアイテムがありません</div>
      <div
        v-else
        class="pub-grid"
        :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridPx}px, 1fr))` }"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="pub-card"
          @click="router.push(`/u/${handle}/${item.id}`)"
        >
          <div class="pub-img-wrap">
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="pub-img" />
            <span v-else class="pub-img-fallback">{{ CATEGORY_EMOJI[item.category] ?? '📦' }}</span>
          </div>
        </div>
      </div>
    </main>

    <footer class="pub-footer">
      <p class="pub-footer-text">Penstokで自分の棚を管理・共有しよう</p>
      <a href="/login" class="pub-cta-btn">無料で始める</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { userProfileStore } from '../store/userProfile'
import { CATEGORY_EMOJI, type ItemCategory } from '../types'

interface PublicItem {
  id: string
  name: string
  imageUrl: string
  category: ItemCategory
  addedAt: string
  showOnPublic?: boolean
}

const route = useRoute()
const router = useRouter()
const handle = route.params.uid as string
const resolvedUid = ref<string | null>(null)

const items = ref<PublicItem[]>([])
const loading = ref(true)

// ---- グリッドサイズ ----
type GridSize = 'S' | 'M' | 'L'
const SIZES: { key: GridSize; icon: string; label: string; px: number }[] = [
  { key: 'S', icon: '▪▪▪', label: '小', px: 72  },
  { key: 'M', icon: '▪▪',  label: '中', px: 104 },
  { key: 'L', icon: '▪',   label: '大', px: 148 },
]
const STORAGE_KEY = 'penstok_pub_grid_size'
const savedSize = localStorage.getItem(STORAGE_KEY) as GridSize | null
const gridSize = ref<GridSize>(savedSize ?? 'M')
const gridPx = computed(() => SIZES.find(s => s.key === gridSize.value)?.px ?? 104)
function setGridSize(s: GridSize) {
  gridSize.value = s
  localStorage.setItem(STORAGE_KEY, s)
}

onMounted(async () => {
  try {
    const uid = await userProfileStore.resolveUid(handle)
    if (!uid) { loading.value = false; return }
    resolvedUid.value = uid
    const q = query(
      collection(db, 'users', uid, 'items'),
      where('status', '==', 'owned'),
    )
    const snap = await getDocs(q)
    items.value = snap.docs
      .map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: (data.name as string) ?? '',
          imageUrl: (data.customImageUrl as string) || (data.imageUrl as string) || '',
          category: (data.category as ItemCategory) ?? 'other',
          addedAt: (data.addedAt as string) ?? '',
          showOnPublic: data.showOnPublic as boolean | undefined,
        }
      })
      .filter(i => i.name && i.showOnPublic !== false)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  } catch (e) {
    console.warn('public shelf load error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pub-view {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

.pub-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 54px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-subtle);
}

.pub-logo {
  font-size: 18px;
  font-weight: 800;
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.04em;
  background: linear-gradient(180deg,
    #f8f0c0 0%,
    #c9941a 22%,
    #f5d060 48%,
    #a87010 74%,
    #f0e0a0 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.pub-login-btn {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  padding: 6px 14px;
  border: 1.5px solid var(--accent);
  border-radius: 20px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.pub-login-btn:hover { background: var(--accent); color: #fff; }

.pub-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 40px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg);
}

.pub-count {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 0.04em;
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

.pub-main {
  flex: 1;
  padding: 12px 12px 32px;
}

.state-msg {
  text-align: center;
  padding: 64px 0;
  font-size: 13px;
  color: var(--text-faint);
}

.pub-grid {
  display: grid;
  gap: 3px;
}

.pub-card {
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-faint);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}
.pub-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.pub-img-wrap {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 4px;
  box-sizing: border-box;
}
.pub-img { width: 100%; height: 100%; object-fit: contain; display: block; }
.pub-img-fallback { font-size: 28px; opacity: 0.4; }

.pub-footer {
  text-align: center;
  padding: 32px 20px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border-top: 1px solid var(--border-subtle);
}
.pub-footer-text { font-size: 13px; color: var(--text-muted); }
.pub-cta-btn {
  display: inline-block;
  padding: 12px 32px;
  background: var(--accent);
  color: #fff;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.pub-cta-btn:hover { background: var(--accent-hover); }
</style>
