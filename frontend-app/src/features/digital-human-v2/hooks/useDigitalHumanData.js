import { useEffect, useRef, useState } from "react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import { imageDigitalHumanApi } from "../../../api/imageDigitalHumanApi";
import { emitCreditsUpdated } from "../../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../../api/taskPolling";
import { resolveAvatarSelection } from "../utils";
import { digitalHumanOfficialAvatarFallbacks } from "../../../data/faceminiData";

const emptyOptions = {
  models: [],
  defaults: { model: "", driveMode: "text" },
};

const fallbackAvatars = {
  public: digitalHumanOfficialAvatarFallbacks,
  mine: [],
};

function withOfficialAvatarFallback(value) {
  const publicAvatars = Array.isArray(value?.public) ? value.public : [];
  return publicAvatars.length
    ? { ...value, public: publicAvatars, mine: Array.isArray(value?.mine) ? value.mine : [] }
    : { ...fallbackAvatars, mine: Array.isArray(value?.mine) ? value.mine : [] };
}

const dataCache = {
  options: null,
  avatars: null,
  voices: null,
  tasks: null,
  photoTasks: null,
  credits: null,
  loaded: false,
};

function hasCachedData() {
  return (
    dataCache.loaded &&
    dataCache.options &&
    dataCache.avatars &&
    dataCache.voices
  );
}

function updateDataCache(partial, { markLoaded = false } = {}) {
  Object.assign(dataCache, partial);
  if (markLoaded) dataCache.loaded = true;
}

function applyCredits(setCredits, value) {
  if (!value) return;
  updateDataCache({ credits: value });
  setCredits(value);
  emitCreditsUpdated(value);
}

export function useDigitalHumanData({ isActive = true } = {}) {
  const [options, setOptions] = useState(() => dataCache.options || emptyOptions);
  const [avatars, setAvatars] = useState(
    () => withOfficialAvatarFallback(dataCache.avatars),
  );
  const [voices, setVoices] = useState(() => dataCache.voices || []);
  const [tasks, setTasks] = useState(() => dataCache.tasks || []);
  const [photoTasks, setPhotoTasks] = useState(() => dataCache.photoTasks || []);
  const [credits, setCredits] = useState(() => dataCache.credits || null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [loading, setLoading] = useState(() => !hasCachedData());
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
      updateDataCache({ tasks: value });
      setTasks(value);
      if (didStatusChange) {
        digitalHumanApi
          .getCredits()
          .then((creditValue) => mounted && applyCredits(setCredits, creditValue))
          .catch(() => {});
      }
    }

    async function load() {
      const hasCache = hasCachedData();
      setLoading(!hasCache);
      setError("");
      try {
        const [modelData, avatarData, voiceData, taskData, photoTaskData, creditData] =
          await Promise.all([
          digitalHumanApi.getModels(),
          digitalHumanApi.getAvatars(),
          digitalHumanApi.getVoices(),
          digitalHumanApi.getTasks(),
          imageDigitalHumanApi.getTasks().catch(() => []),
          digitalHumanApi.getCredits().catch(() => null),
        ]);
        if (!mounted) return;
        setOptions(modelData);
        const resolvedAvatarData = withOfficialAvatarFallback(avatarData);
        setAvatars(resolvedAvatarData);
        setVoices(voiceData.voices || []);
        updateDataCache(
          {
            options: modelData,
            avatars: resolvedAvatarData,
            voices: voiceData.voices || [],
            photoTasks: Array.isArray(photoTaskData) ? photoTaskData : [],
          },
          { markLoaded: true },
        );
        applyTaskList(taskData);
        setPhotoTasks(Array.isArray(photoTaskData) ? photoTaskData : []);
        applyCredits(setCredits, creditData);
        setSelectedAvatar((current) => resolveAvatarSelection(current, resolvedAvatarData));
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
        .getVoices()
        .then((value) => {
          if (!mounted) return;
          const nextVoices = value.voices || [];
          updateDataCache({ voices: nextVoices });
          setVoices(nextVoices);
        })
        .catch(() => {});
      digitalHumanApi
        .getAvatars()
        .then((value) => {
          if (!mounted) return;
          const resolvedAvatarData = withOfficialAvatarFallback(value);
          updateDataCache({ avatars: resolvedAvatarData });
          setAvatars(resolvedAvatarData);
          setSelectedAvatar((current) => resolveAvatarSelection(current, resolvedAvatarData));
        })
        .catch(() => {});
    });

    const unsubscribePhoto = imageDigitalHumanApi.subscribe(() => {
      imageDigitalHumanApi
        .getTasks()
        .then((value) => {
          if (!mounted) return;
          const nextPhotoTasks = Array.isArray(value) ? value : [];
          updateDataCache({ photoTasks: nextPhotoTasks });
          setPhotoTasks(nextPhotoTasks);
        })
        .catch(() => {});
    });

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribePhoto();
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

  async function refreshAvatars() {
    const value = await digitalHumanApi.getAvatars();
    const resolvedAvatarData = withOfficialAvatarFallback(value);
    updateDataCache({ avatars: resolvedAvatarData });
    setAvatars(resolvedAvatarData);
    setSelectedAvatar((current) =>
      resolveAvatarSelection(current, resolvedAvatarData)
    );
    return resolvedAvatarData;
  }

  return {
    options,
    avatars,
    voices,
    tasks,
    photoTasks,
    credits,
    selectedAvatar,
    setSelectedAvatar,
    loading,
    error,
    setError,
    refreshCredits,
    refreshAvatars,
  };
}
