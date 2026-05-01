<template>
  <div class="karte-home">

    <!-- ===== オーバーレイ ===== -->
    <Transition name="overlay-fade">
      <div v-if="drawer.isOpen.value" class="drawer-overlay" @click="drawer.close()" />
    </Transition>

    <!-- ===== サイドドロワー ===== -->
    <Transition name="drawer-slide">
      <aside v-if="drawer.isOpen.value" class="side-drawer">
        <div class="drawer-head">
          <span class="drawer-title">🦉 メニュー</span>
          <button class="drawer-close" @click="drawer.close()">✕</button>
        </div>

        <!-- ナビリンク -->
        <div class="drawer-section">
          <p class="drawer-section-label">メニュー</p>
          <button class="drawer-nav-item" :class="{ active: $route.name === 'karte-home' }"
            @click="navTo('karte-home')">
            <span class="nav-icon">🏠</span><span>ホーム</span>
          </button>
          <button class="drawer-nav-item" :class="{ active: $route.name === 'karte-event-list' }"
            @click="navTo('karte-event-list')">
            <span class="nav-icon">📋</span><span>イベント一覧</span>
          </button>
          <button class="drawer-nav-item" :class="{ active: $route.name?.toString().startsWith('karte-equipment') }"
            @click="navTo('karte-equipment-list')">
            <span class="nav-icon">🔧</span><span>設備一覧</span>
          </button>
          <button class="drawer-nav-item" @click="navTo('karte-settings')">
            <span class="nav-icon">⚙️</span><span>アカウント設定</span>
          </button>
        </div>

        <!-- 参加中の工事掲示板 -->
        <div class="drawer-section">
          <p class="drawer-section-label">参加中の施工掲示板</p>
          <template v-if="boards.length > 0">
            <button
              v-for="b in boards"
              :key="b.boardId"
              class="drawer-item"
              @click="goToBoard(b.boardId)"
            >
              <span class="drawer-item-dot" :class="{ unread: hasBoardUnread(b.boardId, b.updatedAt) }" />
              <span class="drawer-item-name">{{ b.projectName }}</span>
              <svg class="drawer-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </template>
          <p v-else class="drawer-empty">参加中の掲示板はありません</p>
        </div>
      </aside>
    </Transition>

    <!-- ===== メインコンテンツ ===== -->
    <div class="home-content">

      <!-- ヘッダー -->
      <div class="timeline-header">
        <div>
          <h1 class="timeline-heading">住宅ログ</h1>
          <p class="timeline-sub">この家のできごとを時系列で記録します</p>
        </div>
        <button class="add-event-btn" @click="$router.push({ name: 'karte-event-new' })">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          追加
        </button>
      </div>

      <!-- ローディング -->
      <div v-if="!loaded" class="timeline-loading">読み込み中…</div>

      <!-- タイムライン本体 -->
      <div v-else-if="groupedEvents.length > 0" class="timeline">
        <template v-for="(group, gi) in groupedEvents" :key="gi">

          <!-- 年月ラベル -->
          <div class="ym-label">
            <span class="ym-year">{{ group.year }}年</span>
            <span class="ym-month">{{ group.month }}月</span>
          </div>

          <!-- イベント行 -->
          <div class="event-rows">
            <div
              v-for="ev in group.events"
              :key="ev.id"
              class="event-row"
              @click="goToEvent(ev)"
            >
              <span class="ev-day">{{ ev.day }}<small>日</small></span>
              <span class="ev-emoji">{{ ev.emoji }}</span>
              <span class="ev-title">{{ ev.title }}</span>
              <span v-if="ev.boardId && hasBoardUnread(ev.boardId, ev.updatedAt)" class="ev-unread" />
              <span class="ev-detail">詳細</span>
              <svg class="ev-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

        </template>
      </div>

      <!-- 空状態 -->
      <div v-else class="timeline-empty">
        <span class="empty-owl">🦉</span>
        <p class="empty-title">まだ記録がありません</p>
        <p class="empty-sub">
          工事・点検・設備交換などを記録すると<br>ここにタイムラインで表示されます
        </p>
        <button class="empty-add-btn" @click="$router.push({ name: 'karte-event-new' })">
          最初のイベントを追加
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { authState } from '../../lib/auth'
import { subscribeKarteBoards, hasBoardUnread, markBoardVisited } from '../../services/board'
import { subscribeEvents } from '../../services/events'
import { useKarteDrawer } from '../../composables/useKarteDrawer'
import { TIMELINE_EVENT_TYPE_EMOJI } from '../../types'
import type { BoardDoc, KarteTimelineEvent, TimelineEventType } from '../../types'

const router = useRouter()
const $route = useRoute()
const drawer = useKarteDrawer()

// ===== データ =====
const boards        = ref<BoardDoc[]>([])
const boardEvents   = ref<FlatEvent[]>([])
const manualEvents  = ref<FlatEvent[]>([])
const loaded        = ref(false)
let unsubBoards: (() => void) | null = null
let unsubEvents: (() => void) | null = null

// ===== 内部イベント型（ホーム表示用） =====
interface FlatEvent {
  id:         string
  date:       string          // ISO（ソート用）
  day:        number
  emoji:      string
  title:      string
  updatedAt?: string
  boardId?:   string          // ボード由来
  eventId?:   string          // 手動イベント由来
}

// ===== 年月グループ =====
interface EventGroup {
  year:   number
  month:  number
  events: FlatEvent[]
}

const groupedEvents = computed<EventGroup[]>(() => {
  const all = [...boardEvents.value, ...manualEvents.value]
    .sort((a, b) => b.date.localeCompare(a.date))

  const map = new Map<string, FlatEvent[]>()
  for (const ev of all) {
    const d   = new Date(ev.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, events]) => {
      const [year, month] = key.split('-').map(Number)
      return { year, month: month + 1, events }
    })
})

// ===== ナビゲーション =====
function navTo(name: string) {
  drawer.close()
  router.push({ name })
}

function goToBoard(boardId: string) {
  drawer.close()
  markBoardVisited(boardId)
  router.push({ name: 'karte-board', params: { boardId } })
}

function goToEvent(ev: FlatEvent) {
  if (ev.boardId) {
    markBoardVisited(ev.boardId)
    router.push({ name: 'karte-board', params: { boardId: ev.boardId } })
  } else if (ev.eventId) {
    router.push({ name: 'karte-event-detail', params: { id: ev.eventId } })
  }
}

// ===== マウント =====
onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return

  // ボード由来イベント
  unsubBoards = subscribeKarteBoards(uid, async (rawBoards) => {
    boards.value = rawBoards

    const projectSnaps = await Promise.all(
      rawBoards.map((b) => getDoc(doc(db, 'projects', b.projectId))),
    )
    boardEvents.value = rawBoards.map((b, i) => {
      const d = new Date(b.createdAt)
      return {
        id:        `board-${b.boardId}`,
        date:      b.createdAt,
        day:       d.getDate(),
        emoji:     '🔨',
        title:     b.projectName,
        updatedAt: b.updatedAt,
        boardId:   b.boardId,
      }
    })
    loaded.value = true
  })

  // 手動イベント
  unsubEvents = subscribeEvents(uid, (items) => {
    manualEvents.value = items.map((ev) => {
      const d = new Date(ev.eventDate)
      return {
        id:      ev.eventId,
        date:    ev.eventDate,
        day:     d.getDate(),
        emoji:   TIMELINE_EVENT_TYPE_EMOJI[ev.eventType] ?? '📋',
        title:   ev.title,
        eventId: ev.eventId,
      }
    })
    loaded.value = true
  })
})

onUnmounted(() => {
  unsubBoards?.()
  unsubEvents?.()
})
</script>

<style scoped>
.karte-home {
  min-height: 100vh;
  background: #f9f9f7;
  color: #1b3a5c;
}

/* ===== オーバーレイ ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: rgba(11, 26, 50, 0.46);
}

/* ===== サイドドロワー ===== */
.side-drawer {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 120;
  width: min(78vw, 300px);
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(11, 26, 50, 0.18);
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(16px + env(safe-area-inset-top)) 16px 14px;
  border-bottom: 1px solid rgba(27, 58, 92, 0.08);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 16px;
  font-weight: 800;
  color: #1b3a5c;
}

.drawer-close {
  width: 32px; height: 32px;
  border: none;
  background: rgba(27, 58, 92, 0.07);
  border-radius: 50%;
  color: rgba(27, 58, 92, 0.6);
  font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.drawer-section {
  padding: 14px 12px 8px;
  border-bottom: 1px solid rgba(27, 58, 92, 0.05);
}

.drawer-section-label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.35);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 6px;
  padding: 0 4px;
}

/* ナビリンク */
.drawer-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5c;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}
.drawer-nav-item:hover   { background: rgba(27, 58, 92, 0.05); }
.drawer-nav-item:active  { background: rgba(27, 58, 92, 0.09); }
.drawer-nav-item.active  { background: rgba(27, 58, 92, 0.07); color: #1b3a5c; font-weight: 800; }

.nav-icon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }

/* 掲示板リスト */
.drawer-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}
.drawer-item:hover { background: rgba(27, 58, 92, 0.05); }

.drawer-item-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(27, 58, 92, 0.2);
  flex-shrink: 0;
}
.drawer-item-dot.unread { background: #f4a261; }

.drawer-item-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-item-arrow {
  width: 15px; height: 15px;
  color: rgba(27, 58, 92, 0.28);
  flex-shrink: 0;
}

.drawer-empty {
  font-size: 12px;
  color: rgba(27, 58, 92, 0.4);
  padding: 6px 10px;
  line-height: 1.6;
}

/* ===== メインコンテンツ ===== */
.home-content {
  padding-top: 54px;
}

.timeline-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 22px 20px 12px;
}

.timeline-heading {
  font-size: 22px;
  font-weight: 900;
  color: #1b3a5c;
  letter-spacing: -0.01em;
}

.timeline-sub {
  font-size: 12px;
  color: rgba(27, 58, 92, 0.44);
  margin-top: 3px;
}

.add-event-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 13px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s;
}
.add-event-btn svg { width: 13px; height: 13px; }
.add-event-btn:active { opacity: 0.75; }

/* ローディング */
.timeline-loading {
  padding: 60px 24px;
  text-align: center;
  font-size: 13px;
  color: rgba(27, 58, 92, 0.4);
}

/* ===== タイムライン ===== */
.timeline {
  padding: 4px 0 60px;
}

/* 年月ラベル */
.ym-label {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 18px 20px 8px;
}

.ym-year {
  font-size: 13px;
  font-weight: 800;
  color: rgba(27, 58, 92, 0.55);
}

.ym-month {
  font-size: 18px;
  font-weight: 900;
  color: #1b3a5c;
}

/* イベント行グループ */
.event-rows {
  background: #fff;
  border-radius: 18px;
  margin: 0 16px;
  box-shadow: 0 2px 10px rgba(27, 58, 92, 0.06);
  overflow: hidden;
}

/* 1行 */
.event-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  border-bottom: 1px solid rgba(27, 58, 92, 0.05);
  transition: background 0.1s;
}
.event-row:last-child { border-bottom: none; }
.event-row:active { background: rgba(27, 58, 92, 0.03); }

.ev-day {
  font-size: 17px;
  font-weight: 900;
  color: #1b3a5c;
  width: 28px;
  flex-shrink: 0;
  text-align: right;
  line-height: 1;
}
.ev-day small {
  font-size: 10px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.45);
  margin-left: 1px;
}

.ev-emoji {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.ev-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.ev-unread {
  width: 7px;
  height: 7px;
  background: #f4a261;
  border-radius: 50%;
  flex-shrink: 0;
}

.ev-detail {
  font-size: 11px;
  font-weight: 700;
  color: #2d6a4f;
  flex-shrink: 0;
}

.ev-arrow {
  width: 14px;
  height: 14px;
  color: rgba(27, 58, 92, 0.25);
  flex-shrink: 0;
}

/* ===== 空状態 ===== */
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 24px 80px;
  text-align: center;
}
.empty-owl   { font-size: 52px; }
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
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s;
}
.empty-add-btn:active { opacity: 0.75; }

/* ===== トランジション ===== */
.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.22s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to     { opacity: 0; }

.drawer-slide-enter-active,
.drawer-slide-leave-active { transition: transform 0.24s ease; }
.drawer-slide-enter-from,
.drawer-slide-leave-to     { transform: translateX(-100%); }
</style>
