<template>
  <div v-if="!authState.ready" class="init-loading" />
  <template v-else>
    <GlobalToolbar
      v-if="showToolbar"
      @open-account="showAccountModal = true"
    />
    <div class="app-content" :class="{ 'with-toolbar': showToolbar }">
      <RouterView />
    </div>
    <AccountModal
      v-if="showAccountModal"
      @close="showAccountModal = false"
    />
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { authState } from './lib/auth'
import GlobalToolbar from './components/GlobalToolbar.vue'
import AccountModal from './components/AccountModal.vue'

const route = useRoute()
const showAccountModal = ref(false)
const showToolbar = computed(() => route.name !== 'login' && !!authState.user)
</script>

<style>
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial,
    'Hiragino Sans', 'Yu Gothic', sans-serif;
  background: #faf8f4;
  color: #2c2315;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}

.init-loading {
  min-height: 100vh;
  background: #faf8f4;
}

.app-content {
  min-height: 100vh;
}

.app-content.with-toolbar {
  padding-top: 54px;
}
</style>
