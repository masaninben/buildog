<template>
  <div class="ev-new">

    <!-- ナビバー -->
    <div class="nav-bar">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="nav-title">イベントを追加</span>
      <div style="width:36px" />
    </div>

    <form class="form" @submit.prevent="submit">

      <!-- イベント種別 -->
      <div class="field-group">
        <label class="field-label">種別 <span class="required">必須</span></label>
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

      <!-- カテゴリ -->
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

      <!-- タイトル -->
      <div class="field-group">
        <label class="field-label">タイトル <span class="required">必須</span></label>
        <input
          v-model="form.title"
          class="field-input"
          type="text"
          placeholder="例: 外壁塗装（シリコン）"
          maxlength="60"
        />
      </div>

      <!-- 日付 -->
      <div class="field-group">
        <label class="field-label">日付 <span class="required">必須</span></label>
        <input
          v-model="form.eventDate"
          class="field-input"
          type="date"
        />
      </div>

      <!-- 業者 -->
      <div class="field-group">
        <label class="field-label">業者・施工会社</label>
        <input
          v-model="form.contractor"
          class="field-input"
          type="text"
          placeholder="例: ○○リフォーム株式会社"
          maxlength="60"
        />
      </div>

      <!-- 費用 -->
      <div class="field-group">
        <label class="field-label">費用（円）</label>
        <input
          v-model.number="form.cost"
          class="field-input"
          type="number"
          inputmode="numeric"
          placeholder="例: 850000"
          min="0"
        />
      </div>

      <!-- 関連設備 -->
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
        <p v-else class="field-note">設備を先に登録すると関連付けできます</p>
      </div>

      <!-- メモ -->
      <div class="field-group">
        <label class="field-label">メモ</label>
        <textarea
          v-model="form.memo"
          class="field-textarea"
          placeholder="保証書の場所・作業内容の詳細など"
          rows="3"
          maxlength="400"
        />
      </div>

      <!-- 保存ボタン -->
      <button type="submit" class="submit-btn" :disabled="!canSubmit || saving">
        <span v-if="saving">保存中…</span>
        <span v-else>保存する</span>
      </button>

    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../../lib/auth'
import { createEvent } from '../../services/events'
import { subscribeEquipments } from '../../services/equipment'
import {
  TIMELINE_EVENT_TYPE_LABELS,
  TIMELINE_EVENT_TYPE_EMOJI,
  EVENT_FILTER_CATEGORY_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
} from '../../types'
import type { TimelineEventType, EventFilterCategory, KarteEquipment, EquipmentCategory } from '../../types'

const router = useRouter()
const saving = ref(false)
const equipments = ref<KarteEquipment[]>([])

const EQUIPMENT_CATEGORY_EMOJI: Record<EquipmentCategory, string> = {
  exterior_wall: '🏠', roof: '🏚️', solar_panel: '☀️', storage_battery: '🔋',
  gas_water_heater: '🔥', eco_cute: '💧', air_conditioner: '❄️', kitchen: '🍳',
  bathroom: '🛁', toilet: '🚽', washroom: '🪥', floor: '🪵', window: '🪟',
  entrance_door: '🚪', ventilation: '💨', distribution_board: '⚡', other: '📦',
}

// 今日の日付をデフォルト値に
const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  eventType:           '' as TimelineEventType | '',
  filterCategory:      'all' as EventFilterCategory,
  title:               '',
  eventDate:           today,
  contractor:          '',
  cost:                undefined as number | undefined,
  memo:                '',
  relatedEquipmentIds: [] as string[],
})

const canSubmit = computed(() =>
  form.eventType !== '' && form.title.trim() !== '' && form.eventDate !== '',
)

function toggleEquipment(id: string) {
  const idx = form.relatedEquipmentIds.indexOf(id)
  if (idx === -1) form.relatedEquipmentIds.push(id)
  else form.relatedEquipmentIds.splice(idx, 1)
}

async function submit() {
  if (!canSubmit.value || saving.value) return
  const uid = authState.user?.uid
  if (!uid) return

  saving.value = true
  try {
    await createEvent(uid, {
      eventType:           form.eventType as TimelineEventType,
      filterCategory:      form.filterCategory,
      title:               form.title.trim(),
      eventDate:           form.eventDate,
      contractor:          form.contractor.trim() || undefined,
      cost:                form.cost || undefined,
      memo:                form.memo.trim() || undefined,
      relatedEquipmentIds: form.relatedEquipmentIds,
    })
    router.replace({ name: 'karte-event-list' })
  } catch (e) {
    console.error(e)
    alert('保存に失敗しました')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const uid = authState.user?.uid
  if (!uid) return
  subscribeEquipments(uid, (data) => { equipments.value = data })
})
</script>

<style scoped>
.ev-new {
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

/* ===== フォーム ===== */
.form {
  padding: 70px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.field-group { display: flex; flex-direction: column; gap: 8px; }

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(27, 58, 92, 0.6);
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 5px;
}

.required {
  font-size: 10px; font-weight: 700;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
  padding: 1px 5px; border-radius: 4px;
}

.field-input,
.field-textarea {
  background: #fff;
  border: 1.5px solid rgba(27, 58, 92, 0.12);
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
.field-textarea:focus { border-color: rgba(27, 58, 92, 0.4); }
.field-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }

.field-note { font-size: 12px; color: rgba(27, 58, 92, 0.4); padding: 4px 0; }

/* ===== 種別グリッド ===== */
.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}

.type-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 4px;
  background: #fff;
  border: 1.5px solid rgba(27, 58, 92, 0.1);
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(27, 58, 92, 0.55);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.type-chip span:first-child { font-size: 20px; }
.type-chip.selected {
  border-color: #1b3a5c;
  background: rgba(27, 58, 92, 0.06);
  color: #1b3a5c;
  font-weight: 800;
}

/* ===== カテゴリフィルター ===== */
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.filter-chip {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid rgba(27, 58, 92, 0.12);
  background: #fff;
  color: rgba(27, 58, 92, 0.55);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.filter-chip.selected {
  background: #1b3a5c;
  border-color: #1b3a5c;
  color: #fff;
}

/* ===== 関連設備チップ ===== */
.equipment-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.eq-chip {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid rgba(27, 58, 92, 0.12);
  background: #fff;
  color: rgba(27, 58, 92, 0.55);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.eq-chip.selected {
  background: rgba(45, 106, 79, 0.1);
  border-color: #2d6a4f;
  color: #2d6a4f;
  font-weight: 700;
}

/* ===== 保存ボタン ===== */
.submit-btn {
  height: 50px;
  border-radius: 16px;
  background: #1b3a5c;
  color: #fff;
  border: none;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 8px;
}
.submit-btn:disabled { opacity: 0.4; cursor: default; }
.submit-btn:not(:disabled):active { opacity: 0.8; }
</style>
