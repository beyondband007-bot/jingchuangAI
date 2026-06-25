import { useEffect, useRef, useState } from "react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import { emitCreditsUpdated } from "../../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../../api/taskPolling";
import { resolveAvatarSelection } from "../utils";

const emptyOptions = {
  models: [],
  defaults: { model: "", driveMode: "text" },
};

function applyCredits(setCredits, value) {
  if (!value) return;
  setCredits(value);
  emitCreditsUpdated(value);
}

export function useDigitalHumanData({ isActive = true } = {}) {
  const [options, setOptions] = useState(emptyOptions);
  const [avatars, setAvatars] = useState({ public: [], mine: [] });
  const [voices, setVoices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [credits, setCredits] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
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
      digitalHumanApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      if (didStatusChange) {
        digitalHumanApi
          .getCredits()
          .then((creditValue) => mounted && applyCredits(setCredits, creditValue))
          .catch(() => {});
      }
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [modelData, avatarData, voiceData, taskData, creditData] = await Promise.all([
          digitalHumanApi.getModels(),
          digitalHumanApi.getAvatars(),
          digitalHumanApi.getVoices(),
          digitalHumanApi.getTasks(),
          digitalHumanApi.getCredits().catch(() => null),
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setAvatars(avatarData);
        setVoices(voiceData.voices || []);
        applyTaskList(taskData);
        applyCredits(setCredits, creditData);
        setSelectedAvatar((current) => resolveAvatarSelection(current, avatarData));
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || "加载数字人数据失败");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const unsubscribe = digitalHumanApi.subscribe(() => {
      digitalHumanApi.getTasks().then(applyTaskList).catch(() => {});
      digitalHumanApi
        .getAvatars()
        .then((value) => {
          if (!mounted) return;
          setAvatars(value);
          setSelectedAvatar((current) => resolveAvatarSelection(current, value));
        })
        .catch(() => {});
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isActive]);

  async function refreshCredits() {
    try {
      const value = await digitalHumanApi.getCredits();
      applyCredits(setCredits, value);
      return value;
    } catch {
      return null;
    }
  }

  return {
    options,
    avatars,
    voices,
    tasks,
    credits,
    selectedAvatar,
    setSelectedAvatar,
    loading,
    error,
    setError,
    refreshCredits,
  };
}
