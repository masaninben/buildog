<template>
  <div class="eq-new">

    <!-- ナビバー -->
    <div class="nav-bar">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="nav-title">設備を追加</span>
      <div style="width:36px" />
    </div>

    <form class="form" @submit.prevent="submit">

      <!-- カテゴリ -->
      <div class="field-group">
        <label class="field-label">カテゴリ <span class="required">必須</span></label>
        <div class="category-grid">
          <button
            v-for="(label, cat) in EQUIPMENT_CATEGORY_LABELS"
            :key="cat"
            type="button"
            class="cat-chip"
            :class="{ selected: form.category === cat }"
            @click="form.category = cat as EquipmentCategory"
          >
            <span>{{ CATEGORY_EMOJI[cat as EquipmentCategory] }}</span>
            <span>{{ label }}</span>
          </button>
        </div>
      </div>

      <!-- 名称 -->
      <div class="field-group">
        <label class="field-label">名称 <span class="required">必須</span></label>
        <input
          v-model="form.name"
          class="field-input"
          type="text"
          placeholder="例: ノーリツ給湯器 GT-C2462ARX"
          maxlength="60"
        />
      </div>

      <!-- メーカー -->
      <div class="field-group">
        <label class="field-label">メーカー</label>
        <input
          v-model="form.maker"
          class="field-input"
          type="text"
          placeholder="例: ノーリツ"
          maxlength="40"
        />
      </div>

      <!-- 型番 -->
      <div class="field-group">
        <label class="field-label">型番</label>
        <input
          v-model="form.modelNumber"
          class="field-input"
          type="text"
          placeholder="例: GT-C2462ARX"
          maxlength="60"
        />
      </div>

      <!-- 設置日 -->
      <div class="field-group">
        <label class="field-label">設置年月</label>
        <input
          v-model="form.installedDate"
          class="field-input"
          type="month"
        />
      </div>

      <!-- 保証期限 -->
      <div class="field-group">
        <label class="field-label">保証期限</label>
        <input
          v-model="form.warrantyExpiry"
          class="field-input"
          type="month"
        />
      </div>

      <!-- ステータス -->
      <div class="field-group">
        <label class="field-label">現在の状態</label>
        <div class="status-row">
          <button
            v-for="(label, st) in EQUIPMENT_STATUS_LABELS"
            :key="st"
            type="button"
            class="status-chip"
            :class="[`status-chip--${st}`, { selected: form.status === st }]"
            @click="form.status = st as EquipmentStatus"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <!-- メモ -->
      <div class="field-group">
        <label class="field-label">メモ</label>
        <textarea
          v-model="form.memo"
          class="field-textarea"
          placeholder="施工会社・保証書の場所など"
          rows="3"
          maxlength="200"
        />
      </div>

      <!-- 保存ボタン -->
      <button
        type="submit"
        class="submit-btn"
        :disabled="!canSubmit || saving"
      >
        <span v-if="saving">保存中…</span>
        <span v-else>保存する</span>
      </button>

    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authState } from '../../lib/auth'
import { createEquipment } from '../../services/equipment'
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_STATUS_LABELS,
} from '../../types'
import type { EquipmentCategory, EquipmentStatus } from '../../types'

const router = useRouter()
const saving = ref(false)

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

const form = reactive({
  category:      '' as EquipmentCategory | '',
  name:          '',
  maker:         '',
  modelNumber:   '',
  installedDate: '',
  warrantyExpiry:'',
  status:        'unknown' as EquipmentStatus,
  memo:          '',
})

const canSubmit = computed(() => form.category !== '' && form.name.trim() !== '')

async function submit() {
  if (!canSubmit.value || saving.value) return
  const uid = authState.user?.uid
  if (!uid) return

  saving.value = true
  try {
    // type="month" → "YYYY-MM"。ISOに変換（日付付き）
    const toIso = (ym: string) => ym ? `${ym}-01` : undefined

    await createEquipment(uid, {
      category:       form.category as EquipmentCategory,
      name:           form.name.trim(),
      maker:          form.maker.trim() || undefined,
      modelNumber:    form.modelNumber.trim() || undefined,
      installedDate:  toIso(form.installedDate),
      warrantyExpiry: toIso(form.warrantyExpiry),
      status:         form.status,
      memo:           form.memo.trim() || undefined,
    })
    router.replace({ name: 'karte-equipment-list' })
  } catch (e) {
    console.error(e)
    alert('保存に失敗しました')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.eq-new {
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
  flex-shrink: 0;
}
.back-btn svg { width: 20px; height: 20px; }

.nav-title {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.02em;
}

/* ===== フォーム ===== */
.form {
  padding: 70px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

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
  font-size: 10px;
  font-weight: 700;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
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
.field-textarea:focus {
  border-color: rgba(27, 58, 92, 0.4);
}
.field-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

/* ===== カテゴリ グリッド ===== */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 6px;
  background: #fff;
  border: 1.5px solid rgba(27, 58, 92, 0.1);
  border-radius: 14px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(27, 58, 92, 0.6);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.cat-chip span:first-child { font-size: 22px; }
.cat-chip.selected {
  border-color: #1b3a5c;
  background: rgba(27, 58, 92, 0.06);
  color: #1b3a5c;
}

/* ===== ステータスチップ ===== */
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
  background: rgba(27, 58, 92, 0.06);
  color: rgba(27, 58, 92, 0.55);
}
.status-chip.selected { border-color: currentColor; opacity: 1; }
.status-chip--good          { background: rgba(45, 106, 79, 0.1);  color: #2d6a4f; }
.status-chip--check_needed  { background: rgba(244, 162, 97, 0.15); color: #c87137; }
.status-chip--warranty_soon { background: rgba(200, 160, 40, 0.13); color: #a07b10; }
.status-chip--replace_soon  { background: rgba(220, 80, 80, 0.12);  color: #c0392b; }
.status-chip--unknown       { background: rgba(27, 58, 92, 0.07);   color: rgba(27,58,92,0.45); }

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
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s;
  margin-top: 8px;
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.submit-btn:not(:disabled):active { opacity: 0.8; }
</style>
