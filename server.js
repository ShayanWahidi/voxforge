import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { QdrantClient } from '@qdrant/js-client-rest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
const chatModel = genAI.getGenerativeModel({
  model: 'gemini-3.5-flash',
  systemInstruction:
    'You are a spoken DSA tutor answering questions about binary search. Answer briefly and clearly in 2-4 sentences using the provided notes, since this will be read aloud. If the notes do not cover it, say so honestly instead of guessing.',
})

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
})

const RIME_URL = 'https://users.rime.ai/v1/rime-tts'
const COLLECTION = 'dsa_notes'
const PORT = 3001

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

app.post('/api/ask', async (req, res) => {
  try {
    const requestStart = Date.now()
    const { transcript, history = [] } = req.body || {}
    if (!transcript) {
      return res.status(400).json({ error: 'Missing transcript in request body' })
    }

    console.log(`[1/5] Embedding transcript: "${transcript}"`)
    const embedStart = Date.now()
    const embedResult = await embedModel.embedContent(transcript)
    const vector = embedResult.embedding.values
    const embeddingMs = Date.now() - embedStart
    console.log(`[1/5] Embedding done (vector size ${vector.length}, ${embeddingMs}ms)`)

    console.log('[2/5] Searching Qdrant dsa_notes...')
    const qdrantStart = Date.now()
    const search = await qdrant.query(COLLECTION, {
      query: vector,
      limit: 3,
      with_payload: true,
    })
    const matches = search.points || []
    const qdrantMs = Date.now() - qdrantStart
    console.log(`[2/5] Qdrant search done (${matches.length} matches, ${qdrantMs}ms)`)

    const context = matches
      .map((hit, i) => `--- Chunk ${i + 1} ---\n${hit.payload.text}`)
      .join('\n\n')

    const recentHistory = history.slice(-3).map(
      (h) => `User: ${h.question}\nTutor: ${h.answer}`
    )
    const historyBlock = recentHistory.length
      ? `\n\nRecent conversation:\n${recentHistory.join('\n')}`
      : ''

    const prompt = `Answer the student's question using only the notes below.

${context}${historyBlock}

Student question: ${transcript}`

    console.log('[3/5] Calling Gemini generateContent...')
    const geminiStart = Date.now()
    const chatResult = await chatModel.generateContent(prompt)
    const answerText = chatResult.response.text().trim()
    const geminiMs = Date.now() - geminiStart
    console.log(`[3/5] Gemini response received: "${answerText}" (${geminiMs}ms)`)

    console.log('[4/5] Calling Rime TTS...')
    const rimeStart = Date.now()
    const rimeRes = await fetch(RIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RIME_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        speaker: 'astra',
        text: answerText,
        modelId: 'coda',
        lang: 'en',
        samplingRate: 24000,
      }),
    })
    if (!rimeRes.ok) {
      const errBody = await rimeRes.text()
      throw new Error(`Rime API error ${rimeRes.status}: ${errBody}`)
    }
    const audioBuffer = Buffer.from(await rimeRes.arrayBuffer())
    const rimeMs = Date.now() - rimeStart
    console.log(`[4/5] Rime audio received (${audioBuffer.length} bytes, ${rimeMs}ms)`)

    const requestEnd = Date.now()
    const totalBackendMs = requestEnd - requestStart
    const timings = { embeddingMs, qdrantMs, geminiMs, rimeMs, totalBackendMs }
    console.log('[5/5] Sending response to client')
    console.log(timings)
    console.log(
      `[TIMING] embedding=${embeddingMs}ms qdrant=${qdrantMs}ms gemini=${geminiMs}ms rime=${rimeMs}ms total=${totalBackendMs}ms`
    )
    res.json({
      answerText,
      audioBase64: audioBuffer.toString('base64'),
      timings,
    })
  } catch (err) {
    console.error('[ERROR] /api/ask failed:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
