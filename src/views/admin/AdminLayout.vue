<template>
  <div class="admin-view">
    <div class="admin-subnav">
      <RouterLink class="nav-link" :to="{ name: 'admin-products' }">商品DB</RouterLink>
      <RouterLink
        v-if="userProfileStore.isAdmin"
        class="nav-link"
        :to="{ name: 'admin-users' }"
      >ユーザー</RouterLink>
    </div>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { userProfileStore } from '../../store/userProfile'
</script>

<style scoped>
.admin-view {
  min-height: 100vh;
  background: var(--bg);
}

.admin-subnav {
  position: sticky;
  top: 54px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 24px;
  height: 44px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--toolbar-border);
}

.nav-link {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.nav-link:hover { color: var(--accent); background: var(--accent-bg-dim); }
.nav-link.router-link-active {
  color: var(--accent);
  background: var(--accent-bg);
  font-weight: 600;
}

@media (max-width: 430px) {
  .admin-subnav { padding: 0 14px; }
}
</style>
