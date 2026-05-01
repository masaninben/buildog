<template>
  <div class="eq-detail">

    <!-- ナビバー -->
    <div class="nav-bar">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="nav-title">設備詳細</span>
      <button class="edit-toggle-btn" @click="editing = !editing">
        {{ editing ? 'キャンセル' : '編集' }}
      </button>
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="detail-loading">読み込み中…</div>

    <!-- 見つからない -->
    <div v-else-if="!item" class="detail-loading">設備が見つかりません</div>

    <!-- 詳細表示 -->
    <div v-else class="detail-body">

      <!-- カテゴリ・アイコン -->
      <div class="detail-hero" :class="`hero--${statusColor}`">
        <span class="hero-icon">{{ categoryEmoji }}</span>
        <div>
          <div class="hero-category">{{ EQUIPMENT_CATEGORY_LABELS[item.category] }}</div>
          <div class="hero-name">{{ editing ? form.name : item.name }}</div>
        </div>
        <div class="hero-status" :class="`status--${statusColor}`">
          {{ EQUIPMENT_STATUS_LABELS[editing ? form.status : item.status] }}
        </div>
      </div>

      <!-- 寿命ウォーニング -->
      <div v-if="lifespanWarning" class="warn-banner">
        <span class="warn-icon">⚠️</span>
        {{ lifespanWarning }}
      </div>

      <!-- 編集フォーム -->
      <form v-if="editing" class="edit-form" @submit.prevent="save">

        <div class="field-group">
          <label class="field-label">名称 <span class="required">必須</span></label>
          <input v-model="form.name" class="field-input" type="text" maxlength="60" />
        </div>

        <div class="field-group">
          <label class="field-label">メーカー</label>
          <input v-model="form.maker" class="field-input" type="text" maxlength="40" />
        </div>

        <div class="field-group">
          <label class="field-label">型番</label>
          <input v-model="form.modelNumber" class="field-input" type="text" maxlength="60" />
        </div>

        <div class="field-group">
          <label class="field-label">設置年月</label>
          <input v-model="form.installedDate" class="field-input" type="month" />
        </div>

        <div class="field-group">
          <label class="field-label">保証期限</label>
          <input v-model="form.warrantyExpiry" class="field-input" type="month" />
        </div>

        <div class="field-group">
          <label class="field-label">状態</label>
          <div class="status-row">
            <button
              v-for="(label, st) in EQUIPMENT_STATUS_LABELS"
              :key="st"
              type="button"
              class="status-chip"
              :class="[`status-chip--${st}`, { selected: form.status === st }]"
              @click="form.status = st as EquipmentStatus"
            >{{ label }}</button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">メモ</label>
          <textarea v-model="form.memo" class="field-textarea" rows="3" maxlength="200" />
        </div>

        <button type="submit" class="save-btn" :disabled="!form.name.trim() || saving">
          {{ saving ? '保存中…' : '保存する' }}
        </button>

      </form>

      <!-- 読み取りビュー -->
      <!-- 読み取りビュー -->
      <div v-else class="info-view">

        <!-- 基本情報テーブル -->
        <div class="info-list">
          <div v-if="item.maker" class="info-row">
            <span class="info-key">メーカー</span>
            <span class="info-val">{{ item.maker }}</span>
          </div>
          <div v-if="item.modelNumber" class="info-row">
            <span class="info-key">型番</span>
            <span class="info-val">{{ item.modelNumber }}</span>
          </div>
          <div v-if="item.installedDate" class="info-row">
            <span class="info-key">設置年月</span>
            <span class="info-val">{{ formatMonth(item.installedDate) }}</span>
          </div>
          <div v-if="item.warrantyExpiry" class="info-row">
            <span class="info-key">保証期限</span>
            <span class="info-val">
              {{ formatMonth(item.warrantyExpiry) }}
              <span v-if="isWarrantyExpired(item.warrantyExpiry)" class="expired-badge">期限切れ</span>
              <span v-else-if="isWarrantySoon(item.warrantyExpiry)" class="soon-badge">まもなく期限</span>
            </span>
          </div>
          <div v-if="item.memo" class="info-row info-row--memo">
            <span class="info-key">メモ</span>
            <span class="info-val memo-val">{{ item.memo }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">登録日</span>
            <span class="info-val">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>

        <!-- 寿命プログレス -->
        <div v-if="lifespanInfo" class="lifespan-section">
          <div class="lifespan-label">
            <span>目安寿命</span>
            <span>{{ lifespanInfo.elapsed }}年 / {{ lifespanInfo.total }}年</span>
          </div>
          <div class="lifespan-bar">
            <div
              class="lifespan-fill"
              :class="lifespanBarClass"
              :style="{ width: `${Math.min(lifespanInfo.ratio * 100, 100)}%` }"
            />
          </div>
        </div>

        <!-- 関連イベント -->
        <div v-if="relatedEvents.length > 0" class="related-section">
          <p class="related-section-title">関連イベント</p>
          <div class="related-event-list">
            <div
              v-for="ev in relatedEvents"
              :key="ev.eventId"
              class="related-event-row"
              @click="router.push({ name: 'karte-event-detail', params: { id: ev.eventId } })"
            >
              <span class="rel-ev-emoji">{{ TIMELINE_EVENT_TYPE_EMOJI[ev.eventType] }}</span>
              <div class="rel-ev-info">
                <div class="rel-ev-title">{{ ev.title }}</div>
                <div class="rel-ev-date">{{ formatDate(ev.eventDate) }}</div>
              </div>
              <svg class="rel-ev-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 削除 -->
        <div class="delete-wrap">
          <button class="delete-btn" @click="confirmDelete">この設備を削除</button>
        </div>

      </div>

    </div>

    <!-- 削除確認モーダル -->
    <Transition name="modal-fade">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal">
          <p class="modal-title">設備を削除しますか？</p>
          <p class="modal-sub">この操作は取り消せません。</p>
          <div class="modal-actions">
            <button class="modal-cancel" @click="showDeleteModal = false">キャンセル</button>
            <button class="modal-confirm" @click="doDelete" :disabled="deleting">
              {{ deleting ? '削除中…' : '削除する' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authState } from '../../lib/auth'
import { getEquipment, updateEquipment, deleteEquipment } from '../../services/equipment'
import { getEventsByEquipmentId } from '../../services/events'
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_LIFESPAN_YEARS,
  EQUIPMENT_STATUS_LABELS,
  TIMELINE_EVENT_TYPE_EMOJI,
} from '../../types'
import type { KarteEquipment, KarteTimelineEvent, EquipmentCategory, EquipmentStatus } from '../../types'

const router = useRouter()
const route  = useRoute()
const equipmentId = route.params.id as string

const item           = ref<KarteEquipment | null>(null)
const loading        = ref(true)
const editing        = ref(false)
const saving         = ref(false)
const deleting       = ref(false)
const showDeleteModal = ref(false)
const relatedEvents  = ref<KarteTimelineEvent[]>([])

// ===== カテゴリ絵文字 =====
const CATEGORY_EMOJI_MAP: Record<EquipmentCategory, string> = {
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

// ===== フォーム =====
const form = reactive({
  name:          '',
  maker:         '',
  modelNumber:   '',
  installedDate: '',
  warrantyExpiry:'',
  status:        'unknown' as EquipmentStatus,
  memo:          '',
})

// 月文字列変換（ISO → type="month"）
function isoToMonth(iso: string | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 7) // "YYYY-MM"
}

function populateForm(eq: KarteEquipment) {
  form.name          = eq.name
  form.maker         = eq.maker ?? ''
  form.modelNumber   = eq.modelNumber ?? ''
  form.installedDate = isoToMonth(eq.installedDate)
  form.warrantyExpiry= isoToMonth(eq.warrantyExpiry)
  form.status        = eq.status
  form.memo          = eq.memo ?? ''
}

// ===== 計算値 =====
const categoryEmoji = computed(() =>
  item.value ? CATEGORY_EMOJI_MAP[item.value.category] : '📦',
)

const statusColor = computed(() => {
  if (!item.value) return 'gray'
  const st = editing.value ? form.status : item.value.status
  const warn = lifespanWarning.value
  if (warn?.includes('超過') || st === 'replace_soon') return 'red'
  if (warn || st === 'warranty_soon') return 'orange'
  if (st === 'check_needed') return 'yellow'
  if (st === 'good') return 'green'
  return 'gray'
})

const lifespanWarning = computed(() => {
  if (!item.value?.installedDate) return null
  const lifespan = EQUIPMENT_LIFESPAN_YEARS[item.value.category]
  if (!lifespan) return null
  const yearsElapsed = (Date.now() - new Date(item.value.installedDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
  if (yearsElapsed >= lifespan) return `目安寿命（${lifespan}年）を超えています。交換を検討しましょう。`
  if (yearsElapsed / lifespan >= 0.8) return `目安寿命まであと${Math.ceil(lifespan - yearsElapsed)}年。交換時期が近づいています。`
  return null
})

const lifespanInfo = computed(() => {
  if (!item.value?.installedDate) return null
  const lifespan = EQUIPMENT_LIFESPAN_YEARS[item.value.category]
  if (!lifespan) return null
  const elapsed = (Date.now() - new Date(item.value.installedDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
  return {
    elapsed: Math.floor(elapsed),
    total: lifespan,
    ratio: elapsed / lifespan,
  }
})

const lifespanBarClass = computed(() => {
  const r = lifespanInfo.value?.ratio ?? 0
  if (r >= 1) return 'fill--red'
  if (r >= 0.8) return 'fill--orange'
  return 'fill--green'
})

// ===== 保証日付チェック =====
function isWarrantyExpired(iso: string): boolean {
  return new Date(iso) < new Date()
}
function isWarrantySoon(iso: string): boolean {
  const diffMs = new Date(iso).getTime() - Date.now()
  return diffMs > 0 && diffMs < 90 * 24 * 60 * 60 * 1000 // 90日以内
}

// ===== フォーマット =====
function formatMonth(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// ===== 保存 =====
async function save() {
  if (!form.name.trim() || saving.value) return
  const uid = authState.user?.uid
  if (!uid) return

  saving.value = true
  try {
    const toIso = (ym: string) => ym ? `${ym}-01` : undefined
    await updateEquipment(uid, equipmentId, {
      name:           form.name.trim(),
      maker:          form.maker.trim() || undefined,
      modelNumber:    form.modelNumber.trim() || undefined,
      installedDate:  toIso(form.installedDate),
      warrantyExpiry: toIso(form.warrantyExpiry),
      status:         form.status,
      memo:           form.memo.trim() || undefined,
    })
    // ローカルも更新
    if (item.value) {
      item.value.name          = form.name.trim()
      item.value.maker         = form.maker.trim() || undefined
      item.value.modelNumber   = form.modelNumber.trim() || undefined
      item.value.installedDate = toIso(form.installedDate)
      item.value.warrantyExpiry= toIso(form.warrantyExpiry)
      item.value.status        = form.status
      item.value.memo          = form.memo.trim() || undefined
    }
    editing.value = false
  } catch (e) {
    console.error(e)
    alert('保存に失敗しました')
  } finally {
    saving.value = false
  }
}

// ===== 削除 =====
function confirmDelete() {
  showDeleteModal.value = true
}

async function doDelete() {
  const uid = authState.user?.uid
  if (!uid) return
  deleting.value = true
  try {
    await deleteEquipment(uid, equipmentId)
    router.replace({ name: 'karte-equipment-list' })
  } catch (e) {
    console.error(e)
    alert('削除に失敗しました')
    deleting.value = false
  }
}

// ===== マウント =====
onMounted(async () => {
  const uid = authState.user?.uid
  if (!uid) { loading.value = false; return }

  const [eq, events] = await Promise.all([
    getEquipment(uid, equipmentId),
    getEventsByEquipmentId(uid, equipmentId),
  ])
  item.value = eq
  relatedEvents.value = events
  if (eq) populateForm(eq)
  loading.value = false
})

watch(editing, (val) => {
  if (val && item.value) populateForm(item.value)
})
</script>

<style scoped>
.eq-detail {
  min-height: 100vh;
  background: #f9f9f7;
  color: #1b3a5c;
  padding-bottom: 60px;
}

/* ===== ナビバー ===== */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #1b3a5c;
  box-shadow: 0 2px 12px rgba(27, 58, 92, 0.2);
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  color: rgba(255,255,255,0.85);
}
.back-btn svg { width: 20px; height: 20px; }

.nav-title {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}

.edit-toggle-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 999px;
  background: transparent;
  color: rgba(255,255,255,0.9);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.edit-toggle-btn:hover { background: rgba(255,255,255,0.12); }

/* ===== ローディング ===== */
.detail-loading {
  padding-top: 120px;
  text-align: center;
  font-size: 13px;
  color: rgba(27,58,92,0.4);
}

/* ===== 詳細ボディ ===== */
.detail-body {
  padding-top: 54px;
}

/* ===== ヒーロー ===== */
.detail-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px 20px;
  background: #fff;
  border-bottom: 1px solid rgba(27,58,92,0.06);
}

.hero-icon {
  font-size: 40px;
  line-height: 1;
  flex-shrink: 0;
}

.hero-category {
  font-size: 11px;
  color: rgba(27,58,92,0.45);
  font-weight: 600;
}

.hero-name {
  font-size: 20px;
  font-weight: 900;
  color: #1b3a5c;
  margin-top: 2px;
  line-height: 1.3;
}

.hero-status {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}
.status--green  { background: rgba(45,106,79,0.1);    color: #2d6a4f; }
.status--orange { background: rgba(244,162,97,0.15);  color: #c87137; }
.status--yellow { background: rgba(200,160,40,0.13);  color: #a07b10; }
.status--red    { background: rgba(220,80,80,0.12);   color: #c0392b; }
.status--gray   { background: rgba(27,58,92,0.07);    color: rgba(27,58,92,0.45); }

/* ===== 警告バナー ===== */
.warn-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 16px 0;
  padding: 12px 14px;
  background: rgba(220, 80, 80, 0.08);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #c0392b;
  line-height: 1.5;
}
.warn-icon { font-size: 14px; flex-shrink: 0; }

/* ===== 読み取りビュー ===== */
.info-view {
  padding: 16px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ===== 基本情報テーブル ===== */
.info-list {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(27,58,92,0.06);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(27,58,92,0.06);
}
.info-row--memo { align-items: flex-start; }

.info-key {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27,58,92,0.45);
  width: 80px;
  flex-shrink: 0;
}

.info-val {
  font-size: 14px;
  color: #1b3a5c;
  font-weight: 600;
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.memo-val {
  display: block;
  line-height: 1.6;
  white-space: pre-wrap;
}

.expired-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(192,57,43,0.1);
  color: #c0392b;
  padding: 1px 6px;
  border-radius: 4px;
}
.soon-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(200,160,40,0.13);
  color: #a07b10;
  padding: 1px 6px;
  border-radius: 4px;
}

/* ===== 寿命バー ===== */
.lifespan-section {
  margin-top: 12px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(27,58,92,0.06);
}

.lifespan-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: rgba(27,58,92,0.5);
  margin-bottom: 10px;
}

.lifespan-bar {
  height: 8px;
  background: rgba(27,58,92,0.08);
  border-radius: 4px;
  overflow: hidden;
}

.lifespan-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}
.fill--green  { background: #2d6a4f; }
.fill--orange { background: #f4a261; }
.fill--red    { background: #c0392b; }

/* ===== 削除ラップ ===== */
.delete-wrap { margin-top: 24px; margin-bottom: 16px; }

/* ===== 削除ボタン ===== */
.delete-btn {
  width: 100%;
  height: 44px;
  border: 1.5px solid rgba(192,57,43,0.3);
  border-radius: 12px;
  background: transparent;
  color: #c0392b;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}
.delete-btn:hover { background: rgba(192,57,43,0.05); }

/* ===== 編集フォーム ===== */
.edit-form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27,58,92,0.6);
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 5px;
}

.required {
  font-size: 10px;
  font-weight: 700;
  color: #c0392b;
  background: rgba(192,57,43,0.08);
  padding: 1px 5px;
  border-radius: 4px;
}

.field-input,
.field-textarea {
  background: #fff;
  border: 1.5px solid rgba(27,58,92,0.12);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  color: #1b3a5c;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus,
.field-textarea:focus { border-color: rgba(27,58,92,0.4); }
.field-textarea { resize: vertical; min-height: 72px; line-height: 1.5; }

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-chip {
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: 1.5px solid transparent;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.12s, border-color 0.12s;
}
.status-chip.selected { border-color: currentColor; }
.status-chip--good          { background: rgba(45,106,79,0.1);   color: #2d6a4f; }
.status-chip--check_needed  { background: rgba(244,162,97,0.15); color: #c87137; }
.status-chip--warranty_soon { background: rgba(200,160,40,0.13); color: #a07b10; }
.status-chip--replace_soon  { background: rgba(220,80,80,0.12);  color: #c0392b; }
.status-chip--unknown       { background: rgba(27,58,92,0.07);   color: rgba(27,58,92,0.45); }

.save-btn {
  height: 50px;
  border-radius: 16px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s;
}
.save-btn:disabled { opacity: 0.4; cursor: default; }
.save-btn:not(:disabled):active { opacity: 0.8; }

/* ===== 削除確認モーダル ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(11,26,50,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  background: #fff;
  border-radius: 20px;
  padding: 28px 24px 24px;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 8px 40px rgba(11,26,50,0.2);
}

.modal-title {
  font-size: 17px;
  font-weight: 800;
  color: #1b3a5c;
  margin-bottom: 8px;
}

.modal-sub {
  font-size: 13px;
  color: rgba(27,58,92,0.5);
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.modal-cancel {
  flex: 1;
  height: 44px;
  border: 1.5px solid rgba(27,58,92,0.15);
  border-radius: 12px;
  background: transparent;
  color: rgba(27,58,92,0.6);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.modal-cancel:hover { background: rgba(27,58,92,0.04); }

.modal-confirm {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: #c0392b;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.12s;
}
.modal-confirm:disabled { opacity: 0.5; cursor: default; }

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ===== 関連イベント ===== */
.related-section { margin-top: 12px; }

.related-section-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27,58,92,0.45);
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

.related-event-list {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(27,58,92,0.06);
}

.related-event-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(27,58,92,0.05);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.related-event-row:last-child { border-bottom: none; }
.related-event-row:active { background: rgba(27,58,92,0.03); }

.rel-ev-emoji { font-size: 18px; flex-shrink: 0; width: 26px; text-align: center; }

.rel-ev-info { flex: 1; min-width: 0; }

.rel-ev-title {
  font-size: 14px; font-weight: 700; color: #1b3a5c;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.rel-ev-date { font-size: 11px; color: rgba(27,58,92,0.45); margin-top: 2px; }

.rel-ev-arrow { width: 15px; height: 15px; color: rgba(27,58,92,0.25); flex-shrink: 0; }
</style>
