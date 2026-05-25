import { requestJson as request } from "../../api/request.js";

export const transcribeApi = {
  async getTasks() {
    return request("/api/transcribe/tasks");
  },

  async transcribe(file, durationMs) {
    const formData = new FormData();
    formData.append("audio", file);
    if (durationMs) formData.append("durationMs", String(Math.round(durationMs)));

    return request("/api/transcribe", {
      method: "POST",
      body: formData
    });
  }
};
