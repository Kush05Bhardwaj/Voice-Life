"use client";

import { useState, useRef, useEffect } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

interface ExtractedItem {
  type: string;
  text: string;
}

interface UnderstandingResult {
  summary: string;
  items: ExtractedItem[];
  error?: string;
}

interface MemoryCandidate {
  type: string;
  text: string;
  person: string | null;
  place: string | null;
  date: string | null;
  time: string | null;
  confidence: number | null;
}

interface UploadResponse {
  success: boolean;
  filename: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  transcript?: string;
  language?: string;
  language_probability?: number;
  duration?: number;
  transcription_error?: string;
  understanding?: UnderstandingResult;
  memory_candidates?: MemoryCandidate[];
}


export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>("Checking connection...");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMemoryIndices, setSavedMemoryIndices] = useState<Set<number>>(new Set());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message || "Connected"))
      .catch(() => setBackendStatus("Backend not reachable (run backend on port 8000)"));
  }, []);

  // Format recording timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start microphone recording
  const startRecording = async () => {
    setErrorMsg(null);
    setUploadResult(null);
    setSelectedFile(null);
    setRecordedBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Microphone access denied or unavailable";
      setErrorMsg(`Microphone error: ${message}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Handle local file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setUploadResult(null);
    setRecordedBlob(null);

    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  // Upload and Transcribe audio
  const handleProcessVoice = async () => {
    const audioToSend = selectedFile || recordedBlob;
    if (!audioToSend) {
      setErrorMsg("Please record audio or select a file first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile, selectedFile.name);
      } else if (recordedBlob) {
        formData.append("file", recordedBlob, `recording_${Date.now()}.webm`);
      }

      const res = await fetch(`${BACKEND_URL}/api/audio/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errDetail = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errDetail.detail || "Upload request failed");
      }

      const data: UploadResponse = await res.json();
      setUploadResult(data);
      setSavedMemoryIndices(new Set());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Processing error";
      setErrorMsg(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMemory = async (memory: MemoryCandidate, index: number) => {
    setSavingIndex(index);
    try {
      const res = await fetch(`${BACKEND_URL}/api/memories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memory),
      });
      if (!res.ok) {
        throw new Error("Failed to save memory to database");
      }
      setSavedMemoryIndices((prev) => new Set(prev).add(index));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save memory";
      setErrorMsg(message);
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 antialiased">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {backendStatus}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            🎙️ Voice → Life
          </h1>
          <p className="text-sm text-zinc-400">
            Phase 5: Audio → Whisper → AI → Memory Storage (SQLite)
          </p>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          
          {/* Record Section */}
          <div className="p-6 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex flex-col items-center gap-4">
            <span className="text-sm font-medium text-zinc-300">Option 1: Microphone</span>
            
            {isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-rose-500 font-mono text-lg font-bold animate-pulse">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  Recording: {formatTime(recordingDuration)}
                </div>
                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium transition cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  ⏹ Stop Recording
                </button>
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl font-medium transition cursor-pointer flex items-center gap-2"
              >
                🎙️ Start Recording
              </button>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500 font-semibold absolute">
              or
            </span>
          </div>

          {/* Upload Section */}
          <div className="p-6 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex flex-col items-center gap-4">
            <span className="text-sm font-medium text-zinc-300">Option 2: Upload File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl font-medium transition cursor-pointer flex items-center gap-2"
            >
              📁 Choose Audio File
            </button>
            {selectedFile && (
              <p className="text-xs text-zinc-400 font-mono">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Audio Preview */}
          {audioUrl && (
            <div className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/60 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Audio Preview
              </span>
              <audio controls src={audioUrl} className="w-full h-10" />
            </div>
          )}

          {/* Process / Transcribe Button */}
          {(recordedBlob || selectedFile) && (
            <button
              onClick={handleProcessVoice}
              disabled={isProcessing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl font-semibold transition cursor-pointer shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Transcribing Voice (Whisper)...
                </>
              ) : (
                "Process Voice (Transcribe)"
              )}
            </button>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-sm">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Transcript Display (Phase 2 core) */}
          {uploadResult?.transcript && (
            <div className="p-5 bg-zinc-950 rounded-xl border border-blue-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  📝 Transcript
                </span>
                {uploadResult.language && (
                  <span className="text-[11px] font-mono bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-400 border border-zinc-700/50">
                    Language: {uploadResult.language} ({((uploadResult.language_probability ?? 0) * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
              <p className="text-base text-zinc-100 font-sans leading-relaxed bg-zinc-900/80 p-4 rounded-lg border border-zinc-800/80">
                "{uploadResult.transcript}"
              </p>
            </div>
          )}

          {/* AI Understanding Display (Phase 3 core) */}
          {uploadResult?.understanding && (
            <div className="p-5 bg-zinc-950 rounded-xl border border-violet-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  🧠 AI Understanding
                </span>
                <span className="text-[11px] font-mono bg-violet-950/60 text-violet-300 border border-violet-800/50 px-2 py-0.5 rounded">
                  Ollama / Qwen
                </span>
              </div>

              {/* Summary */}
              {uploadResult.understanding.summary && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">Summary</span>
                  <p className="text-sm text-zinc-200 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80">
                    {uploadResult.understanding.summary}
                  </p>
                </div>
              )}

              {/* Extracted Items */}
              {uploadResult.understanding.items && uploadResult.understanding.items.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-400">Extracted Information</span>
                  <div className="grid gap-2">
                    {uploadResult.understanding.items.map((item, index) => {
                      const badgeColors: Record<string, string> = {
                        task: "bg-blue-950/80 text-blue-300 border-blue-800/60",
                        event: "bg-purple-950/80 text-purple-300 border-purple-800/60",
                        person: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
                        place: "bg-amber-950/80 text-amber-300 border-amber-800/60",
                        fact: "bg-cyan-950/80 text-cyan-300 border-cyan-800/60",
                        plan: "bg-indigo-950/80 text-indigo-300 border-indigo-800/60",
                        reminder: "bg-rose-950/80 text-rose-300 border-rose-800/60",
                      };
                      const colorClass = badgeColors[item.type.toLowerCase()] || "bg-zinc-800 text-zinc-300 border-zinc-700";

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/70"
                        >
                          <span className="text-sm text-zinc-200 font-sans">{item.text}</span>
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${colorClass}`}>
                            {item.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadResult?.transcription_error && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-300 text-xs font-mono">
              ⚠️ {uploadResult.transcription_error}
            </div>
          )}

          {/* Phase 4: Memory Candidates (awaiting confirmation) */}
          {uploadResult?.memory_candidates && uploadResult.memory_candidates.length > 0 && (
            <div className="p-5 bg-zinc-950 rounded-xl border border-emerald-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  📦 Memory Candidates
                </span>
                <span className="text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded">
                  {uploadResult.memory_candidates.length} candidate{uploadResult.memory_candidates.length !== 1 ? "s" : ""} · awaiting confirmation
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Review these memory candidates. Saving will be available in Phase 5.
              </p>
              <div className="space-y-3">
                {uploadResult.memory_candidates.map((mem, index) => {
                  const typeColors: Record<string, string> = {
                    task: "border-blue-700/60 bg-blue-950/30",
                    event: "border-purple-700/60 bg-purple-950/30",
                    person: "border-emerald-700/60 bg-emerald-950/30",
                    place: "border-amber-700/60 bg-amber-950/30",
                    fact: "border-cyan-700/60 bg-cyan-950/30",
                    plan: "border-indigo-700/60 bg-indigo-950/30",
                    reminder: "border-rose-700/60 bg-rose-950/30",
                  };
                  const typeBadge: Record<string, string> = {
                    task: "bg-blue-950 text-blue-300 border-blue-800",
                    event: "bg-purple-950 text-purple-300 border-purple-800",
                    person: "bg-emerald-950 text-emerald-300 border-emerald-800",
                    place: "bg-amber-950 text-amber-300 border-amber-800",
                    fact: "bg-cyan-950 text-cyan-300 border-cyan-800",
                    plan: "bg-indigo-950 text-indigo-300 border-indigo-800",
                    reminder: "bg-rose-950 text-rose-300 border-rose-800",
                  };
                  const typeKey = mem.type.toLowerCase().split("|")[0].trim();
                  const cardColor = typeColors[typeKey] || "border-zinc-700/60 bg-zinc-900/40";
                  const badgeColor = typeBadge[typeKey] || "bg-zinc-800 text-zinc-300 border-zinc-700";
                  const isSaved = savedMemoryIndices.has(index);
                  const isSavingThis = savingIndex === index;

                  return (
                    <div key={index} className={`p-4 rounded-xl border space-y-3 ${cardColor}`}>
                      {/* Type badge + text */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold shrink-0 mt-0.5 ${badgeColor}`}>
                            {typeKey}
                          </span>
                          <span className="text-sm text-zinc-100 leading-relaxed">{mem.text}</span>
                        </div>
                        <button
                          onClick={() => handleSaveMemory(mem, index)}
                          disabled={isSaved || isSavingThis}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${
                            isSaved
                              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 cursor-default"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                          }`}
                        >
                          {isSaved ? "✓ Saved" : isSavingThis ? "Saving..." : "Confirm & Save"}
                        </button>
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono pl-1">
                        {mem.person && <span>👤 {mem.person}</span>}
                        {mem.place && <span>📍 {mem.place}</span>}
                        {mem.date && <span>📅 {mem.date}</span>}
                        {mem.time && <span>🕐 {mem.time}</span>}
                        {mem.confidence !== null && (
                          <span className="ml-auto text-zinc-600">
                            {Math.round((mem.confidence ?? 0) * 100)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata Card */}
          {uploadResult && (
            <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs font-mono text-zinc-400 space-y-1">
              <div><span className="text-zinc-500">File ID:</span> {uploadResult.filename}</div>
              <div><span className="text-zinc-500">Size:</span> {(uploadResult.size_bytes / 1024).toFixed(1)} KB</div>
              {uploadResult.duration !== undefined && (
                <div><span className="text-zinc-500">Audio Duration:</span> {uploadResult.duration}s</div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
