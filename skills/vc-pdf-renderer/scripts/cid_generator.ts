/**
 * IPFS CID Generator
 * Generates Content Identifiers (CID) for PDF files using multihash
 */

import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import * as raw from 'multiformats/codecs/raw';
import { createHash } from 'crypto';

export interface CIDResult {
  cid: string;
  hash: Uint8Array;
  multihash: string;
}

/**
 * Generate IPFS CID v1 for a buffer using SHA-256
 * 
 * CID v1 format:
 * - Version: 1
 * - Codec: raw (0x55)
 * - Hash function: SHA-256
 * - Encoding: base32
 */
export async function generateCID(buffer: Buffer): Promise<CIDResult> {
  // Calculate SHA-256 hash
  const hash = createHash('sha256').update(buffer).digest();
  
  // Create multihash digest
  const multihashDigest = await sha256.digest(new Uint8Array(hash));
  
  // Create CID v1 with raw codec
  const cid = CID.create(1, raw.code, multihashDigest);
  
  // Encode as base32 (default for CID v1)
  const cidString = cid.toString();
  
  return {
    cid: cidString,
    hash: new Uint8Array(hash),
    multihash: multihashDigest.bytes.toString()
  };
}

/**
 * Verify CID matches buffer content
 */
export async function verifyCID(buffer: Buffer, cidString: string): Promise<boolean> {
  try {
    const result = await generateCID(buffer);
    return result.cid === cidString;
  } catch (error) {
    return false;
  }
}

/**
 * Parse CID string and extract hash information
 */
export function parseCID(cidString: string): {
  version: number;
  codec: number;
  hashFunction: string;
} | null {
  try {
    const cid = CID.parse(cidString);
    
    return {
      version: cid.version,
      codec: cid.code,
      hashFunction: cid.multihash.code === 0x12 ? 'SHA-256' : 'Unknown'
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate filename from CID
 */
export function getCIDFilename(cid: string, extension: string = 'pdf'): string {
  return `${cid}.${extension}`;
}

/**
 * Generate a placeholder CID for preview purposes
 * Uses current timestamp and random data
 */
export function generatePlaceholderCID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `bafkrei${timestamp}${random}placeholder`;
}
