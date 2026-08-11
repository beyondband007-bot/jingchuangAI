import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function RenameAssetDialog({ asset, kind = "形象", isSubmitting = false, onClose, onConfirm }) {
  const [name, setName] = useState(asset?.name || "");
  useEffect(() => setName(asset?.name || ""), [asset]);
  if (!asset) return null;
  const submit = () => {
    const value = name.trim();
    if (value) onConfirm?.(value);
  };
  return createPortal(
    <div className="dhv2-rename-backdrop" role="dialog" aria-modal="true" aria-label={`修改${kind}名称`} onClick={onClose}>
      <section className="dhv2-rename-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>修改{kind}名称</h2>
        <label>{kind}名称<input autoFocus maxLength="50" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} /></label>
        <footer><button type="button" disabled={isSubmitting} onClick={onClose}>取消</button><button type="button" disabled={isSubmitting || !name.trim()} onClick={submit}>{isSubmitting ? "保存中…" : "保存"}</button></footer>
      </section>
    </div>, document.body,
  );
}
