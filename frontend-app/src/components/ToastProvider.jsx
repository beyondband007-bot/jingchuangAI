import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

const ToastContext = createContext(null);
export const TOAST_DURATION_MS = 2000;
const toastIcons = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message, options = {}) => {
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const type = toastIcons[options.type] ? options.type : "info";
    const duration = Number.isFinite(options.duration)
      ? Math.max(0, options.duration)
      : TOAST_DURATION_MS;
    setToast({ id: Date.now(), message: normalizedMessage, type });
    if (duration > 0) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setToast(null);
      }, duration);
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );
  const Icon = toast ? toastIcons[toast.type] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast
        ? createPortal(
            <div className="ui-toast-layer">
              <div
                key={toast.id}
                className={`ui-toast ui-toast--${toast.type}`}
                role={toast.type === "error" ? "alert" : "status"}
                aria-live={toast.type === "error" ? "assertive" : "polite"}
              >
                {Icon ? <Icon size={17} aria-hidden="true" /> : null}
                <span>{toast.message}</span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
