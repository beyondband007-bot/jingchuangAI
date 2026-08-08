import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Play, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { digitalHumanApi } from "../../../api/digitalHumanApi";
import { CustomSelect } from "../../../components/CustomSelect";
import { VOICE_EMOTION_OPTIONS, isDigitalHumanVoiceEnabled, isVideoCover } from "../utils";

function getVoiceSource(voiceId, publicVoices, mineVoices) {
  if (mineVoices.some((voice) => String(voice.id) === String(voiceId))) return "mine";
  if (publicVoices.some((voice) => String(voice.id) === String(voiceId))) return "public";
  return "public";
}

export function MineAvatarConfigOverlay({
  avatar,
  voices = [],
  initialVoiceId,
  initialVoiceSource = "public",
  initialPublicVoiceId = "",
  initialMineVoiceId = "",
  initialVoiceSpeed = 1,
  initialVoiceEmotion = "中性",
  onClose,
  onConfirm,
  onRename,
  onDelete,
  onVoiceSaved,
  onConfigChange,
}) {
  const audioRef = useRef(null);
  const [availableVoices, setAvailableVoices] = useState(voices);
  const publicVoices = useMemo(
    () => availableVoices.filter((voice) => voice.source !== "voice-clone" && isDigitalHumanVoiceEnabled(voice.id)),
    [availableVoices],
  );
  const mineVoices = useMemo(
    () => availableVoices.filter((voice) => voice.source === "voice-clone"),
    [availableVoices],
  );
  const initialSource = initialVoiceSource === "upload" ? "mine" : (initialVoiceSource || getVoiceSource(initialVoiceId, publicVoices, mineVoices));
  const [voiceId, setVoiceId] = useState(initialVoiceId || "");
  const [voiceSource, setVoiceSource] = useState(initialSource);
  const [publicVoiceId, setPublicVoiceId] = useState(String(initialPublicVoiceId || (initialSource === "public" ? initialVoiceId : "") || ""));
  const [mineVoiceId, setMineVoiceId] = useState(String(initialMineVoiceId || (initialSource === "mine" ? initialVoiceId : "") || ""));
  const [voiceSpeed, setVoiceSpeed] = useState(initialVoiceSpeed);
  const [voiceEmotion, setVoiceEmotion] = useState(initialVoiceEmotion);
  const [previewingId, setPreviewingId] = useState("");
  const [notice, setNotice] = useState("");
  const [hasUserConfigChanged, setHasUserConfigChanged] = useState(false);

  useEffect(() => {
    setAvailableVoices(voices);
  }, [voices]);

  useEffect(() => {
    let active = true;
    digitalHumanApi.getVoices({ force: true })
      .then((result) => {
        if (active) setAvailableVoices(result.voices || []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [avatar?.id]);

  useEffect(() => {
    const onKeyDown = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => () => audioRef.current?.pause(), []);

  useEffect(() => {
    if (!hasUserConfigChanged || !voiceId) return undefined;
    const timer = window.setTimeout(() => {
      onConfigChange?.(avatar, { voiceId, voiceSpeed, voiceEmotion, voiceSource, publicVoiceId, mineVoiceId });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [avatar, hasUserConfigChanged, mineVoiceId, onConfigChange, publicVoiceId, voiceEmotion, voiceId, voiceSource, voiceSpeed]);

  function selectPublicVoice(id) {
    setVoiceId(id);
    setPublicVoiceId(String(id));
    setVoiceSource("public");
    setNotice("");
    setHasUserConfigChanged(true);
  }

  function selectVoiceSource(source) {
    setNotice("");
    if (source === "public") {
      const nextVoiceId = publicVoiceId || String(publicVoices[0]?.id || "");
      setVoiceSource("public");
      setVoiceId(nextVoiceId);
      if (!publicVoiceId && nextVoiceId) setPublicVoiceId(nextVoiceId);
      setHasUserConfigChanged(true);
      return;
    }
    const nextVoiceId = mineVoiceId || String(mineVoices[0]?.id || "");
    setVoiceSource("mine");
    setVoiceId(nextVoiceId);
    if (!mineVoiceId && nextVoiceId) setMineVoiceId(nextVoiceId);
    setHasUserConfigChanged(true);
  }

  async function previewVoice(targetVoiceId) {
    if (!targetVoiceId) return;
    setPreviewingId(String(targetVoiceId));
    setNotice("");
    try {
      const result = await digitalHumanApi.previewVoice({
        text: "你好，这是当前音色的试听效果。",
        voiceId: targetVoiceId,
        speed: voiceSource === "public" ? voiceSpeed : 1,
        volume: 1,
        pitch: 0,
        emotion: voiceSource === "public" ? voiceEmotion : undefined,
      });
      audioRef.current?.pause();
      const audio = new Audio(result.audioDataUrl);
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      setNotice(error?.message || "音色试听失败，请稍后重试");
    } finally {
      setPreviewingId("");
    }
  }

  const isPublicVoice = voiceSource === "public";

  return createPortal(
    <div className="dhv2-mine-config-backdrop" role="dialog" aria-modal="true" aria-label="配置我的形象" onClick={onClose}>
      <section className="dhv2-mine-config" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="dhv2-mine-config__close" aria-label="关闭" onClick={onClose}><X size={20} /></button>
        <div className="dhv2-mine-config__body">
          <div className="dhv2-mine-config__preview">
            <header>
              <strong>{avatar.name || "我的形象"}</strong>
              <span className="dhv2-mine-config__avatar-actions">
                <button type="button" aria-label="修改形象名称" onClick={() => onRename?.(avatar)}><Pencil size={16} /></button>
                <button type="button" className="is-delete" aria-label="删除形象" onClick={() => onDelete?.(avatar)}><Trash2 size={16} /></button>
              </span>
            </header>
            <div className="dhv2-mine-config__media">
              {isVideoCover(avatar.cover) ? <video src={avatar.cover} controls playsInline /> : <img src={avatar.cover} alt={avatar.name || "我的形象"} />}
            </div>
          </div>

          <div className="dhv2-mine-config__settings">
            <header><strong>配置音色</strong><span>三种来源任选其一；只有公共音色支持配置语速和情感。</span></header>
            <section className={`dhv2-mine-config__voice-source${isPublicVoice ? " is-active" : ""}`} onClick={() => selectVoiceSource("public")}>
              <div className="dhv2-mine-config__source-title"><strong>1. 使用公共音色</strong><span>可配置语速、情感</span></div>
              <div className="dhv2-mine-config__voice-list">
                {publicVoices.map((voice) => {
                  const selected = String(voice.id) === String(voiceId) && isPublicVoice;
                  return <article key={voice.id} className={selected ? "is-selected" : ""}>
                    <button type="button" className="dhv2-mine-config__voice-main" onClick={() => selectPublicVoice(voice.id)}>
                      <strong>{voice.name}</strong><span>{voice.description || "公共音色"}</span>
                    </button>
                    <button type="button" className="dhv2-mine-config__voice-play" aria-label={`试听${voice.name}`} disabled={previewingId === String(voice.id)} onClick={() => previewVoice(voice.id)}>
                      {previewingId === String(voice.id) ? <Loader2 size={15} className="dhv2-spinner" /> : <Play size={15} />}
                    </button>
                  </article>;
                })}
              </div>
            </section>

            <section className={`dhv2-mine-config__voice-source${voiceSource === "mine" ? " is-active" : ""}`} onClick={() => selectVoiceSource("mine")}>
              <div className="dhv2-mine-config__source-title"><strong>2. 选择我的音色</strong><span>使用音色原始配置</span></div>
              <div className="dhv2-mine-config__select-row" onClick={(event) => event.stopPropagation()}>
                <CustomSelect
                  className="dhv2-mine-config__voice-select"
                  ariaLabel="选择我的音色"
                  menuZIndex="1201"
                  value={voiceSource === "mine" ? voiceId : ""}
                  placeholder="选择已保存的我的音色"
                  options={[{ value: "", label: "选择已保存的我的音色" }, ...mineVoices.map((voice) => ({ value: voice.id, label: voice.name || "我的音色" }))]}
                  onChange={(id) => { if (id) { setVoiceId(id); setMineVoiceId(String(id)); setVoiceSource("mine"); setNotice(""); setHasUserConfigChanged(true); } }}
                />
                {voiceSource === "mine" && voiceId ? <button type="button" className="dhv2-mine-config__voice-play" aria-label="试听我的音色" onClick={() => previewVoice(voiceId)}><Play size={15} /></button> : null}
              </div>
            </section>

            {notice ? <p className="dhv2-mine-config__notice" role="status">{notice}</p> : null}
            <fieldset className="dhv2-mine-config__public-controls" disabled={!isPublicVoice}>
              <label className="dhv2-mine-config__range"><span>语速<strong>{Number(voiceSpeed).toFixed(1)}x</strong></span><input type="range" min="0.5" max="2" step="0.1" value={voiceSpeed} onChange={(event) => { setVoiceSpeed(Number(event.target.value)); setHasUserConfigChanged(true); }} /></label>
              <div className="dhv2-mine-config__emotions"><span>情感</span>{VOICE_EMOTION_OPTIONS.map((emotion) => <button key={emotion} type="button" className={voiceEmotion === emotion ? "is-active" : ""} onClick={() => { setVoiceEmotion(emotion); setHasUserConfigChanged(true); }}>{emotion}</button>)}</div>
            </fieldset>
          </div>
        </div>
        <footer><button type="button" onClick={onClose}>取消</button><button type="button" className="is-primary" onClick={() => { const config = { voiceId, voiceSpeed: isPublicVoice ? voiceSpeed : 1, voiceEmotion: isPublicVoice ? voiceEmotion : "", voiceSource, publicVoiceId, mineVoiceId }; onConfigChange?.(avatar, config); onConfirm?.(avatar, config); }}>确认使用</button></footer>
      </section>
    </div>,
    document.body,
  );
}
