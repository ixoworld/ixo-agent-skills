# VC PDF Renderer

Render W3C Verifiable Credentials as beautiful, print-ready PDF documents with embedded verification QR codes.

## Features

- 📄 **Two-Page Documents**: Certificate (A4 landscape) + Audit Trail (A4 portrait)
- 🔐 **Functional QR Codes**: Scannable by mobile camera AND clickable in browser
- ✅ **W3C VCDM 2.0 Compliant**: Full support for Verifiable Presentations
- 🖨️ **Print-Ready**: Optimized for A4 PDF output
- 🔍 **Transparent**: Full cryptographic proof details for auditability

## Quick Start

### 1. Prepare Your Credential

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential", "CourseCompletionCredential"],
  "issuer": {
    "id": "did:ixo:entity:abc123",
    "name": "Global Business Academy"
  },
  "credentialSubject": {
    "id": "did:ixo:person:xyz789",
    "name": "Alexandra Chen",
    "courseName": "Strategic Business Leadership"
  },
  "issuanceDate": "2024-01-26T10:00:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-26T10:00:00Z",
    "verificationMethod": "did:ixo:entity:abc123#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9..."
  }
}
```

### 2. Process Template

```typescript
import { processTemplate } from './scripts/template_processor';

const result = await processTemplate({
  credential,
  template: htmlTemplate,
  extraVars: {
    verificationUrl: 'https://verify.ixo.world/credentials?id=...',
    presentationDate: new Date().toISOString(),
    // ... other VP metadata
  }
});
```

### 3. Generate PDF

```typescript
import { renderCredentialPDF } from './scripts/render_vc_pdf';

const { pdf, cid, outputPath } = await renderCredentialPDF({
  credential,
  template,
  verificationEndpoint: 'https://verify.ixo.world/credentials'
});
```

## Document Output

### Page 1: Certificate (A4 Landscape)

A beautifully designed certificate featuring:
- Issuer branding and name
- Recipient name prominently displayed
- Credential details (course, grade, date, etc.)
- Signature blocks and official seal
- Decorative corner elements

### Page 2: Audit Trail (A4 Portrait)

A technical verification page including:
- **Verified Profiles**: Issuer and subject with names and DIDs
- **Verification Status**: Badge with registry check timestamp
- **Human-Readable Summary**: Plain-language explanation of the signature
- **Credential Timeline**: Issue → Sign → Present
- **VP Parameters**: Challenge and domain for replay protection
- **Cryptographic Proof**: Full proof details for auditability
- **QR Code**: Functional verification (scan or click)
- **Download JSON**: Raw credential for developers

## QR Code Verification

The QR code encodes a verification URL that works two ways:

1. **Mobile**: Open camera app → Scan QR → Tap notification → Opens IXO verification
2. **Browser**: Click QR code → Opens verification page in new tab

**Label**: "Scan with IXO Mobile to Verify"

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{credentialSubject.name}}` | Recipient name |
| `{{issuer.name}}` | Issuer name |
| `{{issuer.id}}` | Issuer DID |
| `{{issuanceDate}}` | Issue date |
| `{{proof.type}}` | Signature type |
| `{{proof.proofValue}}` | Digital signature |
| `{{verificationUrl}}` | QR code target URL |
| `{{vpChallenge}}` | Replay protection nonce |
| `{{vpDomain}}` | Verifier domain binding |
| `{{credentialJSON}}` | Full JSON for download |

See [SKILL.md](./SKILL.md) for complete variable reference.

## Print Settings

For best results when printing to PDF:

1. Open the HTML in Chrome
2. Press Ctrl/Cmd + P
3. Select "Save as PDF"
4. Enable "Background graphics"
5. Set margins to "None"
6. Page 1 will be landscape, Page 2 portrait

## Dependencies

- `qrcode` - QR code generation
- `puppeteer` - HTML to PDF rendering
- `multiformats` - IPFS CID generation
- `pdf-lib` - PDF manipulation

## License

MIT

## Credits

Built for [IXO World](https://ixo.world) - Building the Internet of Impact
