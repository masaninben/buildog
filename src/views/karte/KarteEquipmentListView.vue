<template>
  <div class="eq-list">

    <!-- ヘッダー -->
    <div class="eq-header">
      <div class="eq-header-text">
        <h1 class="eq-heading">住宅設備</h1>
        <p class="eq-sub">設備の状態・交換時期を管理します</p>
      </div>
      <button class="add-btn" @click="router.push({ name: 'karte-equipment-new' })">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        追加
      </button>
    </div>

    <!-- ローディング -->
    <div v-if="!loaded" class="eq-loading">読み込み中…</div>

    <!-- 設備一覧 -->
    <div v-else-if="items.length > 0" class="eq-grid">
      <div
        v-for="item in items"
        :key="item.equipmentId"
        class="eq-card"
        @click="router.push({ name: 'karte-equipment-detail', params: { id: item.equipmentId } })"
      >
        <!-- カテゴリアイコン -->
        <div class="eq-icon-wrap" :class="`icon--${statusColor(item)}`">
          <span class="eq-icon">{{ categoryEmoji(item.category) }}</span>
        </div>

        <!-- 情報 -->
        <div class="eq-info">
          <div class="eq-name">{{ item.name }}</div>
          <div class="eq-category">{{ EQUIPMENT_CATEGORY_LABELS[item.category] }}</div>
          <div v-if="item.installedDate" class="eq-installed">
            {{ formatInstalled(item.installedDate) }}設置
            <span v-if="lifespanWarning(item)" class="eq-lifespan-warn">
              {{ lifespanWarning(item) }}
            </span>
          </div>
        </div>

        <!-- ステータスバッジ -->
        <div class="eq-status-badge" :class="`status--${statusColor(item)}`">
          {{ EQUIPMENT_STATUS_LABELS[item.status] }}
        </div>

        <!-- 矢印 -->
        <svg class="eq-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>

    <!-- 空状態 -->
    <div v-else class="eq-empty">
      <span class="empty-icon">🏠</span>
      <p class="empty-title">設備が登録されていません</p>
      <p class="empty-sub">給湯器・エアコン・外壁など<br>住宅設備を登録して管理しましょう</p>
      <button class="empty-add-btn" @click="router.push({ name: 'karte-equipment-new' })">
        設備を追加する
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../../lib/auth'
import { subscribeEquipments } from '../../services/equipment'
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_LIFESPAN_YEARS,
  EQUIPMENT_STATUS_LABELS,
} from '../../types'
import type { KarteEquipment, EquipmentCategory } from '../../types'

const router = useRouter()
const items  = ref<KarteEquipment[]>([])
const loaded = ref(false)
let unsub: (() => void) | null = null

// ===== カテゴリ絵文字 =====
const CATEGORY_EMOJI: Record<EquipmentCategory, string> = {
  exterior_wall:      '🏠',
  roof:               '🏚️',
  solar_panel:        '☀️',
  storage_battery:    '🔋',
  gas_water_heater:   '🔥',
  eco_cute:           '💧',
  air_conditioner:    '❄️',
  kitchen:            '🍳',
  bathroom:           '🛁',
  toilet:             '🚽',
  washroom:           '🪥',
  floor:              '🪵',
  window:             '🪟',
  entrance_door:      '🚪',
  ventilation:        '💨',
  distribution_board: '⚡',
  other:              '📦',
}

function categoryEmoji(cat: EquipmentCategory): string {
  return CATEGORY_EMOJI[cat] ?? '📦'
}

// ===== ステータスカラー =====
function statusColor(item: KarteEquipment): string {
  const warn = lifespanWarning(item)
  if (warn?.includes('超過') || item.status === 'replace_soon') return 'red'
  if (warn || item.status === 'warranty_soon') return 'orange'
  if (item.status === 'check_needed') return 'yellow'
  if (item.status === 'good') return 'green'
  return 'gray'
}

// ===== 寿命警告 =====
function lifespanWarning(item: KarteEquipment): string | null {
  if (!item.installedDate) return null
  const lifespan = EQUIPMENT_LIFESPAN_YEARS[item.category]
  if (!lifespan) return null
  const yearsElapsed = (Date.now() - new Date(item.installedDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
  const ratio = yearsElapsed / lifespan
  if (ratio >= 1) return `寿命超過（目安${lifespan}年）`
  if (ratio >= 0.8) return `交換時期が近づいています`
  return null
}

// ===== フォーマット =====
function formatInstalled(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

// ===== マウント =====
onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return
  unsub = subscribeEquipments(uid, (data) => {
    items.value = data
    loaded.value = true
  })
})

onUnmounted(() => {
  unsub?.()
})
</script>

<style scoped>
.eq-list {
  min-height: 100vh;
  background: #f9f9f7;
  padding-top: 54px; /* KarteToolbar */
  padding-bottom: 48px;
  color: #1b3a5c;
}

/* ===== ヘッダー ===== */
.eq-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px 20px 16px;
}

.eq-heading {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.eq-sub {
  font-size: 12px;
  color: rgba(27, 58, 92, 0.44);
  margin-top: 3px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 14px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s;
}
.add-btn svg {
  width: 14px;
  height: 14px;
}
.add-btn:active { opacity: 0.75; }

/* ===== ローディング ===== */
.eq-loading {
  padding: 60px;
  text-align: center;
  font-size: 13px;
  color: rgba(27, 58, 92, 0.4);
}

/* ===== グリッド ===== */
.eq-grid {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== カード ===== */
.eq-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 2px 10px rgba(27, 58, 92, 0.07);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s, box-shadow 0.1s;
}
.eq-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(27, 58, 92, 0.05);
}

/* ===== アイコン ===== */
.eq-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon--green  { background: rgba(45, 106, 79, 0.12); }
.icon--orange { background: rgba(244, 162, 97, 0.15); }
.icon--yellow { background: rgba(230, 190, 80, 0.15); }
.icon--red    { background: rgba(220, 80, 80, 0.12); }
.icon--gray   { background: rgba(27, 58, 92, 0.07); }

.eq-icon {
  font-size: 22px;
  line-height: 1;
}

/* ===== 情報 ===== */
.eq-info {
  flex: 1;
  min-width: 0;
}

.eq-name {
  font-size: 15px;
  font-weight: 700;
  color: #1b3a5c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.eq-category {
  font-size: 11px;
  color: rgba(27, 58, 92, 0.45);
  margin-top: 2px;
}

.eq-installed {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 11px;
  color: rgba(27, 58, 92, 0.45);
  margin-top: 3px;
}

.eq-lifespan-warn {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  background: rgba(220, 80, 80, 0.1);
  color: #c0392b;
  padding: 1px 6px;
  border-radius: 999px;
}

/* ===== ステータスバッジ ===== */
.eq-status-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.status--green  { background: rgba(45, 106, 79, 0.1);  color: #2d6a4f; }
.status--orange { background: rgba(244, 162, 97, 0.15); color: #c87137; }
.status--yellow { background: rgba(200, 160, 40, 0.13); color: #a07b10; }
.status--red    { background: rgba(220, 80, 80, 0.12);  color: #c0392b; }
.status--gray   { background: rgba(27, 58, 92, 0.07);   color: rgba(27, 58, 92, 0.45); }

/* ===== 矢印 ===== */
.eq-arrow {
  width: 16px;
  height: 16px;
  color: rgba(27, 58, 92, 0.25);
  flex-shrink: 0;
}

/* ===== 空状態 ===== */
.eq-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 24px 80px;
  text-align: center;
}

.empty-icon  { font-size: 52px; }
.empty-title { font-size: 17px; font-weight: 800; color: #1b3a5c; }
.empty-sub   { font-size: 13px; color: rgba(27, 58, 92, 0.46); line-height: 1.7; }

.empty-add-btn {
  margin-top: 8px;
  height: 44px;
  padding: 0 24px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s;
}
.empty-add-btn:active { opacity: 0.75; }
</style>
