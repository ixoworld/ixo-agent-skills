/**
 * Main VC PDF Renderer
 * Orchestrates the complete workflow of rendering Verifiable Credentials as PDFs
 * 
 * Output: Two-page document
 * - Page 1: Certificate (A4 Landscape)
 * - Page 2: Audit Trail (A4 Portrait)
 */

import puppeteer from 'puppeteer';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { processTemplate, generateVPMetadata, validateTemplate } from './template_processor.js';
import { generateCID, getCIDFilename, generatePlaceholderCID } from './cid_generator.js';

export interface VerifiableCredential {
  '@context': string | string[];
  type: string | string[];
  credentialSubject: Record<string, any>;
  issuer: string | { id: string; name?: string; [key: string]: any };
  issuanceDate: string;
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  [key: string]: any;
}

export interface RenderOptions {
  credential: VerifiableCredential;
  template: string;
  verificationEndpoint: string;
  outputDir?: string;
  documentCID?: string; // Optional pre-generated CID
}

export interface RenderResult {
  success: boolean;
  pdfBuffer?: Buffer;
  htmlContent?: string;
  cid?: string;
  outputPath?: string;
  warnings?: string[];
  errors?: string[];
}

/**
 * Validate W3C Verifiable Credential structure
 */
function validateCredential(credential: VerifiableCredential): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!credential['@context']) {
    errors.push('Missing required field: @context');
  }
  
  if (!credential.type) {
    errors.push('Missing required field: type');
  } else {
    const types = Array.isArray(credential.type) ? credential.type : [credential.type];
    if (!types.includes('VerifiableCredential')) {
      errors.push('Credential type must include "VerifiableCredential"');
    }
  }
  
  if (!credential.credentialSubject) {
    errors.push('Missing required field: credentialSubject');
  }
  
  if (!credential.issuer) {
    errors.push('Missing required field: issuer');
  }
  
  if (!credential.issuanceDate) {
    errors.push('Missing required field: issuanceDate');
  }
  
  if (!credential.proof) {
    errors.push('Missing required field: proof');
  } else {
    if (credential.proof.type !== 'Ed25519Signature2020') {
      errors.push(`Unsupported proof type: ${credential.proof.type}. Expected Ed25519Signature2020`);
    }
    
    if (!credential.proof.verificationMethod) {
      errors.push('Proof missing verificationMethod');
    }
    
    if (!credential.proof.proofValue) {
      errors.push('Proof missing proofValue');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Render HTML to PDF using Puppeteer
 * Handles mixed page orientations (landscape + portrait)
 */
async function renderHTMLToPDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });
    
    // Generate PDF with default settings
    // Page orientation is controlled by CSS @page rules in the template
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Main rendering function
 */
export async function renderCredentialPDF(options: RenderOptions): Promise<RenderResult> {
  const {
    credential,
    template,
    verificationEndpoint,
    outputDir = '/mnt/user-data/outputs',
    documentCID
  } = options;
  
  const warnings: string[] = [];
  const errors: string[] = [];
  
  try {
    // Step 1: Validate credential
    console.log('Step 1: Validating credential...');
    const credentialValidation = validateCredential(credential);
    if (!credentialValidation.valid) {
      return {
        success: false,
        errors: credentialValidation.errors
      };
    }
    
    // Step 2: Validate template
    console.log('Step 2: Validating template...');
    const templateValidation = validateTemplate(template);
    if (!templateValidation.valid) {
      return {
        success: false,
        errors: templateValidation.errors
      };
    }
    
    // Step 3: Generate CID (or use placeholder for preview)
    console.log('Step 3: Generating document CID...');
    const cid = documentCID || generatePlaceholderCID();
    
    // Step 4: Generate VP metadata
    console.log('Step 4: Generating VP metadata...');
    const vpMetadata = generateVPMetadata(credential, verificationEndpoint, cid);
    
    // Step 5: Process template
    console.log('Step 5: Processing template...');
    const processed = processTemplate({
      credential,
      template,
      extraVars: vpMetadata,
      warnOnMissing: true
    });
    
    warnings.push(...processed.warnings);
    
    // Step 6: Render HTML to PDF
    console.log('Step 6: Rendering PDF...');
    const pdfBuffer = await renderHTMLToPDF(processed.html);
    
    // Step 7: Generate final CID from PDF
    console.log('Step 7: Generating final CID...');
    const finalCIDResult = await generateCID(pdfBuffer);
    const finalCID = finalCIDResult.cid;
    
    // Step 8: Save PDF
    console.log('Step 8: Saving PDF...');
    await mkdir(outputDir, { recursive: true });
    
    const filename = getCIDFilename(finalCID, 'pdf');
    const outputPath = join(outputDir, filename);
    
    await writeFile(outputPath, pdfBuffer);
    
    console.log(`✓ PDF rendered successfully: ${filename}`);
    console.log(`  CID: ${finalCID}`);
    
    if (warnings.length > 0) {
      console.log(`  Warnings: ${warnings.length}`);
      warnings.forEach(w => console.log(`    - ${w}`));
    }
    
    return {
      success: true,
      pdfBuffer,
      htmlContent: processed.html,
      cid: finalCID,
      outputPath,
      warnings
    };
    
  } catch (error) {
    console.error('Error rendering credential PDF:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Render HTML only (without PDF generation)
 * Useful for preview or browser-based rendering
 */
export async function renderCredentialHTML(options: Omit<RenderOptions, 'outputDir'>): Promise<RenderResult> {
  const {
    credential,
    template,
    verificationEndpoint,
    documentCID
  } = options;
  
  const warnings: string[] = [];
  
  try {
    // Validate credential
    const credentialValidation = validateCredential(credential);
    if (!credentialValidation.valid) {
      return {
        success: false,
        errors: credentialValidation.errors
      };
    }
    
    // Validate template
    const templateValidation = validateTemplate(template);
    if (!templateValidation.valid) {
      return {
        success: false,
        errors: templateValidation.errors
      };
    }
    
    // Generate CID
    const cid = documentCID || generatePlaceholderCID();
    
    // Generate VP metadata
    const vpMetadata = generateVPMetadata(credential, verificationEndpoint, cid);
    
    // Process template
    const processed = processTemplate({
      credential,
      template,
      extraVars: vpMetadata,
      warnOnMissing: true
    });
    
    warnings.push(...processed.warnings);
    
    return {
      success: true,
      htmlContent: processed.html,
      cid,
      warnings
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Batch render multiple credentials with the same template
 */
export async function renderCredentialBatch(
  credentials: VerifiableCredential[],
  template: string,
  verificationEndpoint: string,
  outputDir?: string
): Promise<RenderResult[]> {
  const results: RenderResult[] = [];
  
  for (let i = 0; i < credentials.length; i++) {
    console.log(`\nRendering credential ${i + 1}/${credentials.length}...`);
    
    const result = await renderCredentialPDF({
      credential: credentials[i],
      template,
      verificationEndpoint,
      outputDir
    });
    
    results.push(result);
  }
  
  return results;
}
