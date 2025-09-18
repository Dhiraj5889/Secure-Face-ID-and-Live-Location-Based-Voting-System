const crypto = require('crypto');

class FingerprintService {
  constructor() {
    this.algorithm = 'sha256';
  }

  // Generate fingerprint hash from biometric data
  generateFingerprintHash(biometricData) {
    try {
      // Normalize the biometric data
      const normalizedData = this.normalizeBiometricData(biometricData);
      
      // Create hash from normalized data
      const hash = crypto.createHash(this.algorithm);
      hash.update(normalizedData);
      
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Fingerprint hash generation failed: ${error.message}`);
    }
  }

  // Normalize biometric data for consistent hashing
  normalizeBiometricData(data) {
    if (typeof data === 'string') {
      return data.toLowerCase().trim();
    }
    
    if (typeof data === 'object') {
      // Sort object keys for consistent ordering
      const sortedKeys = Object.keys(data).sort();
      const normalizedObject = {};
      
      sortedKeys.forEach(key => {
        normalizedObject[key] = data[key];
      });
      
      return JSON.stringify(normalizedObject);
    }
    
    return String(data);
  }

  // Verify fingerprint against stored hash
  verifyFingerprint(biometricData, storedHash) {
    try {
      const currentHash = this.generateFingerprintHash(biometricData);
      return crypto.timingSafeEqual(
        Buffer.from(currentHash, 'hex'),
        Buffer.from(storedHash, 'hex')
      );
    } catch (error) {
      throw new Error(`Fingerprint verification failed: ${error.message}`);
    }
  }

  // Generate device fingerprint
  generateDeviceFingerprint(userAgent, screenResolution, timezone, language) {
    const deviceData = {
      userAgent: userAgent || '',
      screenResolution: screenResolution || '',
      timezone: timezone || '',
      language: language || '',
      timestamp: new Date().toISOString()
    };
    
    return this.generateFingerprintHash(deviceData);
  }

  // Extract fingerprint features from image data
  extractFingerprintFeatures(imageData) {
    try {
      // This is a simplified version - in a real implementation,
      // you would use proper biometric processing libraries
      const features = {
        imageHash: crypto.createHash('sha256').update(imageData).digest('hex'),
        size: imageData.length,
        timestamp: Date.now()
      };
      
      return features;
    } catch (error) {
      throw new Error(`Feature extraction failed: ${error.message}`);
    }
  }

  // Validate fingerprint quality
  validateFingerprintQuality(fingerprintData) {
    const qualityChecks = {
      hasMinLength: fingerprintData && fingerprintData.length > 10,
      hasValidFormat: /^[a-f0-9]+$/i.test(fingerprintData),
      isUnique: true // This would be checked against database
    };
    
    return Object.values(qualityChecks).every(check => check === true);
  }

  // Generate secure fingerprint token
  generateFingerprintToken(fingerprintHash, voterId) {
    const tokenData = {
      fingerprintHash,
      voterId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const tokenString = JSON.stringify(tokenData);
    return crypto.createHash('sha256').update(tokenString).digest('hex');
  }

  // Verify fingerprint token
  verifyFingerprintToken(token, expectedFingerprintHash, expectedVoterId) {
    try {
      // In a real implementation, you would store and verify tokens
      // This is a simplified version
      return token && expectedFingerprintHash && expectedVoterId;
    } catch (error) {
      return false;
    }
  }

  // Create biometric template
  createBiometricTemplate(rawBiometricData) {
    const template = {
      id: crypto.randomUUID(),
      hash: this.generateFingerprintHash(rawBiometricData),
      createdAt: new Date(),
      quality: this.validateFingerprintQuality(rawBiometricData) ? 'high' : 'medium'
    };
    
    return template;
  }

  // Match biometric templates
  matchBiometricTemplates(template1, template2, threshold = 0.95) {
    // Simplified matching - in reality, you'd use proper biometric matching algorithms
    const similarity = this.calculateSimilarity(template1.hash, template2.hash);
    return similarity >= threshold;
  }

  // Calculate similarity between two hashes
  calculateSimilarity(hash1, hash2) {
    if (hash1 === hash2) return 1.0;
    
    // Simple character-by-character comparison
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(hash1.length, hash2.length);
  }
}

module.exports = new FingerprintService();
