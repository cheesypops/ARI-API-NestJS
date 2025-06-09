import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoUtil {
  private algorithm = 'aes-256-cbc';
  private keyLength = 32; // AES-256 key length

  encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipherKey = crypto.scryptSync(key, 'salt', this.keyLength); // Derive key
    const cipher = crypto.createCipheriv(this.algorithm, cipherKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`; // Store IV with encrypted data
  }

  decrypt(encryptedText: string, key: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const cipherKey = crypto.scryptSync(key, 'salt', this.keyLength);
    const decipher = crypto.createDecipheriv(this.algorithm, cipherKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}