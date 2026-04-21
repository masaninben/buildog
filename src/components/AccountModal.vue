<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-title">マイページ</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- プロフィール -->
      <div class="profile-row">
        <div class="avatar-wrap">
          <img v-if="profile?.photoURL" :src="profile.photoURL" class="avatar-img" />
          <span v-else class="avatar-placeholder">{{ initial }}</span>
        </div>
        <div class="profile-info">
          <p class="profile-name">{{ profile?.displayName || '(表示名なし)' }}</p>
          <p class="profile-email">{{ profile?.email }}</p>
          <p v-if="profile?.prefecture || profile?.city" class="profile-location">
            📍 {{ [profile?.prefecture, profile?.city].filter(Boolean).join(' ') }}
          </p>
        </div>
      </div>

      <!-- Penstok スコア -->
      <div class="score-card">
        <div class="score-top">
          <div class="score-left">
            <p class="score-label">Penstok Score</p>
            <p class="score-value">{{ penstokScore.toLocaleString() }}</p>
            <p class="score-total-hint">/ 1000</p>
          </div>
          <div class="score-right">
            <p class="rank-name">{{ currentRank.name }}</p>
            <p class="rank-sub">{{ currentRank.sub }}</p>
          </div>
        </div>

        <!-- 5軸ブレークダウン -->
        <div class="score-axes">
          <div class="axis-row">
            <span class="axis-label">活動量</span>
            <div class="axis-track"><div class="axis-bar" :style="{ width: `${(activityScore / 200) * 100}%`, background: 'var(--accent)' }" /></div>
            <span class="axis-val">{{ activityScore }}<span class="axis-max">/200</span></span>
          </div>
          <div class="axis-row">
            <span class="axis-label">継続性</span>
            <div class="axis-track"><div class="axis-bar" :style="{ width: `${(continuityScore / 150) * 100}%`, background: 'var(--blue)' }" /></div>
            <span class="axis-val">{{ continuityScore }}<span class="axis-max">/150</span></span>
          </div>
          <div class="axis-row">
            <span class="axis-label">循環貢献</span>
            <div class="axis-track"><div class="axis-bar" :style="{ width: `${(circulationScore / 250) * 100}%`, background: 'var(--success)' }" /></div>
            <span class="axis-val">{{ circulationScore }}<span class="axis-max">/250</span></span>
          </div>
          <div class="axis-row axis-row--locked" title="編集承認システム実装後に解放">
            <span class="axis-label">信頼性 🔒</span>
            <div class="axis-track"><div class="axis-bar" style="width:0%" /></div>
            <span class="axis-val axis-val--locked">—<span class="axis-max">/250</span></span>
          </div>
          <div class="axis-row">
            <span class="axis-label">データ貢献</span>
            <div class="axis-track"><div class="axis-bar" :style="{ width: `${(contributionScore / 150) * 100}%`, background: 'var(--pink)' }" /></div>
            <span class="axis-val">{{ contributionScore }}<span class="axis-max">/150</span></span>
          </div>
        </div>

        <p class="next-action">💡 {{ nextAction }}</p>
      </div>

      <!-- 所有物統計 -->
      <div class="stats-section">
        <p class="stats-title">所有物サマリー</p>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ ownedCount }}</span>
            <span class="stat-label">所有中</span>
          </div>
          <div class="stat-item stat-item--archived">
            <span class="stat-value">{{ archivedCount }}</span>
            <span class="stat-label">手放し済み</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ totalCount }}</span>
            <span class="stat-label">総登録数</span>
          </div>
        </div>
      </div>

      <!-- 手放し方法別内訳 -->
      <div v-if="archivedCount > 0" class="disposal-section">
        <p class="stats-title">手放し方法の内訳</p>
        <div class="disposal-list">
          <div
            v-for="m in disposalBreakdown"
            :key="m.value"
            class="disposal-row"
          >
            <span class="disposal-icon">{{ m.icon }}</span>
            <span class="disposal-label">{{ m.label }}</span>
            <div class="disposal-bar-wrap">
              <div
                class="disposal-bar"
                :style="{ width: `${(m.count / archivedCount) * 100}%`, background: m.color }"
              />
            </div>
            <span class="disposal-count">{{ m.count }}</span>
          </div>
        </div>
      </div>

      <hr class="divider" />

      <!-- 居住地設定 -->
      <div class="section-label">居住地設定</div>
      <p class="section-hint">廃棄方法の案内などに使います。市区町村まで設定してください。</p>

      <div class="field">
        <label class="field-label">都道府県</label>
        <select v-model="prefecture" class="field-select" @change="onPrefectureChange">
          <option value="">選択してください</option>
          <option v-for="p in PREFECTURES" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field-label">
          市区町村
          <span v-if="citiesLoading" class="loading-hint">読み込み中…</span>
        </label>
        <div class="city-input-wrap">
          <input
            v-model="city"
            class="field-input"
            type="text"
            :list="cities.length ? 'city-list' : undefined"
            placeholder="例：博多区"
            :disabled="!!prefecture && citiesLoading"
            autocomplete="off"
          />
          <datalist id="city-list">
            <option v-for="c in cities" :key="c" :value="c" />
          </datalist>
          <span v-if="cities.length" class="city-count">{{ cities.length }}件</span>
        </div>
        <p v-if="citiesError" class="field-hint-error">候補の取得に失敗しました。手入力してください。</p>
      </div>

      <button class="save-btn" :disabled="saving" @click="saveLocation">
        {{ saving ? '保存中…' : '居住地を保存' }}
      </button>
      <p v-if="saved" class="saved-msg">✓ 保存しました</p>
      <p v-if="saveError" class="error-msg">{{ saveError }}</p>

      <hr class="divider" />

      <button class="signout-btn" @click="handleSignOut">ログアウト</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { userProfileStore } from '../store/userProfile'
import { store as shelfStore } from '../store/shelf'
import { signOut } from '../lib/auth'

defineEmits<{ close: [] }>()

const router = useRouter()
const profile = computed(() => userProfileStore.profile)
const initial = computed(() => {
  const name = profile.value?.displayName ?? profile.value?.email ?? ''
  return name.charAt(0).toUpperCase() || '?'
})

// ---- 統計 ----
const ownedCount    = computed(() => shelfStore.items.filter(i => i.status === 'owned').length)
const archivedCount = computed(() => shelfStore.items.filter(i => i.status === 'archived').length)
const totalCount    = computed(() => shelfStore.items.length)

const DISPOSAL_METHODS = [
  { value: 'resale',   label: '再販売',    icon: '💰', color: '#5a9a6a' },
  { value: 'gift',     label: '譲渡',      icon: '🎁', color: '#6a80c8' },
  { value: 'donation', label: '寄付',      icon: '❤️', color: '#c86a80' },
  { value: 'recycle',  label: 'リサイクル', icon: '♻️', color: '#4ea87a' },
  { value: 'disposal', label: '廃棄',      icon: '🗑',  color: '#b0a090' },
]

const disposalBreakdown = computed(() =>
  DISPOSAL_METHODS.map(m => ({
    ...m,
    count: shelfStore.items.filter(i => i.status === 'archived' && i.disposalMethod === m.value).length,
  })).filter(m => m.count > 0)
)

// ---- Penstok Score 5軸 ----

function clamp(v: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, v)))
}

// Activity（活動量）0-200
const activityScore = computed(() => {
  const items = shelfStore.items
  const withNotes        = items.filter(i => i.notes?.trim()).length
  const withCustomImage  = items.filter(i => i.customImageUrl).length
  let s = 0
  s += Math.min(items.length * 3, 80)
  s += Math.min(withNotes * 5, 50)
  s += Math.min(withCustomImage * 6, 40)
  s += Math.min(archivedCount.value * 5, 30)
  return clamp(s, 0, 200)
})

// Continuity（継続性）0-150
const continuityScore = computed(() => {
  const items = shelfStore.items
  if (!items.length) return 0
  const dates = items.map(i => i.addedAt).filter(Boolean).sort()
  if (!dates.length) return 0
  const daysSince = Math.floor((Date.now() - new Date(dates[0]).getTime()) / 86400000)
  if (isNaN(daysSince)) return 0
  const uniqueMonths = new Set(dates.map(d => d.slice(0, 7))).size
  const archivedMonths = new Set(
    items.filter(i => i.archivedAt).map(i => i.archivedAt!.slice(0, 7))
  ).size
  let s = 0
  s += clamp(daysSince / 365 * 60, 0, 60)
  s += clamp(uniqueMonths * 7, 0, 60)
  s += clamp(archivedMonths * 5, 0, 30)
  return clamp(s, 0, 150)
})

// Circulation（循環貢献）0-250
const circulationScore = computed(() => {
  const items    = shelfStore.items
  const archived = items.filter(i => i.status === 'archived')
  const total    = items.length
  const resale   = archived.filter(i => i.disposalMethod === 'resale').length
  const gift     = archived.filter(i => i.disposalMethod === 'gift').length
  const donation = archived.filter(i => i.disposalMethod === 'donation').length
  const recycle  = archived.filter(i => i.disposalMethod === 'recycle').length
  const disposal = archived.filter(i => i.disposalMethod === 'disposal').length
  const good     = resale + gift + donation + recycle
  const circRate = total > 0 ? archived.length / total : 0
  const qualRate = archived.length > 0 ? good / archived.length : 0
  let s = 0
  s += resale   * 8
  s += gift     * 7
  s += donation * 9
  s += recycle  * 8
  s += disposal * 4
  s += circRate * 60
  s += qualRate * 40
  return clamp(s, 0, 250)
})

// Reliability（信頼性）0-250 — 編集承認システム実装後に解放
const reliabilityScore = computed(() => 0)

// Contribution（データ貢献）0-150
const contributionScore = computed(() => {
  const items          = shelfStore.items
  const withTitle      = items.filter(i => i.customTitle?.trim()).length
  const withImage      = items.filter(i => i.customImageUrl).length
  const withPrice      = items.filter(i => i.acquirePrice || i.sellPrice).length
  const withAcquiredAt = items.filter(i => i.acquiredAt).length
  let s = 0
  s += clamp(withTitle * 6, 0, 36)
  s += clamp(withImage * 5, 0, 35)
  s += clamp(withPrice * 4, 0, 30)
  s += clamp(withAcquiredAt * 2, 0, 20)
  return clamp(s, 0, 150)
})

const penstokScore = computed(() =>
  activityScore.value + continuityScore.value +
  circulationScore.value + reliabilityScore.value + contributionScore.value
)

const RANKS = [
  { min: 990, name: '管理人', sub: 'Penstok編集権限候補' },
  { min: 950, name: '案内人', sub: '他者の手放しを助ける存在' },
  { min: 900, name: '守り手', sub: '信頼できる記録者' },
  { min: 800, name: '編み手', sub: 'データで世界を編んでいる' },
  { min: 650, name: '渡し手', sub: '質の高い循環を続けている' },
  { min: 450, name: '流し手', sub: 'モノを循環させている' },
  { min: 250, name: '整え手', sub: '情報を丁寧に整えている' },
  { min: 100, name: '記し手', sub: '持ち物を記録している' },
  { min: 0,   name: '訪れ手', sub: 'まだ記録を始めたばかり' },
]

const currentRank = computed(() =>
  RANKS.find(r => penstokScore.value >= r.min) ?? RANKS[RANKS.length - 1]
)

const nextAction = computed(() => {
  const items = shelfStore.items
  if (!items.length) return 'アイテムを登録するとスコアが始まります'
  if (!archivedCount.value) return '手放し記録を始めると循環スコアが上がります'
  const archived = items.filter(i => i.status === 'archived')
  const good = archived.filter(i => ['resale','gift','donation','recycle'].includes(i.disposalMethod ?? '')).length
  if (archived.length > 0 && good < archived.length * 0.5) return '売る・譲る・寄付するとスコアが上がります'
  const withPrice = items.filter(i => i.acquirePrice).length
  if (withPrice < items.length * 0.3) return '取得金額を記録するとスコアが上がります'
  return '継続して記録を続けるとスコアが上がります'
})

// ---- 居住地 ----
const prefecture = ref(profile.value?.prefecture ?? '')
const city = ref(profile.value?.city ?? '')
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const cities = ref<string[]>([])
const citiesLoading = ref(false)
const citiesError = ref(false)

let allData: Record<string, string[]> | null = null
let fetchPromise: Promise<Record<string, string[]>> | null = null

async function loadAllData(): Promise<Record<string, string[]>> {
  if (allData) return allData
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch('https://geolonia.github.io/japanese-addresses/api/ja.json')
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then(d => { allData = d; return d })
  return fetchPromise
}

async function fetchCities(pref: string): Promise<string[]> {
  if (!pref) return []
  try {
    const data = await loadAllData()
    return data[pref] ?? []
  } catch {
    return []
  }
}

async function onPrefectureChange() {
  city.value = ''
  cities.value = []
  citiesError.value = false
  if (!prefecture.value) return
  citiesLoading.value = true
  try {
    const list = await fetchCities(prefecture.value)
    if (list.length === 0) citiesError.value = true
    else cities.value = list
  } finally {
    citiesLoading.value = false
  }
}

if (prefecture.value) {
  fetchCities(prefecture.value).then(list => { cities.value = list })
}

async function saveLocation() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    await userProfileStore.updateLocation(prefecture.value, city.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e: any) {
    saveError.value = `保存に失敗しました: ${e?.message ?? '不明なエラー'}`
  } finally {
    saving.value = false
  }
}

async function handleSignOut() {
  await signOut()
  router.push({ name: 'login' })
}

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
@media (min-width: 480px) { .modal-overlay { align-items: center; padding: 20px; } }

.modal-card {
  background: var(--bg-card);
  border-radius: 18px 18px 0 0;
  width: 100%;
  max-width: 480px;
  padding: 0 24px calc(24px + env(safe-area-inset-bottom, 0px));
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 92dvh;
  overflow-y: auto;
}
@media (min-width: 480px) {
  .modal-card { border-radius: 16px; padding: 0 24px 24px; max-height: 90dvh; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-card);
  /* カード左右paddingを打ち消して全幅に */
  margin: 0 -24px;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--border-faint);
  flex-shrink: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-faint);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-surface);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.avatar-placeholder {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.profile-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.profile-email {
  font-size: 12px;
  color: var(--text-faint);
  margin-top: 2px;
}

.profile-location {
  font-size: 12px;
  color: var(--accent);
  margin-top: 3px;
}

.score-card {
  background: var(--score-bg);
  border: 1px solid var(--score-border);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.score-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.score-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.score-value {
  font-size: 30px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.score-total-hint {
  font-size: 10px;
  color: var(--text-faint);
  margin-top: 3px;
}

.rank-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.2;
  text-align: right;
}

.rank-sub {
  font-size: 10px;
  color: var(--text-faint);
  text-align: right;
  margin-top: 3px;
  max-width: 120px;
  line-height: 1.4;
}

/* 5軸ブレークダウン */
.score-axes { display: flex; flex-direction: column; gap: 7px; }

.axis-row {
  display: grid;
  grid-template-columns: 64px 1fr 48px;
  align-items: center;
  gap: 8px;
}
.axis-row--locked { opacity: 0.35; }

.axis-label { font-size: 10px; color: var(--text-sub); font-weight: 500; }

.axis-track {
  height: 5px;
  background: var(--bg-surface);
  border-radius: 3px;
  overflow: hidden;
}

.axis-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
  min-width: 0;
}

.axis-val {
  font-size: 10px;
  font-weight: 700;
  color: var(--text);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.axis-val--locked { color: var(--text-faint); }
.axis-max { font-weight: 400; color: var(--text-faint); }

.next-action {
  font-size: 11px;
  color: var(--accent);
  line-height: 1.5;
  padding-top: 2px;
  border-top: 1px solid var(--border-subtle);
}

.stats-section, .disposal-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-faint);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  background: var(--bg-surface);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border-faint);
}

.stat-item--archived { opacity: 0.8; }

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 10px;
  color: var(--text-faint);
  font-weight: 600;
  white-space: nowrap;
}

.disposal-list { display: flex; flex-direction: column; gap: 8px; }

.disposal-row {
  display: grid;
  grid-template-columns: 20px 48px 1fr 24px;
  align-items: center;
  gap: 8px;
}

.disposal-icon { font-size: 14px; text-align: center; }

.disposal-label {
  font-size: 12px;
  color: var(--text-sub);
  font-weight: 500;
}

.disposal-bar-wrap {
  height: 6px;
  background: var(--bg-surface);
  border-radius: 3px;
  overflow: hidden;
}

.disposal-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
  min-width: 4px;
}

.disposal-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.divider {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 0;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.04em;
}

.section-hint {
  font-size: 11px;
  color: var(--text-faint);
  line-height: 1.6;
  margin-top: -8px;
}

.field { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

.loading-hint {
  font-size: 10px;
  color: var(--warning);
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.city-input-wrap { position: relative; }

.field-select,
.field-input {
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text);
  background: var(--bg-input);
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.field-select:focus,
.field-input:focus { border-color: var(--accent); }
.field-input:disabled { opacity: 0.5; }

.city-count {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--text-placeholder);
  pointer-events: none;
}

.field-hint-error { font-size: 11px; color: var(--danger); }

.save-btn {
  height: 42px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.save-btn:hover:not(:disabled) { background: var(--accent-hover); }
.save-btn:disabled { opacity: 0.4; cursor: default; }

.saved-msg { font-size: 12px; color: var(--success); text-align: center; margin-top: -8px; }
.error-msg { font-size: 12px; color: var(--danger); text-align: center; margin-top: -8px; }

.signout-btn {
  height: 42px;
  background: transparent;
  color: var(--danger);
  border: 1.5px solid var(--danger-bg);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.signout-btn:hover { background: var(--danger-bg); }
</style>
