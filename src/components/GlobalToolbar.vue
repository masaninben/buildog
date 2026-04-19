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

      <!-- About -->
      <button
        class="nav-btn"
        :class="{ active: route.name === 'about' }"
        @click="router.push({ name: 'about' })"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8.5" stroke-width="2.5"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
        <span class="nav-label">About</span>
      </button>

      <!-- テーマ切替 -->
      <button class="nav-btn nav-btn--theme" @click="toggleTheme" :title="isDark ? 'ライトモードへ' : 'ダークモードへ'">
        <!-- Sun icon (light mode indicator) -->
        <svg v-if="isDark" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <!-- Moon icon (dark mode indicator) -->
        <svg v-else class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <span class="nav-label">{{ isDark ? 'ライト' : 'ダーク' }}</span>
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
import { useTheme } from '../composables/useTheme'

defineEmits<{ openAccount: [] }>()

const router = useRouter()
const route = useRoute()
const profile = computed(() => userProfileStore.profile)
const isInAdmin = computed(() => String(route.name ?? '').startsWith('admin'))

const { theme, toggle } = useTheme()
const isDark = computed(() => theme.value === 'dark')

function toggleTheme() {
  toggle()
}
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
  background: var(--toolbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--toolbar-border);
}

.logo-btn {
  background: none;
  border: none;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  user-select: none;
  flex-shrink: 0;
}

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
  min-width: 48px;
  height: 44px;
  padding: 0 6px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.nav-btn:hover { background: var(--accent-bg); color: var(--accent); }
.nav-btn.active { color: var(--accent); background: var(--accent-bg); }

.nav-icon { width: 20px; height: 20px; flex-shrink: 0; }

.nav-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.nav-btn--add { color: var(--accent); }
.nav-btn--add:hover { background: var(--accent-bg); }
.nav-btn--add.active { background: var(--accent-bg); }

.nav-btn--theme { color: var(--text-faint); }
.nav-btn--theme:hover { color: var(--accent); background: var(--accent-bg); }

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

@media (max-width: 480px) {
  .global-toolbar { padding: 0 10px; }
  .nav-label { display: none; }
  .nav-btn { min-width: 36px; padding: 0 4px; }
}
</style>
