<template>
  <div class="login-view">
    <section class="hero">
      <div class="hero-panel">
        <div class="mascot-wrap">
          <img src="/brand/buildog-bulldog-mascot.jpg" alt="Buildog bulldog mascot" class="mascot-image" />
          <div class="mascot-badge">
            <img src="/brand/buildog-bulldog-icon.jpg" alt="" class="mascot-badge-icon" />
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

        <button class="google-btn" :disabled="loading" @click="handleSignIn">
          {{ loading ? 'ログイン中…' : 'Googleでログイン' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithGoogle } from '../lib/auth'

const router = useRouter()
const loading = ref(false)

async function handleSignIn() {
  loading.value = true
  try {
    await signInWithGoogle()
    router.push({ name: 'project-list' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(255, 122, 26, 0.18), transparent 36%),
    radial-gradient(circle at bottom right, rgba(76, 122, 156, 0.16), transparent 34%),
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
  background: linear-gradient(180deg, rgba(14, 23, 31, 0.92), rgba(14, 23, 31, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  border-radius: 24px;
  object-fit: cover;
  box-shadow: var(--shadow-md);
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
  background: rgba(15, 23, 32, 0.86);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.mascot-badge-icon {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  object-fit: cover;
  object-position: top;
}

.hero-tag {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 122, 26, 0.14);
  color: var(--accent);
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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.google-btn {
  margin-top: 8px;
  height: 52px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 640px) {
  .hero-panel {
    padding: 24px;
  }
}
</style>
