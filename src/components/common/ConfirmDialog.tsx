import { useCallback, useState, type ReactNode } from 'react'
import BottomSheet from './BottomSheet'
import { useT } from '../../i18n/LanguageContext'
import styles from './ConfirmDialog.module.css'

export interface ConfirmOptions {
  /** The question / warning shown to the user. */
  message: string
  /** Label for the confirming (destructive) action button. */
  confirmLabel: string
  /** Style the confirm button as destructive (default true — confirms are usually risky). */
  danger?: boolean
  /** Called when the user confirms. */
  onConfirm: () => void
}

/**
 * A styled replacement for window.confirm(), built on BottomSheet so destructive
 * confirmations match the rest of the app (theme-aware, focus-trapped, swipe/Esc to
 * dismiss) instead of a jarring native browser dialog.
 */
export function ConfirmDialog({ message, confirmLabel, danger = true, onConfirm, onCancel }:
  ConfirmOptions & { onCancel: () => void }) {
  const t = useT()
  return (
    <BottomSheet onClose={onCancel} ariaLabel={message}>
      <div className={styles.wrap}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancel} data-testid="confirm-cancel" onClick={onCancel}>
            {t.cancelBtn}
          </button>
          <button className={`${styles.confirm} ${danger ? styles.danger : ''}`}
            data-testid="confirm-accept" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

/**
 * Hook form for imperative confirmations. Returns `confirm(opts)` to open the dialog and
 * a `dialog` node to render in the component tree — a drop-in modern replacement for the
 * synchronous `if (confirm(msg)) { … }` pattern.
 */
export function useConfirm() {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const confirm = useCallback((opts: ConfirmOptions) => setPending(opts), [])
  const dialog: ReactNode = pending
    ? <ConfirmDialog {...pending}
        onCancel={() => setPending(null)}
        onConfirm={() => { pending.onConfirm(); setPending(null) }} />
    : null
  return { confirm, dialog }
}
