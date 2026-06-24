export const BEIJING_TIME_ZONE = "Asia/Shanghai";

function getBeijingDateParts(value = new Date()) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date);
  const pick = (type) => parts.find((item) => item.type === type)?.value || "0";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour").padStart(2, "0"),
    minute: pick("minute").padStart(2, "0"),
    second: pick("second").padStart(2, "0")
  };
}

export function formatBeijingDateTime(value = new Date()) {
  const parts = getBeijingDateParts(value);
  if (!parts) return "";
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatBeijingStamp(value = new Date()) {
  const parts = getBeijingDateParts(value);
  if (!parts) return "";
  return `${parts.year}${parts.month.padStart(2, "0")}${parts.day.padStart(2, "0")}-${parts.hour}${parts.minute}${parts.second}`;
}

export function formatBeijingHistoryTime(value = new Date()) {
  return formatBeijingDateTime(value);
}
