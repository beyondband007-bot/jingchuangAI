import { createHttpError } from "./http.js";

const CREDIT_MEMO_TEXT = new Map([
  ["register initial credits", "\u6ce8\u518c\u8d60\u9001\u79ef\u5206"],
  ["demo-user initial credits", "\u6f14\u793a\u8d26\u53f7\u521d\u59cb\u79ef\u5206"],
  ["image generation debit", "\u56fe\u7247\u751f\u6210\u6263\u8d39"],
  ["image generation refund", "\u56fe\u7247\u751f\u6210\u9000\u6b3e"],
  ["article image generation debit", "\u7206\u6b3e\u56fe\u6587\u751f\u56fe\u6263\u8d39"],
  ["article image generation refund", "\u7206\u6b3e\u56fe\u6587\u751f\u56fe\u9000\u6b3e"],
  ["digital human avatar ai customization image generation debit", "\u6570\u5b57\u4eba\u5f62\u8c61 AI \u5b9a\u5236\u751f\u56fe\u6263\u8d39"],
  ["digital human avatar ai customization image generation refund", "\u6570\u5b57\u4eba\u5f62\u8c61 AI \u5b9a\u5236\u751f\u56fe\u9000\u6b3e"],
  ["video generation debit", "\u89c6\u9891\u751f\u6210\u6263\u8d39"],
  ["video generation refund", "\u89c6\u9891\u751f\u6210\u9000\u6b3e"],
  ["chat completion debit", "AI \u5bf9\u8bdd\u6263\u8d39"],
  ["voice clone debit", "\u97f3\u8272\u590d\u523b\u6263\u8d39"],
  ["voice clone refund", "\u97f3\u8272\u590d\u523b\u9000\u6b3e"],
  ["voice synthesis debit", "\u8bed\u97f3\u5408\u6210\u6263\u8d39"],
  ["voice synthesis refund", "\u8bed\u97f3\u5408\u6210\u9000\u6b3e"],
  ["digital human generation debit", "\u6570\u5b57\u4eba\u751f\u6210\u6263\u8d39"],
  ["digital human generation refund", "\u6570\u5b57\u4eba\u751f\u6210\u9000\u6b3e"],
  ["image digital human generation debit", "\u56fe\u7247\u6570\u5b57\u4eba\u751f\u6210\u6263\u8d39"],
  ["image digital human generation refund", "\u56fe\u7247\u6570\u5b57\u4eba\u751f\u6210\u9000\u6b3e"],
  ["motion transfer generation debit", "\u52a8\u4f5c\u8fc1\u79fb\u6263\u8d39"],
  ["motion transfer generation refund", "\u52a8\u4f5c\u8fc1\u79fb\u9000\u6b3e"],
  ["face swap generation debit", "\u89c6\u9891\u6362\u8138\u6263\u8d39"],
  ["face swap generation refund", "\u89c6\u9891\u6362\u8138\u9000\u6b3e"],
  ["watermark removal generation debit", "\u53bb\u6c34\u5370\u6263\u8d39"],
  ["watermark removal generation refund", "\u53bb\u6c34\u5370\u9000\u6b3e"],
  ["enhance generation debit", "\u753b\u8d28\u63d0\u5347\u6263\u8d39"],
  ["enhance generation refund", "\u753b\u8d28\u63d0\u5347\u9000\u6b3e"],
  ["remove background generation debit", "\u53bb\u80cc\u666f\u6263\u8d39"],
  ["remove background generation refund", "\u53bb\u80cc\u666f\u9000\u6b3e"],
  ["music generation debit", "\u97f3\u4e50\u751f\u6210\u6263\u8d39"],
  ["music generation refund", "\u97f3\u4e50\u751f\u6210\u9000\u6b3e"],
  ["article copy debit", "\u7206\u6b3e\u56fe\u6587\u751f\u6210\u6807\u9898&\u6b63\u6587\u6263\u8d39"],
  ["article copy refund", "\u7206\u6b3e\u56fe\u6587\u751f\u6210\u6807\u9898&\u6b63\u6587\u9000\u6b3e"],
  ["article copy invalid response refund", "\u7206\u6b3e\u56fe\u6587\u751f\u6210\u6807\u9898&\u6b63\u6587\u9000\u6b3e"],
  ["image replicate debit", "\u89c6\u89c9\u590d\u523b\u6263\u8d39"],
  ["image replicate failure refund", "\u89c6\u89c9\u590d\u523b\u9000\u6b3e"],
  ["video replicate debit", "\u89c6\u9891\u590d\u523b\u6263\u8d39"],
  ["video replicate failure refund", "\u89c6\u9891\u590d\u523b\u9000\u6b3e"],
  ["video dubbing debit", "视频配音扣费"],
  ["video dubbing failure refund", "视频配音退款"],
  ["voice convert debit", "音色转换扣费"],
  ["voice convert failure refund", "音色转换退款"],
  ["transcription debit", "语音转文字扣费"],
  ["transcription refund", "语音转文字退款"],
  ["image replicate refund", "\u89c6\u89c9\u590d\u5236\u9000\u6b3e"],
  ["video replicate refund", "\u89c6\u9891\u590d\u5236\u9000\u6b3e"],
  ["invite gift inviter reward", "\u9080\u8bf7\u6709\u793c\u5956\u52b1"],
  ["invite gift invitee reward", "\u53d7\u9080\u6ce8\u518c\u5956\u52b1"]
]);

export function localizeCreditMemo(memo, { imageSource = "" } = {}) {
  const text = String(memo || "").trim();
  if (!text) return "";
  if (text === "image generation debit") {
    if (imageSource === "article") return "爆款图文生图扣费";
    if (imageSource === "digital-human-avatar") return "数字人形象 AI 定制生图扣费";
  }
  if (text === "image generation refund") {
    if (imageSource === "article") return "爆款图文生图退款";
    if (imageSource === "digital-human-avatar") return "数字人形象 AI 定制生图退款";
  }
  if (CREDIT_MEMO_TEXT.has(text)) return CREDIT_MEMO_TEXT.get(text);

  return text
    .replace(/^Manual recharge for\s+(.+)$/i, "\u4eba\u5de5\u5145\u503c\uff08\u8d26\u6237\uff1a$1\uff09")
    .replace(/\btask creation failed:\s*/i, "\u4efb\u52a1\u521b\u5efa\u5931\u8d25\uff1a")
    .replace(/\btask failed\b/i, "\u4efb\u52a1\u5931\u8d25")
    .replace(/\bresult missing URL\b/i, "\u7ed3\u679c\u7f3a\u5c11\u94fe\u63a5");
}

export async function debitCredits(connection, { userId, taskId, amount, memo }) {
  const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [userId]);
  if (accounts.length === 0 || accounts[0].balance < amount) {
    throw createHttpError("积分不够，请充值", 402);
  }

  const balanceAfter = accounts[0].balance - amount;
  await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, userId]);
  await connection.query(
    `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
     VALUES (?, ?, 'debit', ?, ?, ?)`,
    [userId, taskId, -amount, balanceAfter, localizeCreditMemo(memo)]
  );

  return balanceAfter;
}

export async function refundCredits(connection, { userId, taskId, amount, memo }) {
  const [accounts] = await connection.query("SELECT balance FROM credit_accounts WHERE user_id = ? FOR UPDATE", [userId]);
  const balanceAfter = accounts[0].balance + amount;

  await connection.query("UPDATE credit_accounts SET balance = ? WHERE user_id = ?", [balanceAfter, userId]);
  await connection.query(
    `INSERT INTO credit_transactions (user_id, task_id, type, amount, balance_after, memo)
     VALUES (?, ?, 'refund', ?, ?, ?)`,
    [userId, taskId, amount, balanceAfter, localizeCreditMemo(memo)]
  );

  return balanceAfter;
}
