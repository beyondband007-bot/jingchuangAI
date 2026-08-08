import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { recoverStreamingChatMessages } from "./modules/chat/chat.service.js";
import { recoverProcessingImageTasks } from "./modules/image/image.service.js";
import { recoverProcessingVideoTasks } from "./modules/video/video.service.js";
import { recoverInterruptedReplicateTasks } from "./modules/replicate/replicate.service.js";
import { expireTimedOutTasks as expireTimedOutEnhanceTasks } from "./modules/enhance/enhance.service.js";

const app = createApp();

const recoveredReplicateTasks = await recoverInterruptedReplicateTasks();
if (recoveredReplicateTasks > 0) {
  console.log(`Recovered ${recoveredReplicateTasks} interrupted replicate task(s)`);
}

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

let enhanceTimeoutSweepRunning = false;
async function runEnhanceTimeoutSweep() {
  if (enhanceTimeoutSweepRunning) return;
  enhanceTimeoutSweepRunning = true;
  try {
    const expired = await expireTimedOutEnhanceTasks();
    if (expired > 0) console.log(`Closed ${expired} timed out enhance task(s)`);
  } catch (error) {
    console.error("Failed to close timed out enhance tasks", error);
  } finally {
    enhanceTimeoutSweepRunning = false;
  }
}

const initialEnhanceTimeoutSweep = setTimeout(runEnhanceTimeoutSweep, 2_000);
initialEnhanceTimeoutSweep.unref();
const enhanceTimeoutSweepTimer = setInterval(runEnhanceTimeoutSweep, 60_000);
enhanceTimeoutSweepTimer.unref();

let videoTaskRecoveryRunning = false;
async function runVideoTaskRecovery() {
  if (videoTaskRecoveryRunning) return;
  videoTaskRecoveryRunning = true;
  try {
    await recoverProcessingVideoTasks();
  } catch (error) {
    console.error("Failed to recover processing video tasks", error);
  } finally {
    videoTaskRecoveryRunning = false;
  }
}

const initialVideoTaskRecovery = setTimeout(runVideoTaskRecovery, 1_500);
initialVideoTaskRecovery.unref();
const videoTaskRecoveryTimer = setInterval(runVideoTaskRecovery, 10_000);
videoTaskRecoveryTimer.unref();
