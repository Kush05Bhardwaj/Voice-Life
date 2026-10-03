# 🎙️ Voice → Life

> **Turn your voice into useful memories.**

Voice → Life is an open-source, local-first AI application that transforms voice notes into **structured, searchable memories and actionable information**.

Instead of letting important information get buried inside voice recordings, Voice → Life uses open-source AI to understand what was said, extract useful information, and let the user decide what should be remembered.

---

## ✨ What It Does

Give Voice → Life a voice note like:

> "Bro kal 11 baje Rahul ko internship ke documents bhej dena. Aur usko bol dena ki interview Monday ko hai."

It can turn that into:

```text
🔔 Task
Send internship documents

👤 Person
Rahul

📅 Event
Interview — Monday
```

The user can review the extracted information and choose what to save.

Later:

> **"What did I need to send Rahul?"**

Voice → Life can retrieve the relevant memory.

---

## 🎯 Core Idea

```text
🎙 Voice
   ↓
📝 Transcription
   ↓
🧠 AI Understanding
   ↓
🧩 Memory Extraction
   ↓
👤 User Confirmation
   ↓
💾 Memory
   ↓
🔎 Search / Ask
```

The goal is not to build another generic AI chatbot.

The goal is to build a **personal memory layer for information contained in voice**.

---

## 🚀 Features

### Current / MVP

- 🎙️ Record voice directly in the browser
- 📁 Upload voice recordings
- 📝 Speech-to-text transcription
- 🧠 Open-source AI understanding
- 🧩 Automatic extraction of:
  - Tasks
  - Events
  - People
  - Places
  - Important memories
- 👤 Human confirmation before saving
- 💾 Persistent memory storage
- 🕒 Memory timeline
- 🔎 Memory search
- 💬 Ask questions about saved memories

### Planned

- 🌍 Hinglish and multilingual support
- 📱 WhatsApp voice-message integration
- 🔔 Reminders and notifications
- 🧠 Semantic memory search
- 🔐 Stronger privacy and local-first capabilities
- 📦 Import/export of memories
- 🤝 Extensible input sources

---

## 🏗️ Architecture

```text
                    VOICE → LIFE
                         │
              ┌──────────┴──────────┐
              │                     │
          🎙 Record              📁 Upload
              │                     │
              └──────────┬──────────┘
                         ↓
                  Speech-to-Text
                     Whisper
                         ↓
                  AI Understanding
                    Open LLM
                         ↓
                 Memory Extraction
                         ↓
                  User Confirmation
                         ↓
                   Memory Storage
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
          Timeline                Search
                                    ↓
                              Ask Memories
```

The processing pipeline is designed to be **source-agnostic**, allowing future inputs such as WhatsApp voice messages to use the same core memory engine.

---

## 🛠️ Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI

### AI

- Whisper — Speech-to-text
- Open-weight LLM — Understanding & extraction

Potential model ecosystem:

- Qwen
- Gemma
- Llama

### Storage

- SQLite for the initial implementation

Additional infrastructure will only be introduced when needed.

---

## 🔐 Privacy

Voice recordings and personal memories can contain sensitive information.

Voice → Life is designed with a **local-first mindset**, prioritizing user control over their data.

The long-term goal is to support:

- Local AI inference
- Local memory storage
- Data export
- Data deletion
- User-controlled memory
- Minimal external data dependency

---

## 🧠 Human in the Loop

Voice → Life does not blindly save everything the AI extracts.

Instead:

```text
AI
 ↓
Extract information
 ↓
Suggest memory
 ↓
User reviews
 ↓
User decides
 ↓
Save
```

The user remains in control of what becomes a permanent memory.

---

## 🗺️ Roadmap

- [x] Project definition
- [x] Voice input
- [x] Speech-to-text
- [x] AI understanding
- [x] Memory extraction
- [x] Memory storage
- [x] Timeline
- [x] Search
- [ ] Ask Your Memories
- [ ] Multilingual / Hinglish
- [ ] WhatsApp integration
- [ ] Notifications
- [ ] Privacy improvements
- [ ] Production-ready release

---

## 🤝 Open Source

Voice → Life is being built as an open-source project.

Contributions, ideas, improvements, and experiments are welcome.

---

## 📌 Project Status

🚧 **Early Development**

The project is currently being developed from the ground up, starting with the core voice → memory pipeline.

---

## 📄 License

License will be added as the project reaches its initial release.
