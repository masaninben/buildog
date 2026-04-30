<template>
  <div class="karte-home">

    <!-- ===== サイドメニューオーバーレイ ===== -->
    <Transition name="overlay-fade">
      <div
        v-if="drawer.isOpen.value"
        class="drawer-overlay"
        @click="drawer.close()"
      />
    </Transition>

    <!-- ===== サイドメニュー ===== -->
    <Transition name="drawer-slide">
      <aside v-if="drawer.isOpen.value" class="side-drawer">
        <div class="drawer-head">
          <span class="drawer-title">🦉 メニュー</span>
          <button class="drawer-close" @click="drawer.close()">✕</button>
        </div>

        <!-- 参加中の工事 -->
        <div class="drawer-section">
          <p class="drawer-section-label">参加中の工事</p>
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
          <p v-else class="drawer-empty">現在参加中の工事はありません</p>
        </div>
      </aside>
    </Transition>

    <!-- ===== メインコンテンツ：住宅タイムライン ===== -->
    <div class="home-content">

      <!-- タイムラインヘッダー -->
      <div class="timeline-header">
        <h1 class="timeline-heading">住宅ログ</h1>
        <p class="timeline-sub">この家のできごとを記録します</p>
      </div>

      <!-- タイムライン本体 -->
      <div v-if="!loaded" class="timeline-loading">
        読み込み中…
      </div>

      <div v-else-if="timelineEvents.length > 0" class="timeline">
        <template v-for="(group, gi) in groupedEvents" :key="gi">
          <!-- 年ラベル -->
          <div class="year-label">{{ group.year }}年</div>

          <!-- イベント -->
          <div v-for="ev in group.events" :key="ev.id" class="timeline-item">
            <div class="tl-dot" :class="`tl-dot--${ev.type}`" />
            <div class="tl-card" @click="ev.boardId && goToBoard(ev.boardId)">
              <!-- カバー写真 -->
              <div v-if="ev.coverPhotoUrl" class="tl-thumb">
                <img :src="ev.coverPhotoUrl" class="tl-thumb-img" />
              </div>
              <!-- テキスト -->
              <div class="tl-body">
                <div class="tl-type-badge" :class="`badge--${ev.type}`">
                  {{ typeLabel(ev.type) }}
                </div>
                <p class="tl-title">{{ ev.title }}</p>
                <p class="tl-date">{{ formatDate(ev.date) }}</p>
                <div v-if="ev.boardId" class="tl-action">
                  施工記録・連絡を見る
                  <span v-if="hasBoardUnread(ev.boardId, ev.updatedAt)" class="tl-unread" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 空状態 -->
      <div v-else class="timeline-empty">
        <span class="empty-owl">🦉</span>
        <p class="empty-title">まだ記録がありません</p>
        <p class="empty-sub">担当業者との工事が記録されると<br>ここにタイムラインで表示されます</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { authState } from '../../lib/auth'
import { subscribeKarteBoards, hasBoardUnread, markBoardVisited } from '../../services/board'
import { useKarteDrawer } from '../../composables/useKarteDrawer'
import type { BoardDoc } from '../../types'

const router = useRouter()
const drawer = useKarteDrawer()

// ===== ボード一覧（サイドメニュー & タイムライン共用） =====
const boards  = ref<BoardDoc[]>([])
const loaded  = ref(false)
let unsubBoards: (() => void) | null = null

// ===== タイムラインイベント型 =====
type EventType = 'construction' // 将来: 'equipment' | 'trouble' | 'memo'

interface TimelineEvent {
  id:            string
  type:          EventType
  title:         string
  date:          string          // ISO
  updatedAt?:    string
  boardId?:      string
  coverPhotoUrl?: string
}

// ===== ボードからタイムラインイベントに変換 =====
const timelineEvents = ref<TimelineEvent[]>([])

// 年ごとにグループ化
const groupedEvents = computed(() => {
  const map = new Map<number, TimelineEvent[]>()
  for (const ev of timelineEvents.value) {
    const year = new Date(ev.date).getFullYear()
    if (!map.has(year)) map.set(year, [])
    map.get(year)!.push(ev)
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a)  // 新しい年を上に
    .map(([year, events]) => ({ year, events }))
})

function typeLabel(type: EventType): string {
  if (type === 'construction') return '工事'
  return 'できごと'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

// ===== ナビゲーション =====
function goToBoard(boardId: string) {
  drawer.close()
  markBoardVisited(boardId)
  router.push({ name: 'karte-board', params: { boardId } })
}

// ===== マウント =====
onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return

  unsubBoards = subscribeKarteBoards(uid, async (rawBoards) => {
    boards.value = rawBoards

    // 案件ドキュメントを並列取得してタイムラインイベントを生成
    const projectSnaps = await Promise.all(
      rawBoards.map((b) => getDoc(doc(db, 'projects', b.projectId))),
    )
    timelineEvents.value = rawBoards.map((b, i) => {
      const data = projectSnaps[i].exists() ? projectSnaps[i].data() : null
      return {
        id:            b.boardId,
        type:          'construction' as EventType,
        title:         b.projectName,
        date:          b.createdAt,
        updatedAt:     b.updatedAt,
        boardId:       b.boardId,
        coverPhotoUrl: data?.coverPhotoUrl || undefined,
      }
    }).sort((a, b) => b.date.localeCompare(a.date))  // 新しい順

    loaded.value = true
  })
})

onUnmounted(() => {
  unsubBoards?.()
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
  top: 0;
  left: 0;
  bottom: 0;
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
}

.drawer-title {
  font-size: 16px;
  font-weight: 800;
  color: #1b3a5c;
}

.drawer-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(27, 58, 92, 0.07);
  border-radius: 50%;
  color: rgba(27, 58, 92, 0.6);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-section {
  padding: 16px;
}

.drawer-section-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.4);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.drawer-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: none;
  background: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}
.drawer-item:hover { background: rgba(27, 58, 92, 0.05); }
.drawer-item:active { background: rgba(27, 58, 92, 0.08); }

.drawer-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(27, 58, 92, 0.2);
  flex-shrink: 0;
  transition: background 0.15s;
}
.drawer-item-dot.unread {
  background: #f4a261;
}

.drawer-item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-item-arrow {
  width: 16px;
  height: 16px;
  color: rgba(27, 58, 92, 0.3);
  flex-shrink: 0;
}

.drawer-empty {
  font-size: 12px;
  color: rgba(27, 58, 92, 0.4);
  padding: 8px 12px;
  line-height: 1.6;
}

/* ===== メインコンテンツ ===== */
.home-content {
  padding-top: 54px; /* KarteToolbar の高さ */
}

.timeline-header {
  padding: 24px 20px 8px;
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

/* ローディング */
.timeline-loading {
  padding: 60px 24px;
  text-align: center;
  font-size: 13px;
  color: rgba(27, 58, 92, 0.4);
}

/* ===== タイムライン ===== */
.timeline {
  padding: 16px 20px 48px;
  position: relative;
}

/* 縦ライン */
.timeline::before {
  content: '';
  position: absolute;
  left: 32px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  background: rgba(27, 58, 92, 0.1);
  border-radius: 1px;
}

/* 年ラベル */
.year-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.4);
  letter-spacing: 0.08em;
  margin: 8px 0 14px 40px;
}

/* タイムラインアイテム */
.timeline-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
}

/* ドット */
.tl-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  margin-top: 14px;
  border: 3px solid #fff;
}
.tl-dot--construction { background: #2d6a4f; }

/* カード */
.tl-card {
  flex: 1;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(27, 58, 92, 0.08);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s, box-shadow 0.1s;
}
.tl-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(27, 58, 92, 0.06);
}

/* カバー写真 */
.tl-thumb {
  width: 100%;
  height: 120px;
  overflow: hidden;
}
.tl-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* カード本文 */
.tl-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tl-type-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  align-self: flex-start;
}
.badge--construction {
  background: rgba(45, 106, 79, 0.1);
  color: #2d6a4f;
}

.tl-title {
  font-size: 15px;
  font-weight: 700;
  color: #1b3a5c;
  line-height: 1.4;
}

.tl-date {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.44);
}

.tl-action {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #2d6a4f;
}
.tl-action svg {
  width: 14px;
  height: 14px;
}

.tl-unread {
  width: 7px;
  height: 7px;
  background: #f4a261;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ===== 空状態 ===== */
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 24px 80px;
  text-align: center;
}
.empty-owl   { font-size: 52px; }
.empty-title { font-size: 17px; font-weight: 800; color: #1b3a5c; }
.empty-sub   { font-size: 13px; color: rgba(27, 58, 92, 0.46); line-height: 1.7; }

/* ===== トランジション ===== */
.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.22s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0; }

.drawer-slide-enter-active,
.drawer-slide-leave-active { transition: transform 0.24s ease; }
.drawer-slide-enter-from,
.drawer-slide-leave-to { transform: translateX(-100%); }
</style>
