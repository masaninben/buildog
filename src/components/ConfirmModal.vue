<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="visible" class="confirm-overlay" @click.self="onCancel">
        <div class="confirm-card" role="alertdialog" aria-modal="true">
          <p v-if="options.title" class="confirm-title">{{ options.title }}</p>
          <p class="confirm-message">{{ options.message }}</p>
          <div class="confirm-actions">
            <button class="confirm-cancel-btn" type="button" @click="onCancel">
              {{ options.cancelLabel ?? 'キャンセル' }}
            </button>
            <button
              :class="['confirm-ok-btn', { 'confirm-ok-btn--danger': options.danger }]"
              type="button"
              @click="onConfirm"
            >
              {{ options.confirmLabel ?? 'OK' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'

const { visible, options, onConfirm, onCancel } = useConfirm()
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-card {
  width: min(100%, 360px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
}

.confirm-title {
  font-size: 15px;
  font-weight: 900;
  line-height: 1.4;
}

.confirm-message {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-sub);
}

.confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.confirm-cancel-btn {
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.confirm-cancel-btn:hover {
  background: var(--bg-hover);
}

.confirm-ok-btn {
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.12s;
}
.confirm-ok-btn:hover {
  opacity: 0.85;
}

.confirm-ok-btn--danger {
  background: #e03b3b;
}

/* トランジション */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.15s ease;
}
.confirm-fade-enter-active .confirm-card,
.confirm-fade-leave-active .confirm-card {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
.confirm-fade-enter-from .confirm-card {
  transform: scale(0.95) translateY(6px);
}
.confirm-fade-leave-to .confirm-card {
  transform: scale(0.97);
  opacity: 0;
}
</style>
