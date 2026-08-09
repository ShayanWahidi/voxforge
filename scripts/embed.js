require('dotenv').config({ path: '../.env.local' });
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantClient } = require('@qdrant/js-client-rest');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function main() {
  const chunks = JSON.parse(fs.readFileSync('./dsa-chunks.json', 'utf-8'));
  console.log(`Loaded ${chunks.length} chunks`);

  const points = [];
  for (const chunk of chunks) {
    console.log(`Embedding chunk ${chunk.id}: ${chunk.topic}`);
    const result = await embedModel.embedContent(chunk.text);
    points.push({
      id: chunk.id,
      vector: result.embedding.values,
      payload: { text: chunk.text, topic: chunk.topic },
    });
  }

  const vectorSize = points[0].vector.length;
  console.log(`Vector size: ${vectorSize}`);

  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(c => c.name === 'dsa_notes');
  if (!exists) {
    await qdrant.createCollection('dsa_notes', {
      vectors: { size: vectorSize, distance: 'Cosine' },
    });
    console.log('Created collection dsa_notes');
  }

  await qdrant.upsert('dsa_notes', { points });
  console.log(`Upserted ${points.length} points into dsa_notes`);
}

main().catch(err => console.error(err));