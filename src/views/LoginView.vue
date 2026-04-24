<template>
  <div class="lp">

    <!-- ──────── HERO ──────── -->
    <section class="hero">
      <div class="hero-bg-noise" />
      <div class="hero-inner">
        <p class="hero-logo">Penstok</p>
        <h1 class="hero-headline">
          手放す、を<br>設計する。
        </h1>
        <p class="hero-sub">
          モノを買うことには、みんな慣れている。<br>
          でも、手放すことは？
        </p>
        <button class="cta-btn" @click="scrollToLogin">
          はじめる
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
      <div class="hero-scroll-hint">scroll</div>
    </section>

    <!-- ──────── PROBLEM ──────── -->
    <section class="section section--dark">
      <div class="section-inner narrow">
        <p class="eyebrow">The problem</p>
        <h2 class="section-h2">
          モノは増え続ける。<br>でも出口は、誰も教えてくれない。
        </h2>
        <p class="section-body">
          部屋の隅に積まれた本、使わなくなった道具、引き出しの奥のガジェット。
          買ったことは覚えている。でも「いつ」「どうやって」手放せばいいか、
          考えたことはあるだろうか。<br><br>
          購入は最適化されてきた。でも、所有の<em>出口</em>は、ずっと放置されていた。
        </p>
      </div>
    </section>

    <!-- ──────── WHAT IS ──────── -->
    <section class="section section--mid">
      <div class="section-inner">
        <p class="eyebrow">What is Penstok</p>
        <h2 class="section-h2 accent-glow">
          所有の、終わりを<br>デザインするOS。
        </h2>
        <div class="feature-grid">
          <div class="feature-card">
            <span class="feature-num">01</span>
            <h3 class="feature-title">スキャンで即登録</h3>
            <p class="feature-desc">バーコードを読むだけ。本でも、日用品でも、ガジェットでも。所有の記録は、2秒でつくれる。</p>
          </div>
          <div class="feature-card">
            <span class="feature-num">02</span>
            <h3 class="feature-title">手放すを記録する</h3>
            <p class="feature-desc">売った、贈った、捨てた。終わりの記録が、所有の全体像をつくる。あなたの棚は、常に今を映す。</p>
          </div>
          <div class="feature-card">
            <span class="feature-num">03</span>
            <h3 class="feature-title">Penstok Score</h3>
            <p class="feature-desc">どれだけ所有を循環させているか。あなただけのスコアが、意識を変える。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ──────── PHILOSOPHY ──────── -->
    <section class="section section--philosophy">
      <div class="section-inner narrow">
        <p class="eyebrow">Philosophy</p>
        <blockquote class="philosophy-quote">
          あなたの所有の記憶は、<br>
          <span class="q-accent">あなただけのもの。</span>
        </blockquote>
        <p class="section-body">
          Penstokは、あなたの所有データを売らない。分析しない。広告に使わない。
          登録した品物は、あなたの棚の中にだけある。<br><br>
          ただ、ひとつだけお願いがある。
        </p>
        <div class="divider-line" />
        <blockquote class="philosophy-quote philosophy-quote--small">
          あなたが手放した記録は、<br>
          <span class="q-accent">社会の流れを、整える。</span>
        </blockquote>
        <p class="section-body">
          匿名化された所有・手放しデータは、モノの流通を最適化するインフラになる。
          個人の記録の集積が、社会全体のサステナビリティを動かす。<br><br>
          <strong>モノの出口を最適化することで、社会全体の流れを整える。</strong><br>
          それがPenstokのミッションだ。
        </p>
      </div>
    </section>

    <!-- ──────── LOGIN CTA ──────── -->
    <section id="login-section" class="section section--cta">
      <div class="section-inner narrow center">
        <p class="hero-logo">Penstok</p>
        <p class="cta-tagline">あなたの所有を、記録しよう。</p>

        <!-- アプリ内ブラウザ警告 -->
        <div v-if="isInAppBrowser" class="inapp-warning">
          <p class="inapp-title">⚠️ このブラウザではログインできません</p>
          <p class="inapp-desc">LINEやInstagramなどのアプリ内ブラウザはGoogleログインをブロックします。<br>右下のメニューから <strong>「ブラウザで開く」</strong> または <strong>「Safariで開く」</strong> を選択してください。</p>
          <button class="copy-url-btn" @click="copyUrl">{{ copied ? '✓ コピーしました' : 'URLをコピーする' }}</button>
        </div>

        <button v-else class="google-btn" @click="handleSignIn" :disabled="loading">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {{ loading ? 'ログイン中…' : 'Google でログイン' }}
        </button>
        <p class="cta-note">
          <a href="/about" class="about-link">Penstokについて詳しく →</a>
        </p>
      </div>
    </section>

    <footer class="lp-footer">
      <span>© 2025 Penstok</span>
      <a href="/about">About</a>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithGoogle } from '../lib/auth'

const router = useRouter()
const loading = ref(false)
const copied = ref(false)

// アプリ内ブラウザ（LINE, Instagram, Facebook, Twitter等）を検知
function detectInAppBrowser(): boolean {
  const ua = navigator.userAgent
  return /Line\/|FBAN|FBAV|Instagram|Twitter|Snapchat|TikTok|MicroMessenger|GSA\//.test(ua)
}
const isInAppBrowser = ref(detectInAppBrowser())

function scrollToLogin() {
  document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
  }
}

async function handleSignIn() {
  loading.value = true
  try {
    await signInWithGoogle()
    router.push({ name: 'shelf' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Base ── */
.lp {
  font-family: inherit;
  background: #0a0907;
  color: #f0ead8;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── Hero ── */
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 60px;
  text-align: center;
  overflow: hidden;
  background: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(180, 120, 20, 0.18) 0%, transparent 70%),
              #0a0907;
}

.hero-bg-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  opacity: 0.6;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 480px;
}

.hero-logo {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #c9942a;
  text-transform: uppercase;
  margin: 0;
}

.hero-headline {
  font-size: clamp(48px, 12vw, 80px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0;
  background: linear-gradient(135deg, #f0ead8 0%, #c9942a 60%, #f0ead8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-sub {
  font-size: 15px;
  line-height: 1.8;
  color: rgba(240, 234, 216, 0.6);
  margin: 0;
}

.cta-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 32px;
  background: #c9942a;
  border: none;
  border-radius: 26px;
  font-size: 15px;
  font-weight: 700;
  color: #0a0907;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.04em;
  transition: background 0.15s, transform 0.1s;
  margin-top: 8px;
}
.cta-btn:hover { background: #e0a830; transform: translateY(-1px); }
.cta-btn:active { transform: translateY(0); }
.cta-btn svg { width: 16px; height: 16px; }

.hero-scroll-hint {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: rgba(240, 234, 216, 0.25);
  text-transform: uppercase;
}

/* ── Sections ── */
.section {
  padding: 80px 24px;
}

.section--dark {
  background: #0a0907;
}

.section--mid {
  background: #111009;
}

.section--philosophy {
  background: linear-gradient(180deg, #111009 0%, #0f0c07 100%);
}

.section--cta {
  background: #0a0907;
  padding: 100px 24px;
}

.section-inner {
  max-width: 720px;
  margin: 0 auto;
}
.section-inner.narrow { max-width: 560px; }
.section-inner.center { text-align: center; display: flex; flex-direction: column; align-items: center; }

.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #c9942a;
  margin: 0 0 20px;
}

.section-h2 {
  font-size: clamp(28px, 6vw, 44px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0 0 28px;
  color: #f0ead8;
}

.section-h2.accent-glow {
  background: linear-gradient(135deg, #f0ead8 0%, #d4a030 50%, #f0ead8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-body {
  font-size: 15px;
  line-height: 1.9;
  color: rgba(240, 234, 216, 0.65);
  margin: 0;
}
.section-body em { font-style: normal; color: #c9942a; }
.section-body strong { color: rgba(240, 234, 216, 0.9); font-weight: 600; }

/* ── Feature grid ── */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 40px;
}

.feature-card {
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(201, 148, 42, 0.15);
  border-radius: 12px;
  padding: 24px 20px;
}

.feature-num {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #c9942a;
  margin-bottom: 12px;
}

.feature-title {
  font-size: 15px;
  font-weight: 700;
  color: #f0ead8;
  margin: 0 0 10px;
}

.feature-desc {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(240, 234, 216, 0.55);
  margin: 0;
}

/* ── Philosophy ── */
.philosophy-quote {
  font-size: clamp(22px, 5vw, 34px);
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: #f0ead8;
  margin: 0 0 28px;
  font-style: normal;
}

.philosophy-quote--small {
  font-size: clamp(19px, 4vw, 28px);
  margin-top: 0;
}

.q-accent {
  color: #c9942a;
}

.divider-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 148, 42, 0.3), transparent);
  margin: 40px 0;
}

/* ── CTA section ── */
.cta-tagline {
  font-size: 14px;
  color: rgba(240, 234, 216, 0.5);
  letter-spacing: 0.06em;
  margin: 8px 0 32px;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 52px;
  padding: 0 32px;
  background: rgba(255,255,255,0.07);
  border: 1.5px solid rgba(255,255,255,0.18);
  border-radius: 26px;
  font-size: 15px;
  font-weight: 600;
  color: #f0ead8;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
  width: 100%;
  max-width: 280px;
}
.google-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.3);
}
.google-btn:disabled { opacity: 0.4; cursor: default; }
.google-icon { width: 18px; height: 18px; flex-shrink: 0; }

/* ── アプリ内ブラウザ警告 ── */
.inapp-warning {
  width: 100%;
  max-width: 320px;
  background: rgba(224, 120, 112, 0.1);
  border: 1.5px solid rgba(224, 120, 112, 0.35);
  border-radius: 14px;
  padding: 18px 20px;
  text-align: left;
  margin-bottom: 8px;
}
.inapp-title {
  font-size: 14px;
  font-weight: 700;
  color: #e07870;
  margin-bottom: 10px;
}
.inapp-desc {
  font-size: 12px;
  color: rgba(240, 234, 216, 0.65);
  line-height: 1.7;
  margin-bottom: 14px;
}
.inapp-desc strong {
  color: rgba(240, 234, 216, 0.9);
}
.copy-url-btn {
  display: block;
  width: 100%;
  padding: 10px;
  background: rgba(201, 148, 42, 0.15);
  border: 1px solid rgba(201, 148, 42, 0.4);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #c9942a;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.copy-url-btn:hover { background: rgba(201, 148, 42, 0.25); }

.cta-note {
  margin: 20px 0 0;
  font-size: 12px;
}

.about-link {
  color: rgba(201, 148, 42, 0.7);
  text-decoration: none;
  transition: color 0.15s;
}
.about-link:hover { color: #c9942a; }

/* ── Footer ── */
.lp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 12px;
  color: rgba(240, 234, 216, 0.25);
}
.lp-footer a {
  color: rgba(240, 234, 216, 0.25);
  text-decoration: none;
  transition: color 0.15s;
}
.lp-footer a:hover { color: rgba(240, 234, 216, 0.6); }
</style>
