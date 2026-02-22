"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "https://study-mate-backend-zu9b.onrender.com";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

type UploadedFile = {
  name: string;
  chunks: number;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAsking]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.");
      return;
    }
    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        setUploadError(data.error);
      } else {
        setUploadedFiles((prev) => [
          ...prev,
          { name: file.name, chunks: data.chunks_stored },
        ]);
        setUploadSuccess(
          `"${file.name}" indexed with ${data.chunks_stored} chunks!`,
        );
        setTimeout(() => {
          setUploadSuccess("");
          setShowUploadModal(false);
        }, 2000);
      }
    } catch {
      setUploadError("Cannot connect to backend. Is it running on port 8000?");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
    };
    setMessages((p) => [...p, userMsg]);
    setQuestion("");
    setIsAsking(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`${API_BASE}/documents/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content }),
      });
      const data = await res.json();
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer || "No answer returned.",
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Could not reach the backend. Make sure it's running on port 8000.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Upload Modal */}
      {showUploadModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploadModal(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="animate-modal-in"
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "var(--brown-dark)",
              border: "1px solid var(--border-bright)",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow:
                "0 40px 80px rgba(0,0,0,0.6), 0 0 40px var(--orange-glow)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.6rem",
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  Add Document
                </h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    marginTop: "0.25rem",
                  }}
                >
                  PDF files are indexed and searchable instantly
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: "rgba(107,68,35,0.3)",
                  border: "none",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary)",
                  fontSize: "1.1rem",
                }}
              >
                ×
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? "var(--orange)" : "rgba(107,68,35,0.5)"}`,
                borderRadius: "14px",
                padding: "3rem 2rem",
                textAlign: "center",
                cursor: isUploading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                background: isDragging
                  ? "var(--orange-glow)"
                  : "rgba(0,0,0,0.2)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = "";
                }}
              />

              {isUploading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      border: "3px solid var(--brown-mid)",
                      borderTop: "3px solid var(--orange)",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Processing document...
                  </p>
                </div>
              ) : uploadSuccess ? (
                <div
                  className="animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: "var(--orange-glow-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    ✓
                  </div>
                  <p
                    style={{
                      color: "var(--orange-bright)",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                    }}
                  >
                    {uploadSuccess}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  {/* Big PDF Icon */}
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background:
                        "linear-gradient(135deg, var(--brown-mid), var(--brown-light))",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                      position: "relative",
                    }}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--orange)"
                      strokeWidth="1.5"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <p
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "1rem",
                        fontWeight: 500,
                      }}
                    >
                      Drop your PDF here
                    </p>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      or{" "}
                      <span
                        style={{
                          color: "var(--orange)",
                          textDecoration: "underline",
                        }}
                      >
                        browse files
                      </span>{" "}
                      from your computer
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    {["PDF only", "Any size", "Instant indexing"].map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: "rgba(107,68,35,0.3)",
                          color: "var(--text-secondary)",
                          padding: "0.2rem 0.7rem",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <p
                style={{
                  color: "#ff6b4a",
                  fontSize: "0.82rem",
                  marginTop: "0.75rem",
                  textAlign: "center",
                }}
              >
                ⚠ {uploadError}
              </p>
            )}

            {/* Already uploaded */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "0.6rem",
                  }}
                >
                  Indexed documents
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: "8px",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--orange)"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-primary)",
                            maxWidth: "240px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {f.chunks} chunks
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10,8,5,0.95)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, var(--orange), var(--orange-bright))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px var(--orange-glow-strong)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.15rem",
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              StudyMate <span style={{ color: "var(--orange)" }}>AI</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {uploadedFiles.length > 0 && (
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                background: "rgba(107,68,35,0.2)",
                padding: "0.3rem 0.7rem",
                borderRadius: "20px",
                border: "1px solid var(--border)",
              }}
            >
              {uploadedFiles.length} doc{uploadedFiles.length > 1 ? "s" : ""}{" "}
              ready
            </span>
          )}
          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadError("");
              setUploadSuccess("");
            }}
            style={{
              background:
                "linear-gradient(135deg, var(--orange), var(--orange-bright))",
              border: "none",
              borderRadius: "10px",
              padding: "0.5rem 1rem",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 12px var(--orange-glow-strong)",
              transition: "all 0.2s ease",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload PDF
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: "800px",
          width: "100%",
          margin: "0 auto",
          padding: "0 1rem",
        }}
      >
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem 0 1rem" }}>
          {messages.length === 0 ? (
            <div
              className="animate-fade-up"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "60vh",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              {/* Hero */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "22px",
                  background:
                    "linear-gradient(135deg, var(--brown-dark), var(--brown-mid))",
                  border: "1px solid rgba(107,68,35,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                  boxShadow:
                    "0 20px 40px rgba(0,0,0,0.4), 0 0 30px var(--orange-glow)",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                  color: "var(--text-primary)",
                  lineHeight: 1.15,
                  marginBottom: "0.75rem",
                }}
              >
                Ask anything about
                <br />
                <span style={{ color: "var(--orange)" }}>your documents</span>
              </h1>

              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "1rem",
                  maxWidth: "380px",
                  lineHeight: 1.6,
                  marginBottom: "2rem",
                }}
              >
                Upload a PDF and ask questions. Claude reads your document and
                gives precise, sourced answers.
              </p>

              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  background:
                    "linear-gradient(135deg, var(--orange), var(--orange-bright))",
                  border: "none",
                  borderRadius: "12px",
                  padding: "0.75rem 1.5rem",
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 8px 24px var(--orange-glow-strong)",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload your first document
              </button>

              {/* Divider */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  margin: "2.5rem 0 0",
                  width: "100%",
                  maxWidth: "360px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--border)",
                  }}
                />
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}
                >
                  HOW IT WORKS
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--border)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "1.5rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {[
                  { step: "01", label: "Upload PDF" },
                  { step: "02", label: "Ask questions" },
                  { step: "03", label: "Get answers" },
                ].map(({ step, label }) => (
                  <div
                    key={step}
                    style={{
                      background: "var(--brown-dark)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "0.75rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--orange)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {step}
                    </span>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="animate-fade-up"
                  style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    gap: "0.75rem",
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      flexShrink: 0,
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, var(--brown-mid), var(--brown-light))"
                          : "linear-gradient(135deg, var(--orange), var(--orange-bright))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "white",
                      boxShadow:
                        msg.role === "assistant"
                          ? "0 4px 12px var(--orange-glow)"
                          : "none",
                      marginTop: "2px",
                    }}
                  >
                    {msg.role === "user" ? "U" : "AI"}
                  </div>

                  {/* Bubble */}
                  <div style={{ maxWidth: "75%", minWidth: "80px" }}>
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.35rem",
                        textAlign: msg.role === "user" ? "right" : "left",
                      }}
                    >
                      {msg.role === "user" ? "You" : "StudyMate AI"}
                    </p>
                    <div
                      style={{
                        background:
                          msg.role === "user"
                            ? "linear-gradient(135deg, var(--brown-dark), var(--brown-mid))"
                            : "rgba(30,22,16,0.8)",
                        border: `1px solid ${msg.role === "user" ? "rgba(107,68,35,0.4)" : "rgba(107,68,35,0.2)"}`,
                        borderRadius:
                          msg.role === "user"
                            ? "14px 4px 14px 14px"
                            : "4px 14px 14px 14px",
                        padding: "0.85rem 1.1rem",
                        fontSize: "0.9rem",
                        lineHeight: 1.7,
                        color: "var(--text-primary)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                          marginTop: "0.5rem",
                        }}
                      >
                        {msg.sources.map((src, j) => (
                          <span
                            key={j}
                            style={{
                              fontSize: "0.72rem",
                              padding: "0.2rem 0.6rem",
                              borderRadius: "20px",
                              background: "var(--orange-glow)",
                              color: "var(--orange-bright)",
                              border: "1px solid rgba(232,93,4,0.2)",
                            }}
                          >
                            📄 {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAsking && (
                <div
                  className="animate-fade-in"
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      flexShrink: 0,
                      background:
                        "linear-gradient(135deg, var(--orange), var(--orange-bright))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "white",
                      boxShadow: "0 4px 12px var(--orange-glow)",
                      marginTop: "2px",
                    }}
                  >
                    AI
                  </div>
                  <div
                    style={{
                      background: "rgba(30,22,16,0.8)",
                      border: "1px solid rgba(107,68,35,0.2)",
                      borderRadius: "4px 14px 14px 14px",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`dot-${i + 1}`}
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "var(--orange)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "1rem 0 1.5rem",
            position: "sticky",
            bottom: 0,
            background:
              "linear-gradient(to top, var(--black) 70%, transparent)",
          }}
        >
          <div
            style={{
              background: "var(--brown-dark)",
              border: "1px solid var(--border-bright)",
              borderRadius: "16px",
              padding: "0.6rem 0.6rem 0.6rem 1.1rem",
              display: "flex",
              gap: "0.6rem",
              alignItems: "flex-end",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.4), 0 0 20px var(--orange-glow)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={question}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              disabled={isAsking}
              rows={1}
              placeholder={
                uploadedFiles.length === 0
                  ? "Upload a document first, then ask questions..."
                  : "Ask a question about your document..."
              }
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                resize: "none",
                fontSize: "0.93rem",
                color: "var(--text-primary)",
                fontFamily: "'Outfit', sans-serif",
                minHeight: "36px",
                maxHeight: "160px",
                lineHeight: 1.6,
                paddingTop: "4px",
              }}
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || isAsking}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                flexShrink: 0,
                background:
                  question.trim() && !isAsking
                    ? "linear-gradient(135deg, var(--orange), var(--orange-bright))"
                    : "var(--brown-mid)",
                border: "none",
                cursor:
                  question.trim() && !isAsking ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                boxShadow: question.trim()
                  ? "0 4px 12px var(--orange-glow-strong)"
                  : "none",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginTop: "0.5rem",
            }}
          >
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
