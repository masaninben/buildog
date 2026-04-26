<template>
  <header class="global-toolbar">
    <button class="logo-btn" @click="router.push({ name: 'project-list' })">
      <img src="/brand/buildog-bulldog-icon.jpg" alt="" class="logo-mark" />
      <span class="logo-word">Buildog</span>
    </button>

    <nav class="toolbar-nav">
      <button
        class="nav-btn"
        :class="{ active: route.name === 'project-list' }"
        @click="router.push({ name: 'project-list' })"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
        <span class="nav-label">案件</span>
      </button>

      <button
        class="nav-btn nav-btn--add"
        :class="{ active: route.name === 'project-create' }"
        @click="router.push({ name: 'project-create' })"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <span class="nav-label">新規</span>
      </button>

      <button
        v-if="route.name === 'project-detail'"
        class="nav-btn"
        :class="{ active: route.name === 'project-detail' }"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16v12H4z" />
          <path d="m8 14 2.5-2.5L13 14l2-2 3 3" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
        <span class="nav-label">写真</span>
      </button>

      <button class="nav-btn nav-btn--theme" @click="toggleTheme">
        <svg v-if="isDark" class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <svg v-else class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <span class="nav-label">{{ isDark ? 'ライト' : 'ダーク' }}</span>
      </button>

      <button class="nav-btn nav-btn--mypage" @click="$emit('openAccount')">
        <div class="mypage-icon-wrap">
          <img v-if="profile?.photoURL" :src="profile.photoURL" class="avatar-img" />
          <svg v-else class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span class="nav-label">アカウント</span>
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userProfileStore } from '../store/userProfile'
import { useTheme } from '../composables/useTheme'

defineEmits<{ openAccount: [] }>()

const router = useRouter()
const route = useRoute()
const profile = computed(() => userProfileStore.profile)

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
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--toolbar-border);
  box-shadow: 0 10px 24px rgba(17, 40, 79, 0.16);
}

.logo-btn {
  border: none;
  padding: 0;
  background: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  object-fit: cover;
  object-position: top;
  box-shadow: var(--shadow-sm);
}

.logo-word {
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.toolbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  min-width: 52px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-btn:hover,
.nav-btn.active {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.nav-btn--add {
  color: #fff;
  background: rgba(215, 154, 74, 0.22);
}

.nav-icon {
  width: 20px;
  height: 20px;
}

.nav-label {
  font-size: 9px;
  font-weight: 700;
}

.mypage-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 520px) {
  .global-toolbar {
    padding: 0 10px;
  }

  .nav-label {
    display: none;
  }

  .nav-btn {
    min-width: 40px;
  }

  .logo-word {
    font-size: 18px;
  }
}
</style>
