<template>
  <div v-if="!authState.ready" class="init-loading" />
  <template v-else>
    <GlobalToolbar v-if="showToolbar" @open-account="showAccountModal = true" />
    <div class="app-content" :class="{ 'with-toolbar': showToolbar }">
      <RouterView />
    </div>
    <AccountModal v-if="showAccountModal" @close="showAccountModal = false" />
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccountModal from './components/AccountModal.vue'
import GlobalToolbar from './components/GlobalToolbar.vue'
import { authState } from './lib/auth'
import { useTheme } from './composables/useTheme'

useTheme()

const route = useRoute()
const showAccountModal = ref(false)
const showToolbar = computed(() => !!authState.user && route.name !== 'public-project' && route.name !== 'login')

watch(() => authState.user, (user) => {
  if (!user) showAccountModal.value = false
})
</script>

<style>
:root {
  --bg: #0f1720;
  --bg-surface: #16202b;
  --bg-card: #1c2733;
  --bg-hover: #223140;
  --bg-input: #111b25;
  --bg-subtle: rgba(255, 255, 255, 0.05);

  --border: rgba(255, 255, 255, 0.12);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-faint: rgba(255, 255, 255, 0.05);
  --border-accent: rgba(255, 122, 26, 0.28);

  --text: #eef4f8;
  --text-sub: rgba(238, 244, 248, 0.74);
  --text-muted: rgba(238, 244, 248, 0.5);
  --text-faint: rgba(238, 244, 248, 0.34);
  --text-placeholder: rgba(238, 244, 248, 0.24);

  --accent: #ff7a1a;
  --accent-hover: #ff8c39;
  --accent-bg: rgba(255, 122, 26, 0.12);

  --toolbar-bg: rgba(15, 23, 32, 0.88);
  --toolbar-border: rgba(255, 122, 26, 0.12);

  --success: #54b07d;
  --success-bg: rgba(84, 176, 125, 0.12);
  --danger: #df7268;
  --danger-bg: rgba(223, 114, 104, 0.14);
  --overlay: rgba(6, 12, 18, 0.72);

  --shadow-sm: 0 6px 20px rgba(0, 0, 0, 0.24);
  --shadow-md: 0 18px 40px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 30px 90px rgba(0, 0, 0, 0.35);
}

[data-theme="light"] {
  --bg: #f3f5f6;
  --bg-surface: #e8edf1;
  --bg-card: #ffffff;
  --bg-hover: #f6f8fa;
  --bg-input: #ffffff;
  --bg-subtle: rgba(17, 27, 37, 0.04);

  --border: rgba(17, 27, 37, 0.12);
  --border-subtle: rgba(17, 27, 37, 0.08);
  --border-faint: rgba(17, 27, 37, 0.05);
  --border-accent: rgba(255, 122, 26, 0.25);

  --text: #16202b;
  --text-sub: rgba(22, 32, 43, 0.72);
  --text-muted: rgba(22, 32, 43, 0.5);
  --text-faint: rgba(22, 32, 43, 0.34);
  --text-placeholder: rgba(22, 32, 43, 0.24);

  --accent: #d45d00;
  --accent-hover: #b94f00;
  --accent-bg: rgba(212, 93, 0, 0.08);

  --toolbar-bg: rgba(243, 245, 246, 0.92);
  --toolbar-border: rgba(212, 93, 0, 0.1);

  --success: #2f8f61;
  --success-bg: rgba(47, 143, 97, 0.12);
  --danger: #c65b55;
  --danger-bg: rgba(198, 91, 85, 0.12);
  --overlay: rgba(12, 18, 24, 0.48);

  --shadow-sm: 0 8px 18px rgba(15, 23, 32, 0.08);
  --shadow-md: 0 18px 34px rgba(15, 23, 32, 0.12);
  --shadow-lg: 0 28px 70px rgba(15, 23, 32, 0.18);
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100vh;
}

body {
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea {
  font: inherit;
}

.init-loading,
.app-content {
  min-height: 100vh;
}

.app-content.with-toolbar {
  padding-top: 58px;
}
</style>
