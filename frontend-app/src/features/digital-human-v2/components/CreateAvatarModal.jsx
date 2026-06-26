import React, { useRef, useState } from "react";
import { Info, Loader2, Upload, X } from "lucide-react";

const AGE_OPTIONS = ["儿童", "少年", "青年", "轻熟", "中年", "老年"];
const SKIN_OPTIONS = ["#f3d4bf", "#c79a61", "#9f6b39", "#7a4a22", "#5d3518"];
const STYLE_OPTIONS = ["韩式", "中式写实", "3D卡通", "电影质感"];
const RECOMMEND_OPTIONS = [
  "节日女主持",
  "带货主播",
  "国风讲师",
  "企业商务形象",
  "美妆博主",
  "虚拟讲师",
  "旅行博主",
  "智能客服",
];
const RATIO_OPTIONS = ["9:16", "16:9", "3:4", "4:3", "1:1", "21:9"];

function getNameFromFile(file) {
  if (!file?.name) return "我的形象";
  const baseName = String(file.name).replace(/\.[^/.]+$/, "").trim();
  return baseName || "我的形象";
}

export function CreateAvatarModal({
  onClose,
  onCreate,
  isSubmitting = false,
  mode = "upload",
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

  function handleUploadFile(file) {
    if (!file || isSubmitting) return;
    setNotice("");
    onCreate?.({
      mode: "upload",
      name: getNameFromFile(file),
      file,
    });
  }

  function submit() {
    if (!isAiMode) return;
    if (!desc.trim()) {
      setNotice("请完善人设描述后生成形象");
      return;
    }
    onCreate?.({
      mode: "ai",
      prompt: desc.trim(),
      gender,
      age,
      style,
      ratio,
      skinTone,
    });
  }

  function handleBackdropClose() {
    if (isSubmitting) return;
    onClose?.();
  }

  return (
    <div
      className="dhv2-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleBackdropClose}
    >
      <div
        className={`dhv2-modal ${isAiMode ? "is-ai" : ""} ${isUploadMode ? "is-upload" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dhv2-modal__header">
          <div>
            {!isUploadMode ? <span>创建形象</span> : null}
            <strong className={isUploadMode ? "dhv2-modal__title-with-icon" : ""}>
              {isAiMode ? "创建我的形象" : isUploadMode ? "创建我的形象" : "上传形象图"}
              {isUploadMode ? <Info size={14} aria-hidden="true" /> : null}
            </strong>
          </div>
          <button
            type="button"
            className="dhv2-modal__close"
            onClick={handleBackdropClose}
            aria-label="关闭"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </header>

        <div className="dhv2-modal__body">
          {isAiMode ? (
            <div className="dhv2-ai-modal">
              <section className="dhv2-ai-field">
                <h4>性别</h4>
                <div className="dhv2-ai-toggle">
                  {["女", "男"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={gender === item ? "is-active" : ""}
                      onClick={() => setGender(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="dhv2-ai-field">
                <h4>年龄</h4>
                <div className="dhv2-ai-pills dhv2-ai-pills--equal is-cols-6">
                  {AGE_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={age === item ? "is-active" : ""}
                      onClick={() => setAge(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="dhv2-ai-field">
                <h4>肤色</h4>
                <div className="dhv2-ai-skin">
                  {SKIN_OPTIONS.map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      className={skinTone === index ? "is-active" : ""}
                      onClick={() => setSkinTone(index)}
                      style={{ backgroundColor: item }}
                      aria-label={`肤色${index + 1}`}
                    />
                  ))}
                </div>
              </section>

              <section className="dhv2-ai-field">
                <h4>五官风格</h4>
                <div className="dhv2-ai-pills dhv2-ai-pills--equal is-cols-4">
                  {STYLE_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={style === item ? "is-active" : ""}
                      onClick={() => setStyle(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="dhv2-ai-field">
                <h4>角色描述</h4>
                <textarea
                  className="dhv2-ai-desc"
                  placeholder="填写职业、发型、穿搭、镜头姿态、画面光影、场景风格"
                  value={desc}
                  onChange={(event) => setDesc(event.target.value)}
                />
              </section>

              <section className="dhv2-ai-field">
                <h4>推荐</h4>
                <div className="dhv2-ai-pills">
                  {RECOMMEND_OPTIONS.map((item) => (
                    <button key={item} type="button" onClick={() => setDesc(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section className="dhv2-ai-field">
                <h4>比例</h4>
                <div className="dhv2-ai-ratio">
                  {RATIO_OPTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={ratio === item ? "is-active" : ""}
                      onClick={() => setRatio(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className={`dhv2-upload-panel ${isSubmitting ? "is-busy" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                hidden
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  event.target.value = "";
                  handleUploadFile(nextFile);
                }}
              />
              <button
                type="button"
                className="dhv2-upload-card"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={28} className="dhv2-spinner" />
                ) : (
                  <Upload size={28} />
                )}
                <strong>{isSubmitting ? "正在上传到我的形象..." : "上传正面人像照片"}</strong>
                <span>支持 JPG / PNG / WebP，半身或特写效果更佳</span>
              </button>
            </div>
          )}

          {notice ? <p className="dhv2-notice">{notice}</p> : null}
        </div>

        {!isUploadMode ? (
          <footer className="dhv2-modal__footer">
            <button type="button" className="dhv2-button-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="dhv2-button-primary"
              onClick={submit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 size={16} className="dhv2-spinner" /> : null}
              {isAiMode ? "生成" : "创建形象"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
