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
  background: #faf8f4;
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
  background: rgba(250, 248, 244, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(139, 105, 20, 0.1);
}

.nav-link {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #b0a090;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.nav-link:hover { color: #8b6914; background: rgba(139, 105, 20, 0.06); }
.nav-link.router-link-active {
  color: #8b6914;
  background: rgba(139, 105, 20, 0.1);
  font-weight: 600;
}

@media (max-width: 430px) {
  .admin-subnav { padding: 0 14px; }
}
</style>
