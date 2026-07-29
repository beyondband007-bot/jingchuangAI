import { useEffect, useMemo, useRef, useState } from "react";
import { videoApi } from "../../api/videoApi";
import { deriveVideoGenState } from "./deriveVideoGenState";
import {
  createInitialRawState,
  createResumedRawState,
  getVirtualProgressDurationMs,
  tickRawState,
} from "./videoGenRawState";

const DONE_HOLD_MS = 1400;
const PROGRESS_TICK_MS = 1000;

/**
 * State machine: idle → generating → done → idle.
 * Exposes derivedState only — raw state never leaves this hook.
 */
export function useVideoGenStateMachine({
  onFailed,
  onReturnToList,
  taskApi = videoApi,
}) {
  const [rawState, setRawState] = useState(
    /** @type {import('./videoGenRawState').GenerationRawState | null} */ (null),
  );
  const [session, setSession] = useState(null);

  const taskDoneRef = useRef(false);
  const completedTaskRef = useRef(null);
  const progressTimerRef = useRef(null);
  const doneTimerRef = useRef(null);
  const onFailedRef = useRef(onFailed);
  const onReturnToListRef = useRef(onReturnToList);
  const taskApiRef = useRef(taskApi);

  onFailedRef.current = onFailed;
  onReturnToListRef.current = onReturnToList;
  taskApiRef.current = taskApi;

  const derivedState = useMemo(
    () =>
      deriveVideoGenState(rawState, { prompt: session?.prompt ?? "" }),
    [rawState, session?.prompt],
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
    setRawState(createInitialRawState(Date.now()));
  }

  function attachTaskId(taskId) {
    setSession((current) =>
      current ? { ...current, taskId } : null,
    );
  }

  function resumeGeneration(payload) {
    clearDoneTimer();
    taskDoneRef.current = false;
    completedTaskRef.current = null;

    const duration = Number(payload.duration) || 0;
    setSession({
      prompt: payload.prompt || "",
      duration,
      taskId: String(payload.taskId),
    });
    setRawState(
      createResumedRawState({
        progress: payload.progress,
        durationMs: getVirtualProgressDurationMs(duration),
      }),
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
        return tickRawState(prev, {
          taskComplete: taskDoneRef.current,
          durationMs: getVirtualProgressDurationMs(session?.duration),
        });
      });
    }

    progressTimerRef.current = window.setInterval(tick, PROGRESS_TICK_MS);
    return () => clearProgressTimer();
  }, [rawState?.status, session?.duration]);

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
    const taskId = session?.taskId;
    if (rawState?.status !== "generating" || !taskId) return undefined;

    let mounted = true;

    async function syncTask() {
      try {
        const tasks = await taskApiRef.current.getTasks({ filter: "all" });
        if (!mounted) return;
        const task = tasks.find((item) => String(item.id) === String(taskId));
        if (!task) return;

        if (task.status === "completed") {
          completedTaskRef.current = task;
          taskDoneRef.current = true;
          setRawState((prev) =>
            prev && prev.status === "generating"
              ? tickRawState(prev, {
                  taskComplete: true,
                  durationMs: getVirtualProgressDurationMs(session?.duration),
                })
              : prev,
          );
        } else if (task.status === "failed") {
          failGeneration(task.error || "视频生成失败");
        }
      } catch {
        // Retry on next poll.
      }
    }

    syncTask();
    const unsubscribe = taskApiRef.current.subscribe(syncTask);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [rawState?.status, session?.duration, session?.taskId]);

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
    startGeneration,
    attachTaskId,
    resumeGeneration,
    failGeneration,
    resetToIdle,
  };
}
