import { useCallback } from "react";

export function useRequireAuth({ authUser, onOpenAuth, onDeny }) {
  return useCallback(() => {
    if (!authUser?.isGuest) return true;
    onDeny?.();
    onOpenAuth?.("login");
    return false;
  }, [authUser, onOpenAuth, onDeny]);
}
