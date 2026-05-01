<template>
  <div class="ev-list">

    <!-- ヘッダー -->
    <div class="ev-header">
      <div>
        <h1 class="ev-heading">イベント一覧</h1>
        <p class="ev-sub">工事・点検・修理などの履歴</p>
      </div>
      <button class="add-btn" @click="router.push({ name: 'karte-event-new' })">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        追加
      </button>
    </div>

    <!-- フィルター -->
    <div class="filter-row">
      <button
        v-for="(label, cat) in EVENT_FILTER_CATEGORY_LABELS"
        :key="cat"
        class="filter-chip"
        :class="{ active: activeFilter === cat }"
        @click="activeFilter = cat as EventFilterCategory"
      >{{ label }}</button>
    </div>

    <!-- ローディング -->
    <div v-if="!loaded" class="ev-loading">読み込み中…</div>

    <!-- 一覧 -->
    <div v-else-if="filtered.length > 0" class="ev-cards">
      <div
        v-for="ev in filtered"
        :key="ev.eventId"
        class="ev-card"
        @click="router.push({ name: 'karte-event-detail', params: { id: ev.eventId } })"
      >
        <div class="ev-card-left">
          <div class="ev-type-icon" :class="`type--${ev.eventType}`">
            {{ TIMELINE_EVENT_TYPE_EMOJI[ev.eventType] }}
          </div>
          <div class="ev-card-info">
            <div class="ev-card-title">{{ ev.title }}</div>
            <div class="ev-card-meta">
              <span class="ev-type-label">{{ TIMELINE_EVENT_TYPE_LABELS[ev.eventType] }}</span>
              <span v-if="ev.contractor" class="ev-contractor">{{ ev.contractor }}</span>
            </div>
            <div class="ev-card-date">{{ formatDate(ev.eventDate) }}</div>
          </div>
        </div>
        <svg class="ev-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>

    <!-- 空状態 -->
    <div v-else class="ev-empty">
      <span class="empty-icon">📋</span>
      <p class="empty-title">
        {{ activeFilter === 'all' ? 'イベントがありません' : 'このカテゴリのイベントはありません' }}
      </p>
      <p class="empty-sub">工事・点検・修理などを記録しましょう</p>
      <button v-if="activeFilter === 'all'" class="empty-add-btn"
        @click="router.push({ name: 'karte-event-new' })">
        イベントを追加する
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../../lib/auth'
import { subscribeEvents } from '../../services/events'
import {
  TIMELINE_EVENT_TYPE_LABELS,
  TIMELINE_EVENT_TYPE_EMOJI,
  EVENT_FILTER_CATEGORY_LABELS,
} from '../../types'
import type { KarteTimelineEvent, EventFilterCategory } from '../../types'

const router      = useRouter()
const items       = ref<KarteTimelineEvent[]>([])
const loaded      = ref(false)
const activeFilter = ref<EventFilterCategory>('all')
let unsub: (() => void) | null = null

const filtered = computed(() => {
  if (activeFilter.value === 'all') return items.value
  return items.value.filter((ev) => ev.filterCategory === activeFilter.value)
})

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return
  unsub = subscribeEvents(uid, (data) => {
    items.value = data
    loaded.value = true
  })
})

onUnmounted(() => { unsub?.() })
</script>

<style scoped>
.ev-list {
  min-height: 100vh;
  background: #f9f9f7;
  color: #1b3a5c;
  padding-top: 54px;
  padding-bottom: 48px;
}

/* ===== ヘッダー ===== */
.ev-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 22px 20px 14px;
}

.ev-heading { font-size: 22px; font-weight: 900; letter-spacing: -0.01em; }
.ev-sub     { font-size: 12px; color: rgba(27, 58, 92, 0.44); margin-top: 3px; }

.add-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 14px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s;
}
.add-btn svg { width: 14px; height: 14px; }
.add-btn:active { opacity: 0.75; }

/* ===== フィルター ===== */
.filter-row {
  display: flex;
  gap: 7px;
  padding: 0 16px 14px;
  overflow-x: auto;
  scrollbar-width: none;
}
.filter-row::-webkit-scrollbar { display: none; }

.filter-chip {
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid rgba(27, 58, 92, 0.14);
  background: #fff;
  color: rgba(27, 58, 92, 0.55);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.filter-chip.active {
  background: #1b3a5c;
  border-color: #1b3a5c;
  color: #fff;
}

/* ===== ローディング ===== */
.ev-loading {
  padding: 60px;
  text-align: center;
  font-size: 13px;
  color: rgba(27, 58, 92, 0.4);
}

/* ===== カードリスト ===== */
.ev-cards {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ev-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 18px;
  padding: 14px 14px;
  box-shadow: 0 2px 10px rgba(27, 58, 92, 0.07);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s, box-shadow 0.1s;
}
.ev-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(27, 58, 92, 0.05);
}

.ev-card-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }

.ev-type-icon {
  width: 44px; height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: rgba(27, 58, 92, 0.07);
}
.type--construction { background: rgba(45, 106, 79, 0.12); }
.type--repair       { background: rgba(220, 80, 80, 0.1); }
.type--inspection   { background: rgba(80, 130, 200, 0.1); }
.type--replacement  { background: rgba(244, 162, 97, 0.15); }
.type--purchase     { background: rgba(130, 100, 200, 0.1); }
.type--move_in      { background: rgba(45, 106, 79, 0.12); }

.ev-card-info { flex: 1; min-width: 0; }

.ev-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ev-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.ev-type-label {
  font-size: 10px;
  font-weight: 700;
  background: rgba(27, 58, 92, 0.07);
  color: rgba(27, 58, 92, 0.55);
  padding: 1px 6px;
  border-radius: 999px;
}

.ev-contractor {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.ev-card-date {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.4);
  margin-top: 3px;
}

.ev-card-arrow {
  width: 16px; height: 16px;
  color: rgba(27, 58, 92, 0.25);
  flex-shrink: 0;
}

/* ===== 空状態 ===== */
.ev-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 24px 80px;
  text-align: center;
}
.empty-icon  { font-size: 48px; }
.empty-title { font-size: 17px; font-weight: 800; color: #1b3a5c; }
.empty-sub   { font-size: 13px; color: rgba(27, 58, 92, 0.46); line-height: 1.7; }

.empty-add-btn {
  margin-top: 8px;
  height: 44px;
  padding: 0 24px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.12s;
}
.empty-add-btn:active { opacity: 0.75; }
</style>
