import { useEffect, useMemo, useRef, useState } from "react";
import { videoApi } from "../../api/videoApi";
import { deriveVideoGenState } from "./deriveVideoGenState";
import {
  createInitialRawState,
  tickRawState,
} from "./videoGenRawState";

const DONE_HOLD_MS = 1000;
const PROGRESS_TICK_MS = 1200;

/**
 * State machine: idle → generating → done → idle.
 * Exposes derivedState only — raw state never leaves this hook.
 */
export function useVideoGenStateMachine({ onFailed, onReturnToList }) {
  const [rawState, setRawState] = useState(
    /** @type {import('./videoGenRawState').GenerationRawState | null} */ (null),
  );
  const [session, setSession] = useState(null);

  const taskDoneRef = useRef(false);
  const completedTaskRef = useRef(null);
  const progressTimerRef = useRef(null);
  const doneTimerRef = useRef(null);
  const logEndRef = useRef(null);
  const onFailedRef = useRef(onFailed);
  const onReturnToListRef = useRef(onReturnToList);

  onFailedRef.current = onFailed;
  onReturnToListRef.current = onReturnToList;

  const derivedState = useMemo(
    () => deriveVideoGenState(rawState),
    [rawState],
  );

  const isGenStageActive = derivedState?.meta.isStageVisible ?? false;

  function clearProgressTimer() {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function clearDoneTimer() {
    if (doneTimerRef.current) {
      window.clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  }

  function resetToIdle() {
    clearProgressTimer();
    clearDoneTimer();
    taskDoneRef.current = false;
    completedTaskRef.current = null;
    setSession(null);
    setRawState(null);
  }

  function startGeneration(payload) {
    clearDoneTimer();
    taskDoneRef.current = false;
    completedTaskRef.current = null;

    setSession({
      prompt: payload.prompt,
      duration: payload.duration,
      taskId: null,
    });
    setRawState(createInitialRawState());
  }

  function attachTaskId(taskId) {
    setSession((current) =>
      current ? { ...current, taskId } : null,
    );
  }

  function failGeneration(message) {
    resetToIdle();
    onFailedRef.current?.(message);
  }

  useEffect(() => {
    if (rawState?.status !== "generating") return undefined;

    function tick() {
      setRawState((prev) => {
        if (!prev || prev.status !== "generating") return prev;
        return tickRawState(prev, { taskComplete: taskDoneRef.current });
      });
    }

    progressTimerRef.current = window.setInterval(tick, PROGRESS_TICK_MS);
    return () => clearProgressTimer();
  }, [rawState?.status]);

  useEffect(() => {
    if (rawState?.status !== "done") return undefined;

    clearProgressTimer();

    doneTimerRef.current = window.setTimeout(() => {
      const task = completedTaskRef.current;
      completedTaskRef.current = null;
      taskDoneRef.current = false;
      setSession(null);
      setRawState(null);
      onReturnToListRef.current?.(task);
    }, DONE_HOLD_MS);

    return () => clearDoneTimer();
  }, [rawState?.status]);

  useEffect(() => {
    if (!isGenStageActive || !derivedState) {
      document.documentElement.style.removeProperty("--progress");
      return undefined;
    }

    document.documentElement.style.setProperty(
      "--progress",
      String(Math.floor(derivedState.progress.value)),
    );
    return () => {
      document.documentElement.style.removeProperty("--progress");
    };
  }, [derivedState?.progress.value, isGenStageActive]);

  useEffect(() => {
    if (!derivedState || derivedState.meta.isDone) return;
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [derivedState?.logs.lines.length, derivedState?.meta.isDone]);

  useEffect(() => {
    const taskId = session?.taskId;
    if (rawState?.status !== "generating" || !taskId) return undefined;

    let mounted = true;

    async function syncTask() {
      try {
        const tasks = await videoApi.getTasks({ filter: "all" });
        if (!mounted) return;
        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;

        if (task.status === "completed") {
          completedTaskRef.current = task;
          taskDoneRef.current = true;
        } else if (task.status === "failed") {
          failGeneration(task.error || "视频生成失败");
        }
      } catch {
        // Retry on next poll.
      }
    }

    syncTask();
    const unsubscribe = videoApi.subscribe(syncTask);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [rawState?.status, session?.taskId]);

  useEffect(
    () => () => {
      clearProgressTimer();
      clearDoneTimer();
      document.documentElement.style.removeProperty("--progress");
    },
    [],
  );

  return {
    derivedState,
    isGenStageActive,
    logEndRef,
    startGeneration,
    attachTaskId,
    failGeneration,
    resetToIdle,
  };
}
