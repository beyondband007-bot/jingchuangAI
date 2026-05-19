import { requestJson as request } from "../../api/request.js";

export const replicateApi = {
  async getTasks() {
    return request("/api/replicate/tasks");
  },

  async analyzeImage(file, fileName) {
    const formData = new FormData();
    formData.append("image", file, fileName);
    return request("/api/replicate/analyze-image", {
      method: "POST",
      body: formData
    });
  },

  async analyzeVideo(file, fileName) {
    const formData = new FormData();
    formData.append("video", file, fileName);
    return request("/api/replicate/analyze-video", {
      method: "POST",
      body: formData
    });
  }
};
