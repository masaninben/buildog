<template>
  <header class="global-toolbar">
    <button class="logo-btn" @click="router.push({ name: 'shelf' })">Penstok</button>

    <nav class="toolbar-nav">
      <!-- ホーム -->
      <button
        class="nav-btn"
        :class="{ active: route.name === 'shelf' }"
        @click="router.push({ name: 'shelf' })"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="nav-label">ホーム</span>
      </button>

      <!-- 追加 -->
      <button
        class="nav-btn nav-btn--add"
        :class="{ active: route.name === 'add-item' }"
        @click="router.push({ name: 'add-item' })"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span class="nav-label">追加</span>
      </button>

      <!-- 管理（権限あり時のみ） -->
      <button
        v-if="userProfileStore.canAccessAdmin"
        class="nav-btn"
        :class="{ active: isInAdmin }"
        @click="router.push({ name: 'admin-products' })"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
        <span class="nav-label">管理</span>
      </button>

      <!-- マイページ -->
      <button
        class="nav-btn nav-btn--mypage"
        @click="$emit('openAccount')"
      >
        <div class="mypage-icon-wrap">
          <img v-if="profile?.photoURL" :src="profile.photoURL" class="avatar-img" />
          <svg v-else class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <span class="nav-label">マイページ</span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { userProfileStore } from '../store/userProfile'

defineEmits<{ openAccount: [] }>()

const router = useRouter()
const route = useRoute()
const profile = computed(() => userProfileStore.profile)
const isInAdmin = computed(() => String(route.name ?? '').startsWith('admin'))
</script>

<style scoped>
.global-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(250, 248, 244, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(139, 105, 20, 0.12);
}

.logo-btn {
  background: none;
  border: none;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8b6914;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  user-select: none;
  flex-shrink: 0;
}

/* ナビゲーション */
.toolbar-nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 52px;
  height: 44px;
  padding: 0 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #b0a090;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.nav-btn:hover { background: rgba(139, 105, 20, 0.07); color: #8b6914; }
.nav-btn.active { color: #8b6914; background: rgba(139, 105, 20, 0.1); }

.nav-icon { width: 20px; height: 20px; flex-shrink: 0; }

.nav-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

/* 追加ボタン：アクセント色 */
.nav-btn--add { color: #8b6914; }
.nav-btn--add:hover { background: rgba(139, 105, 20, 0.12); }
.nav-btn--add.active { background: rgba(139, 105, 20, 0.15); }

/* マイページ */
.mypage-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* モバイル: ラベル非表示 */
@media (max-width: 480px) {
  .global-toolbar { padding: 0 12px; }
  .nav-label { display: none; }
  .nav-btn { min-width: 40px; padding: 0 6px; }
}
</style>
