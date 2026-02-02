/**
 * Template Processor for W3C Verifiable Credentials
 * Processes HTML templates with {{variable}} syntax using credential data
 * Supports QR code injection and VP metadata for audit trails
 */

export interface TemplateProcessorOptions {
  credential: any;
  template: string;
  extraVars?: Record<string, string>;
  warnOnMissing?: boolean;
}

export interface ProcessedTemplate {
  html: string;
  warnings: string[];
}

/**
 * Extract value from nested object using dot notation
 * Supports: credentialSubject.name, type.0, issuer.id
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (/^\d+$/.test(part)) {
      const index = parseInt(part, 10);
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
}

/**
 * Format value for display in HTML
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    if (value.name) return value.name;
    if (value.id) return value.id;
    return JSON.stringify(value);
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Format ISO date strings to readable format
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    }
  }
  
  if (value instanceof Date) {
    return value.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }
  
  return String(value);
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Get the specific credential type (excluding VerifiableCredential)
 */
export function getCredentialType(credential: any): string {
  const types = Array.isArray(credential.type) ? credential.type : [credential.type];
  return types.find((t: string) => t !== 'VerifiableCredential') || types[0];
}

/**
 * Build verification URL for IXO Portal
 */
export function buildVerificationUrl(
  endpoint: string,
  cid: string,
  credentialId: string
): string {
  const cleanEndpoint = endpoint.replace(/\/$/, '');
  return `${cleanEndpoint}?cid=${encodeURIComponent(cid)}&id=${encodeURIComponent(credentialId)}`;
}

/**
 * Generate VP metadata variables for audit trail
 */
export function generateVPMetadata(
  credential: any,
  verificationEndpoint: string,
  documentCID: string
): Record<string, string> {
  const verificationUrl = buildVerificationUrl(
    verificationEndpoint,
    documentCID,
    credential.id
  );
  
  const now = new Date();
  
  return {
    verificationUrl,
    presentationDate: now.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
    }),
    documentCID,
    statusCheckTime: now.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    }),
    statusListUrl: `https://registry.ixo.world/status/list/${documentCID.slice(0, 16)}`,
    issuerInitials: getInitials(credential.issuer?.name),
    subjectInitials: getInitials(credential.credentialSubject?.name),
    credentialType: getCredentialType(credential),
    vpChallenge: `${Date.now().toString(16)}-${Math.random().toString(36).slice(2, 10)}`,
    vpDomain: new URL(verificationEndpoint).hostname,
    credentialJSON: JSON.stringify(credential)
  };
}

/**
 * Process HTML template by replacing {{variable}} placeholders with credential data
 */
export function processTemplate(options: TemplateProcessorOptions): ProcessedTemplate {
  const { 
    credential, 
    template, 
    extraVars = {},
    warnOnMissing = true
  } = options;
  
  const warnings: string[] = [];
  const variablePattern = /\{\{([^}]+)\}\}/g;
  
  let processedHtml = template;
  const replacements = new Map<string, string>();
  
  // Add extra variables first (they take precedence)
  for (const [key, value] of Object.entries(extraVars)) {
    replacements.set(`{{${key}}}`, value);
  }
  
  // Find all template variables
  let match: RegExpExecArray | null;
  while ((match = variablePattern.exec(template)) !== null) {
    const fullMatch = match[0];
    const variablePath = match[1].trim();
    
    if (replacements.has(fullMatch)) {
      continue;
    }
    
    const value = getNestedValue(credential, variablePath);
    
    if (value === undefined && warnOnMissing) {
      warnings.push(`Template variable not found: {{${variablePath}}}`);
    }
    
    const formattedValue = formatValue(value);
    replacements.set(fullMatch, formattedValue);
  }
  
  // Apply all replacements
  for (const [placeholder, value] of replacements) {
    processedHtml = processedHtml.split(placeholder).join(value);
  }
  
  return {
    html: processedHtml,
    warnings
  };
}

/**
 * Validate HTML template structure
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!template.includes('<html') && !template.includes('<HTML')) {
    errors.push('Template should include <html> tag');
  }
  
  if (!template.includes('<body') && !template.includes('<BODY')) {
    errors.push('Template should include <body> tag');
  }
  
  // Check for unclosed template variables
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push(`Mismatched template braces: ${openBraces} opening {{ but ${closeBraces} closing }}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract all template variables from HTML template
 */
export function extractTemplateVariables(template: string): string[] {
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = variablePattern.exec(template)) !== null) {
    const variablePath = match[1].trim();
    if (!variables.includes(variablePath)) {
      variables.push(variablePath);
    }
  }
  
  return variables;
}
