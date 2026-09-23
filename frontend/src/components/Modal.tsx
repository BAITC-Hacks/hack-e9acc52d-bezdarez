import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Доступное модальное окно на <dialog>: Esc и клик по фону закрывают, фокус остаётся внутри. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-1.5rem)] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      {open && (
        <div className="rise max-h-[85vh] overflow-y-auto">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-5 py-4 sm:px-6">
            <h2 id="modal-title" className="flex-1 text-lg font-extrabold">
              {title}
            </h2>
            <button onClick={onClose} aria-label="Закрыть" className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink-2 hover:text-ink">
              <X aria-hidden className="size-5" />
            </button>
          </header>
          <div className="px-5 py-5 sm:px-6">{children}</div>
        </div>
      )}
    </dialog>
  )
}
