<template>
  <div class="lp">

    <!-- ナビ -->
    <header class="lp-nav">
      <span class="lp-logo">Buildog</span>
      <a href="#auth" class="lp-nav-cta">ログイン</a>
    </header>

    <!-- ヒーロー -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-text">
          <p class="hero-eyebrow">施工写真共有サービス</p>
          <h1 class="hero-title">工事の安心を、<br>写真で残す。</h1>
          <p class="hero-desc">
            リフォーム・建築工事の施工写真を案件ごとに整理し、<br class="br-md">
            施主様にはURLひとつで共有。ログイン不要で閲覧できます。
          </p>
          <a href="#auth" class="hero-cta">無料で始める</a>
        </div>
        <div class="hero-visual">
          <div class="hero-mascot-card">
            <img src="/brand/buildog-helmet-mascot.png" alt="Buildogマスコット" class="hero-mascot" />
          </div>
        </div>
      </div>
    </section>

    <!-- 特徴 -->
    <section class="features">
      <div class="section-inner">
        <h2 class="section-title">Buildogでできること</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 6h16v12H4z" />
                <path d="m8 14 2.5-2.5L13 14l2-2 3 3" />
                <circle cx="9" cy="9" r="1.2" />
              </svg>
            </div>
            <h3 class="feature-title">写真を記録・整理</h3>
            <p class="feature-desc">ビフォー・施工中・材料・アフターのタグで自動整理。最大10枚を一括アップロード、自動圧縮。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
            </div>
            <h3 class="feature-title">URLで即共有</h3>
            <p class="feature-desc">施主様はアカウント不要。URLかQRコードを渡すだけで、スマホからすぐ閲覧できます。</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 class="feature-title">施主様へ安心を届ける</h3>
            <p class="feature-desc">工事の進捗をビフォー・施工中・アフターの流れで整理。施主様が安心できる報告書を手軽に作れます。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使い方 -->
    <section class="howto">
      <div class="section-inner">
        <h2 class="section-title">使い方はかんたん3ステップ</h2>
        <div class="step-list">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-body">
              <h3 class="step-title">案件を作成</h3>
              <p class="step-desc">工事名・現場住所・施主名を入力して案件を登録します。</p>
            </div>
          </div>
          <div class="step-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-body">
              <h3 class="step-title">写真をアップロード</h3>
              <p class="step-desc">現場でスマホ撮影した写真をタグ付きでアップロード。並び順も自由に調整できます。</p>
            </div>
          </div>
          <div class="step-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-body">
              <h3 class="step-title">URLを施主に渡す</h3>
              <p class="step-desc">QRコードやURLをLINEで送るだけ。施主様はログイン不要で施工状況を確認できます。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ログイン -->
    <section id="auth" class="auth-section">
      <div class="auth-inner">
        <div class="auth-lead">
          <img src="/brand/buildog-helmet-mascot.png" alt="" class="auth-mascot" />
          <p class="auth-lead-text">現場の信頼を、写真が守る。</p>
        </div>
        <div class="auth-box">
          <h2 class="auth-title">ログイン</h2>
          <form class="auth-form" @submit.prevent="handleEmailSignIn">
            <label class="auth-label">
              <span>メールアドレス</span>
              <input
                v-model="email"
                type="email"
                placeholder="example@company.com"
                autocomplete="email"
                required
                class="auth-input"
              />
            </label>
            <label class="auth-label">
              <span>パスワード</span>
              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
                class="auth-input"
              />
            </label>
            <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
            <button type="submit" class="auth-btn-primary" :disabled="!!loading">
              {{ loading === 'email' ? 'ログイン中…' : 'ログイン' }}
            </button>
          </form>
          <div class="auth-divider"><span>または</span></div>
          <button class="auth-btn-google" :disabled="!!loading" @click="handleGoogleSignIn">
            <svg class="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ loading === 'google' ? 'ログイン中…' : 'Googleでログイン' }}
          </button>
        </div>
      </div>
    </section>

    <footer class="lp-footer">
      <span class="lp-footer-logo">Buildog</span>
      <p class="lp-footer-copy">© 2025 Buildog. All rights reserved.</p>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmail, signInWithGoogle } from '../lib/auth'

const router = useRouter()
const loading = ref<'email' | 'google' | null>(null)
const email = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleEmailSignIn() {
  loading.value = 'email'
  errorMsg.value = ''
  try {
    await signInWithEmail(email.value, password.value)
    router.push({ name: 'project-list' })
  } catch {
    errorMsg.value = 'メールアドレスまたはパスワードが正しくありません'
  } finally {
    loading.value = null
  }
}

async function handleGoogleSignIn() {
  loading.value = 'google'
  errorMsg.value = ''
  try {
    await signInWithGoogle()
    router.push({ name: 'project-list' })
  } catch {
    errorMsg.value = 'Googleログインに失敗しました'
  } finally {
    loading.value = null
  }
}
</script>

<style scoped>
/* ========== ベース ========== */
.lp {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

/* ========== ナビ ========== */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 60px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--toolbar-border);
}

.lp-logo {
  color: #fff;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.lp-nav-cta {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  background: rgba(255,255,255,0.18);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}

.lp-nav-cta:hover {
  background: rgba(255,255,255,0.28);
}

/* ========== ヒーロー ========== */
.hero {
  background:
    radial-gradient(circle at top right, rgba(215,154,74,0.18), transparent 40%),
    radial-gradient(circle at bottom left, rgba(30,90,174,0.16), transparent 40%),
    linear-gradient(160deg, #0f1c31 0%, #18263d 100%);
  color: #fff;
  padding: 80px 40px;
}

.hero-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 60px;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-eyebrow {
  display: inline-block;
  width: fit-content;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(215,154,74,0.22);
  color: #d79a4a;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.hero-title {
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.hero-desc {
  color: rgba(237,244,255,0.78);
  font-size: clamp(14px, 1.6vw, 17px);
  line-height: 1.9;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  height: 52px;
  padding: 0 32px;
  border-radius: 16px;
  background: #d79a4a;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(215,154,74,0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(215,154,74,0.5);
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.hero-mascot-card {
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
  width: min(100%, 340px);
  margin: 0 auto;
}

.hero-mascot {
  width: 100%;
  display: block;
  object-fit: cover;
}

/* ========== セクション共通 ========== */
.section-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 40px;
}

.section-title {
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 900;
  text-align: center;
  margin-bottom: 40px;
  letter-spacing: -0.02em;
}

/* ========== 特徴 ========== */
.features {
  padding: 80px 0;
  background: var(--bg-surface);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.feature-card {
  padding: 28px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.feature-icon svg {
  width: 22px;
  height: 22px;
}

.feature-title {
  font-size: 16px;
  font-weight: 800;
}

.feature-desc {
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.8;
}

/* ========== 使い方 ========== */
.howto {
  padding: 80px 0;
}

.step-list {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.step-num {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-title {
  font-size: 15px;
  font-weight: 800;
}

.step-desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.8;
}

.step-arrow {
  flex-shrink: 0;
  margin-top: 32px;
  color: var(--text-muted);
}

.step-arrow svg {
  width: 20px;
  height: 20px;
}

/* ========== ログイン ========== */
.auth-section {
  padding: 80px 40px;
  background: var(--bg-surface);
}

.auth-inner {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 60px;
}

.auth-lead {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.auth-mascot {
  width: min(100%, 200px);
  object-fit: cover;
  border-radius: 20px;
  overflow: hidden;
  display: block;
  box-shadow: var(--shadow-md);
}

.auth-lead-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-sub);
  text-align: center;
}

.auth-box {
  padding: 36px;
  border-radius: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
}

.auth-input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-input);
  color: var(--text);
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
}

.auth-input:focus {
  border-color: var(--accent);
}

.auth-error {
  font-size: 13px;
  color: var(--danger);
}

.auth-btn-primary {
  height: 52px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}

.auth-btn-primary:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.auth-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.auth-btn-google {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.auth-btn-google:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-accent);
}

.auth-btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* ========== フッター ========== */
.lp-footer {
  padding: 28px 40px;
  background: #0b1828;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.lp-footer-logo {
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.lp-footer-copy {
  font-size: 12px;
  color: rgba(255,255,255,0.42);
}

/* ========== レスポンシブ ========== */

/* タブレット横 〜 小デスクトップ */
@media (max-width: 1024px) {
  .hero {
    padding: 60px 32px;
  }

  .hero-inner {
    gap: 40px;
  }

  .section-inner {
    padding: 0 32px;
  }

  .auth-section {
    padding: 60px 32px;
  }
}

/* タブレット縦 */
@media (max-width: 768px) {
  .lp-nav {
    padding: 0 20px;
  }

  .hero {
    padding: 48px 20px;
  }

  .hero-inner {
    grid-template-columns: 1fr;
    gap: 32px;
    text-align: center;
  }

  .hero-eyebrow {
    margin: 0 auto;
  }

  .hero-cta {
    align-self: center;
  }

  .hero-visual {
    order: -1;
  }

  .hero-mascot {
    width: min(100%, 220px);
  }

  .section-inner {
    padding: 0 20px;
  }

  .features {
    padding: 56px 0;
  }

  .feature-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .howto {
    padding: 56px 0;
  }

  .step-list {
    flex-direction: column;
    gap: 14px;
  }

  .step-arrow {
    transform: rotate(90deg);
    margin: 0 auto;
  }

  .auth-section {
    padding: 56px 20px;
  }

  .auth-inner {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .auth-lead {
    flex-direction: row;
    justify-content: center;
    gap: 20px;
  }

  .auth-mascot {
    width: 90px;
  }

  .auth-lead-text {
    text-align: left;
  }

  .auth-box {
    padding: 28px 24px;
  }

  .lp-footer {
    flex-direction: column;
    padding: 24px 20px;
    text-align: center;
    gap: 8px;
  }
}

/* スマホ縦（480px以下） */
@media (max-width: 480px) {
  .lp-nav {
    padding: 0 16px;
    height: 52px;
  }

  .lp-logo {
    font-size: 18px;
  }

  .lp-nav-cta {
    height: 32px;
    padding: 0 14px;
    font-size: 12px;
  }

  .hero {
    padding: 36px 16px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-desc {
    font-size: 14px;
  }

  .hero-cta {
    width: 100%;
    justify-content: center;
    height: 52px;
  }

  .hero-mascot {
    width: min(100%, 180px);
  }

  .features {
    padding: 44px 0;
  }

  .section-inner {
    padding: 0 16px;
  }

  .section-title {
    margin-bottom: 28px;
    font-size: 20px;
  }

  .feature-card {
    padding: 20px;
    gap: 10px;
  }

  .howto {
    padding: 44px 0;
  }

  .step-item {
    padding: 18px;
    flex-direction: row;
    gap: 14px;
    align-items: flex-start;
  }

  .step-num {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .step-arrow {
    display: none;
  }

  .auth-section {
    padding: 44px 16px;
  }

  .auth-lead {
    flex-direction: column;
    align-items: center;
  }

  .auth-mascot {
    width: 80px;
  }

  .auth-lead-text {
    text-align: center;
  }

  .auth-box {
    padding: 24px 16px;
    gap: 14px;
    border-radius: 20px;
  }

  .auth-title {
    font-size: 20px;
  }

  .auth-input {
    height: 52px;
    font-size: 16px; /* iOSズーム防止 */
  }

  .auth-btn-primary,
  .auth-btn-google {
    height: 56px;
    font-size: 15px;
  }

  .br-md {
    display: none;
  }
}
</style>
