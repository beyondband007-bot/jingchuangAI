export function getArticleImages(task, { useThumbnail = false } = {}) {
  if (!task) return [];
  if (task.imageTasks?.length) {
    return task.imageTasks
      .map((item, index) => {
        const image = useThumbnail
          ? item.thumbnailUrl || item.image
          : item.imageUrl || item.image;
        return {
          id: item.id || `${task.id}-image-${index}`,
          image,
          title: item.segmentTitle || item.title || `配图 ${index + 1}`,
          status: item.status,
        };
      })
      .filter((item) => item.image);
  }
  if (task.images?.length) {
    return task.images
      .map((image, index) => ({
        id: `${task.id}-image-${index}`,
        image,
        title: `配图 ${index + 1}`,
        status: task.status,
      }))
      .filter((item) => item.image);
  }
  const image = useThumbnail ? task.thumbnailUrl || task.image : task.imageUrl || task.image;
  return image
    ? [{ id: task.id, image, title: "配图 1", status: task.status }]
    : [];
}

export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function buildArticleBodyCopy(body, tags = []) {
  const tagsText = tags.map((tag) => `#${tag}`).join(" ");
  return [body, tagsText].filter(Boolean).join("\n\n");
}
