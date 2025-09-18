const axios = require('axios');

const ARC_FACE_URL = process.env.ARC_FACE_URL || 'http://localhost:8000';

async function getEmbeddingFromService(imageBase64) {
  const { data } = await axios.post(`${ARC_FACE_URL}/embed`, { image_base64: imageBase64 }, { timeout: 15000 });
  if (!data || !Array.isArray(data.embedding)) {
    throw new Error('ArcFace: invalid response');
  }
  return { embedding: data.embedding, detScore: data.det_score };
}

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) return -1;
  let sum = 0;
  for (let i = 0; i < vecA.length; i += 1) sum += vecA[i] * vecB[i];
  return sum;
}

module.exports = { getEmbeddingFromService, cosineSimilarity };


