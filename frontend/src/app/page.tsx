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

export type Memory = {
  id: number;
  type: string;
  text: string;
  person?: string | null;
  place?: string | null;
  date?: string | null;
  time?: string | null;
  created_at: string;
};

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

  // Timeline state (Phase 6)
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState<boolean>(false);

  // Search state (Phase 7)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/memories/search?query=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.memories)) {
        setSearchResults(data.memories);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  // Ask Your Memories state (Phase 8)
  const [askQuestion, setAskQuestion] = useState<string>("");
  const [askAnswer, setAskAnswer] = useState<string>("");
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [askedQuestion, setAskedQuestion] = useState<string>("");
  const [memoriesUsed, setMemoriesUsed] = useState<Memory[]>([]);

  const handleAsk = async () => {
    if (!askQuestion.trim()) return;

    setIsAsking(true);
    setAskAnswer("");
    setAskedQuestion(askQuestion.trim());
    setMemoriesUsed([]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/memories/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askQuestion.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAskAnswer(data.answer);
        setMemoriesUsed(data.memories_used || []);
      } else {
        setAskAnswer("Sorry, I could not answer that question.");
      }
    } catch (err) {
      console.error("Ask failed:", err);
      setAskAnswer("Error communicating with memory assistant.");
    } finally {
      setIsAsking(false);
    }
  };

  const fetchMemories = async () => {
    setIsLoadingMemories(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/memories/`);
      const data = await res.json();
      if (data.success && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  // Check backend health & fetch initial memories
  useEffect(() => {
    fetch(`${BACKEND_URL}/`)
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message || "Connected"))
      .catch(() => setBackendStatus("Backend not reachable (run backend on port 8000)"));

    fetchMemories();
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

  // Confirm and persist candidate to SQLite
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
      // Refresh timeline from database
      await fetchMemories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save memory";
      setErrorMsg(message);
    } finally {
      setSavingIndex(null);
    }
  };

  // Group timeline memories by date
  const groupMemoriesByDate = (items: Memory[]) => {
    const groups: Record<string, Memory[]> = {};
    for (const item of items) {
      // Prioritize target memory date, fallback to formatted created_at
      let groupKey = item.date;
      if (!groupKey) {
        try {
          groupKey = new Date(item.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          groupKey = "Undated";
        }
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    }
    return groups;
  };

  const memoryGroups = groupMemoriesByDate(memories);

  const badgeColors: Record<string, string> = {
    task: "bg-blue-950 text-blue-300 border-blue-800",
    event: "bg-purple-950 text-purple-300 border-purple-800",
    person: "bg-emerald-950 text-emerald-300 border-emerald-800",
    place: "bg-amber-950 text-amber-300 border-amber-800",
    fact: "bg-cyan-950 text-cyan-300 border-cyan-800",
    plan: "bg-indigo-950 text-indigo-300 border-indigo-800",
    reminder: "bg-rose-950 text-rose-300 border-rose-800",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-6 md:p-12 antialiased">
      <div className="w-full max-w-4xl space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {backendStatus}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            🎙️ Voice → Life
          </h1>
          <p className="text-sm text-zinc-400">
            Turn your voice into useful memories &amp; persistent timeline.
          </p>
        </div>

        {/* Top Input & Processing Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Voice Capture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Record Section */}
            <div className="p-6 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-center gap-4">
              <span className="text-sm font-medium text-zinc-300">Option 1: Microphone</span>
              {isRecording ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-rose-500 font-mono text-lg font-bold animate-pulse">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    {formatTime(recordingDuration)}
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

            {/* Upload Section */}
            <div className="p-6 bg-zinc-950/60 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-center gap-4">
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
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
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

          {/* Process Button */}
          {(recordedBlob || selectedFile) && (
            <button
              onClick={handleProcessVoice}
              disabled={isProcessing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl font-semibold transition cursor-pointer shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing Voice Pipeline (Whisper &amp; Ollama)...
                </>
              ) : (
                "Process Voice Note"
              )}
            </button>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-sm">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Transcript Display */}
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

          {/* Memory Candidates (Human confirmation) */}
          {uploadResult?.memory_candidates && uploadResult.memory_candidates.length > 0 && (
            <div className="p-5 bg-zinc-950 rounded-xl border border-emerald-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  📦 Extracted Memory Candidates
                </span>
                <span className="text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded">
                  {uploadResult.memory_candidates.length} candidate{uploadResult.memory_candidates.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Confirm which candidate items should be permanently preserved in your SQLite memory store.
              </p>
              <div className="space-y-3">
                {uploadResult.memory_candidates.map((mem, index) => {
                  const typeKey = mem.type.toLowerCase().split("|")[0].trim();
                  const badgeColor = badgeColors[typeKey] || "bg-zinc-800 text-zinc-300 border-zinc-700";
                  const isSaved = savedMemoryIndices.has(index);
                  const isSavingThis = savingIndex === index;

                  return (
                    <div key={index} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold shrink-0 mt-0.5 ${badgeColor}`}>
                            {typeKey}
                          </span>
                          <span className="text-sm text-zinc-100 leading-relaxed font-medium">{mem.text}</span>
                        </div>
                        <button
                          onClick={() => handleSaveMemory(mem, index)}
                          disabled={isSaved || isSavingThis}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${
                            isSaved
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60 cursor-default"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                          }`}
                        >
                          {isSaved ? "✓ Saved" : isSavingThis ? "Saving..." : "Confirm & Save"}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono pl-1">
                        {mem.person && <span>👤 {mem.person}</span>}
                        {mem.place && <span>📍 {mem.place}</span>}
                        {mem.date && <span>📅 {mem.date}</span>}
                        {mem.time && <span>🕐 {mem.time}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Phase 7: Search Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              🔎 Search Your Memories
            </h2>
            <p className="text-xs text-zinc-400">
              Keyword search across memory text, people, places, dates, and types.
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by person, keyword, place, or date (e.g. 'Rahul', 'interview')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="w-full px-4 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/80 transition"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-md shadow-blue-950/30 flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </button>
          </div>

          {/* Search Results Display */}
          {hasSearched && (
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Results for &ldquo;<span className="text-zinc-200 font-medium">{searchQuery}</span>&rdquo;
                </span>
                <span className="font-mono bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-400 border border-zinc-700/50">
                  {searchResults.length} match{searchResults.length !== 1 ? "es" : ""} found
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-6 text-center bg-zinc-950/40 rounded-xl border border-zinc-800/60 text-sm text-zinc-400">
                  No memories found matching &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.map((mem) => {
                    const typeKey = mem.type.toLowerCase().split("|")[0].trim();
                    const badgeColor = badgeColors[typeKey] || "bg-zinc-800 text-zinc-300 border-zinc-700";

                    return (
                      <div
                        key={mem.id}
                        className="p-4 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 rounded-xl space-y-2 transition shadow-sm"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold shrink-0 mt-0.5 ${badgeColor}`}>
                            {typeKey}
                          </span>
                          <h3 className="text-sm font-medium text-zinc-100 leading-snug">
                            {mem.text}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400 font-mono pt-1">
                          {mem.person && <span>👤 {mem.person}</span>}
                          {mem.place && <span>📍 {mem.place}</span>}
                          {mem.date && <span>📅 {mem.date}</span>}
                          {mem.time && <span>🕐 {mem.time}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phase 8: Ask Your Memories (Conversational AI Assistant) */}
        <div className="bg-zinc-900 border border-violet-800/40 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                🤖 Ask Your Memories
              </h2>
              <p className="text-xs text-zinc-400">
                Ask questions in plain English or Hinglish. Grounded strictly in your SQLite memories.
              </p>
            </div>
            <span className="text-[11px] font-mono bg-violet-950/80 text-violet-300 border border-violet-800/60 px-2.5 py-1 rounded-full">
              Phase 8 • MVP Complete
            </span>
          </div>

          {/* Question Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 'What did I need to send Rahul?' or 'What tasks do I have?'"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
              className="flex-1 px-4 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
            />
            <button
              onClick={handleAsk}
              disabled={isAsking || !askQuestion.trim()}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-md shadow-violet-950/40 flex items-center gap-2"
            >
              {isAsking ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Thinking...
                </>
              ) : (
                "Ask"
              )}
            </button>
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>Try:</span>
            {[
              "What did I need to send Rahul?",
              "When was Rahul's interview?",
              "What tasks do I have?",
              "What is my favorite Minecraft server?",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  setAskQuestion(chip);
                }}
                className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg transition text-left cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Answer Card */}
          {askAnswer && (
            <div className="p-5 bg-zinc-950 rounded-xl border border-violet-500/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  💬 Assistant Answer
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {memoriesUsed.length} source memor{memoriesUsed.length !== 1 ? "ies" : "y"} used
                </span>
              </div>

              <div className="text-sm text-zinc-100 bg-zinc-900/90 p-4 rounded-xl border border-zinc-800/80 leading-relaxed">
                {askAnswer}
              </div>

              {memoriesUsed.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono uppercase text-zinc-500">
                    Source context:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {memoriesUsed.map((m) => (
                      <span
                        key={m.id}
                        className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded-md"
                      >
                        #{m.id} {m.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phase 6: Timeline Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                📅 Your Memories Timeline
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Persistent memories stored in SQLite.
              </p>
            </div>
            <button
              onClick={fetchMemories}
              disabled={isLoadingMemories}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              {isLoadingMemories ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {memories.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3">
              <span className="text-3xl">📭</span>
              <p className="text-sm text-zinc-400">No memories stored yet.</p>
              <p className="text-xs text-zinc-500">
                Record or upload an audio clip above, confirm memory candidates, and they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(memoryGroups).map(([dateLabel, groupItems]) => (
                <div key={dateLabel} className="space-y-3">
                  {/* Date Heading */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-300 font-mono bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg">
                      {dateLabel}
                    </span>
                    <div className="h-px bg-zinc-800 flex-1" />
                    <span className="text-xs text-zinc-500 font-mono">
                      {groupItems.length} item{groupItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Memory Cards in Date Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 border-l-2 border-zinc-800/60 ml-2">
                    {groupItems.map((mem) => {
                      const typeKey = mem.type.toLowerCase().split("|")[0].trim();
                      const badgeColor = badgeColors[typeKey] || "bg-zinc-800 text-zinc-300 border-zinc-700";

                      return (
                        <div
                          key={mem.id}
                          className="p-4 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-xl space-y-2 transition shadow-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold shrink-0 mt-0.5 ${badgeColor}`}>
                              {typeKey}
                            </span>
                            <h3 className="text-sm font-medium text-zinc-100 leading-snug">
                              {mem.text}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400 font-mono pt-1">
                            {mem.person && <span>👤 {mem.person}</span>}
                            {mem.place && <span>📍 {mem.place}</span>}
                            {mem.time && <span>🕐 {mem.time}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
