import React, { useEffect, useMemo, useRef, useState } from "react";
import { Info, Loader2, RefreshCcw, Upload, X } from "lucide-react";
import { VOICE_EMOTION_OPTIONS, isDigitalHumanVoiceEnabled } from "../utils";
import { stripFileExtension } from "../../../utils/fileName";

const AGE_OPTIONS = ["儿童", "少年", "青年", "轻熟", "中年", "老年"];
const SKIN_OPTIONS = ["#f3d4bf", "#c79a61", "#9f6b39", "#7a4a22", "#5d3518"];
const STYLE_OPTIONS = ["韩式", "中式写实", "3D卡通", "电影质感"];
const RECOMMEND_OPTIONS = ["节日女主持", "带货主播", "国风讲师", "企业商务形象", "美妆博主", "虚拟讲师", "旅行博主", "智能客服"];
const RATIO_OPTIONS = ["9:16", "16:9", "3:4", "4:3", "1:1", "21:9"];
const SCENE_OPTIONS = ["企业服务", "知识科普", "生活分享", "活动主持", "新闻主播", "企业客服", "教育", "职场", "电商带货", "自定义"];
const DEFAULT_PERFORMANCE = "面带微笑，眼神专注自信地说话，双手动作自然，固定镜头，对着镜头讲解内容，偶尔看向镜头位置，动作自然。";

function getNameFromFile(file) {
  const name = stripFileExtension(String(file?.name || "")).trim();
  return name || "我的形象";
}

export function CreateAvatarModal({
  onClose,
  onCreate,
  isSubmitting = false,
  mode = "upload",
  voices = [],
  initialVoiceId = "",
  initialVoiceSpeed = 1,
  initialVoiceEmotion = "中性",
}) {
  const isAiMode = mode === "ai";
  const isUploadMode = mode === "upload";
  const fileInputRef = useRef(null);
  const [notice, setNotice] = useState("");
  const [gender, setGender] = useState("女");
  const [age, setAge] = useState("青年");
  const [skinTone, setSkinTone] = useState(1);
  const [style, setStyle] = useState("中式写实");
  const [desc, setDesc] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [uploadFile, setUploadFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scene, setScene] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [performance, setPerformance] = useState(DEFAULT_PERFORMANCE);
  const [voiceId, setVoiceId] = useState(initialVoiceId);
  const [voiceSpeed, setVoiceSpeed] = useState(initialVoiceSpeed);
  const [voiceEmotion, setVoiceEmotion] = useState(initialVoiceEmotion);
  const enabledVoices = useMemo(
    () => voices.filter((voice) => isDigitalHumanVoiceEnabled(voice.id)),
    [voices],
  );

  useEffect(() => {
    if (!voiceId && enabledVoices[0]?.id) setVoiceId(enabledVoices[0].id);
  }, [enabledVoices, voiceId]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleUploadFile(file) {
    if (!file || isSubmitting) return;
    if (!String(file.type || "").startsWith("image/")) {
      setNotice("请选择 JPG、PNG 或 WebP 图片");
      return;
    }
    setNotice("");
    setUploadFile(file);
    setAvatarName(getNameFromFile(file));
    setPreviewUrl(URL.createObjectURL(file));
  }

  function submit() {
    if (isAiMode) {
      if (!desc.trim()) {
        setNotice("请完善人设描述后生成形象");
        return;
      }
      onCreate?.({ mode: "ai", prompt: desc.trim(), gender, age, style, ratio, skinTone });
      return;
    }
    if (!uploadFile) {
      fileInputRef.current?.click();
      return;
    }
    if (!avatarName.trim()) {
      setNotice("请输入形象昵称");
      return;
    }
    onCreate?.({
      mode: "upload",
      name: avatarName.trim(),
      file: uploadFile,
      scene,
      performance: performance.trim(),
      voiceId,
      voiceSpeed,
      voiceEmotion,
    });
  }

  function close() {
    if (!isSubmitting) onClose?.();
  }

  return (
    <div className="dhv2-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={close}>
      <div
        className={`dhv2-modal ${isAiMode ? "is-ai" : ""} ${isUploadMode ? "is-upload" : ""} ${uploadFile ? "has-upload-preview" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dhv2-modal__header">
          <div>
            {!isUploadMode ? <span>创建形象</span> : null}
            <strong className={isUploadMode ? "dhv2-modal__title-with-icon" : ""}>
              创建我的形象
              {isUploadMode ? <Info size={14} aria-hidden="true" /> : null}
            </strong>
          </div>
          <button type="button" className="dhv2-modal__close" onClick={close} aria-label="关闭" disabled={isSubmitting}>
            <X size={18} />
          </button>
        </header>

        <div className="dhv2-modal__body">
          {isAiMode ? (
            <div className="dhv2-ai-modal">
              <section className="dhv2-ai-field">
                <h4>性别</h4>
                <div className="dhv2-ai-toggle">
                  {["女", "男"].map((item) => <button key={item} type="button" className={gender === item ? "is-active" : ""} onClick={() => setGender(item)}>{item}</button>)}
                </div>
              </section>
              <section className="dhv2-ai-field">
                <h4>年龄</h4>
                <div className="dhv2-ai-pills dhv2-ai-pills--equal is-cols-6">
                  {AGE_OPTIONS.map((item) => <button key={item} type="button" className={age === item ? "is-active" : ""} onClick={() => setAge(item)}>{item}</button>)}
                </div>
              </section>
              <section className="dhv2-ai-field">
                <h4>肤色</h4>
                <div className="dhv2-ai-skin">
                  {SKIN_OPTIONS.map((item, index) => <button key={item} type="button" className={skinTone === index ? "is-active" : ""} onClick={() => setSkinTone(index)} style={{ backgroundColor: item }} aria-label={`肤色${index + 1}`} />)}
                </div>
              </section>
              <section className="dhv2-ai-field">
                <h4>五官风格</h4>
                <div className="dhv2-ai-pills dhv2-ai-pills--equal is-cols-4">
                  {STYLE_OPTIONS.map((item) => <button key={item} type="button" className={style === item ? "is-active" : ""} onClick={() => setStyle(item)}>{item}</button>)}
                </div>
              </section>
              <section className="dhv2-ai-field">
                <h4>角色描述</h4>
                <textarea className="dhv2-ai-desc" placeholder="填写职业、发型、穿搭、镜头姿态、画面光影、场景风格" value={desc} onChange={(event) => setDesc(event.target.value)} />
              </section>
              <section className="dhv2-ai-field">
                <h4>推荐</h4>
                <div className="dhv2-ai-pills">
                  {RECOMMEND_OPTIONS.map((item) => <button key={item} type="button" onClick={() => setDesc(item)}>{item}</button>)}
                </div>
              </section>
              <section className="dhv2-ai-field">
                <h4>比例</h4>
                <div className="dhv2-ai-ratio">
                  {RATIO_OPTIONS.map((item) => <button key={item} type="button" className={ratio === item ? "is-active" : ""} onClick={() => setRatio(item)}>{item}</button>)}
                </div>
              </section>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => {
                  handleUploadFile(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              {!uploadFile ? (
                <div className="dhv2-upload-panel">
                  <button type="button" className="dhv2-upload-card" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={28} />
                    <strong>上传正面人像照片</strong>
                    <span>支持 JPG / PNG / WebP，半身或特写效果更佳</span>
                  </button>
                </div>
              ) : (
                <div className="dhv2-upload-editor">
                  <div className="dhv2-upload-editor__preview">
                    <div
                      className="dhv2-upload-editor__cover"
                      role="img"
                      aria-label="已上传形象预览"
                      style={{ backgroundImage: `url("${previewUrl}")` }}
                    />
                    <button type="button" data-tooltip="重新上传" aria-label="重新上传" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                      <RefreshCcw size={18} />
                    </button>
                  </div>
                  <div className="dhv2-upload-editor__form">
                    <label>
                      <span>场景</span>
                      <select value={scene} onChange={(event) => setScene(event.target.value)}>
                        <option value="">请选择使用场景</option>
                        {SCENE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>形象昵称</span>
                      <input value={avatarName} maxLength={30} onChange={(event) => setAvatarName(event.target.value)} />
                    </label>
                    <label className="dhv2-upload-editor__performance">
                      <span>角色表现</span>
                      <textarea value={performance} maxLength={300} onChange={(event) => setPerformance(event.target.value)} />
                    </label>
                    <label>
                      <span>常用音色</span>
                      <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
                        {enabledVoices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
                      </select>
                    </label>
                    <label className="dhv2-upload-editor__speed">
                      <span>语速 <strong>{Number(voiceSpeed).toFixed(1)}x</strong></span>
                      <input type="range" min="0.5" max="2" step="0.1" value={voiceSpeed} onChange={(event) => setVoiceSpeed(Number(event.target.value))} />
                    </label>
                    <div className="dhv2-upload-editor__emotion">
                      <span>情感</span>
                      <div>
                        {VOICE_EMOTION_OPTIONS.map((item) => <button key={item} type="button" className={voiceEmotion === item ? "is-active" : ""} onClick={() => setVoiceEmotion(item)}>{item}</button>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {notice ? <p className="dhv2-notice">{notice}</p> : null}
        </div>

        {(!isUploadMode || uploadFile) ? (
          <footer className="dhv2-modal__footer">
            {!isUploadMode ? <button type="button" className="dhv2-button-secondary" onClick={onClose}>取消</button> : null}
            <button type="button" className="dhv2-button-primary" onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="dhv2-spinner" /> : null}
              {isAiMode ? "生成" : "保存形象"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
