import { useEffect, useRef, useState } from "react";
import { imageDigitalHumanApi } from "../../../api/imageDigitalHumanApi";
import { emitCreditsUpdated } from "../../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../../api/taskPolling";

const emptyOptions = {
  models: [],
  defaults: { model: "", driveMode: "text" },
  limits: { maxImageBytes: 10 * 1024 * 1024, maxTextLength: 500 },
};

function applyCredits(setCredits, value) {
  if (!value) return;
  setCredits(value);
  emitCreditsUpdated(value);
}

export function usePhotoDigitalHumanData({ isActive = true } = {}) {
  const [options, setOptions] = useState(emptyOptions);
  const [voices, setVoices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const taskStatusSignatureRef = useRef("");

  useEffect(() => {
    if (!isActive) return undefined;

    let mounted = true;

    function applyTaskList(value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      imageDigitalHumanApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      if (didStatusChange) {
        imageDigitalHumanApi
          .getCredits()
          .then((creditValue) => mounted && applyCredits(setCredits, creditValue))
          .catch(() => {});
      }
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [modelData, voiceData, taskData, creditData] = await Promise.all([
          imageDigitalHumanApi.getModels(),
          imageDigitalHumanApi.getVoices(),
          imageDigitalHumanApi.getTasks(),
          imageDigitalHumanApi.getCredits().catch(() => null),
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setVoices(voiceData.voices || []);
        applyTaskList(taskData);
        applyCredits(setCredits, creditData);
      } catch (loadError) {
        if (mounted) setError(loadError.message || "加载照片数字人失败");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const unsubscribe = imageDigitalHumanApi.subscribe(() => {
      imageDigitalHumanApi.getTasks().then(applyTaskList).catch(() => {});
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isActive]);

  async function refreshCredits() {
    try {
      const value = await imageDigitalHumanApi.getCredits();
      applyCredits(setCredits, value);
      return value;
    } catch {
      return null;
    }
  }

  return {
    options,
    voices,
    tasks,
    credits,
    loading,
    error,
    setError,
    refreshCredits,
  };
}
