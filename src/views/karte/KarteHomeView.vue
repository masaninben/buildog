<template>
  <div class="karte-home">

    <!-- ボードリスト -->
    <section v-if="boards.length > 0" class="board-list">
      <p class="list-heading">参加中の工事</p>
      <div
        v-for="b in boards"
        :key="b.boardId"
        class="board-card"
        @click="goToBoard(b.boardId)"
      >
        <!-- カバー写真 -->
        <div class="card-thumb">
          <img v-if="b.coverPhotoUrl" :src="b.coverPhotoUrl" class="thumb-img" />
          <div v-else class="thumb-placeholder">🏠</div>
        </div>

        <!-- テキスト -->
        <div class="card-body">
          <div class="card-name">
            {{ b.projectName }}
            <span v-if="hasBoardUnread(b.boardId, b.updatedAt)" class="unread-dot" />
          </div>
          <div class="card-sub">{{ b.lastMessage || '施工担当からの連絡' }}</div>
        </div>

        <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </section>

    <!-- 空状態 -->
    <div v-else-if="loaded" class="empty-state">
      <span class="empty-owl">🦉</span>
      <h1 class="empty-title">マイホームカルテ</h1>
      <p class="empty-sub">担当業者からの招待を<br>お待ちください</p>
    </div>

    <!-- ロード中 -->
    <div v-else class="empty-state">
      <p class="empty-sub">読み込み中…</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { authState } from '../../lib/auth'
import { subscribeKarteBoards, hasBoardUnread, markBoardVisited } from '../../services/board'
import type { BoardDoc } from '../../types'

interface BoardItem extends BoardDoc {
  coverPhotoUrl?: string
  lastMessage?: string
}

const router = useRouter()
const boards = ref<BoardItem[]>([])
const loaded = ref(false)
let unsubBoards: (() => void) | null = null

function goToBoard(boardId: string) {
  markBoardVisited(boardId)
  router.push({ name: 'karte-board', params: { boardId } })
}

onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return
  unsubBoards = subscribeKarteBoards(uid, async (rawBoards) => {
    // 案件ドキュメントをまとめて取得してカバー写真・最終メッセージを付加
    const projectSnaps = await Promise.all(
      rawBoards.map((b) => getDoc(doc(db, 'projects', b.projectId))),
    )
    boards.value = rawBoards.map((b, i) => {
      const data = projectSnaps[i].exists() ? projectSnaps[i].data() : null
      return {
        ...b,
        coverPhotoUrl: data?.coverPhotoUrl || undefined,
        lastMessage:   data?.boardLastMessageText || undefined,
      }
    })
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
  padding-bottom: 16px;
}

/* ボードリスト */
.board-list {
  padding: 20px 16px 0;
}

.list-heading {
  font-size: 11px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.44);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 10px;
  padding-left: 2px;
}

.board-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 18px;
  margin-bottom: 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 10px rgba(27, 58, 92, 0.07);
  transition: opacity 0.12s;
}
.board-card:active { opacity: 0.75; }

/* サムネイル */
.card-thumb {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(27, 58, 92, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  font-size: 28px;
}

/* テキスト */
.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-name {
  font-size: 15px;
  font-weight: 700;
  color: #1b3a5c;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #f4a261;
  border-radius: 50%;
  flex-shrink: 0;
}

.card-sub {
  font-size: 12px;
  color: rgba(27, 58, 92, 0.48);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-arrow {
  width: 18px;
  height: 18px;
  color: rgba(27, 58, 92, 0.3);
  flex-shrink: 0;
}

/* 空状態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 24px;
  text-align: center;
}

.empty-owl   { font-size: 56px; }
.empty-title { font-size: 22px; font-weight: 800; color: #1b3a5c; }
.empty-sub   { font-size: 14px; color: rgba(27, 58, 92, 0.48); line-height: 1.7; }
</style>
