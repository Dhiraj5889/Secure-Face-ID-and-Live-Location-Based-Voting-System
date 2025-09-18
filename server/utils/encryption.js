const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    // GCM typically uses a 12-byte IV
    this.ivLength = 12;
    this.tagLength = 16;
  }

  // Generate a random encryption key
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  // Derive key from password using PBKDF2
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
  }

  // Normalize key into a 32-byte buffer suitable for AES-256
  normalizeKey(key) {
    if (Buffer.isBuffer(key)) {
      if (key.length === this.keyLength) return key;
      if (key.length > this.keyLength) return key.subarray(0, this.keyLength);
      const out = Buffer.alloc(this.keyLength);
      key.copy(out);
      return out;
    }
    if (typeof key === 'string') {
      // If hex-like and of correct size use it; otherwise derive via SHA-256
      const hexMatch = key.match(/^[0-9a-fA-F]{64}$/);
      if (hexMatch) return Buffer.from(key, 'hex');
      return crypto.createHash('sha256').update(key, 'utf8').digest();
    }
    throw new Error('Invalid key type');
  }

  // Encrypt data
  encrypt(text, key) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const keyBuf = this.normalizeKey(key);
      const cipher = crypto.createCipheriv(this.algorithm, keyBuf, iv, { authTagLength: this.tagLength });
      cipher.setAAD(Buffer.from('voting-system', 'utf8'));

      const ciphertextBuf = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      return {
        ciphertext: ciphertextBuf.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt data
  decrypt(encryptedData, key) {
    try {
      const { ciphertext, iv, tag } = encryptedData;
      const keyBuf = this.normalizeKey(key);
      const decipher = crypto.createDecipheriv(this.algorithm, keyBuf, Buffer.from(iv, 'hex'), { authTagLength: this.tagLength });
      decipher.setAAD(Buffer.from('voting-system', 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      const plaintextBuf = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]);
      return plaintextBuf.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Hash data using SHA-256
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Hash data using SHA-512
  hash512(data) {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  // Generate HMAC
  generateHMAC(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  // Verify HMAC
  verifyHMAC(data, key, hmac) {
    const expectedHmac = this.generateHMAC(data, key);
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
  }

  // Generate random salt
  generateSalt(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Encrypt vote data
  encryptVote(voteData, electionKey) {
    const voteString = JSON.stringify(voteData);
    const encrypted = this.encrypt(voteString, electionKey);
    const voteHash = this.hash(voteString);
    
    return {
      // Store as JSON string to fit schema String type
      encryptedVote: JSON.stringify(encrypted),
      voteHash: voteHash
    };
  }

  // Decrypt vote data (for audit purposes only)
  decryptVote(encryptedVote, electionKey) {
    const payload = typeof encryptedVote === 'string' ? JSON.parse(encryptedVote) : encryptedVote;
    const decryptedString = this.decrypt(payload, electionKey);
    return JSON.parse(decryptedString);
  }

  // Generate secure random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Create digital signature
  sign(data, privateKey) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'hex');
  }

  // Verify digital signature
  verify(data, signature, publicKey) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'hex');
  }
}

module.exports = new EncryptionService();
