<template>
  <header class="karte-toolbar">
    <!-- ハンバーガー（ホーム画面のみ） -->
    <button v-if="isHomeRoute" class="hamburger-btn" @click="drawer.toggle()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="3" y1="6"  x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <button class="logo-btn" @click="router.push({ name: 'karte-home' })">
      <span class="logo-owl">🦉</span>
      <span class="logo-word">Karte</span>
    </button>

    <div class="toolbar-right">
      <!-- 通知バッジ -->
      <div class="notification-wrap" @click="router.push({ name: 'karte-home' })">
        <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span v-if="hasUnread" class="notif-dot" />
      </div>

      <!-- Buildog切替（施工店ユーザーの場合） -->
      <button class="switch-btn" @click="router.push({ name: 'project-list' })">
        施工記録
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authState } from '../../lib/auth'
import { subscribeKarteBoards, hasBoardUnread } from '../../services/board'
import { useKarteDrawer } from '../../composables/useKarteDrawer'
import type { BoardDoc } from '../../types'

const router = useRouter()
const route  = useRoute()
const drawer = useKarteDrawer()
const isHomeRoute = computed(() => route.name === 'karte-home')

const myBoards = ref<BoardDoc[]>([])
const hasUnread = ref(false)
let unsubBoards: (() => void) | null = null

function checkUnread(boards: BoardDoc[]) {
  hasUnread.value = boards.some((b) => hasBoardUnread(b.boardId, b.updatedAt))
}

onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return
  unsubBoards = subscribeKarteBoards(uid, (boards) => {
    myBoards.value = boards
    checkUnread(boards)
  })
})

onUnmounted(() => {
  unsubBoards?.()
})
</script>

<style scoped>
.karte-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: #1b3a5c;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 12px rgba(27, 58, 92, 0.2);
}

.hamburger-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
  margin-right: 2px;
}
.hamburger-btn svg {
  width: 20px;
  height: 20px;
}

.logo-btn {
  border: none;
  background: none;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.logo-owl {
  font-size: 22px;
  line-height: 1;
}

.logo-word {
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-icon {
  width: 22px;
  height: 22px;
  color: rgba(255, 255, 255, 0.7);
}

.notification-wrap {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
}

.notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: #f4a261;
  border-radius: 50%;
  border: 2px solid #1b3a5c;
}

.switch-btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.switch-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 520px) {
  .karte-toolbar {
    padding: 0 12px;
  }
}
</style>
