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
import { ref, computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { authState } from './lib/auth'
import GlobalToolbar from './components/GlobalToolbar.vue'
import AccountModal from './components/AccountModal.vue'
import { useTheme } from './composables/useTheme'

useTheme() // initialize theme from localStorage on mount

const route = useRoute()
const showAccountModal = ref(false)
const showToolbar = computed(() =>
  route.name !== 'login' &&
  route.name !== 'about' &&
  !!authState.user
)

// ログアウト時にモーダルを自動で閉じる
watch(() => authState.user, (user) => {
  if (!user) showAccountModal.value = false
})
</script>

<style>
/* ── CSS Custom Properties ── */
:root {
  /* Backgrounds */
  --bg:         #0a0907;
  --bg-surface: #111009;
  --bg-card:    #18160f;
  --bg-hover:   #1f1c12;
  --bg-input:   #141209;
  --bg-subtle:  rgba(255, 255, 255, 0.04);

  /* Borders */
  --border:        rgba(255, 255, 255, 0.09);
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-faint:  rgba(255, 255, 255, 0.04);
  --border-accent: rgba(201, 148, 42, 0.25);

  /* Text */
  --text:             #f0ead8;
  --text-sub:         rgba(240, 234, 216, 0.65);
  --text-muted:       rgba(240, 234, 216, 0.45);
  --text-faint:       rgba(240, 234, 216, 0.30);
  --text-placeholder: rgba(240, 234, 216, 0.22);

  /* Brand accent */
  --accent:        #c9942a;
  --accent-hover:  #e0a830;
  --accent-bg:     rgba(201, 148, 42, 0.10);
  --accent-bg-dim: rgba(201, 148, 42, 0.06);

  /* Toolbar */
  --toolbar-bg:     rgba(10, 9, 7, 0.92);
  --toolbar-border: rgba(201, 148, 42, 0.12);

  /* Functional */
  --digital:    #6b84e8;
  --digital-bg: rgba(107, 132, 232, 0.14);
  --success:    #5aaa6a;
  --success-bg: rgba(90, 170, 106, 0.12);
  --danger:     #e07870;
  --danger-bg:  rgba(224, 120, 112, 0.12);
  --warning:    #d4aa38;
  --warning-bg: rgba(212, 170, 56, 0.12);
  --blue:       #6a80c8;
  --pink:       #d07898;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.45);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.55);
  --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.65);

  /* Overlay */
  --overlay: rgba(0, 0, 0, 0.65);

  /* Score card */
  --score-bg:     linear-gradient(135deg, rgba(201,148,42,0.12), rgba(201,148,42,0.06));
  --score-border: rgba(201, 148, 42, 0.2);
}

[data-theme="light"] {
  --bg:         #faf8f4;
  --bg-surface: #f5f2ec;
  --bg-card:    #ffffff;
  --bg-hover:   #fdf8f0;
  --bg-input:   #faf8f4;
  --bg-subtle:  rgba(139, 105, 20, 0.04);

  --border:        #e0dbd0;
  --border-subtle: #f0ece4;
  --border-faint:  #f5f2ec;
  --border-accent: rgba(139, 105, 20, 0.3);

  --text:             #2c2315;
  --text-sub:         #6b5c40;
  --text-muted:       #a09070;
  --text-faint:       #b0a090;
  --text-placeholder: #c0b8a8;

  --accent:        #8b6914;
  --accent-hover:  #70530f;
  --accent-bg:     rgba(139, 105, 20, 0.08);
  --accent-bg-dim: rgba(139, 105, 20, 0.04);

  --toolbar-bg:     rgba(250, 248, 244, 0.95);
  --toolbar-border: rgba(139, 105, 20, 0.12);

  --digital:    #4f65d2;
  --digital-bg: #eef1fb;
  --success:    #3a7a3a;
  --success-bg: #f0f9f0;
  --danger:     #c0786a;
  --danger-bg:  #fff8f8;
  --warning:    #c8a830;
  --warning-bg: #fdf3dc;
  --blue:       #4a6da8;
  --pink:       #c86a80;

  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 2px 10px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.2);

  --overlay: rgba(30, 20, 10, 0.5);

  --score-bg:     linear-gradient(135deg, #fdf3dc, #fff8ee);
  --score-border: rgba(139, 105, 20, 0.2);
}

/* ── Base ── */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  transition: background 0.2s, color 0.2s;
}

#app {
  min-height: 100vh;
}

.init-loading {
  min-height: 100vh;
  background: var(--bg);
}

.app-content {
  min-height: 100vh;
}

.app-content.with-toolbar {
  padding-top: 54px;
}
</style>
