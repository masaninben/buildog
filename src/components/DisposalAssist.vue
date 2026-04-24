<template>
  <div class="da-card">
    <div class="da-header">
      <span class="da-title">手放しアシスト</span>
    </div>

    <!-- ① コミュニティ統計 -->
    <div v-if="totalDisposed > 0" class="da-block">
      <p class="da-label">Penstokユーザーが手放した方法（{{ totalDisposed }}件）</p>
      <div class="da-stats">
        <div v-for="m in sortedMethods" :key="m.value" class="da-stat-row">
          <span class="da-method">{{ m.label }}</span>
          <div class="da-track">
            <div class="da-fill" :style="{ width: pct(m.count) + '%' }" />
          </div>
          <span class="da-pct">{{ pct(m.count) }}%</span>
        </div>
      </div>
    </div>

    <!-- ② フリマ出品リンク -->
    <div class="da-block">
      <p class="da-label">フリマ・オークションで出品</p>
      <div class="da-services">
        <a
          v-for="s in freeMarkets"
          :key="s.name"
          :href="s.href"
          target="_blank"
          rel="noopener noreferrer"
          class="da-service"
        >
          <img :src="faviconUrl(s.domain)" class="da-favicon" alt="" />
          <span>{{ s.name }}</span>
        </a>
      </div>
    </div>

    <!-- ② 買取サービス（カテゴリ別） -->
    <div v-if="buybackServices.length > 0" class="da-block">
      <p class="da-label">買取サービス</p>
      <div class="da-services">
        <a
          v-for="s in buybackServices"
          :key="s.name"
          :href="s.href"
          target="_blank"
          rel="noopener noreferrer"
          class="da-service"
        >
          <img :src="faviconUrl(s.domain)" class="da-favicon" alt="" />
          <span>{{ s.name }}</span>
        </a>
      </div>
    </div>

    <!-- ③ 廃棄・処分 -->
    <div class="da-block">
      <p class="da-label">廃棄・処分</p>
      <div v-if="isLithiumRisk" class="da-lithium">
        ⚠️ <strong>リチウム電池に注意</strong><br>
        この商品にはリチウム電池が含まれる場合があります。
        可燃・不燃ゴミには出さず、自治体指定の小型充電式電池回収ボックスへ。
        <a href="https://www.jbrc.com/general/map/" target="_blank" rel="noopener" class="da-inline-link">回収場所を探す →</a>
      </div>
      <a :href="municipalUrl" target="_blank" rel="noopener noreferrer" class="da-muni">
        🏛 {{ municipalLabel }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { userProfileStore } from '../store/userProfile'
import type { ItemCategory } from '../types'

const props = defineProps<{
  productId?: string
  name: string
  category?: ItemCategory
  userDisposalMethod?: string
}>()

const disposalCounts = ref<Record<string, number>>({})

const METHODS = [
  { value: 'resale',   label: '再販売' },
  { value: 'gift',     label: '譲渡' },
  { value: 'donation', label: '寄付' },
  { value: 'recycle',  label: 'リサイクル' },
  { value: 'disposal', label: '廃棄' },
]

// 自分の手放し分を除いたカウント
const adjustedCounts = computed(() => {
  const counts = { ...disposalCounts.value }
  if (props.userDisposalMethod && counts[props.userDisposalMethod] > 0) {
    counts[props.userDisposalMethod] = counts[props.userDisposalMethod] - 1
  }
  return counts
})

const totalDisposed = computed(() =>
  Object.values(adjustedCounts.value).reduce((s, v) => s + Math.max(0, v), 0)
)

const sortedMethods = computed(() =>
  METHODS
    .map(m => ({ ...m, count: Math.max(0, adjustedCounts.value[m.value] ?? 0) }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count)
)

function pct(count: number): number {
  return totalDisposed.value > 0 ? Math.round(count / totalDisposed.value * 100) : 0
}

// フリマ検索リンク
const enc = computed(() => encodeURIComponent(props.name))

const freeMarkets = computed(() => [
  { name: 'メルカリ',  domain: 'jp.mercari.com',          href: `https://jp.mercari.com/search?keyword=${enc.value}` },
  { name: 'ヤフオク', domain: 'auctions.yahoo.co.jp',     href: `https://auctions.yahoo.co.jp/search/search?p=${enc.value}` },
  { name: 'ラクマ',   domain: 'fril.jp',                  href: `https://fril.jp/search?query=${enc.value}` },
])

const buybackServices = computed(() => {
  const cat = props.category
  const e = enc.value
  if (cat === 'book') return [
    { name: 'ブックオフ', domain: 'shopping.bookoff.co.jp', href: 'https://shopping.bookoff.co.jp/' },
    { name: 'ネットオフ', domain: 'www.netoff.co.jp',       href: `https://www.netoff.co.jp/cmdtyallsearch?word=${e}` },
    { name: 'ウリドキ',   domain: 'uridoki.net',            href: `https://uridoki.net/pix/search/items?category=&name=${e}` },
  ]
  if (cat === 'music') return [
    { name: 'ディスクユニオン', domain: 'diskunion.net', href: `https://diskunion.net/portal/ct/search?q=${e}` },
  ]
  if (cat === 'game' || cat === 'electronics' || cat === 'camera') return [
    { name: 'ゲオ',     domain: 'www.geosonline.co.jp', href: 'https://www.geosonline.co.jp/' },
    { name: 'ハードオフ', domain: 'www.hardoff.co.jp',  href: 'https://www.hardoff.co.jp/' },
  ]
  if (cat === 'shoes') return [
    { name: 'ZOZO', domain: 'zozo.jp', href: `https://zozo.jp/search/?keyword=${e}` },
    { name: 'スニーカーダンク', domain: 'snkrdunk.com', href: `https://snkrdunk.com/sneakers/search/?q=${e}` },
  ]
  if (cat === 'clothing') return [
    { name: 'ZOZO', domain: 'zozo.jp', href: `https://zozo.jp/search/?keyword=${e}` },
    { name: 'ブランディア', domain: 'brandear.jp', href: `https://brandear.jp/` },
  ]
  if (cat === 'bag' || cat === 'watch') return [
    { name: 'ブランディア', domain: 'brandear.jp', href: `https://brandear.jp/` },
    { name: 'ブランドオフ', domain: 'www.brandoff.co.jp', href: `https://www.brandoff.co.jp/` },
  ]
  if (cat === 'instrument') return [
    { name: 'イシバシ楽器', domain: 'www.ishibashi.co.jp', href: `https://www.ishibashi.co.jp/` },
    { name: 'ハードオフ', domain: 'www.hardoff.co.jp', href: `https://www.hardoff.co.jp/` },
  ]
  if (cat === 'sports') return [
    { name: 'スポーツデポ', domain: 'www.alpen-group.jp', href: `https://www.alpen-group.jp/shop/sportsdepot/` },
    { name: 'ハードオフ', domain: 'www.hardoff.co.jp', href: `https://www.hardoff.co.jp/` },
  ]
  return []
})

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}

// 廃棄・処分
const isLithiumRisk = computed(() =>
  props.category === 'electronics' || props.category === 'camera' || props.category === 'game' || props.category === 'watch'
)

const municipalUrl = computed(() => {
  const p = userProfileStore.profile
  if (p?.prefecture && p?.city) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${p.prefecture} ${p.city} ゴミ 分別 処分方法`)}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent('ゴミ 分別 処分方法 調べ方')}`
})

const municipalLabel = computed(() => {
  const p = userProfileStore.profile
  if (p?.prefecture && p?.city) return `${p.city}のゴミ・処分情報を調べる`
  return '居住地のゴミ・処分情報を調べる（プロフィールで地域設定）'
})

onMounted(async () => {
  if (!props.productId) return
  try {
    const snap = await getDoc(doc(db, 'products', props.productId))
    disposalCounts.value = snap.data()?.disposalCounts ?? {}
  } catch (e) {
    console.warn('disposalCounts fetch error:', e)
  }
})
</script>

<style scoped>
.da-card {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-faint);
  border-left: 3px solid var(--warning);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.da-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.da-icon { font-size: 16px; }
.da-title { font-size: 14px; font-weight: 700; color: var(--text); }

.da-block { display: flex; flex-direction: column; gap: 8px; }

.da-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-faint);
}

/* コミュニティ統計 */
.da-stats { display: flex; flex-direction: column; gap: 6px; }
.da-stat-row { display: flex; align-items: center; gap: 8px; }
.da-method { font-size: 11px; color: var(--text-sub); width: 40px; flex-shrink: 0; }
.da-track {
  flex: 1; height: 6px; background: var(--bg-surface); border-radius: 3px; overflow: hidden;
}
.da-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.4s ease; }
.da-pct { font-size: 10px; color: var(--text-faint); width: 30px; text-align: right; flex-shrink: 0; }

/* フリマ・買取サービス */
.da-services { display: flex; flex-wrap: wrap; gap: 6px; }
.da-service {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}
.da-service:hover { border-color: var(--accent); color: var(--accent); }
.da-favicon { width: 14px; height: 14px; border-radius: 2px; }

/* 廃棄・処分 */
.da-lithium {
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-sub);
  background: var(--warning-bg);
  border-radius: 6px;
  padding: 10px 12px;
}
.da-lithium strong { color: var(--warning); }
.da-inline-link { color: var(--warning); font-weight: 600; text-decoration: none; margin-left: 4px; }
.da-inline-link:hover { text-decoration: underline; }

.da-muni {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  padding: 6px 0;
}
.da-muni:hover { text-decoration: underline; }
</style>
