import { useEffect } from "react";
import { initHotkeys } from "../services/hotkeys";

export function useHotkeys(actions: Parameters<typeof initHotkeys>[0]) {
  useEffect(() => {
    const cleanup = initHotkeys(actions);
    return cleanup;
  }, [actions]);
}
