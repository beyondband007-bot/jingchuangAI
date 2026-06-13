import React, { useEffect, useRef, useState } from "react";

const MODEL_OPTIONS = [
  "DeepSeek V4 Pro",
  "Qwen 3.6 Plus",
  "Qwen 3.7 Plus",
  "Kimi K2.6",
  "MiniMax M2.7",
  "GPT-5.5-codex",
  "Gemini 3 Pro",
  "Gemini 3.1 pro"
];
const INSPIRATION_OPTIONS = [
  "Floating crystal island",
  "Cyberpunk cityscape",
  "Ancient temple ruins",
  "Underwater coral reef",
  "Alien desert landscape"
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ChatbotUI() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState(MODEL_OPTIONS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showInspirationDropdown, setShowInspirationDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const closeMenus = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!target.parentElement?.closest(".chatbot-ui-dropdown")) {
        setShowModelDropdown(false);
        setShowInspirationDropdown(false);
      }
    };

    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let finalTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          if (event.results[index].isFinal) {
            finalTranscript += event.results[index][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue((previous) => previous + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (error) {
            console.error("Failed to restart recognition:", error);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.stop?.();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  function startRecording() {
    try {
      recognitionRef.current?.start?.();
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
    isRecordingRef.current = true;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordingTime((previous) => previous + 1);
    }, 1000);
  }

  function stopRecording() {
    isRecordingRef.current = false;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // Ignore stop errors from the Web Speech API.
    }
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  function handleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setUploadedFiles((previous) => [...previous, ...files]);
    }
    event.target.value = "";
  }

  function removeFile(index) {
    setUploadedFiles((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleSubmit() {
    const nextMessage = inputValue.trim();
    if (!nextMessage) return;

    setMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${previous.length}`,
        user: nextMessage
      }
    ]);
    setInputValue("");
    setShowModelDropdown(false);
    setShowInspirationDropdown(false);
  }

  const hasInput = inputValue.trim().length > 0;
  const hasMessages = messages.length > 0;
  const stageHeight = 560;
  const submittedPanelTop = 650;

  return (
    <div className="chatbot-ui-shell">
      <div className="chatbot-ui-ambient-glow" />

      <div
        style={{
          width: "100%",
          maxWidth: "780px",
          minHeight: `${stageHeight}px`,
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "stretch",
            transition: "opacity 0.35s ease",
            opacity: hasMessages ? 1 : 0,
            pointerEvents: hasMessages ? "auto" : "none"
          }}
        >
          {messages.map((message, index) => (
            <div
              key={`${message.id}-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  animation:
                    messages.length === 1 && index === 0
                      ? "messageInFirst 0.72s cubic-bezier(0.32, 0, 0.2, 1)"
                      : "messageIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)"
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "14px 18px",
                    borderRadius: "20px 20px 8px 20px",
                    background: "linear-gradient(135deg, rgba(90, 44, 252, 0.96) 0%, rgba(122, 89, 255, 0.92) 100%)",
                    color: "#ffffff",
                    fontSize: "15px",
                    lineHeight: "1.45",
                    letterSpacing: "-0.01em",
                    boxShadow: "0 14px 36px rgba(90, 44, 252, 0.24), 0 0 28px rgba(90, 44, 252, 0.12)"
                  }}
                >
                  {message.user}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  animation:
                    messages.length === 1 && index === 0
                      ? "messageInAiFirst 0.36s cubic-bezier(0.22, 1, 0.36, 1) 0.72s both"
                      : "messageInAi 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.32s both",
                  opacity: 0
                }}
              >
                <div
                  style={{
                    minWidth: "58px",
                    minHeight: "49px",
                    padding: "14px 18px",
                    borderRadius: "20px 20px 20px 8px",
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "conic-gradient(from 0deg, #5A2CFC 0deg, #8f72ff 130deg, #ffffff 240deg, #5A2CFC 360deg)",
                      animation: "aiSpinner 1.05s linear infinite",
                      position: "relative",
                      boxShadow: "0 0 18px rgba(90, 44, 252, 0.22)"
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "3px",
                        borderRadius: "50%",
                        background: "#1a1a1d"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: hasMessages ? `${submittedPanelTop - 64}px` : "calc(50% - 86px)",
            transform: hasMessages ? "translateY(-22px)" : "translateY(-50%)",
            transition:
              "top 0.82s cubic-bezier(0.32, 0, 0.2, 1), transform 0.82s cubic-bezier(0.32, 0, 0.2, 1), opacity 0.48s cubic-bezier(0.32, 0, 0.2, 1)",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            opacity: hasMessages ? 0 : 1
          }}
        >
          <div
            style={{
              color: "rgba(255, 255, 255, 0.78)",
              fontSize: "30px",
              fontWeight: "300",
              letterSpacing: "-0.02em",
              textAlign: "center",
              textShadow: "0 2px 18px rgba(0, 0, 0, 0.24)"
            }}
          >
            释放你的创作灵感
          </div>
        </div>

        <div
          style={{
            width: "100%",
            position: "absolute",
            left: 0,
            right: 0,
            top: hasMessages ? `${submittedPanelTop}px` : "50%",
            transform: "translateY(0)",
            background: "linear-gradient(135deg, rgba(35, 35, 35, 0.78) 0%, rgba(28, 28, 28, 0.88) 100%)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "20px 24px",
            transition: "top 0.82s cubic-bezier(0.32, 0, 0.2, 1), border-color 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)"
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.38)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />

          {uploadedFiles.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "12px"
              }}
            >
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    background: "rgba(50, 205, 50, 0.1)",
                    border: "1px solid rgba(50, 205, 50, 0.3)",
                    borderRadius: "8px",
                    maxWidth: "200px"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="#32CD32"
                      strokeWidth="1.2"
                      fill="none"
                    />
                    <path d="M8 2v3h3" stroke="#32CD32" strokeWidth="1.2" />
                  </svg>
                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <div
                      style={{
                        color: "#cccccc",
                        fontSize: "12px",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {file.name}
                    </div>
                    <div
                      style={{
                        color: "#888888",
                        fontSize: "10px"
                      }}
                    >
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="请告诉我您的想法..."
              rows={1}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "400",
                lineHeight: "1.5",
                fontFamily: "inherit",
                minHeight: "28px",
                padding: 0
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={toolbarSquareButtonStyle}
                onMouseEnter={raiseSquareButton}
                onMouseLeave={resetSquareButton}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round">
                  <line x1="10" y1="4" x2="10" y2="16" />
                  <line x1="4" y1="10" x2="16" y2="10" />
                </svg>
              </button>

              <div className="chatbot-ui-dropdown" style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowInspirationDropdown((value) => !value);
                    setShowModelDropdown(false);
                  }}
                  style={toolbarWideButtonStyle}
                  onMouseEnter={raiseWideButton}
                  onMouseLeave={resetWideButton}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8.5 1L3 9h4.5l-.5 6L13 7H8.5l.5-6z" fill="#8f78ff" stroke="#8f78ff" strokeWidth="0.5" />
                  </svg>
                  <span style={toolbarButtonTextStyle}>Inspiration</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showInspirationDropdown ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {showInspirationDropdown && (
                  <div style={dropdownMenuStyle(220)}>
                    {INSPIRATION_OPTIONS.map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          setInputValue(item);
                          setShowInspirationDropdown(false);
                        }}
                        style={dropdownItemStyle("#cccccc")}
                        onMouseEnter={highlightDropdownItem}
                        onMouseLeave={resetDropdownItem("#cccccc")}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="chatbot-ui-dropdown" style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModelDropdown((value) => !value);
                    setShowInspirationDropdown(false);
                  }}
                  style={toolbarWideButtonStyle}
                  onMouseEnter={raiseWideButton}
                  onMouseLeave={resetWideButton}
                >
                  <span style={toolbarButtonTextStyle}>{model}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showModelDropdown ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {showModelDropdown && (
                  <div style={dropdownMenuStyle(180)}>
                    {MODEL_OPTIONS.map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          setModel(item);
                          setShowModelDropdown(false);
                        }}
                        style={{
                          ...dropdownItemStyle(item === model ? "#8f78ff" : "#cccccc"),
                          fontWeight: item === model ? "500" : "400",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                        onMouseEnter={highlightDropdownItem}
                        onMouseLeave={resetDropdownItem(item === model ? "#8f78ff" : "#cccccc")}
                      >
                        {item}
                        {item === model && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="#8f78ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={toggleRecording}
                aria-pressed={isRecording}
                title={isRecording ? "Stop recording" : "Start recording"}
                style={{
                  ...toolbarRoundButtonStyle,
                  background: isRecording ? "linear-gradient(135deg, #ff4444 0%, #cc0000 100%)" : "rgba(55, 55, 55, 0.8)",
                  border: isRecording ? "2px solid rgba(255, 100, 100, 0.5)" : "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: isRecording ? "0 0 20px rgba(255, 68, 68, 0.4)" : "none",
                  animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none"
                }}
                onMouseEnter={(event) => {
                  if (!isRecording) {
                    event.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
                  }
                  event.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(event) => {
                  if (!isRecording) {
                    event.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
                  }
                  event.currentTarget.style.transform = "scale(1)";
                }}
              >
                {isRecording ? (
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "3px",
                      background: "#ffffff"
                    }}
                  />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="6" y="2" width="6" height="10" rx="3" fill="#999999" />
                    <path d="M4 8v1a5 5 0 0 0 10 0V8" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="9" y1="14" x2="9" y2="16" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>

              {isRecording && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    background: "rgba(255, 68, 68, 0.15)",
                    borderRadius: "20px",
                    border: "1px solid rgba(255, 68, 68, 0.3)"
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ff4444",
                      animation: "blink 1s ease-in-out infinite"
                    }}
                  />
                  <span
                    style={{
                      color: "#ff6666",
                      fontSize: "13px",
                      fontWeight: "500",
                      fontFamily: "monospace"
                    }}
                  >
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  ...toolbarRoundButtonStyle,
                  background: hasInput ? "#5A2CFC" : "rgba(75, 75, 75, 0.8)",
                  border: "none",
                  cursor: hasInput ? "pointer" : "default",
                  boxShadow: hasInput ? "0 4px 16px rgba(90, 44, 252, 0.34), 0 0 28px rgba(90, 44, 252, 0.22)" : "none"
                }}
                onMouseEnter={(event) => {
                  if (hasInput) {
                    event.currentTarget.style.transform = "scale(1.08)";
                    event.currentTarget.style.boxShadow = "0 6px 24px rgba(90, 44, 252, 0.42), 0 0 34px rgba(90, 44, 252, 0.28)";
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = "scale(1)";
                  event.currentTarget.style.boxShadow = hasInput
                    ? "0 4px 16px rgba(90, 44, 252, 0.34), 0 0 28px rgba(90, 44, 252, 0.22)"
                    : "none";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9 14V4M9 4L5 8M9 4L13 8"
                    stroke={hasInput ? "#ffffff" : "#666666"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const toolbarSquareButtonStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: "rgba(55, 55, 55, 0.8)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.2s ease"
};

const toolbarWideButtonStyle = {
  height: "44px",
  borderRadius: "12px",
  background: "rgba(55, 55, 55, 0.8)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "0 16px",
  cursor: "pointer",
  transition: "all 0.2s ease"
};

const toolbarRoundButtonStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  position: "relative"
};

const toolbarButtonTextStyle = {
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "500",
  letterSpacing: "-0.01em"
};

function dropdownMenuStyle(minWidth) {
  return {
    position: "absolute",
    bottom: "54px",
    left: 0,
    background: "rgba(40, 40, 40, 0.98)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "8px",
    minWidth: `${minWidth}px`,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(20px)",
    animation: "fadeIn 0.15s ease",
    zIndex: 5
  };
}

function dropdownItemStyle(color) {
  return {
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    color,
    fontSize: "14px",
    transition: "all 0.15s ease"
  };
}

function raiseSquareButton(event) {
  event.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
  event.currentTarget.style.transform = "scale(1.02)";
}

function resetSquareButton(event) {
  event.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
  event.currentTarget.style.transform = "scale(1)";
}

function raiseWideButton(event) {
  event.currentTarget.style.background = "rgba(70, 70, 70, 0.9)";
}

function resetWideButton(event) {
  event.currentTarget.style.background = "rgba(55, 55, 55, 0.8)";
}

function highlightDropdownItem(event) {
  event.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
  event.currentTarget.style.color = "#ffffff";
}

function resetDropdownItem(color) {
  return (event) => {
    event.currentTarget.style.background = "transparent";
    event.currentTarget.style.color = color;
  };
}
