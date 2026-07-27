import { App } from "./App";
import { ToastProvider } from "../components/ToastProvider";

/**
 * Keeps the entry module limited to React and global styles while preserving a
 * single async boundary for application code and its shared toast provider.
 */
export function AppBootstrap() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
