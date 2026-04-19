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

      <!-- Penstok スコア（仮） -->
      <div class="score-card">
        <div class="score-left">
          <p class="score-label">Penstok Score</p>
          <p class="score-value">{{ penstokScore.toLocaleString() }}</p>
          <p class="score-hint">仮スコア・今後実装予定</p>
        </div>
        <div class="score-right">
          <span class="score-rank">{{ scoreRank }}</span>
        </div>
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
  { value: 'resale',   label: '再販売', icon: '💰', color: '#5a9a6a' },
  { value: 'gift',     label: '譲渡',   icon: '🎁', color: '#6a80c8' },
  { value: 'donation', label: '寄付',   icon: '❤️', color: '#c86a80' },
  { value: 'disposal', label: '廃棄',   icon: '🗑',  color: '#b0a090' },
]

const disposalBreakdown = computed(() =>
  DISPOSAL_METHODS.map(m => ({
    ...m,
    count: shelfStore.items.filter(i => i.status === 'archived' && i.disposalMethod === m.value).length,
  })).filter(m => m.count > 0)
)

// ---- Penstok スコア（仮） ----
const penstokScore = computed(() => {
  const base = totalCount.value * 10
  const archiveBonus = archivedCount.value * 15
  const sustainableCount = shelfStore.items.filter(
    i => i.status === 'archived' && ['resale', 'gift', 'donation'].includes(i.disposalMethod ?? '')
  ).length
  const sustainableBonus = sustainableCount * 20
  return Math.round((base + archiveBonus + sustainableBonus) / 10) * 10
})

const scoreRank = computed(() => {
  const s = penstokScore.value
  if (s >= 1000) return '🏆'
  if (s >= 500)  return '🥇'
  if (s >= 200)  return '🥈'
  if (s >= 50)   return '🥉'
  return '🌱'
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
  z-index: 200;
  background: rgba(30, 20, 10, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

@media (min-width: 480px) {
  .modal-overlay { align-items: center; padding: 20px; }
}

.modal-card {
  background: #fff;
  border-radius: 18px 18px 0 0;
  width: 100%;
  max-width: 480px;
  padding: 24px 24px 40px;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 92vh;
  overflow-y: auto;
}

@media (min-width: 480px) {
  .modal-card {
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #2c2315;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #b0a090;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

/* プロフィール */
.profile-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e8e0d0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.avatar-placeholder {
  font-size: 22px;
  font-weight: 700;
  color: #8b6914;
}

.profile-name {
  font-size: 16px;
  font-weight: 700;
  color: #2c2315;
}

.profile-email {
  font-size: 12px;
  color: #b0a090;
  margin-top: 2px;
}

.profile-location {
  font-size: 12px;
  color: #8b6914;
  margin-top: 3px;
}

/* Penstok スコア */
.score-card {
  background: linear-gradient(135deg, #fdf3dc, #fff8ee);
  border: 1px solid rgba(139, 105, 20, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-label {
  font-size: 11px;
  font-weight: 700;
  color: #8b6914;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.score-value {
  font-size: 32px;
  font-weight: 800;
  color: #2c2315;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.score-hint {
  font-size: 10px;
  color: #c8a830;
  margin-top: 4px;
}

.score-rank {
  font-size: 40px;
  line-height: 1;
}

/* 統計 */
.stats-section, .disposal-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-title {
  font-size: 11px;
  font-weight: 700;
  color: #b0a090;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  background: #faf8f4;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-item--archived { background: #f5f2ec; }

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #2c2315;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 10px;
  color: #b0a090;
  font-weight: 600;
  white-space: nowrap;
}

/* 手放し方法 */
.disposal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.disposal-row {
  display: grid;
  grid-template-columns: 20px 48px 1fr 24px;
  align-items: center;
  gap: 8px;
}

.disposal-icon { font-size: 14px; text-align: center; }

.disposal-label {
  font-size: 12px;
  color: #5a4f40;
  font-weight: 500;
}

.disposal-bar-wrap {
  height: 6px;
  background: #f0ece4;
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
  color: #2c2315;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 区切り */
.divider {
  border: none;
  border-top: 1px solid #f0ece4;
  margin: 0;
}

/* 居住地 */
.section-label {
  font-size: 12px;
  font-weight: 700;
  color: #8b6914;
  letter-spacing: 0.04em;
}

.section-hint {
  font-size: 11px;
  color: #b0a090;
  line-height: 1.6;
  margin-top: -8px;
}

.field { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: 11px;
  color: #b0a090;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

.loading-hint {
  font-size: 10px;
  color: #c8a830;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.city-input-wrap { position: relative; }

.field-select,
.field-input {
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid #e0dbd0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #2c2315;
  background: #faf8f4;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.field-select:focus,
.field-input:focus { border-color: #8b6914; }
.field-input:disabled { opacity: 0.5; }

.city-count {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #c0b8a8;
  pointer-events: none;
}

.field-hint-error { font-size: 11px; color: #c0786a; }

.save-btn {
  height: 42px;
  background: #8b6914;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.save-btn:hover:not(:disabled) { background: #70530f; }
.save-btn:disabled { opacity: 0.4; cursor: default; }

.saved-msg { font-size: 12px; color: #5a9a6a; text-align: center; margin-top: -8px; }
.error-msg { font-size: 12px; color: #c0786a; text-align: center; margin-top: -8px; }

.signout-btn {
  height: 42px;
  background: transparent;
  color: #c0786a;
  border: 1.5px solid #e8d0cc;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.signout-btn:hover { background: #fdf0ee; }
</style>
