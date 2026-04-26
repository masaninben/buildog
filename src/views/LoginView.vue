<template>
  <div class="login-view">
    <section class="hero">
      <div class="hero-panel">
        <div class="mascot-wrap">
          <img src="/brand/buildog-bulldog-mascot.jpg" alt="Buildog bulldog mascot" class="mascot-image" />
          <div class="mascot-badge">
            <span>Buildog</span>
          </div>
        </div>
        <p class="hero-tag">施工写真共有サービス</p>
        <h1 class="hero-title">Buildog</h1>
        <p class="hero-copy">
          リフォーム・建築工事の案件ごとに写真を整理し、
          顧客には公開URLでそのまま共有できるPWA。
        </p>

        <ul class="hero-points">
          <li>案件一覧をカードで管理</li>
          <li>現場写真を時系列でアップロード</li>
          <li>写真ごとに公開・非公開を切り替え</li>
          <li>顧客はログイン不要で閲覧のみ</li>
        </ul>

        <form class="login-form" @submit.prevent="handleSignIn">
          <input
            v-model="email"
            type="email"
            placeholder="メールアドレス"
            autocomplete="email"
            required
            class="login-input"
          />
          <input
            v-model="password"
            type="password"
            placeholder="パスワード"
            autocomplete="current-password"
            required
            class="login-input"
          />
          <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>
          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? 'ログイン中…' : 'ログイン' }}
          </button>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmail } from '../lib/auth'

const router = useRouter()
const loading = ref(false)
const email = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleSignIn() {
  loading.value = true
  errorMsg.value = ''
  try {
    await signInWithEmail(email.value, password.value)
    router.push({ name: 'project-list' })
  } catch {
    errorMsg.value = 'メールアドレスまたはパスワードが正しくありません'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(215, 154, 74, 0.2), transparent 30%),
    radial-gradient(circle at top right, rgba(30, 90, 174, 0.16), transparent 34%),
    var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.hero {
  width: min(100%, 960px);
}

.hero-panel {
  width: min(100%, 560px);
  padding: 36px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(215, 154, 74, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 247, 252, 0.98));
  border: 1px solid rgba(30, 90, 174, 0.12);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mascot-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 6px;
}

.mascot-image {
  width: min(100%, 260px);
  object-fit: cover;
  mix-blend-mode: multiply;
}

.mascot-badge {
  position: absolute;
  right: 12px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(21, 55, 104, 0.92);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.hero-tag {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--accent-bg);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

.hero-title {
  font-size: clamp(42px, 10vw, 76px);
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.hero-copy {
  color: var(--text-sub);
  font-size: 16px;
  line-height: 1.9;
}

.hero-points {
  list-style: none;
  display: grid;
  gap: 10px;
  color: var(--text);
}

.hero-points li {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.login-input {
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus {
  border-color: var(--accent);
}

.login-error {
  color: #e53e3e;
  font-size: 13px;
  margin: 0;
}

.login-btn {
  height: 52px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .hero-panel {
    padding: 24px;
  }
}
</style>
