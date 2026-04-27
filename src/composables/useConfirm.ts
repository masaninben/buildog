import { ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const visible = ref(false)
const options = ref<ConfirmOptions>({ message: '' })
let resolver: ((value: boolean) => void) | null = null

export function useConfirm() {
  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    visible.value = true
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function onConfirm() {
    visible.value = false
    resolver?.(true)
    resolver = null
  }

  function onCancel() {
    visible.value = false
    resolver?.(false)
    resolver = null
  }

  return { visible, options, confirm, onConfirm, onCancel }
}
