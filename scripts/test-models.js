import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

const env = fs.readFileSync(envPath, 'utf8')
const apiKey = (env.match(/^GEMINI_API_KEY="?(.*?)"?\s*$/m) || [])[1]

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env.local')
  process.exit(1)
}

const models = ['gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-2.0-flash']

for (const model of models) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  console.log(`\n--- ${model} ---`)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello, respond in one sentence.' }] }],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.log(`FAILED (HTTP ${res.status}): ${body.slice(0, 400)}`)
      continue
    }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    console.log(`SUCCESS: "${text}"`)
    console.log(`MODEL_OK=${model}`)
    process.exit(0)
  } catch (err) {
    console.log(`FAILED (exception): ${err.message}`)
  }
}

console.log('\nAll three models failed.')
process.exit(1)
