<template>
  <div class="pub-item-view">
    <header class="pub-header">
      <button class="back-btn" @click="router.push(`/u/${uid}`)">←</button>
      <span class="pub-logo">Penstok</span>
      <a href="/login" class="pub-login-btn">ログイン</a>
    </header>

    <div v-if="loading" class="state-msg">読み込み中…</div>
    <div v-else-if="!item" class="state-msg">アイテムが見つかりません</div>

    <div v-else class="pub-item-main">

      <!-- 画像 -->
      <div class="cover-wrap">
        <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="cover-img" />
        <span v-else class="cover-fallback">{{ CATEGORY_EMOJI[item.category] ?? '📦' }}</span>
      </div>

      <!-- 商品名 -->
      <div class="item-identity">
        <span class="item-cat">{{ CATEGORY_EMOJI[item.category] }} {{ CATEGORY_LABELS[item.category] }}</span>
        <h1 class="item-name">{{ item.name }}</h1>
        <p v-if="item.creator" class="item-creator">{{ item.creator }}</p>
      </div>

      <!-- 🔒 所有分布マップ -->
      <div class="section-card">
        <p class="section-title">所有分布マップ</p>
        <div class="locked-wrap">
          <div class="locked-content">
            <div class="map-mock">
              <div class="map-dot" style="top:28%;left:62%;" />
              <div class="map-dot" style="top:55%;left:38%;width:10px;height:10px;" />
              <div class="map-dot" style="top:42%;left:71%;width:8px;height:8px;" />
              <div class="map-dot" style="top:70%;left:55%;width:14px;height:14px;" />
              <div class="map-dot" style="top:35%;left:28%;width:9px;height:9px;" />
              <div class="map-dot" style="top:60%;left:80%;width:11px;height:11px;" />
            </div>
          </div>
          <div class="locked-overlay">
            <div class="lock-cta">
              <span class="lock-icon">🔒</span>
              <p class="lock-msg">ログインして確認できます</p>
              <a href="/login" class="lock-btn">無料で始める</a>
            </div>
          </div>
        </div>
      </div>

      <!-- 🔒 手放しボタン -->
      <div class="section-card">
        <p class="section-title">手放し方を記録する</p>
        <div class="locked-wrap">
          <div class="locked-content">
            <div class="method-grid">
              <div v-for="m in METHODS" :key="m.value" class="method-btn">
                <span class="method-name">{{ m.label }}</span>
                <span class="method-desc">{{ m.desc }}</span>
              </div>
            </div>
          </div>
          <div class="locked-overlay">
            <div class="lock-cta">
              <span class="lock-icon">🔒</span>
              <p class="lock-msg">ログインして記録できます</p>
              <a href="/login" class="lock-btn">無料で始める</a>
            </div>
          </div>
        </div>
      </div>

      <!-- 🔒 手放しアシスト -->
      <div class="section-card">
        <p class="section-title">手放しアシスト</p>
        <div class="locked-wrap">
          <div class="locked-content">
            <div class="assist-mock">
              <p class="assist-label">Penstokユーザーが手放した方法</p>
              <div class="assist-bars">
                <div class="bar-row">
                  <span class="bar-method">再販売</span>
                  <div class="bar-track"><div class="bar-fill" style="width:54%"/></div>
                  <span class="bar-pct">54%</span>
                </div>
                <div class="bar-row">
                  <span class="bar-method">譲渡</span>
                  <div class="bar-track"><div class="bar-fill" style="width:22%"/></div>
                  <span class="bar-pct">22%</span>
                </div>
                <div class="bar-row">
                  <span class="bar-method">廃棄</span>
                  <div class="bar-track"><div class="bar-fill" style="width:14%"/></div>
                  <span class="bar-pct">14%</span>
                </div>
              </div>
              <p class="assist-label" style="margin-top:10px;">フリマ・買取で出品</p>
              <div class="assist-services">
                <div class="assist-service">メルカリ</div>
                <div class="assist-service">ヤフオク</div>
                <div class="assist-service">ラクマ</div>
              </div>
            </div>
          </div>
          <div class="locked-overlay">
            <div class="lock-cta">
              <span class="lock-icon">🔒</span>
              <p class="lock-msg">ログインして確認できます</p>
              <a href="/login" class="lock-btn">無料で始める</a>
            </div>
          </div>
        </div>
      </div>

      <!-- フッターCTA -->
      <div class="footer-cta">
        <p class="footer-cta-text">Penstokに登録して、自分の棚を管理・共有しよう</p>
        <a href="/login" class="footer-cta-btn">無料で始める</a>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CATEGORY_LABELS, CATEGORY_EMOJI, type ItemCategory } from '../types'

interface PublicItemDetail {
  id: string
  name: string
  creator: string
  imageUrl: string
  category: ItemCategory
}

const METHODS = [
  { value: 'resale',   label: '再販売',    desc: 'フリマ・買取' },
  { value: 'gift',     label: '譲渡',      desc: '知人・家族へ' },
  { value: 'donation', label: '寄付',      desc: '団体・施設へ' },
  { value: 'recycle',  label: 'リサイクル', desc: '再資源化' },
  { value: 'disposal', label: '廃棄',      desc: '捨てる' },
]

const route = useRoute()
const router = useRouter()
const uid = route.params.uid as string
const itemId = route.params.itemId as string

const item = ref<PublicItemDetail | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'items', itemId))
    if (snap.exists()) {
      const data = snap.data()
      if (data.status === 'owned' && data.showOnPublic !== false) {
        item.value = {
          id: snap.id,
          name: (data.name as string) ?? '',
          creator: (data.creator as string) ?? '',
          imageUrl: (data.customImageUrl as string) || (data.imageUrl as string) || '',
          category: (data.category as ItemCategory) ?? 'other',
        }
      }
    }
  } catch (e) {
    console.warn('public item load error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pub-item-view {
  min-height: 100vh;
  background: var(--bg);
}

.pub-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 54px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-subtle);
}

.back-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--accent);
  cursor: pointer;
  padding: 4px 8px 4px 0;
  font-family: inherit;
  line-height: 1;
}

.pub-logo {
  font-size: 18px;
  font-weight: 800;
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.04em;
  background: linear-gradient(180deg,
    #f8f0c0 0%,
    #c9941a 22%,
    #f5d060 48%,
    #a87010 74%,
    #f0e0a0 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.pub-login-btn {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  padding: 6px 14px;
  border: 1.5px solid var(--accent);
  border-radius: 20px;
  transition: background 0.15s, color 0.15s;
}
.pub-login-btn:hover { background: var(--accent); color: #fff; }

.state-msg {
  text-align: center;
  padding: 64px 0;
  font-size: 13px;
  color: var(--text-faint);
}

.pub-item-main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px 16px 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 画像 */
.cover-wrap {
  width: 180px;
  aspect-ratio: 3 / 4;
  background: #ffffff;
  border-radius: 10px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  padding: 6px;
  box-sizing: border-box;
}
.cover-img { width: 100%; height: 100%; object-fit: contain; display: block; }
.cover-fallback { font-size: 40px; opacity: 0.4; }

/* 商品名 */
.item-identity {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 4px 0 8px;
}
.item-cat {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
}
.item-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
}
.item-creator {
  font-size: 12px;
  color: var(--text-muted);
}

/* セクション共通 */
.section-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 12px;
  border: 1px solid var(--border-faint);
  box-shadow: var(--shadow-sm);
}
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}

/* ロックラッパー */
.locked-wrap {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}
.locked-content {
  filter: blur(5px);
  pointer-events: none;
  user-select: none;
}
.locked-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
}
.lock-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
}
.lock-icon { font-size: 18px; }
.lock-msg {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}
.lock-btn {
  display: inline-block;
  padding: 6px 16px;
  background: var(--accent);
  color: #fff;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.lock-btn:hover { background: var(--accent-hover); }

/* マップモック */
.map-mock {
  height: 160px;
  background: #d4e4c8;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.map-mock::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px) 0 0 / 36px 36px,
    linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px) 0 0 / 36px 36px,
    linear-gradient(160deg, #c8dbb8 0%, #d8e8cc 40%, #b8cfa8 100%);
}
.map-dot {
  position: absolute;
  width: 13px;
  height: 13px;
  background: #e03030;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  transform: translate(-50%, -50%);
}

/* 手放しボタン */
.method-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.method-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 4px;
  border: 1px solid rgba(160,148,128,0.45);
  border-radius: 6px;
  background: linear-gradient(180deg, #faf6ee 0%, #ece5d9 22%, #d6cfc3 58%, #c5beb2 100%);
  box-shadow: 0 3px 0 #98928a, inset 0 2px 0 rgba(255,255,255,0.95);
}
.method-name { font-size: 11px; font-weight: 600; color: #1e1608; }
.method-desc { font-size: 8px; color: rgba(30,22,8,0.5); }
[data-theme="light"] .method-btn {
  background: linear-gradient(180deg, #7a6035 0%, #634e28 25%, #4e3d1e 55%, #3e3018 100%);
  box-shadow: 0 3px 0 #28200e, inset 0 1.5px 0 rgba(255,218,80,0.45);
}
[data-theme="light"] .method-name { color: #faf0d0; }
[data-theme="light"] .method-desc { color: rgba(250,240,200,0.55); }

/* アシストモック */
.assist-mock { display: flex; flex-direction: column; gap: 8px; }
.assist-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.assist-bars { display: flex; flex-direction: column; gap: 6px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-method { font-size: 11px; color: var(--text-sub); width: 44px; flex-shrink: 0; }
.bar-track { flex: 1; height: 6px; background: var(--bg-surface); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--accent); border-radius: 3px; }
.bar-pct { font-size: 10px; color: var(--text-faint); width: 30px; text-align: right; flex-shrink: 0; }
.assist-services { display: flex; gap: 6px; flex-wrap: wrap; }
.assist-service {
  display: inline-flex; align-items: center;
  padding: 5px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
}

/* フッターCTA */
.footer-cta {
  margin-top: 12px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-faint);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-sm);
}
.footer-cta-text {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
}
.footer-cta-btn {
  display: inline-block;
  padding: 12px 32px;
  background: var(--accent);
  color: #fff;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s;
}
.footer-cta-btn:hover { background: var(--accent-hover); }

@media (max-width: 430px) {
  .method-grid { grid-template-columns: repeat(5, 1fr); }
  .method-name { font-size: 10px; }
  .method-desc { display: none; }
}
</style>
