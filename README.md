# FRIZA

**StarForge Hackathon 2026 — Track: VoxForge — Route: Learning Out Loud**
**Team: AlgoRangers | Team Leader: Suman Saurav**

---

## AI VOICE ASSISTANT TUTOR THAT TEACHES DSA CONCEPTS (binary search only for now)

*Spoken Q&A tutor, single focused topic: binary search (including binary search on answers)*
*Student speaks a question → gets a spoken answer grounded in retrieved notes → can ask natural follow-ups.*

---

## Problem `[Students struggle to resolve academic doubts without interrupting their learning flow]`

*For Students who wants revision of dsa concepts HANDS_FREE like while exercising. Our voice-first AI combines Qdrant-powered retrieval with Rime TTS for instant spoken explanations.*

---

## Architecture

```
Student speaks (mic)
        │
        ▼
Speech recognition (browser-native Web Speech API)
        │
        ▼
Retrieval + reasoning
  ├─ Qdrant: dsa_notes collection (semantic search, top 2-3 matches)
  └─ Gemini 3.5 Flash (generates grounded, spoken-style answer)
  [all API keys held server-side — Vercel serverless function]
        │
        ▼
Voice output — Rime (Coda model)
        │
        ▼
Student hears reply (audio played in browser)
```

Session-only conversation memory (in-memory array, no persistent database) is
included in the Gemini prompt on each turn so follow-up questions stay coherent
within a session.

*(See attached `voxforge-architecture-diagram.png` for the visual version.)*

---

## How to run

**Prerequisites:** Node.js, a Rime API key, a Qdrant Cloud cluster + API key, a
Gemini API key.

**1. Clone and install**
```bash
git clone <repo-url>
cd <repo-folder>
npm install
```

**2. Environment variables**

Create `.env.local` in the project root:
```
GEMINI_API_KEY=
QDRANT_URL=
QDRANT_API_KEY=
RIME_API_KEY=
```

**3. Build the knowledge base (one-time)**
```bash
cd scripts
npm install
node embed.js
```
This embeds the binary search concept chunks in `scripts/dsa-chunks.json` and
upserts them into the Qdrant `dsa_notes` collection.

**4. Run locally**
```bash
npm run dev
```
Open the local URL shown in the terminal, in Chrome (Web Speech API requires it).

**5. Deploy**

Push to GitHub, connect the repo on Vercel, add the same four environment
variables in the Vercel project settings, deploy. The backend runs as a Vercel
serverless function (`api/ask.js`).

---

## Proof

**Measured latency** (screenshot included: `latency-panel-proof.png`):

| Stage | Time |
|---|---|
| Embedding | ~950ms |
| Qdrant search | ~720ms |
| Gemini reasoning | ~4,000ms |
| Rime TTS | ~6,200ms |
| Backend total | ~11,900ms |
| Network overhead | ~65ms |
| **Full round trip** | **~12,000ms** |

Gemini and Rime dominate the round trip; embedding + retrieval together are
under 2 seconds combined — the pipeline's own overhead is small relative to the
external API calls.

**Verified honest-failure behavior:** when asked a question outside the
`dsa_notes` knowledge base, the system explicitly states the topic isn't covered
rather than generating a plausible-sounding incorrect answer — tested directly,
not assumed.

**Verified conversational continuity:** follow-up questions referencing a prior
answer in the same session are answered coherently, using the in-memory history
array passed into each Gemini call.

---

## Tech anchor

- **Frontend:** React + Vite
- **Speech-to-text:** Browser-native Web Speech API (`webkitSpeechRecognition`) — no external STT service or key
- **Backend:** Vercel serverless function (`api/ask.js`); Express (`server.js`) retained for local development only
- **Retrieval:** Qdrant Cloud, collection `dsa_notes`, ~20 embedded concept chunks on binary search (including binary search on answers), cosine similarity
- **Reasoning:** `gemini-3.5-flash`
- **Embeddings:** `gemini-embedding-001` (used identically at knowledge-base build time and at query time)
- **Voice:** Rime, Coda model
- **Memory:** session-only, in-memory, not persisted

---

## Limitations

- **STT accuracy:** the Web Speech API sends audio to Google's servers for
  transcription (not local/offline despite no explicit API call in code), has no
  support for custom vocabulary hints, and can misinterpret domain-specific terms.
  Chosen deliberately for zero-setup speed over accuracy/control.
- **Full round-trip latency (~12s)** is slow for a live conversational feel,
  dominated by Gemini generation and Rime TTS response time rather than
  pipeline overhead.
- **Single-topic knowledge base** — currently scoped to binary search only, by
  design, to keep retrieval reliable within the build window. The pipeline
  (Qdrant + Gemini + Rime) generalizes to additional topics by extending the
  knowledge base, not by rebuilding the system.
- **No persistent memory** — conversation context resets when the session ends;
  there is no cross-session user memory or correction/deletion mechanism.
- **Model availability churn:** during development, the originally used Gemini
  model was blocked for new API keys ahead of its deprecation (confirmed via a
  live 404 from the API). Diagnosed by querying the API's own model list
  endpoint and switched to `gemini-3.5-flash`, a currently stable model.

---

## Team contributions

- **Suman Saurav** — Team Leader
- **Shayan Wahidi** — Product lead/tech lead
- **Hetal Patwal** — Design Lead
- **Anubhav Gupta** — research/content lead

**AI-assisted coding:** OpenCode (with Gemini) used throughout development for
implementation, debugging, and iteration, per the problem statement's explicit
allowance for AI-assisted coding tools.

---

## Demo

- **Live app:** https://friza-voxforge.vercel.app/
- **Full demo video:** attached in submission
- **Showcase clip:** attached in submission
