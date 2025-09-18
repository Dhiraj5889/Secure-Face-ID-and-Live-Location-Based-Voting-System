const sharp = require('sharp');
const { getEmbeddingFromService, cosineSimilarity } = require('./arcfaceClient');

const FACE_MODE = (process.env.FACE_MODE || 'ahash').toLowerCase(); // 'ahash' | 'arcface'
const ARC_DEFAULT_THRESHOLD = Number(process.env.ARC_SIM_THRESHOLD || 0.5);

class FaceService {
  // Convert base64 data URL to Buffer
  toBufferFromBase64(dataUrlOrBase64) {
    if (!dataUrlOrBase64) throw new Error('No face data');
    const cleaned = String(dataUrlOrBase64).replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    return Buffer.from(cleaned, 'base64');
  }

  async computeAverageHash(buffer) {
    // aHash: resize to 8x8 grayscale, compute mean, then bits
    const { data } = await sharp(buffer).grayscale().resize(8, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i];
    const avg = sum / data.length;
    let bits = '';
    for (let i = 0; i < data.length; i += 1) bits += data[i] > avg ? '1' : '0';
    // Convert 64 bits to hex (16 hex chars)
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = bits.slice(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex;
  }

  async generateFaceTemplateHash(faceData) {
    if (FACE_MODE === 'arcface') {
      const { embedding } = await getEmbeddingFromService(faceData);
      return JSON.stringify(embedding);
    }
    const buf = this.toBufferFromBase64(faceData);
    return this.computeAverageHash(buf);
  }

  hammingDistance(hexA, hexB) {
    if (!hexA || !hexB || hexA.length !== hexB.length) return Infinity;
    let dist = 0;
    for (let i = 0; i < hexA.length; i += 1) {
      const a = parseInt(hexA[i], 16);
      const b = parseInt(hexB[i], 16);
      dist += ((a ^ b).toString(2).match(/1/g) || []).length;
    }
    return dist;
  }

  async verifyFace(faceData, storedHash, toleranceBits = 16) {
    if (!storedHash) return false;
    if (FACE_MODE === 'arcface') {
      let stored;
      try { stored = Array.isArray(storedHash) ? storedHash : JSON.parse(storedHash); } catch (_) { return false; }
      const { embedding } = await getEmbeddingFromService(faceData);
      const sim = cosineSimilarity(embedding, stored);
      return sim >= ARC_DEFAULT_THRESHOLD;
    }
    const current = await this.generateFaceTemplateHash(faceData);
    const dist = this.hammingDistance(current, storedHash);
    return dist <= toleranceBits;
  }
}

module.exports = new FaceService();
