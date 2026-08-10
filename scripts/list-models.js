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

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
const res = await fetch(url)

if (!res.ok) {
  console.error(`API error ${res.status}: ${await res.text()}`)
  process.exit(1)
}

const data = await res.json()
const models = (data.models || [])
  .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
  .map((m) => m.name.replace(/^models\//, ''))
  .sort()

console.log(`Found ${models.length} models supporting generateContent:`)
console.log(models.join('\n'))
