<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          @click="dismiss(toast.id)"
        >
          <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '!' }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--shadow-md);
  pointer-events: auto;
  cursor: pointer;
  white-space: nowrap;
  max-width: min(90vw, 400px);
  white-space: normal;
  word-break: break-all;
}

.toast--success {
  background: var(--success);
  color: #fff;
}

.toast--error {
  background: var(--danger);
  color: #fff;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.toast-message {
  line-height: 1.4;
}

/* アニメーション */
.toast-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
.toast-move {
  transition: transform 0.18s ease;
}

@media (max-width: 480px) {
  .toast-container {
    bottom: 16px;
    width: calc(100% - 32px);
    left: 16px;
    right: 16px;
    transform: none;
    align-items: stretch;
  }
  .toast {
    max-width: 100%;
    white-space: normal;
    word-break: normal;
  }
}
</style>
