import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { recoverStreamingChatMessages } from "./modules/chat/chat.service.js";
import { recoverProcessingImageTasks } from "./modules/image/image.service.js";

const app = createApp();

const recoveredChatMessages = await recoverStreamingChatMessages();
if (recoveredChatMessages > 0) {
  console.log(`Recovered ${recoveredChatMessages} interrupted chat message(s)`);
}

const chatRecoveryTimer = setInterval(async () => {
  try {
    const recovered = await recoverStreamingChatMessages();
    if (recovered > 0) {
      console.log(`Recovered ${recovered} interrupted chat message(s)`);
    }
  } catch (error) {
    console.error("Failed to recover interrupted chat messages", error);
  }
}, 60_000);
chatRecoveryTimer.unref();

let imageTaskRecoveryRunning = false;
async function runImageTaskRecovery() {
  if (imageTaskRecoveryRunning) return;
  imageTaskRecoveryRunning = true;
  try {
    await recoverProcessingImageTasks();
  } catch (error) {
    console.error("Failed to recover processing image tasks", error);
  } finally {
    imageTaskRecoveryRunning = false;
  }
}

app.listen(config.port, config.host, () => {
  console.log(`Backend listening on http://${config.host}:${config.port}`);
});

const initialImageTaskRecovery = setTimeout(runImageTaskRecovery, 1_000);
initialImageTaskRecovery.unref();
const imageTaskRecoveryTimer = setInterval(runImageTaskRecovery, 10_000);
imageTaskRecoveryTimer.unref();
