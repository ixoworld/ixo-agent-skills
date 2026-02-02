/**
 * QR Code Overlay Generator
 * Generates functional QR codes for IXO Mobile verification
 * Supports both PDF overlay and HTML embedding
 */

import QRCode from 'qrcode';
import { PDFDocument, rgb } from 'pdf-lib';

export interface QROverlayOptions {
  pdfBuffer: Buffer;
  verificationUrl: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: number; // in mm
  margin?: number; // in mm
  labelText?: string;
}

export interface QROverlayResult {
  pdfBuffer: Buffer;
  qrDataUrl: string;
  verificationUrl: string;
}

/**
 * Convert mm to PDF points (1mm = 2.83465 points)
 */
function mmToPoints(mm: number): number {
  return mm * 2.83465;
}

/**
 * Generate QR code as PNG buffer
 * Uses high error correction for logo overlay capability
 */
async function generateQRCodeBuffer(url: string, sizePixels: number): Promise<Buffer> {
  const qrOptions: QRCode.QRCodeToBufferOptions = {
    errorCorrectionLevel: 'H', // 30% recovery
    type: 'png',
    width: sizePixels,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };
  
  return await QRCode.toBuffer(url, qrOptions);
}

/**
 * Generate QR code as Data URL (for HTML embedding)
 */
export async function generateQRCodeDataUrl(
  url: string, 
  sizePixels: number = 200
): Promise<string> {
  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: sizePixels,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };
  
  return await QRCode.toDataURL(url, qrOptions);
}

/**
 * Generate QR code as SVG string (for HTML embedding)
 */
export async function generateQRCodeSVG(url: string): Promise<string> {
  const qrOptions: QRCode.QRCodeToStringOptions = {
    errorCorrectionLevel: 'H',
    type: 'svg',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };
  
  return await QRCode.toString(url, qrOptions);
}

/**
 * Calculate QR position on PDF page
 */
function calculateQRPosition(
  pageWidth: number,
  pageHeight: number,
  qrSize: number,
  margin: number,
  position: string
): { x: number; y: number } {
  const qrPoints = mmToPoints(qrSize);
  const marginPoints = mmToPoints(margin);
  
  switch (position) {
    case 'bottom-right':
      return {
        x: pageWidth - qrPoints - marginPoints,
        y: marginPoints
      };
    case 'bottom-left':
      return {
        x: marginPoints,
        y: marginPoints
      };
    case 'top-right':
      return {
        x: pageWidth - qrPoints - marginPoints,
        y: pageHeight - qrPoints - marginPoints
      };
    case 'top-left':
      return {
        x: marginPoints,
        y: pageHeight - qrPoints - marginPoints
      };
    default:
      return {
        x: pageWidth - qrPoints - marginPoints,
        y: marginPoints
      };
  }
}

/**
 * Add QR code overlay to PDF
 */
export async function addQROverlay(options: QROverlayOptions): Promise<QROverlayResult> {
  const {
    pdfBuffer,
    verificationUrl,
    position = 'bottom-right',
    size = 28,
    margin = 15,
    labelText = 'Scan with IXO Mobile to Verify'
  } = options;
  
  // Load existing PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Get first page
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();
  
  // Generate QR code
  const qrSizePixels = Math.floor(mmToPoints(size) * 3);
  const qrBuffer = await generateQRCodeBuffer(verificationUrl, qrSizePixels);
  
  // Embed QR code
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  
  // Calculate position
  const qrPosition = calculateQRPosition(
    pageWidth,
    pageHeight,
    size,
    margin,
    position
  );
  
  // Draw QR code
  const qrDimensions = mmToPoints(size);
  firstPage.drawImage(qrImage, {
    x: qrPosition.x,
    y: qrPosition.y,
    width: qrDimensions,
    height: qrDimensions
  });
  
  // Add label text
  const fontSize = 7;
  const textY = qrPosition.y - fontSize - 4;
  const charWidth = fontSize * 0.5;
  const textWidth = labelText.length * charWidth;
  const textX = qrPosition.x + (qrDimensions - textWidth) / 2;
  
  firstPage.drawText(labelText, {
    x: textX,
    y: textY,
    size: fontSize,
    color: rgb(0.35, 0.30, 0.24)
  });
  
  // Serialize PDF
  const modifiedPdfBuffer = Buffer.from(await pdfDoc.save());
  
  // Generate QR data URL for reference
  const qrDataUrl = await generateQRCodeDataUrl(verificationUrl, qrSizePixels);
  
  return {
    pdfBuffer: modifiedPdfBuffer,
    qrDataUrl,
    verificationUrl
  };
}

/**
 * Build verification URL for IXO Portal mobile app
 */
export function buildVerificationUrl(
  endpoint: string, 
  cid: string, 
  credentialId?: string
): string {
  const cleanEndpoint = endpoint.replace(/\/$/, '');
  let url = `${cleanEndpoint}?cid=${encodeURIComponent(cid)}`;
  
  if (credentialId) {
    url += `&id=${encodeURIComponent(credentialId)}`;
  }
  
  return url;
}

/**
 * Build deep link URL for IXO Mobile app
 */
export function buildIXOMobileDeepLink(
  cid: string,
  credentialId?: string
): string {
  let url = `ixo://verify?cid=${encodeURIComponent(cid)}`;
  
  if (credentialId) {
    url += `&id=${encodeURIComponent(credentialId)}`;
  }
  
  return url;
}
