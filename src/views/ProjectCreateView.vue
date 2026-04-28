<template>
  <div class="project-create-view">
    <div class="page-head">
      <button class="back-btn" @click="router.back()">←</button>
      <div>
        <p class="page-eyebrow">New Project</p>
        <h1 class="page-title">案件を作成</h1>
      </div>
    </div>

    <form class="form-card" @submit.prevent="submit">
      <label class="field">
        <span class="field-label">案件名</span>
        <input v-model="name" class="field-input" type="text" placeholder="例）渋谷区O様邸 リノベーション" required />
      </label>

      <label class="field">
        <span class="field-label">顧客名</span>
        <input v-model="clientName" class="field-input" type="text" placeholder="例）O様" />
      </label>

      <label class="field">
        <span class="field-label">現場住所</span>
        <input v-model="siteAddress" class="field-input" type="text" placeholder="例）渋谷区神南 2-10-4" />
      </label>

      <button class="submit-btn" :disabled="saving || !canCreate" :title="canCreate ? '' : '案件作成の権限がありません'">
        {{ saving ? '作成中…' : '案件を作成する' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { projectStore } from '../store/projects'
import { userProfileStore } from '../store/userProfile'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { error: toastError } = useToast()
const name = ref('')
const clientName = ref('')
const siteAddress = ref('')
const saving = ref(false)

const canCreate = computed(() => userProfileStore.canCreateProject)

async function submit() {
  if (!name.value.trim() || saving.value) return

  if (!canCreate.value) {
    toastError('試用期間が終了しています。継続利用はお問い合わせください。')
    return
  }

  saving.value = true
  try {
    const id = await projectStore.createProject({
      name: name.value,
      clientName: clientName.value,
      siteAddress: siteAddress.value,
    })
    if (id) {
      router.push({ name: 'project-detail', params: { id } })
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.project-create-view {
  min-height: 100vh;
  padding: 24px 20px 40px;
  background:
    linear-gradient(180deg, rgba(30, 90, 174, 0.08), transparent 180px),
    var(--bg);
}

.page-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.page-eyebrow {
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.page-title {
  font-size: 28px;
  margin-top: 4px;
}

.back-btn {
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-card);
  color: var(--accent-strong);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.form-card {
  max-width: 760px;
  padding: 24px;
  border-radius: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-strong);
}

.field-input,
.field-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-input);
  color: var(--text);
  padding: 14px;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.field-input::placeholder,
.field-textarea::placeholder {
  color: var(--text-placeholder);
}

.submit-btn {
  width: fit-content;
  min-width: 200px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}
</style>
