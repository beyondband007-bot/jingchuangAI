/** Keep media previews from competing with each other in the same workspace. */
export function pauseOtherMedia(activeMedia) {
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio, video").forEach((media) => {
    if (media !== activeMedia && !media.paused) media.pause();
  });
}
