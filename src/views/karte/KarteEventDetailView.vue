<template>
  <div class="ev-detail">

    <!-- ナビバー -->
    <div class="nav-bar">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="nav-title">イベント詳細</span>
      <button class="edit-toggle-btn" @click="editing = !editing">
        {{ editing ? 'キャンセル' : '編集' }}
      </button>
    </div>

    <div v-if="loading" class="detail-loading">読み込み中…</div>
    <div v-else-if="!item" class="detail-loading">イベントが見つかりません</div>

    <div v-else class="detail-body">

      <!-- ヒーロー -->
      <div class="detail-hero" :class="`type-bg--${item.eventType}`">
        <span class="hero-emoji">{{ TIMELINE_EVENT_TYPE_EMOJI[item.eventType] }}</span>
        <div class="hero-text">
          <div class="hero-type-label">{{ TIMELINE_EVENT_TYPE_LABELS[item.eventType] }}</div>
          <div class="hero-title">{{ item.title }}</div>
          <div class="hero-date">{{ formatDate(item.eventDate) }}</div>
        </div>
      </div>

      <!-- 編集フォーム -->
      <form v-if="editing" class="edit-form" @submit.prevent="save">

        <div class="field-group">
          <label class="field-label">タイトル <span class="required">必須</span></label>
          <input v-model="form.title" class="field-input" type="text" maxlength="60" />
        </div>

        <div class="field-group">
          <label class="field-label">日付</label>
          <input v-model="form.eventDate" class="field-input" type="date" />
        </div>

        <div class="field-group">
          <label class="field-label">種別</label>
          <div class="type-grid">
            <button
              v-for="(label, t) in TIMELINE_EVENT_TYPE_LABELS"
              :key="t"
              type="button"
              class="type-chip"
              :class="{ selected: form.eventType === t }"
              @click="form.eventType = t as TimelineEventType"
            >
              <span>{{ TIMELINE_EVENT_TYPE_EMOJI[t as TimelineEventType] }}</span>
              <span>{{ label }}</span>
            </button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">カテゴリ</label>
          <div class="filter-row">
            <button
              v-for="(label, cat) in EVENT_FILTER_CATEGORY_LABELS"
              :key="cat"
              type="button"
              class="filter-chip"
              :class="{ selected: form.filterCategory === cat }"
              @click="form.filterCategory = cat as EventFilterCategory"
            >{{ label }}</button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">業者・施工会社</label>
          <input v-model="form.contractor" class="field-input" type="text" maxlength="60" />
        </div>

        <div class="field-group">
          <label class="field-label">費用（円）</label>
          <input v-model.number="form.cost" class="field-input" type="number" inputmode="numeric" min="0" />
        </div>

        <div class="field-group">
          <label class="field-label">関連設備</label>
          <div v-if="equipments.length > 0" class="equipment-chips">
            <button
              v-for="eq in equipments"
              :key="eq.equipmentId"
              type="button"
              class="eq-chip"
              :class="{ selected: form.relatedEquipmentIds.includes(eq.equipmentId) }"
              @click="toggleEquipment(eq.equipmentId)"
            >
              {{ EQUIPMENT_CATEGORY_EMOJI[eq.category] }} {{ eq.name }}
            </button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">メモ</label>
          <textarea v-model="form.memo" class="field-textarea" rows="3" maxlength="400" />
        </div>

        <button type="submit" class="save-btn" :disabled="!form.title.trim() || saving">
          {{ saving ? '保存中…' : '保存する' }}
        </button>

      </form>

      <!-- 読み取りビュー -->
      <div v-else class="info-view">

        <!-- 基本情報 -->
        <div class="info-section">
          <div v-if="item.contractor" class="info-row">
            <span class="info-key">業者</span>
            <span class="info-val">{{ item.contractor }}</span>
          </div>
          <div v-if="item.cost" class="info-row">
            <span class="info-key">費用</span>
            <span class="info-val">{{ formatCost(item.cost) }}</span>
          </div>
          <div v-if="item.memo" class="info-row info-row--memo">
            <span class="info-key">メモ</span>
            <span class="info-val memo-val">{{ item.memo }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">カテゴリ</span>
            <span class="info-val">{{ EVENT_FILTER_CATEGORY_LABELS[item.filterCategory] }}</span>
          </div>
        </div>

        <!-- 関連設備 -->
        <div v-if="relatedEquipments.length > 0" class="section">
          <p class="section-title">関連設備</p>
          <div class="related-cards">
            <div
              v-for="eq in relatedEquipments"
              :key="eq.equipmentId"
              class="related-card"
              @click="router.push({ name: 'karte-equipment-detail', params: { id: eq.equipmentId } })"
            >
              <span class="related-icon">{{ EQUIPMENT_CATEGORY_EMOJI[eq.category] }}</span>
              <div class="related-info">
                <div class="related-name">{{ eq.name }}</div>
                <div class="related-cat">{{ EQUIPMENT_CATEGORY_LABELS[eq.category] }}</div>
              </div>
              <svg class="related-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 関連イベント（同じ設備に紐づくもの） -->
        <div v-if="relatedEvents.length > 0" class="section">
          <p class="section-title">関連イベント</p>
          <div class="related-cards">
            <div
              v-for="ev in relatedEvents"
              :key="ev.eventId"
              class="related-card"
              @click="router.push({ name: 'karte-event-detail', params: { id: ev.eventId } })"
            >
              <span class="related-icon">{{ TIMELINE_EVENT_TYPE_EMOJI[ev.eventType] }}</span>
              <div class="related-info">
                <div class="related-name">{{ ev.title }}</div>
                <div class="related-cat">{{ formatDate(ev.eventDate) }}</div>
              </div>
              <svg class="related-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 削除 -->
        <div class="delete-wrap">
          <button class="delete-btn" @click="showDeleteModal = true">このイベントを削除</button>
        </div>

      </div>
    </div>

    <!-- 削除確認モーダル -->
    <Transition name="modal-fade">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal">
          <p class="modal-title">イベントを削除しますか？</p>
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
import { getEvent, updateEvent, deleteEvent, subscribeEvents } from '../../services/events'
import { subscribeEquipments, getEquipment } from '../../services/equipment'
import {
  TIMELINE_EVENT_TYPE_LABELS,
  TIMELINE_EVENT_TYPE_EMOJI,
  EVENT_FILTER_CATEGORY_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
} from '../../types'
import type { KarteTimelineEvent, KarteEquipment, TimelineEventType, EventFilterCategory, EquipmentCategory } from '../../types'

const router  = useRouter()
const route   = useRoute()
const eventId = route.params.id as string

const item           = ref<KarteTimelineEvent | null>(null)
const loading        = ref(true)
const editing        = ref(false)
const saving         = ref(false)
const deleting       = ref(false)
const showDeleteModal = ref(false)
const equipments     = ref<KarteEquipment[]>([])
const relatedEquipments = ref<KarteEquipment[]>([])
const relatedEvents  = ref<KarteTimelineEvent[]>([])

const EQUIPMENT_CATEGORY_EMOJI: Record<EquipmentCategory, string> = {
  exterior_wall: '🏠', roof: '🏚️', solar_panel: '☀️', storage_battery: '🔋',
  gas_water_heater: '🔥', eco_cute: '💧', air_conditioner: '❄️', kitchen: '🍳',
  bathroom: '🛁', toilet: '🚽', washroom: '🪥', floor: '🪵', window: '🪟',
  entrance_door: '🚪', ventilation: '💨', distribution_board: '⚡', other: '📦',
}

const form = reactive({
  eventType:           'other' as TimelineEventType,
  filterCategory:      'other' as EventFilterCategory,
  title:               '',
  eventDate:           '',
  contractor:          '',
  cost:                undefined as number | undefined,
  memo:                '',
  relatedEquipmentIds: [] as string[],
})

function populateForm(ev: KarteTimelineEvent) {
  form.eventType           = ev.eventType
  form.filterCategory      = ev.filterCategory
  form.title               = ev.title
  form.eventDate           = ev.eventDate
  form.contractor          = ev.contractor ?? ''
  form.cost                = ev.cost
  form.memo                = ev.memo ?? ''
  form.relatedEquipmentIds = [...ev.relatedEquipmentIds]
}

function toggleEquipment(id: string) {
  const idx = form.relatedEquipmentIds.indexOf(id)
  if (idx === -1) form.relatedEquipmentIds.push(id)
  else form.relatedEquipmentIds.splice(idx, 1)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatCost(cost: number): string {
  return `¥${cost.toLocaleString()}`
}

async function loadRelated(ev: KarteTimelineEvent) {
  const uid = authState.user?.uid
  if (!uid) return

  // 関連設備を取得
  const eqSnaps = await Promise.all(
    ev.relatedEquipmentIds.map((id) => getEquipment(uid, id)),
  )
  relatedEquipments.value = eqSnaps.filter(Boolean) as KarteEquipment[]

  // 同じ設備IDを持つ他のイベントを取得（簡易：全イベントからフィルター）
  // subscribeEvents のデータを使いまわす（allEvents から絞り込む）
}

async function save() {
  if (!form.title.trim() || saving.value) return
  const uid = authState.user?.uid
  if (!uid) return
  saving.value = true
  try {
    await updateEvent(uid, eventId, {
      eventType:           form.eventType,
      filterCategory:      form.filterCategory,
      title:               form.title.trim(),
      eventDate:           form.eventDate,
      contractor:          form.contractor.trim() || undefined,
      cost:                form.cost || undefined,
      memo:                form.memo.trim() || undefined,
      relatedEquipmentIds: form.relatedEquipmentIds,
    })
    // ローカルも更新
    if (item.value) {
      Object.assign(item.value, {
        ...form,
        contractor: form.contractor.trim() || undefined,
        memo:       form.memo.trim() || undefined,
        cost:       form.cost || undefined,
      })
      await loadRelated(item.value)
    }
    editing.value = false
  } catch (e) {
    console.error(e)
    alert('保存に失敗しました')
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  const uid = authState.user?.uid
  if (!uid) return
  deleting.value = true
  try {
    await deleteEvent(uid, eventId)
    router.replace({ name: 'karte-event-list' })
  } catch (e) {
    console.error(e)
    alert('削除に失敗しました')
    deleting.value = false
  }
}

watch(editing, (val) => {
  if (val && item.value) populateForm(item.value)
})

onMounted(async () => {
  const uid = authState.user?.uid
  if (!uid) { loading.value = false; return }

  // 設備一覧（フォーム用）
  subscribeEquipments(uid, (data) => { equipments.value = data })

  // 全イベント購読（関連イベント用）
  subscribeEvents(uid, (allEvs) => {
    if (!item.value) return
    // 自分以外で relatedEquipmentIds が重なるイベント
    const myEqIds = new Set(item.value.relatedEquipmentIds)
    if (myEqIds.size > 0) {
      relatedEvents.value = allEvs.filter(
        (ev) =>
          ev.eventId !== eventId &&
          ev.relatedEquipmentIds.some((id) => myEqIds.has(id)),
      ).slice(0, 5)
    }
  })

  const ev = await getEvent(uid, eventId)
  item.value = ev
  if (ev) {
    populateForm(ev)
    await loadRelated(ev)
  }
  loading.value = false
})
</script>

<style scoped>
.ev-detail {
  min-height: 100vh;
  background: #f9f9f7;
  color: #1b3a5c;
  padding-bottom: 60px;
}

/* ===== ナビバー ===== */
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
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
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer;
  color: rgba(255,255,255,0.85);
}
.back-btn svg { width: 20px; height: 20px; }

.nav-title { font-size: 16px; font-weight: 800; color: #fff; }

.edit-toggle-btn {
  height: 30px; padding: 0 12px;
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 999px; background: transparent;
  color: rgba(255,255,255,0.9);
  font-size: 12px; font-weight: 700; cursor: pointer;
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

/* ===== ボディ ===== */
.detail-body { padding-top: 54px; }

/* ===== ヒーロー ===== */
.detail-hero {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 20px;
  background: #fff;
  border-bottom: 1px solid rgba(27,58,92,0.06);
}

.hero-emoji { font-size: 36px; line-height: 1; flex-shrink: 0; padding-top: 2px; }

.hero-type-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(27,58,92,0.45);
  background: rgba(27,58,92,0.06);
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 6px;
}

.hero-title {
  font-size: 20px;
  font-weight: 900;
  color: #1b3a5c;
  line-height: 1.3;
}

.hero-date {
  font-size: 12px;
  color: rgba(27,58,92,0.45);
  margin-top: 5px;
  font-weight: 600;
}

.type-bg--construction { border-left: 4px solid #2d6a4f; }
.type-bg--repair       { border-left: 4px solid #c0392b; }
.type-bg--inspection   { border-left: 4px solid #3498db; }
.type-bg--replacement  { border-left: 4px solid #f4a261; }
.type-bg--move_in      { border-left: 4px solid #2d6a4f; }
.type-bg--purchase     { border-left: 4px solid #8e44ad; }

/* ===== 基本情報 ===== */
.info-view { padding: 0 20px; }

.info-section {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  margin-top: 16px;
  box-shadow: 0 2px 10px rgba(27,58,92,0.06);
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(27,58,92,0.05);
}
.info-row:last-child { border-bottom: none; }
.info-row--memo { align-items: flex-start; }

.info-key {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27,58,92,0.45);
  width: 72px;
  flex-shrink: 0;
}

.info-val {
  font-size: 14px;
  color: #1b3a5c;
  font-weight: 600;
  flex: 1;
}

.memo-val { display: block; line-height: 1.6; white-space: pre-wrap; }

/* ===== セクション ===== */
.section { margin-top: 24px; }

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27,58,92,0.45);
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

/* ===== 関連カード ===== */
.related-cards {
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(27,58,92,0.06);
}

.related-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(27,58,92,0.05);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s;
}
.related-card:last-child { border-bottom: none; }
.related-card:active { background: rgba(27,58,92,0.03); }

.related-icon { font-size: 20px; flex-shrink: 0; width: 28px; text-align: center; }

.related-info { flex: 1; min-width: 0; }

.related-name {
  font-size: 14px; font-weight: 700; color: #1b3a5c;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.related-cat { font-size: 11px; color: rgba(27,58,92,0.45); margin-top: 2px; }

.related-arrow { width: 15px; height: 15px; color: rgba(27,58,92,0.25); flex-shrink: 0; }

/* ===== 削除 ===== */
.delete-wrap { margin-top: 32px; }

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

.field-group { display: flex; flex-direction: column; gap: 8px; }

.field-label {
  font-size: 12px; font-weight: 700;
  color: rgba(27,58,92,0.6); letter-spacing: 0.04em;
  display: flex; align-items: center; gap: 5px;
}

.required {
  font-size: 10px; font-weight: 700; color: #c0392b;
  background: rgba(192,57,43,0.08); padding: 1px 5px; border-radius: 4px;
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

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}

.type-chip {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 4px;
  background: #fff;
  border: 1.5px solid rgba(27,58,92,0.1);
  border-radius: 12px;
  font-size: 10px; font-weight: 600; color: rgba(27,58,92,0.55);
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.type-chip span:first-child { font-size: 18px; }
.type-chip.selected { border-color: #1b3a5c; background: rgba(27,58,92,0.06); color: #1b3a5c; font-weight: 800; }

.filter-row { display: flex; flex-wrap: wrap; gap: 7px; }

.filter-chip {
  height: 30px; padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid rgba(27,58,92,0.12);
  background: #fff; color: rgba(27,58,92,0.55);
  font-size: 12px; font-weight: 700; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.filter-chip.selected { background: #1b3a5c; border-color: #1b3a5c; color: #fff; }

.equipment-chips { display: flex; flex-wrap: wrap; gap: 7px; }

.eq-chip {
  height: 32px; padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid rgba(27,58,92,0.12);
  background: #fff; color: rgba(27,58,92,0.55);
  font-size: 12px; font-weight: 600; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.eq-chip.selected { background: rgba(45,106,79,0.1); border-color: #2d6a4f; color: #2d6a4f; font-weight: 700; }

.save-btn {
  height: 50px; border-radius: 16px;
  background: #1b3a5c; color: #fff;
  border: none; font-size: 15px; font-weight: 800;
  cursor: pointer; transition: opacity 0.15s;
}
.save-btn:disabled { opacity: 0.4; cursor: default; }
.save-btn:not(:disabled):active { opacity: 0.8; }

/* ===== 削除モーダル ===== */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(11,26,50,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.modal {
  background: #fff; border-radius: 20px;
  padding: 28px 24px 24px;
  width: 100%; max-width: 340px;
  box-shadow: 0 8px 40px rgba(11,26,50,0.2);
}

.modal-title { font-size: 17px; font-weight: 800; color: #1b3a5c; margin-bottom: 8px; }
.modal-sub   { font-size: 13px; color: rgba(27,58,92,0.5); margin-bottom: 24px; }

.modal-actions { display: flex; gap: 10px; }

.modal-cancel {
  flex: 1; height: 44px;
  border: 1.5px solid rgba(27,58,92,0.15);
  border-radius: 12px; background: transparent;
  color: rgba(27,58,92,0.6); font-size: 14px; font-weight: 700; cursor: pointer;
}

.modal-confirm {
  flex: 1; height: 44px; border: none;
  border-radius: 12px; background: #c0392b;
  color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
  transition: opacity 0.12s;
}
.modal-confirm:disabled { opacity: 0.5; cursor: default; }

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to     { opacity: 0; }
</style>
