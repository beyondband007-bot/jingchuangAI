import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
let openModalCount = 0;
let overflowBeforeFirstModal = "";

export function BaseModal({
  open = true,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = false,
  closeLabel = "关闭弹窗",
  title,
  titleId,
  ariaLabel,
  variant = "",
  className = "",
  surfaceClassName = "",
  children,
}) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId || generatedTitleId;
  const surfaceRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    if (openModalCount === 0) {
      overflowBeforeFirstModal = document.body.style.overflow;
    }
    openModalCount += 1;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = surfaceRef.current?.querySelector(focusableSelector);
      (firstFocusable || surfaceRef.current)?.focus();
    }, 0);

    function handleKeyDown(event) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !surfaceRef.current) return;
      const focusable = [...surfaceRef.current.querySelectorAll(focusableSelector)];
      if (!focusable.length) {
        event.preventDefault();
        surfaceRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = overflowBeforeFirstModal;
      }
      previouslyFocused?.focus?.();
    };
  }, [closeOnEscape, onClose, open]);

  if (!open) return null;

  const variantClassName = variant ? `ui-modal--${variant}` : "";
  return createPortal(
    <div className={`ui-modal ${variantClassName} ${className}`.trim()}>
      <button
        className="ui-modal__backdrop"
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        disabled={!closeOnBackdrop}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <section
        ref={surfaceRef}
        className={`ui-modal__surface ${surfaceClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel || closeLabel}
        aria-labelledby={title ? resolvedTitleId : undefined}
        tabIndex={-1}
      >
        {title ? (
          <header className="ui-modal__header">
            <h2 id={resolvedTitleId} className="ui-panel-title">
              {title}
            </h2>
          </header>
        ) : null}
        {showCloseButton ? (
          <button
            className="ui-modal__close ui-icon-button"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        ) : null}
        {children}
      </section>
    </div>,
    document.body,
  );
}
