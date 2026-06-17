import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(duration = 2000) {
  const [message, setMessage] = useState("");
  const timerRef = useRef(null);

  const showToast = useCallback(
    (nextMessage) => {
      setMessage(nextMessage);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setMessage("");
        timerRef.current = null;
      }, duration);
    },
    [duration],
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setMessage("");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { message, showToast, hideToast };
}
