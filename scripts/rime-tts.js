require('dotenv').config({ path: '../.env.local' });
const fs = require('fs');

const TEXT = 'Hello from Voxforge. This is a test of the Rime Coda text to speech model.';

const payload = JSON.stringify({
  speaker: 'astra',
  text: TEXT,
  modelId: 'coda',
  lang: 'en',
  samplingRate: 24000,
});

const start = process.hrtime.bigint();

async function main() {
  const res = await fetch('https://users.rime.ai/v1/rime-tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RIME_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: payload,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Rime API error ${res.status}: ${body}`);
  }

  let firstByteLogged = false;
  const chunks = [];
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.length) {
      chunks.push(Buffer.from(value));
      if (!firstByteLogged) {
        firstByteLogged = true;
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`First byte received after ${ms.toFixed(1)} ms`);
      }
    }
  }

  const audio = Buffer.concat(chunks);
  const out = 'rime-output.mp3';
  fs.writeFileSync(out, audio);
  console.log(`Saved ${audio.length} bytes to ${out}`);
}

main().catch(err => console.error(err));
