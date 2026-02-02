---
name: vc-pdf-renderer
description: >
  Render W3C Verifiable Credentials and Verifiable Presentations as beautifully 
  formatted, print-ready PDF documents with embedded QR codes for mobile verification.
  Generates two-page documents: Page 1 is a human-friendly certificate (A4 landscape),
  Page 2 is a technical audit trail with Verifiable Presentation metadata (A4 portrait).
  Use when users need to:
  (1) Generate PDF certificates from JSON-LD Verifiable Credentials,
  (2) Create shareable/printable credential documents,
  (3) Render Verifiable Presentations with verification features,
  (4) Design custom certificate templates from visual examples,
  (5) Produce audit-ready documentation with cryptographic proof details.
---

# VC PDF Renderer

Server-side rendering of W3C Verifiable Credentials (VC Data Model 2.0) as professional, print-ready PDF documents with embedded verification QR codes for IXO Mobile app scanning.

## Document Structure

The skill generates a **two-page document**:

| Page | Orientation | Content |
|------|-------------|---------|
| **Page 1** | A4 Landscape (297mm × 210mm) | Human-friendly certificate |
| **Page 2** | A4 Portrait (210mm × 297mm) | Verifiable Presentation audit trail |

## Quick Start

```typescript
import { renderCredentialPDF } from './scripts/render_vc_pdf';

const result = await renderCredentialPDF({
  credential: vcJsonLd,
  template: htmlTemplate,
  verificationEndpoint: 'https://verify.ixo.world/credentials'
});

// Returns: { pdf: Buffer, cid: string, outputPath: string }
```

## Page 1: Certificate (A4 Landscape)

The certificate page is designed for:
- **Printing**: Optimized margins and sizing for A4 landscape
- **Display**: Elegant cream aesthetic with decorative corners
- **Readability**: Clear typography hierarchy

### Certificate Elements
- Issuer name and branding
- Recipient name (prominent display)
- Credential details (course name, description, grade, etc.)
- Signature blocks and official seal
- Issue date and credential ID

## Page 2: Verifiable Presentation Audit Trail (A4 Portrait)

The audit trail page provides trust, accessibility, and technical transparency.

### Verified Profiles
- **Issuer**: Name, avatar, and full DID identifier
- **Subject**: Name, avatar, and full DID identifier
- Replaces raw DID strings with human-readable profiles

### Verification Status
- **Status Badge**: "Credential Verified" with checkmark
- **Last Registry Check**: Timestamp of revocation check
- **Revocation Status**: Current status (Not Revoked / Revoked)
- **Status List Link**: Direct link to OCSP endpoint or Status List

### Human-Readable Summary
Explains what the cryptographic signature means in plain language:
> "This document was digitally signed by [Issuer Name] using a private key corresponding to their public DID. Any tampering with the data would invalidate this signature."

### Credential Lifecycle Timeline
Vertical timeline with icons showing:
1. **📄 Credential Issued** - When and by whom
2. **✓ Digitally Signed** - Proof creation timestamp
3. **📤 Presentation Generated for Verifier** - VP creation (transient wrapper)

### Replay Attack Protection (W3C VCDM 2.0)
- **Challenge**: One-time nonce preventing replay attacks
- **Domain**: Verifier domain binding

### Cryptographic Proof Details
- Proof Type (Ed25519Signature2020)
- Proof Purpose (assertionMethod)
- Verification Method (DID + key ID)
- Proof Value (full digital signature)

### Linked Data Context
Clickable links to @context files:
- W3C Credentials v2
- VC Examples v2
- Ed25519 2020 Suite

### Verification Section
- **Functional QR Code**: Scannable by mobile camera AND clickable in browser
- **Label**: "Scan with IXO Mobile to Verify"
- **Verification URL**: Displayed and clickable
- **Two Methods**:
  1. Mobile: Scan QR with phone camera
  2. Browser: Click QR code directly

### Developer Actions
- **Download JSON**: Downloads raw credential JSON-LD
- **Verify Online**: Opens verification portal

## Template Format

HTML/CSS templates with Handlebars-style variable injection:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: A4 landscape; margin: 0; }
    /* Certificate styles */
  </style>
</head>
<body>
  <!-- Page 1: Certificate -->
  <div class="certificate-page">
    <h1>{{credentialSubject.name}}</h1>
    <p>Issued by {{issuer.name}}</p>
  </div>
  
  <!-- Page 2: Audit Trail -->
  <div class="page-break"></div>
  <div class="audit-page">
    <!-- Verification QR, timeline, proof details -->
  </div>
</body>
</html>
```

### Supported Variables

**Root Properties:**
- `{{id}}` - Credential ID
- `{{type}}` - Credential type(s)
- `{{issuanceDate}}` - Issue date
- `{{expirationDate}}` - Expiration date

**Issuer Properties:**
- `{{issuer.name}}` - Issuer name
- `{{issuer.id}}` - Issuer DID

**Credential Subject:**
- `{{credentialSubject.name}}` - Recipient name
- `{{credentialSubject.id}}` - Subject DID
- `{{credentialSubject.*}}` - Any custom field

**Proof Properties:**
- `{{proof.type}}` - Signature type
- `{{proof.created}}` - Signature timestamp
- `{{proof.verificationMethod}}` - DID + key ID
- `{{proof.proofPurpose}}` - Purpose
- `{{proof.proofValue}}` - Signature value

**Presentation Metadata:**
- `{{verificationUrl}}` - Full verification URL
- `{{presentationDate}}` - VP generation timestamp
- `{{documentCID}}` - IPFS CID of the document
- `{{vpChallenge}}` - Replay protection nonce
- `{{vpDomain}}` - Verifier domain binding
- `{{statusCheckTime}}` - Last revocation check
- `{{statusListUrl}}` - Status List endpoint

**Helper Variables:**
- `{{issuerInitials}}` - Issuer name initials
- `{{subjectInitials}}` - Subject name initials
- `{{credentialType}}` - Specific credential type
- `{{credentialJSON}}` - Full JSON for download

## QR Code Specification

The QR code is **functional** and verifiable via:
1. **Mobile camera app** - Scan and tap notification
2. **Browser click** - Click QR to open verification page

### Technical Specs:
- **Error Correction**: Level H (30% recovery)
- **Size**: 28mm × 28mm minimum
- **Content**: `{endpoint}?cid={ipfs_cid}&id={credential_id}`
- **Label**: "Scan with IXO Mobile to Verify"

### Verification Flow
1. User scans/clicks QR code
2. IXO Mobile app or browser opens verification URL
3. Verifier initiates Verifiable Presentation request
4. Credential signature validated
5. Status List checked for revocation
6. Result displayed to user

## Print Specifications

### Page 1 (Certificate)
- **Size**: A4 Landscape (297mm × 210mm)
- **Margins**: 10mm padding
- **Safe Area**: Content within 15mm from edges
- **Typography**: Georgia serif, 36pt title, 32pt recipient name

### Page 2 (Audit Trail)
- **Size**: A4 Portrait (210mm × 297mm)
- **Margins**: 12mm × 15mm padding
- **Typography**: System sans-serif, 9pt base

## IPFS CID Generation

Content Identifiers using IPFS multihash:
- **Hash**: SHA-256
- **CID Version**: 1
- **Codec**: raw (0x55)
- **Encoding**: Base32
- **Example**: `bafkreihqz5vwyqpt6zlvp5lx5bnk7qhx6xqzx7...`

## Proof Validation

Expected credential structure with Ed25519Signature2020:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://www.w3.org/ns/credentials/examples/v2"
  ],
  "type": ["VerifiableCredential", "CourseCompletionCredential"],
  "issuer": {
    "id": "did:ixo:entity:...",
    "name": "Issuer Organization"
  },
  "credentialSubject": {
    "id": "did:ixo:person:...",
    "name": "Recipient Name"
  },
  "issuanceDate": "2024-01-26T10:00:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-26T10:00:00Z",
    "verificationMethod": "did:ixo:entity:...#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9SkqZMVPxAQpic7ndTfczFzP..."
  }
}
```

## File Structure

```
/mnt/skills/user/vc-pdf-renderer/
├── SKILL.md                    # This documentation
├── README.md                   # Quick start guide
├── scripts/
│   ├── render_vc_pdf.ts        # Main rendering orchestrator
│   ├── template_processor.ts   # Handlebars variable injection
│   ├── cid_generator.ts        # IPFS CID generation
│   └── qr_overlay.ts           # QR code generation
├── templates/
│   └── vc_certificate.html     # Default two-page template
└── assets/
    └── ixo-logo.png            # IXO branding assets
```

## Usage Examples

### Basic Rendering

```typescript
import { renderCredentialPDF } from './scripts/render_vc_pdf';
import { readFileSync } from 'fs';

const credential = JSON.parse(readFileSync('credential.json', 'utf-8'));
const template = readFileSync('templates/vc_certificate.html', 'utf-8');

const result = await renderCredentialPDF({
  credential,
  template,
  verificationEndpoint: 'https://verify.ixo.world/credentials'
});

console.log('PDF saved:', result.outputPath);
console.log('CID:', result.cid);
```

### Template Processing Only

```typescript
import { processTemplate } from './scripts/template_processor';

const extraVars = {
  verificationUrl: 'https://verify.ixo.world/credentials?id=...',
  presentationDate: new Date().toISOString(),
  documentCID: 'bafkrei...',
  vpChallenge: 'abc123',
  vpDomain: 'verify.ixo.world',
  issuerInitials: 'GA',
  subjectInitials: 'AC',
  credentialType: 'CourseCompletionCredential',
  credentialJSON: JSON.stringify(credential)
};

const { html, warnings } = await processTemplate({
  credential,
  template,
  extraVars
});
```

### Batch Rendering

```typescript
import { renderCredentialBatch } from './scripts/render_vc_pdf';

const credentials = [credential1, credential2, credential3];
const results = await renderCredentialBatch(
  credentials,
  template,
  'https://verify.ixo.world/credentials'
);
```

## Error Handling

The skill validates:
- JSON-LD context presence
- Required VC fields (type, credentialSubject, proof)
- Ed25519Signature2020 proof format
- Template variable references (warns if undefined)
- HTML template structure
- QR code URL validity

## Browser Compatibility

The generated HTML works in:
- Chrome/Chromium (recommended for PDF generation)
- Firefox
- Safari
- Edge

Print-to-PDF produces best results in Chrome with "Background graphics" enabled.

## Changelog

### v2.0.0
- Two-page document structure (certificate + audit trail)
- A4 landscape certificate, A4 portrait audit trail
- Verified Profiles replacing raw DIDs
- Enhanced verification status with registry check timestamp
- Human-readable signature summary
- Vertical credential lifecycle timeline
- VP challenge/domain parameters for replay protection
- Linked Data Context links
- Download JSON button (Blob API)
- Clickable + scannable QR code
- "Scan with IXO Mobile to Verify" label

### v1.0.0
- Initial release
- Single-page certificate with QR overlay
