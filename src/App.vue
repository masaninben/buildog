<template>
  <div v-if="!authState.ready" class="init-loading" />
  <template v-else>
    <GlobalToolbar v-if="showToolbar" @open-account="showAccountModal = true" />
    <div class="app-content" :class="{ 'with-toolbar': showToolbar }">
      <RouterView />
    </div>
    <AccountModal v-if="showAccountModal" @close="showAccountModal = false" />
  </template>
  <ToastList />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccountModal from './components/AccountModal.vue'
import GlobalToolbar from './components/GlobalToolbar.vue'
import ToastList from './components/ToastList.vue'
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
  --bg: #f3f6fb;
  --bg-surface: #edf3f8;
  --bg-card: #ffffff;
  --bg-hover: #f7fafe;
  --bg-input: #f8fbff;
  --bg-subtle: rgba(27, 49, 92, 0.05);

  --border: rgba(24, 49, 91, 0.12);
  --border-subtle: rgba(24, 49, 91, 0.08);
  --border-faint: rgba(24, 49, 91, 0.06);
  --border-accent: rgba(30, 90, 174, 0.24);

  --text: #132748;
  --text-sub: rgba(19, 39, 72, 0.72);
  --text-muted: rgba(19, 39, 72, 0.52);
  --text-faint: rgba(19, 39, 72, 0.34);
  --text-placeholder: rgba(19, 39, 72, 0.26);

  --accent: #1e5aae;
  --accent-hover: #184a8f;
  --accent-bg: rgba(30, 90, 174, 0.1);
  --accent-strong: #153768;
  --warm: #d79a4a;
  --warm-bg: rgba(215, 154, 74, 0.14);
  --warm-border: rgba(215, 154, 74, 0.24);

  --toolbar-bg: linear-gradient(90deg, rgba(30, 90, 174, 0.96), rgba(21, 55, 104, 0.96));
  --toolbar-border: rgba(255, 255, 255, 0.18);

  --success: #2f8f61;
  --success-bg: rgba(47, 143, 97, 0.12);
  --danger: #c65b55;
  --danger-bg: rgba(198, 91, 85, 0.12);
  --overlay: rgba(11, 26, 50, 0.52);

  --shadow-sm: 0 10px 24px rgba(19, 39, 72, 0.08);
  --shadow-md: 0 18px 40px rgba(19, 39, 72, 0.12);
  --shadow-lg: 0 34px 88px rgba(19, 39, 72, 0.16);
}

[data-theme="dark"] {
  --bg: #080e1c;
  --bg-surface: #101a2e;
  --bg-card: #1a2b42;
  --bg-hover: #1f3354;
  --bg-input: #0e1a2f;
  --bg-subtle: rgba(255, 255, 255, 0.06);

  --border: rgba(255, 255, 255, 0.12);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-faint: rgba(255, 255, 255, 0.05);
  --border-accent: rgba(215, 154, 74, 0.32);

  --text: #edf4ff;
  --text-sub: rgba(237, 244, 255, 0.74);
  --text-muted: rgba(237, 244, 255, 0.54);
  --text-faint: rgba(237, 244, 255, 0.34);
  --text-placeholder: rgba(237, 244, 255, 0.22);

  --accent: #77a8f2;
  --accent-hover: #93bbf7;
  --accent-bg: rgba(119, 168, 242, 0.16);
  --accent-strong: #dceaff;
  --warm: #d79a4a;
  --warm-bg: rgba(215, 154, 74, 0.16);
  --warm-border: rgba(215, 154, 74, 0.26);

  --toolbar-bg: linear-gradient(90deg, rgba(16, 32, 56, 0.96), rgba(29, 48, 80, 0.96));
  --toolbar-border: rgba(255, 255, 255, 0.08);

  --success: #54b07d;
  --success-bg: rgba(84, 176, 125, 0.12);
  --danger: #df7268;
  --danger-bg: rgba(223, 114, 104, 0.14);
  --overlay: rgba(6, 12, 18, 0.72);

  --shadow-sm: 0 8px 22px rgba(0, 0, 0, 0.22);
  --shadow-md: 0 18px 44px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 30px 90px rgba(0, 0, 0, 0.34);
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
  background:
    radial-gradient(circle at top left, rgba(30, 90, 174, 0.08), transparent 30%),
    radial-gradient(circle at top right, rgba(215, 154, 74, 0.1), transparent 24%),
    var(--bg);
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
