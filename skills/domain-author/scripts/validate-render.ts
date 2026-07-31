#!/usr/bin/env node
/**
 * Validate domain-author separation and persistence invariants.
 *
 * Usage:
 *   npx tsx scripts/validate-render.ts <root> --mode derived \
 *     --expected-class <protocol-did> --expected-profile authoring_draft
 */

import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { Buffer } from "node:buffer";
import {
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import {
  basename,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { isAlias, parseDocument, visit } from "yaml";

const FRONTMATTER_BLOCK = /^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)/s;
const AUTHOR_PLACEHOLDER = /\{\{[^{}\n]+\}\}/;
const PUBLISH_PLACEHOLDER = /<<FILL_AT_PUBLISH:[A-Za-z0-9_.-]+>>/;
const TEXT_SUFFIXES = new Set([".md", ".yaml", ".yml", ".json", ".tmpl", ".txt"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DOMAIN_BYTES = 1024 * 1024;
const MAX_YAML_DEPTH = 64;
const MAX_YAML_NODES = 10_000;
const VALIDATOR_VERSION = "1.0.0-rc.3";
const DOMAIN_SCHEMA_PATH = resolve(__dirname, "../references/domain-md.schema.json");
const CONSTITUTION_NAMESPACE = "https://w3id.org/ixo/vocab/v1/constitution#";
const CONSTITUTIONAL_ARCHETYPES = new Set([
  "Stewarded",
  "Owned",
  "Managed",
  "Governed",
  "Regulated",
  "Verified",
  "Settled",
]);
const CONSTITUTION_TYPES = new Set([
  "OperationalConstitution",
  "PersonalConstitution",
  "AssetConstitution",
  "FinancialSubjectConstitution",
  "WorkConstitution",
  "ServiceConstitution",
  "OracleConstitution",
  "InformationSubjectConstitution",
  "PlaceConstitution",
  "BiologicalSubjectConstitution",
  "NetworkConstitution",
  "StateConstitution",
  "InternationalOrganizationConstitution",
  "OrganizationalConstitution",
  "CorporateConstitution",
  "TrustConstitution",
  "CooperativeConstitution",
  "PartnershipConstitution",
  "FoundationConstitution",
  "PublicBodyConstitution",
  "ProjectConstitution",
  "ProtocolConstitution",
  "DAOConstitution",
  "AgenticConstitution",
  "SchemeConstitution",
]);
// Exact ConstitutionalSubject class catalogue from ixofoundation/ns
// a85b26612e097f2004ca7ec5fdc67129d12f1038:vocab/v1/constitution/subjects.jsonld.
const CONSTITUTIONAL_SUBJECT_TYPES = new Set(
  `Thing Entity Event Process Relationship InformationObject NormativeObject Capability ConstitutionalSubject
Person Organization Asset Commodity FinancialInstrument PropertyRight Agreement
Deed Project Work Protocol Service Oracle Claim Credential Evidence Decision Outcome Place BiologicalEntity
Network NaturalPerson ArtificialPerson DigitalPerson CollectivePerson Company Partnership Cooperative
Association Foundation Trust DAO Government InternationalOrganization PhysicalAsset DigitalAsset
FinancialAsset NaturalAsset InfrastructureAsset KnowledgeAsset IntangibleAsset DeliveryVehicle GPU SolarFarm
Hospital Forest Building ArtisanalGold PatentAsset Battery MachineTool FishingVessel DataCentre EnergyCommodity
AgriculturalCommodity MineralCommodity DigitalComputeCommodity GoldCommodity CoffeeCommodity CarbonCommodity
ElectricityCommodity GPUHours BandwidthCommodity FreshWaterCommodity Investment Bond Equity SAFE ConvertibleNote
Loan Mortgage InsurancePolicy Option Future CarbonCredit BiodiversityCredit Stablecoin CBDC SecurityToken Title
Lease LicenseRight PermitRight Concession MiningRight FishingRight SpectrumRight EmissionAllowance PatentRight
TrademarkRight CopyrightRight Contract ServiceAgreement EmploymentContract PurchaseAgreement OptionAgreement
EscrowAgreement SupplyAgreement LicenseAgreement CollectiveBargainingAgreement PropertyDeed MiningDeed
ConservationDeed GiftDeed SettlementDeed MortgageDeed GrantDeed Programme Mission Campaign Initiative
ConstructionProject ResearchProject HumanitarianProject Task Job Assignment Workflow Flow DeedWork Milestone
Deliverable BlockchainProtocol CommunicationProtocol GovernanceProtocol EvaluationProtocol SettlementProtocol
MedicalProtocol ClinicalGuideline SecurityProtocol ProfessionalService OracleService EvaluationService
VerificationService PaymentService HostingService HumanOracle AIOracle SensorOracle InstitutionalOracle
CompositeOracle MarketOracle ScientificOracle FactClaim MeasurementClaim OwnershipClaim IdentityClaim
EmploymentClaim ComplianceClaim ImpactClaim ScientificClaim MedicalClaim ScientificHypothesis LicenseCredential
Certification PermitCredential Degree Passport Visa ProfessionalRegistration VerifiableCredential Observation
DocumentEvidence Photograph Telemetry SensorReading WitnessStatement EvaluationReport LaboratoryResult Approval
Rejection Allocation Judgement Classification Diagnosis SettlementDecision Award EmploymentOutcome
EmissionReduction DiseaseElimination InfrastructureBuilt PaymentCompleted TrainingCompleted CarbonRemoved
Jurisdiction ProtectedArea Farm Mine Factory Warehouse City Watershed MarineReserve Patient Population Species
Pathogen Ecosystem Crop Livestock DiseaseOutbreak SupplyChain EnergyGrid TransportNetwork ValidatorNetwork
SocialNetwork HealthcareNetwork AgenticTwin Wallet Memory WorldModel DecisionEngine CapabilityToken
ConstitutionalGovernor`.split(/\s+/),
);
// Exact ConstitutionalInstrument class hierarchy from the same merged namespace commit.
const CONSTITUTIONAL_INSTRUMENT_TYPES = new Set(
  `ConstitutionalInstrument ConstitutiveInstrument GoverningInstrument AmendmentInstrument
ExecutableConstitutionalInstrument ConstitutionDocument BasicLaw ConstituentTreaty OrganizationCharter
OrganizationConstitutionDocument ArticlesOfAssociation CorporateCharter Bylaws OperatingAgreement TrustDeed
DeclarationOfTrust TestamentaryInstrument CooperativeStatutes CooperativeArticles DeedOfFormation
PartnershipAgreement PartnershipDeed FoundationCharter FoundationDeed FoundationStatutes EnablingStatute
ProjectCharter CollectiveCharter MarketplaceCharter ProtocolSpecification GovernancePolicy DAOCharter
ExecutableGovernancePolicy AgenticConstitutionDocument SchemeRules OperationalConstitutionDocument AssetCharter
TermsInstrument ServiceCharter ServiceAgreementInstrument OracleCharter EvaluationPolicy LifecyclePolicy
StewardshipCharter EvidencePolicy NetworkCharter`.split(/\s+/),
);

type Mode = "derived" | "protocol" | "standalone" | "template";
type ConformanceProfile = "authoring_draft" | "persisted_draft" | "anchored" | "runtime";
type Severity = "error" | "warning";

interface Finding {
  severity: Severity;
  code: string;
  path: string;
  message: string;
}

interface CliArgs {
  root?: string;
  mode?: Mode;
  expectedProfile?: ConformanceProfile;
  expectedClass?: string;
  expectedProtocol?: string;
  expectedType?: string;
  json: boolean;
}

interface ParsedArgs extends CliArgs {
  root: string;
  mode: Mode;
}

export interface MainOptions {
  root: string;
  mode: Mode;
  expectedProfile?: ConformanceProfile;
  expectedClass?: string;
  expectedProtocol?: string;
  expectedType?: string;
}

export interface ValidationReport {
  validator: string;
  validator_version: string;
  mode: Mode;
  profile: ConformanceProfile | null;
  root: string;
  ok: boolean;
  errors: number;
  warnings: number;
  findings: Finding[];
  scope: string;
}

type RecordValue = Record<string, unknown>;

function loadSchemaValidator(): ValidateFunction {
  const schema = JSON.parse(readFileSync(DOMAIN_SCHEMA_PATH, "utf-8")) as RecordValue;
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    strictTypes: false,
    validateFormats: true,
  });
  addFormats(ajv);
  return ajv.compile(schema);
}

const validateDomainSchema = loadSchemaValidator();

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  path: string,
  message: string,
): void {
  findings.push({ severity, code, path, message });
}

function loadText(path: string, findings: Finding[]): string | undefined {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    addFinding(findings, "error", "stat-failed", path, String(error));
    return undefined;
  }
  if (stat.isSymbolicLink()) {
    addFinding(findings, "error", "symlink", path, "Symlinks are not allowed in a rendered package.");
    return undefined;
  }
  if (!stat.isFile()) {
    addFinding(findings, "error", "not-file", path, "Expected a regular file.");
    return undefined;
  }
  if (stat.size > MAX_FILE_BYTES) {
    addFinding(findings, "error", "file-too-large", path, `File exceeds ${MAX_FILE_BYTES} bytes.`);
    return undefined;
  }
  try {
    const bytes = readFileSync(path);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text;
  } catch (error) {
    addFinding(findings, "error", "read-failed", path, String(error));
    return undefined;
  }
}

function parseFrontmatter(path: string, text: string, findings: Finding[]): RecordValue | undefined {
  const match = FRONTMATTER_BLOCK.exec(text);
  if (!match) {
    addFinding(findings, "error", "frontmatter-missing", path, "YAML frontmatter is missing.");
    return undefined;
  }
  const document = parseDocument(match[1], {
    prettyErrors: true,
    uniqueKeys: true,
    version: "1.2",
  });
  if (document.errors.length > 0 || document.warnings.length > 0) {
    addFinding(
      findings,
      "error",
      "unsafe-yaml",
      path,
      [...document.errors, ...document.warnings].map((error) => error.message).join("; "),
    );
    return undefined;
  }

  const unsafeFeatures = new Set<string>();
  visit(document, {
    Node(_key, node) {
      const candidate = node as { anchor?: string; tag?: string };
      if (isAlias(node)) unsafeFeatures.add("alias");
      if (candidate.anchor) unsafeFeatures.add("anchor");
      if (candidate.tag?.startsWith("!")) unsafeFeatures.add("custom-tag");
    },
    Pair(_key, pair) {
      const key = pair.key as { value?: unknown } | null;
      if (key?.value === "<<") unsafeFeatures.add("merge-key");
    },
  });
  if (unsafeFeatures.size > 0) {
    addFinding(
      findings,
      "error",
      "unsafe-yaml",
      path,
      `Forbidden YAML feature(s): ${[...unsafeFeatures].sort().join(", ")}.`,
    );
    return undefined;
  }

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    addFinding(findings, "error", "frontmatter-invalid", path, String(error));
    return undefined;
  }
  if (!isRecord(value)) {
    addFinding(findings, "error", "frontmatter-shape", path, "Frontmatter must be a mapping.");
    return undefined;
  }

  let nodes = 0;
  let maximumDepth = 0;
  const inspect = (item: unknown, depth: number): void => {
    nodes += 1;
    maximumDepth = Math.max(maximumDepth, depth);
    if (nodes > MAX_YAML_NODES || depth > MAX_YAML_DEPTH) return;
    if (Array.isArray(item)) {
      item.forEach((child) => inspect(child, depth + 1));
    } else if (isRecord(item)) {
      Object.values(item).forEach((child) => inspect(child, depth + 1));
    }
  };
  inspect(value, 1);
  if (nodes > MAX_YAML_NODES || maximumDepth > MAX_YAML_DEPTH) {
    addFinding(
      findings,
      "error",
      "unsafe-yaml",
      path,
      `Parsed YAML exceeds ${MAX_YAML_NODES} nodes or ${MAX_YAML_DEPTH} levels.`,
    );
    return undefined;
  }
  return value;
}

function walkPackage(root: string, findings: Finding[]): string[] {
  const files: string[] = [];

  function walk(directory: string): void {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      addFinding(findings, "error", "list-failed", directory, String(error));
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        files.push(path);
      } else if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        files.push(path);
      } else {
        addFinding(findings, "error", "unsupported-node", path, "Unsupported filesystem node.");
      }
    }
  }

  walk(root);
  return files;
}

function extractDocumentEntries(value: unknown): RecordValue[] | undefined {
  if (Array.isArray(value) && value.every(isRecord)) {
    return value;
  }
  if (isRecord(value) && Array.isArray(value.entries) && value.entries.every(isRecord)) {
    return value.entries;
  }
  return undefined;
}

function validateCommonFiles(
  root: string,
  mode: Mode,
  findings: Finding[],
): Map<string, string> {
  const texts = new Map<string, string>();
  const caseFolded = new Map<string, string>();

  for (const path of walkPackage(root, findings)) {
    const relativePath = relative(root, path);
    const folded = relativePath.toLocaleLowerCase("en-US");
    const collision = caseFolded.get(folded);
    if (collision) {
      addFinding(
        findings,
        "error",
        "path-case-collision",
        path,
        `Path collides with ${collision} on case-insensitive filesystems.`,
      );
    } else {
      caseFolded.set(folded, relativePath);
    }

    let stat;
    try {
      stat = lstatSync(path);
    } catch (error) {
      addFinding(findings, "error", "stat-failed", path, String(error));
      continue;
    }
    if (!stat.isSymbolicLink() && !TEXT_SUFFIXES.has(extname(path).toLowerCase())) {
      addFinding(
        findings,
        "error",
        "unsupported-file",
        path,
        "Rendered packages may contain only UTF-8 text documents; reference binary artifacts externally.",
      );
      continue;
    }

    const text = loadText(path, findings);
    if (text === undefined) {
      continue;
    }
    texts.set(path, text);

    // Protocol packages legitimately carry template sources below templates/<derived-type>/;
    // those files are validated separately with --mode template, not as rendered output.
    const isProtocolTemplateSource = mode === "protocol" && relativePath.split(sep)[0] === "templates";
    if (mode !== "template" && !isProtocolTemplateSource) {
      if (basename(path).endsWith(".tmpl")) {
        addFinding(findings, "error", "template-suffix-leaked", path, "Rendered output ends in .tmpl.");
      }
      if (text.includes("x-template:")) {
        addFinding(findings, "error", "template-marker-leaked", path, "Rendered output contains x-template.");
      }
      if (AUTHOR_PLACEHOLDER.test(text)) {
        addFinding(findings, "error", "author-placeholder", path, "Unresolved {{...}} placeholder.");
      }
      if (PUBLISH_PLACEHOLDER.test(text)) {
        addFinding(findings, "error", "template-placeholder", path, "Conforming output contains a publish placeholder.");
      }
    }
  }
  return texts;
}

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "version", "kind", "conformance", "document_revision", "name", "description", "last_updated",
  "maintainers", "domain", "source_of_truth", "documents", "constitution", "agent_default_mode", "controllers",
  "services", "resources", "rights", "claims", "linked_entities", "accounts", "pods", "agents",
  "privacy", "graph_policy", "validation", "critical_do_not", "governance", "protocols", "asset",
  "deed", "protocol", "investment",
]);

const CANONICAL_SECTIONS = [
  "Overview", "Operating Model", "Authority & Control", "Constitutional Governance", "Services", "Resources", "Rights & Capabilities",
  "Claims, Evidence & Evaluation", "Linked Entities", "Accounts & Value", "POD, Flows & Agents",
  "Privacy & Source-of-Truth Boundaries", "Playbooks", "Do's and Don'ts", "Changelog",
];

// domain.type values that define a manifest document (spec §4.4).
const MANIFEST_DOMAIN_TYPES = new Set([
  "dao", "organisation", "project", "pod", "asset", "investment", "portfolio", "deed", "protocol", "dataset", "device",
]);

function collectSectionHeadings(body: string): string[] {
  const headings: string[] = [];
  let fenceMarker: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (fenceMarker === null) {
        fenceMarker = fence[1];
      } else if (fence[1][0] === fenceMarker[0] && fence[1].length >= fenceMarker.length) {
        fenceMarker = null;
      }
      continue;
    }
    if (fenceMarker !== null) continue;
    const heading = /^## (.+?)\s*$/.exec(line);
    if (heading) headings.push(heading[1]);
  }
  return headings;
}

function recordsAt(value: unknown, key: string): RecordValue[] {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key].filter(isRecord);
}

function ensureUniqueIds(entries: RecordValue[], label: string, path: string, findings: Finding[], idKey = "id"): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    const raw = entry[idKey];
    if (typeof raw !== "string") continue;
    const normalized = raw.normalize("NFC");
    if (ids.has(normalized)) {
      addFinding(findings, "error", "duplicate-entry-id", path, `Duplicate ${label} ${idKey} ${JSON.stringify(normalized)}.`);
    }
    ids.add(normalized);
  }
  return ids;
}

const CID_LIKE = /^b[a-z2-7]{10,}$/;
const BASE32_LOWER_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const SUPPORTED_CID_CODECS = new Set([
  0x55, // raw
  0x70, // dag-pb
  0x71, // dag-cbor
  0x0129, // dag-json
]);
const SUPPORTED_MULTIHASH_LENGTHS = new Map([
  [0x12, 32], // sha2-256
  [0x13, 64], // sha2-512
  [0x1e, 32], // blake3
]);

function isExternalReference(reference: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(reference) || CID_LIKE.test(reference);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.normalize("NFC"))
    : [];
}

function constitutionTerm(reference: string): string | undefined {
  if (reference.startsWith("con:")) return reference.slice("con:".length);
  if (reference.startsWith(CONSTITUTION_NAMESPACE)) {
    return reference.slice(CONSTITUTION_NAMESPACE.length);
  }
  return undefined;
}

function resolvesReference(reference: string, ...sets: Set<string>[]): boolean {
  const normalized = reference.normalize("NFC");
  return (
    isExternalReference(normalized) ||
    resolvesLocalReference(normalized, ...sets)
  );
}

function resolvesLocalReference(reference: string, ...sets: Set<string>[]): boolean {
  const normalized = reference.normalize("NFC");
  return sets.some((set) => set.has(normalized));
}

interface ConstitutionIndexes {
  documentEntries: RecordValue[];
  documents: Set<string>;
  controllers: Set<string>;
  rights: Set<string>;
  resources: Set<string>;
  resourcesById: Map<string, RecordValue>;
  services: Set<string>;
  agents: Set<string>;
  agentControllers: Set<string>;
  linkedEntities: Set<string>;
  claims: Set<string>;
  wallets: Set<string>;
}

function decodeBase32Lower(value: string): Uint8Array | undefined {
  if (!/^b[a-z2-7]+$/.test(value)) return undefined;
  const encoded = value.slice(1);
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of encoded) {
    const digit = BASE32_LOWER_ALPHABET.indexOf(character);
    if (digit < 0) return undefined;
    buffer = (buffer << 5) | digit;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 0xff);
    }
    buffer &= bits === 0 ? 0 : (1 << bits) - 1;
  }

  if (buffer !== 0 || encoded.length !== Math.ceil((bytes.length * 8) / 5)) {
    return undefined;
  }
  return Uint8Array.from(bytes);
}

function readUnsignedVarint(
  bytes: Uint8Array,
  offset: number,
): { value: number; next: number } | undefined {
  let value = 0;
  let shift = 0;
  for (let index = offset; index < bytes.length && shift <= 49; index += 1) {
    const byte = bytes[index];
    const chunk = byte & 0x7f;
    value += chunk * (2 ** shift);
    if (!Number.isSafeInteger(value)) return undefined;
    if ((byte & 0x80) === 0) {
      if (index > offset && chunk === 0) return undefined;
      return { value, next: index + 1 };
    }
    shift += 7;
  }
  return undefined;
}

function validCidV1(value: string): boolean {
  const bytes = decodeBase32Lower(value);
  if (!bytes) return false;

  const version = readUnsignedVarint(bytes, 0);
  if (!version || version.value !== 1) return false;
  const codec = readUnsignedVarint(bytes, version.next);
  if (!codec || !SUPPORTED_CID_CODECS.has(codec.value)) return false;
  const multihashCode = readUnsignedVarint(bytes, codec.next);
  if (!multihashCode) return false;
  const digestLength = readUnsignedVarint(bytes, multihashCode.next);
  const expectedLength = SUPPORTED_MULTIHASH_LENGTHS.get(multihashCode.value);
  if (!digestLength || expectedLength === undefined || digestLength.value !== expectedLength) {
    return false;
  }
  return digestLength.next + digestLength.value === bytes.length;
}

function validArweaveTransactionId(value: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  try {
    const bytes = Buffer.from(value, "base64url");
    return bytes.length === 32 && bytes.toString("base64url") === value;
  } catch {
    return false;
  }
}

function immutableExternalReference(reference: string): boolean {
  const ipfsMatch = /^ipfs:\/\/([^/?#]+)(?:[/?#]|$)/.exec(reference);
  const arweaveMatch = /^ar:\/\/([^/?#]+)(?:[/?#]|$)/.exec(reference);
  const urnCidMatch = /^urn:cid:(.+)$/.exec(reference);
  return (
    validCidV1(reference) ||
    (ipfsMatch !== null && validCidV1(ipfsMatch[1])) ||
    (arweaveMatch !== null && validArweaveTransactionId(arweaveMatch[1])) ||
    (urnCidMatch !== null && validCidV1(urnCidMatch[1])) ||
    /^urn:sha256:[A-Fa-f0-9]{64}$/.test(reference) ||
    /^urn:sha384:[A-Fa-f0-9]{96}$/.test(reference) ||
    /^urn:sha512:[A-Fa-f0-9]{128}$/.test(reference) ||
    /^urn:blake3:[A-Fa-f0-9]{64}$/.test(reference)
  );
}

function validContentHash(hash: string): boolean {
  return (
    /^(?:sha256|blake3):[A-Fa-f0-9]{64}$/.test(hash) ||
    /^sha384:[A-Fa-f0-9]{96}$/.test(hash) ||
    /^sha512:[A-Fa-f0-9]{128}$/.test(hash)
  );
}

function hasLocalContentIdentity(reference: string, indexes: ConstitutionIndexes): boolean {
  const resource = indexes.resourcesById.get(reference.normalize("NFC"));
  return (
    resource !== undefined &&
    ((typeof resource.cid === "string" && validCidV1(resource.cid)) ||
      (typeof resource.hash === "string" && validContentHash(resource.hash)))
  );
}

function validateConstitution(
  data: RecordValue,
  path: string,
  indexes: ConstitutionIndexes,
  findings: Finding[],
): void {
  const constitution = isRecord(data.constitution) ? data.constitution : undefined;
  if (!constitution) {
    addFinding(
      findings,
      "error",
      "constitution-required",
      path,
      "Every domain.md 1.0.0-rc.3 document must declare constitutional status.",
    );
    return;
  }

  const domain = isRecord(data.domain) ? data.domain : undefined;
  const subject =
    typeof domain?.id === "string" ? domain.id.normalize("NFC") : undefined;
  const declaredSubject =
    typeof constitution.subject === "string"
      ? constitution.subject.normalize("NFC")
      : constitution.subject;
  if (subject !== undefined && declaredSubject !== subject) {
    addFinding(
      findings,
      "error",
      "constitution-required",
      path,
      "constitution.subject must exactly equal domain.id.",
    );
  }
  const constitutionType =
    typeof constitution.type === "string"
      ? constitutionTerm(constitution.type)
      : undefined;
  if (constitutionType === undefined || !CONSTITUTION_TYPES.has(constitutionType)) {
    addFinding(
      findings,
      "error",
      "constitution-required",
      path,
      `constitution.type ${JSON.stringify(constitution.type)} is not a canonical IXO constitutional type.`,
    );
  }

  const subjectProfile = isRecord(constitution.subject_profile)
    ? constitution.subject_profile
    : undefined;
  const subjectTypes = stringArray(subjectProfile?.subject_types);
  const archetypes = stringArray(subjectProfile?.archetypes);
  const identity = stringArray(subjectProfile?.identity);
  const agenticTwins = stringArray(subjectProfile?.agentic_twins);
  if (!subjectProfile || subjectTypes.length === 0 || identity.length === 0) {
    addFinding(
      findings,
      "error",
      "constitutional-subject-profile-unresolved",
      path,
      "Every domain must classify its constitutional subject and identify its canonical identity.",
    );
  }
  if (subject !== undefined && !identity.includes(subject)) {
    addFinding(
      findings,
      "error",
      "constitutional-subject-profile-unresolved",
      path,
      "constitution.subject_profile.identity must include constitution.subject.",
    );
  }
  for (const reference of subjectTypes) {
    const term = constitutionTerm(reference);
    if (term === undefined || !CONSTITUTIONAL_SUBJECT_TYPES.has(term)) {
      addFinding(
        findings,
        "error",
        "constitutional-subject-profile-unresolved",
        path,
        `Constitutional subject type ${JSON.stringify(reference)} is not a canonical IXO subject-taxonomy class.`,
      );
    }
  }
  for (const archetype of archetypes) {
    const term = constitutionTerm(archetype);
    if (term === undefined || !CONSTITUTIONAL_ARCHETYPES.has(term)) {
      addFinding(
        findings,
        "error",
        "constitutional-subject-profile-unresolved",
        path,
        `Constitutional archetype ${JSON.stringify(archetype)} is not one of the seven canonical governance mixins.`,
      );
    }
  }

  const profileReferenceSets: Array<[string, Set<string>[]]> = [
    ["identity", [indexes.controllers, indexes.linkedEntities, indexes.resources]],
    ["purposes", [indexes.documents, indexes.resources]],
    ["interests", [indexes.documents, indexes.resources]],
    ["values", [indexes.documents, indexes.resources]],
    ["rights", [indexes.rights]],
    ["obligations", [indexes.documents, indexes.resources, indexes.rights]],
    ["capabilities", [indexes.rights, indexes.resources, indexes.services]],
    ["claims", [indexes.claims, indexes.resources]],
    ["wallets", [indexes.wallets, indexes.resources]],
    ["authorities", [indexes.controllers, indexes.linkedEntities]],
    ["memory", [indexes.resources]],
    ["evidence_policies", [indexes.documents, indexes.resources]],
    ["evaluation_policies", [indexes.documents, indexes.resources]],
    ["decision_policies", [indexes.documents, indexes.resources]],
    ["settlement_policies", [indexes.documents, indexes.resources]],
    ["governance", [indexes.documents, indexes.resources]],
    ["custodians", [indexes.controllers, indexes.linkedEntities]],
    ["stewards", [indexes.controllers, indexes.linkedEntities]],
    ["owners", [indexes.controllers, indexes.linkedEntities]],
    ["beneficiaries", [indexes.controllers, indexes.linkedEntities]],
    ["oracles", [indexes.agents, indexes.services, indexes.linkedEntities]],
    ["agentic_twins", [indexes.agents, indexes.linkedEntities]],
  ];
  for (const [field, referenceSets] of profileReferenceSets) {
    for (const reference of stringArray(subjectProfile?.[field])) {
      const resolved =
        field === "agentic_twins"
          ? resolvesLocalReference(reference, ...referenceSets)
          : resolvesReference(reference, ...referenceSets);
      if (!resolved) {
        addFinding(
          findings,
          "error",
          "constitutional-subject-profile-unresolved",
          path,
          `Constitutional subject ${field} reference ${JSON.stringify(reference)} does not resolve.`,
        );
      }
    }
  }

  const controllerSummary =
    isRecord(data.controllers) && isRecord(data.controllers.summary)
      ? data.controllers.summary
      : undefined;
  const agentMode =
    isRecord(data.agent_default_mode) && typeof data.agent_default_mode.mode === "string"
      ? data.agent_default_mode.mode
      : undefined;
  const governedTypes = new Set(["dao", "organisation", "project", "protocol", "marketplace", "pod"]);
  const agentic =
    indexes.agents.size > 0 ||
    indexes.agentControllers.size > 0 ||
    agenticTwins.length > 0 ||
    controllerSummary?.agent_controllers_allowed === true ||
    agentMode === "bounded_evaluate" ||
    agentMode === "bounded_execute";
  const completePackageRequired =
    (typeof domain?.type === "string" && governedTypes.has(domain.type)) || agentic;

  if (constitution.status === "not_applicable") {
    const packageFields = [
      "legal_effect",
      "norms",
      "instruments",
      "governance",
      "execution",
      "constitutional_ai",
    ].some((field) => field in constitution);
    if (completePackageRequired || packageFields) {
      addFinding(
        findings,
        "error",
        "constitution-not-applicable-invalid",
        path,
        "Only passive domains without agents, agent controllers, bounded agency, or executable governance may declare constitution.status as not_applicable.",
      );
    }
    return;
  }

  const legalEffect = isRecord(constitution.legal_effect) ? constitution.legal_effect : undefined;
  const governance = isRecord(constitution.governance) ? constitution.governance : undefined;
  const execution = isRecord(constitution.execution) ? constitution.execution : undefined;
  const constitutionalAI = isRecord(constitution.constitutional_ai)
    ? constitution.constitutional_ai
    : undefined;
  const instruments = Array.isArray(constitution.instruments)
    ? constitution.instruments.filter(isRecord)
    : [];
  if (
    !legalEffect ||
    !governance ||
    !execution ||
    !constitutionalAI ||
    instruments.length === 0 ||
    stringArray(constitution.norms).length === 0
  ) {
    addFinding(
      findings,
      "error",
      "constitution-required",
      path,
      "A constitutional package requires legal effect, norms, instruments, governance, execution, and Constitutional-AI declarations.",
    );
  }
  for (const norm of stringArray(constitution.norms)) {
    const localResourceReference =
      indexes.resources.has(norm) ||
      (norm.startsWith("resource:") && norm.length > "resource:".length);
    if (!localResourceReference && !immutableExternalReference(norm)) {
      addFinding(
        findings,
        "error",
        "constitution-required",
        path,
        `Constitutional norm ${JSON.stringify(norm)} must resolve to a declared local resource or an immutable external reference.`,
      );
    }
  }

  const instrumentByDocument = new Map<string, RecordValue>();
  for (const instrument of instruments) {
    const instrumentType =
      typeof instrument.type === "string"
        ? constitutionTerm(instrument.type)
        : undefined;
    if (
      instrumentType === undefined ||
      !CONSTITUTIONAL_INSTRUMENT_TYPES.has(instrumentType)
    ) {
      addFinding(
        findings,
        "error",
        "constitutional-instrument-unresolved",
        path,
        `Constitutional instrument type ${JSON.stringify(instrument.type)} is not a canonical IXO constitutional-instrument class.`,
      );
    }
    const documentRef =
      typeof instrument.document_ref === "string"
        ? instrument.document_ref.normalize("NFC")
        : undefined;
    if (
      documentRef === undefined ||
      !indexes.documents.has(documentRef)
    ) {
      addFinding(
        findings,
        "error",
        "constitutional-instrument-unresolved",
        path,
        `Constitutional instrument ${JSON.stringify(instrument.document_ref)} does not resolve to documents.entries[].id.`,
      );
      continue;
    }
    if (instrumentByDocument.has(documentRef)) {
      addFinding(
        findings,
        "error",
        "constitutional-instrument-unresolved",
        path,
        `Constitutional document ${instrument.document_ref} is mapped by more than one instrument entry.`,
      );
      continue;
    }
    instrumentByDocument.set(documentRef, instrument);
    if (
      typeof instrument.effective_from === "string" &&
      typeof instrument.effective_until === "string" &&
      Date.parse(instrument.effective_from) > Date.parse(instrument.effective_until)
    ) {
      addFinding(
        findings,
        "error",
        "constitution-conflicts-canonical",
        path,
        `Instrument ${instrument.document_ref} ends before it becomes effective.`,
      );
    }
  }
  if (
    constitution.status === "superseded" &&
    instruments.some((instrument) => instrument.canonical === true)
  ) {
    addFinding(
      findings,
      "error",
      "constitution-conflicts-canonical",
      path,
      "A superseded constitution cannot retain a canonical instrument.",
    );
  }
  const supersedesByDocument = new Map<string, string>();
  for (const entry of indexes.documentEntries) {
    if (typeof entry.id !== "string" || typeof entry.supersedes !== "string") continue;
    const documentId = entry.id.normalize("NFC");
    const supersededDocumentId = entry.supersedes.normalize("NFC");
    if (!indexes.documents.has(supersededDocumentId)) {
      addFinding(
        findings,
        "error",
        "constitutional-instrument-unresolved",
        path,
        `Document ${entry.id} supersedes missing document ${entry.supersedes}.`,
      );
      continue;
    }
    supersedesByDocument.set(documentId, supersededDocumentId);
  }
  const visitedSupersession = new Set<string>();
  const reportedSupersessionCycles = new Set<string>();
  for (const start of supersedesByDocument.keys()) {
    if (visitedSupersession.has(start)) continue;
    const positions = new Map<string, number>();
    const chain: string[] = [];
    let current: string | undefined = start;
    while (current !== undefined && !visitedSupersession.has(current)) {
      const cycleStart = positions.get(current);
      if (cycleStart !== undefined) {
        const cycle = chain.slice(cycleStart);
        const cycleKey = [...cycle].sort().join("\u0000");
        if (!reportedSupersessionCycles.has(cycleKey)) {
          reportedSupersessionCycles.add(cycleKey);
          addFinding(
            findings,
            "error",
            "constitution-conflicts-canonical",
            path,
            `Document supersession chain contains a cycle: ${[...cycle, current].join(" -> ")}.`,
          );
        }
        break;
      }
      positions.set(current, chain.length);
      chain.push(current);
      current = supersedesByDocument.get(current);
    }
    chain.forEach((documentId) => visitedSupersession.add(documentId));
  }
  const canonicalAncestors = new Map<string, Set<string>>();
  for (const [documentId, instrument] of instrumentByDocument) {
    if (instrument.canonical !== true) continue;
    const traversed = new Set([documentId]);
    const ancestors = new Set<string>();
    let predecessor = supersedesByDocument.get(documentId);
    while (predecessor !== undefined && !traversed.has(predecessor)) {
      ancestors.add(predecessor);
      if (instrumentByDocument.get(predecessor)?.canonical === true) {
        addFinding(
          findings,
          "error",
          "constitution-conflicts-canonical",
          path,
          `Canonical constitutional instrument ${documentId} supersedes canonical predecessor ${predecessor} through its amendment chain.`,
        );
      }
      traversed.add(predecessor);
      predecessor = supersedesByDocument.get(predecessor);
    }
    canonicalAncestors.set(documentId, ancestors);
  }
  const canonicalDocumentIds = [...canonicalAncestors.keys()];
  for (let leftIndex = 0; leftIndex < canonicalDocumentIds.length; leftIndex += 1) {
    const left = canonicalDocumentIds[leftIndex];
    const leftAncestors = canonicalAncestors.get(left) ?? new Set<string>();
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < canonicalDocumentIds.length;
      rightIndex += 1
    ) {
      const right = canonicalDocumentIds[rightIndex];
      const rightAncestors = canonicalAncestors.get(right) ?? new Set<string>();
      if (leftAncestors.has(right) || rightAncestors.has(left)) continue;
      const commonAncestor = [...leftAncestors].find((ancestor) =>
        rightAncestors.has(ancestor),
      );
      if (commonAncestor !== undefined) {
        addFinding(
          findings,
          "error",
          "constitution-conflicts-canonical",
          path,
          `Canonical constitutional instruments ${left} and ${right} are competing successors of common predecessor ${commonAncestor}.`,
        );
      }
    }
  }

  if (
    legalEffect?.status === "verified" &&
    (typeof legalEffect.jurisdiction !== "string" ||
      stringArray(legalEffect.authority_evidence).length === 0)
  ) {
    addFinding(
      findings,
      "error",
      "constitutional-authority-unverified",
      path,
      "Verified legal effect requires jurisdiction and authority evidence.",
    );
  }
  for (const reference of stringArray(legalEffect?.authority_evidence)) {
    if (!resolvesReference(reference, indexes.resources)) {
      addFinding(
        findings,
        "error",
        "constitutional-authority-unverified",
        path,
        `Legal authority evidence ${JSON.stringify(reference)} does not resolve.`,
      );
    }
  }
  for (const reference of stringArray(governance?.authority_sources)) {
    if (!resolvesReference(reference, indexes.documents, indexes.resources)) {
      addFinding(
        findings,
        "error",
        "constitutional-authority-unverified",
        path,
        `Constitutional authority source ${JSON.stringify(reference)} does not resolve.`,
      );
    }
  }
  for (const field of [
    "decision_procedure",
    "amendment_procedure",
    "interpretation_procedure",
    "dispute_resolution_procedure",
    "suspension_procedure",
    "dissolution_procedure",
  ]) {
    const reference = governance?.[field];
    if (
      typeof reference === "string" &&
      !resolvesReference(reference, indexes.documents, indexes.resources)
    ) {
      addFinding(
        findings,
        "error",
        "constitutional-authority-unverified",
        path,
        `Constitutional ${field} ${JSON.stringify(reference)} does not resolve.`,
      );
    }
  }

  const amendingInstruments = new Map(
    [...instrumentByDocument].filter(([, instrument]) =>
      stringArray(instrument.functions).includes("amending"),
    ),
  );
  const supersedingInstruments = new Map(
    [...instrumentByDocument].filter(([documentId]) =>
      supersedesByDocument.has(documentId),
    ),
  );
  const amendmentControlledInstruments = new Map([
    ...amendingInstruments,
    ...supersedingInstruments,
  ]);
  const amends = amendmentControlledInstruments.size > 0;
  if (
    amends &&
    (typeof governance?.amendment_procedure !== "string" ||
      stringArray(governance?.authority_sources).length === 0)
  ) {
    addFinding(
      findings,
      "error",
      "constitutional-amendment-unapproved",
      path,
      "An amending instrument requires an amendment procedure and authority source.",
    );
  }
  for (const [documentId, instrument] of supersedingInstruments) {
    if (!stringArray(instrument.functions).includes("amending")) {
      addFinding(
        findings,
        "error",
        "constitutional-amendment-unapproved",
        path,
        `Constitutional instrument ${documentId} has a supersession edge and must declare the amending function.`,
      );
    }
  }
  for (const [documentId] of amendmentControlledInstruments) {
    const predecessor = supersedesByDocument.get(documentId);
    if (
      predecessor === undefined ||
      !instrumentByDocument.has(predecessor)
    ) {
      addFinding(
        findings,
        "error",
        "constitutional-amendment-unapproved",
        path,
        `Amending instrument ${documentId} requires its document to supersede a resolvable constitutional instrument.`,
      );
    }
  }

  const executable =
    execution?.mode === "machine_executable" ||
    execution?.mode === "hybrid" ||
    instruments.some((instrument) => stringArray(instrument.functions).includes("executable"));
  const implementations = stringArray(execution?.implementations);
  const conformanceTests = stringArray(execution?.conformance_tests);
  const enforcementPoints = stringArray(execution?.enforcement_points);
  const reviewGates = stringArray(execution?.human_review_required_for);
  if (
    executable &&
    (implementations.length === 0 ||
      conformanceTests.length === 0 ||
      enforcementPoints.length === 0 ||
      reviewGates.length === 0 ||
      !["deny", "pause_and_escalate"].includes(String(execution?.failure_policy)))
  ) {
    addFinding(
      findings,
      "error",
      "constitutional-execution-incomplete",
      path,
      "Executable governance requires implementations, tests, enforcement points, human-review gates, and a fail-closed policy.",
    );
  }
  for (const reference of [...implementations, ...conformanceTests]) {
    if (!resolvesReference(reference, indexes.resources)) {
      addFinding(
        findings,
        "error",
        "constitutional-execution-incomplete",
        path,
        `Constitutional execution resource ${JSON.stringify(reference)} does not resolve.`,
      );
    }
  }
  if (executable) {
    for (const reference of implementations) {
      const immutable =
        hasLocalContentIdentity(reference, indexes) ||
        immutableExternalReference(reference);
      if (!immutable) {
        addFinding(
          findings,
          "error",
          "constitutional-execution-incomplete",
          path,
          `Executable constitutional implementation ${JSON.stringify(reference)} lacks immutable content identity.`,
        );
      }
    }
  }
  for (const reference of enforcementPoints) {
    if (!resolvesReference(reference, indexes.services)) {
      addFinding(
        findings,
        "error",
        "constitutional-execution-incomplete",
        path,
        `Constitutional enforcement point ${JSON.stringify(reference)} does not resolve.`,
      );
    }
  }

  const aiMode = typeof constitutionalAI?.mode === "string" ? constitutionalAI.mode : undefined;
  const principles = stringArray(constitutionalAI?.principles);
  const appliesToAgents = stringArray(constitutionalAI?.applies_to_agents);
  const constitutionalAgents = new Set([
    ...indexes.agents,
    ...indexes.agentControllers,
    ...agenticTwins,
  ]);
  const auditRecord = constitutionalAI?.audit_record;
  if (agentic && (!aiMode || aiMode === "none")) {
    addFinding(
      findings,
      "error",
      "constitutional-ai-incomplete",
      path,
      "Agentic domains require an active Constitutional-AI mode.",
    );
  }
  if (aiMode && aiMode !== "none") {
    const critiqueRequired = aiMode === "critique_and_revise" || aiMode === "hybrid";
    const decisionRequired = aiMode === "policy_evaluate" || aiMode === "hybrid";
    if (
      principles.length === 0 ||
      typeof auditRecord !== "string" ||
      constitutionalAI?.conflict_policy !== "canonical_authority_prevails" ||
      (critiqueRequired &&
        (typeof constitutionalAI.critique_procedure !== "string" ||
          typeof constitutionalAI.revision_procedure !== "string")) ||
      (decisionRequired && typeof constitutionalAI.decision_procedure !== "string")
    ) {
      addFinding(
        findings,
        "error",
        "constitutional-ai-incomplete",
        path,
        "Active Constitutional AI requires principles, mode-specific procedures, canonical-authority conflict policy, and an audit-record definition.",
      );
    }
    if (constitutionalAgents.size > 0 && appliesToAgents.length === 0) {
      addFinding(
        findings,
        "error",
        "constitutional-ai-incomplete",
        path,
        "Constitutional AI must identify the agents, twins, and agent controllers to which it applies.",
      );
    }
    for (const agent of new Set([
      ...indexes.agents,
      ...indexes.agentControllers,
      ...agenticTwins,
    ])) {
      if (!appliesToAgents.includes(agent)) {
        const label = indexes.agentControllers.has(agent)
          ? "Agent controller"
          : agenticTwins.includes(agent)
            ? "Agentic twin"
            : "Agent";
        addFinding(
          findings,
          "error",
          "constitutional-ai-incomplete",
          path,
          `${label} ${agent} must be bound to the Constitutional-AI policy.`,
        );
      }
    }
  }
  for (const agent of appliesToAgents) {
    if (!constitutionalAgents.has(agent)) {
      addFinding(
        findings,
        "error",
        "constitutional-ai-incomplete",
        path,
        `Constitutional-AI subject ${agent} is not a declared agent, agent controller, or twin.`,
      );
    }
  }
  for (const reference of [
    ...principles,
    constitutionalAI?.critique_procedure,
    constitutionalAI?.revision_procedure,
    constitutionalAI?.decision_procedure,
    constitutionalAI?.model_profile,
    auditRecord,
  ]) {
    if (
      typeof reference === "string" &&
      !resolvesReference(reference, indexes.resources)
    ) {
      addFinding(
        findings,
        "error",
        "constitutional-ai-incomplete",
        path,
        `Constitutional-AI resource ${JSON.stringify(reference)} does not resolve.`,
      );
    }
  }
}

function parseIsoDurationMs(duration: string): number | null {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration);
  if (!match || match.slice(1).every((group) => group === undefined)) return null;
  const [years, months, weeks, days, hours, minutes, seconds] = match
    .slice(1)
    .map((group) => (group === undefined ? 0 : Number(group)));
  const dayMs = 86_400_000;
  return (years * 365 + months * 30 + weeks * 7 + days) * dayMs + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000;
}

function validateSecretAbsence(value: unknown, path: string, findings: Finding[], pointer = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateSecretAbsence(item, path, findings, `${pointer}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)) {
      addFinding(findings, "error", "secret-in-index", path, `Private key material found at ${pointer}.`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (/(^|_)(secret|private_key|seed_phrase|mnemonic|access_token|api_key|bearer_token)($|_)/i.test(key)) {
      addFinding(findings, "error", "secret-in-index", path, `Forbidden secret-bearing key at ${pointer}.${key}.`);
    }
    validateSecretAbsence(child, path, findings, `${pointer}.${key}`);
  }
}

function validateSections(data: RecordValue, text: string, path: string, findings: Finding[]): void {
  const body = text.slice(FRONTMATTER_BLOCK.exec(text)?.[0].length ?? 0);
  const headings = collectSectionHeadings(body);
  const seen = new Set<string>();
  let lastCanonicalIndex = -1;
  for (const heading of headings) {
    if (seen.has(heading) && CANONICAL_SECTIONS.includes(heading)) {
      addFinding(findings, "error", "duplicate-section", path, `Duplicate canonical section ${JSON.stringify(heading)}.`);
    }
    seen.add(heading);
    const index = CANONICAL_SECTIONS.indexOf(heading);
    if (index < 0) {
      addFinding(findings, "warning", "unknown-section", path, `Unknown section ${JSON.stringify(heading)} is preserved.`);
    } else if (index < lastCanonicalIndex) {
      addFinding(findings, "warning", "section-order", path, `Section ${JSON.stringify(heading)} is out of canonical order.`);
    } else {
      lastCanonicalIndex = index;
    }
  }
  const requiredSections = isRecord(data.validation) && Array.isArray(data.validation.required_sections)
    ? data.validation.required_sections.filter((item): item is string => typeof item === "string")
    : [];
  for (const required of requiredSections) {
    if (!seen.has(required)) {
      addFinding(findings, "error", "missing-required-section", path, `Missing required section ${JSON.stringify(required)}.`);
    }
  }
}

function validateDomain(
  domainPath: string,
  text: string,
  mode: Mode,
  expectedProfile: ConformanceProfile | undefined,
  expectedClass: string | undefined,
  findings: Finding[],
): ConformanceProfile | null {
  const data = parseFrontmatter(domainPath, text, findings);
  if (!data) {
    return null;
  }

  if (!validateDomainSchema(data)) {
    for (const error of (validateDomainSchema.errors ?? []) as ErrorObject[]) {
      const location = error.instancePath || "$";
      addFinding(findings, "error", "schema", domainPath, `${location} ${error.message ?? "is invalid"}.`);
    }
  }

  const profile = isRecord(data.conformance) && typeof data.conformance.profile === "string"
    ? data.conformance.profile as ConformanceProfile
    : null;
  if (expectedProfile !== undefined && profile !== expectedProfile) {
    addFinding(
      findings,
      "error",
      "profile-mismatch",
      domainPath,
      `Expected conformance profile ${JSON.stringify(expectedProfile)}, found ${JSON.stringify(profile)}.`,
    );
  }

  for (const key of Object.keys(data)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key) && !key.startsWith("x-")) {
      addFinding(findings, "warning", "unknown-top-level-key", domainPath, `Unknown top-level key ${JSON.stringify(key)}.`);
    }
  }
  validateSecretAbsence(data, domainPath, findings);
  validateSections(data, text, domainPath, findings);

  if (isRecord(data.agent_default_mode) && isRecord(data.agent_default_mode.overrides)) {
    for (const [overrideKey, overrideValue] of Object.entries(data.agent_default_mode.overrides)) {
      if (overrideValue !== false) {
        addFinding(
          findings,
          "error",
          "open-ended-agent-authority",
          domainPath,
          `agent_default_mode.overrides.${overrideKey} must be false; overrides may only lower the mode ceiling.`,
        );
      }
    }
  }

  if (isRecord(data.documents) && isRecord(data.documents.anchoring)
    && data.documents.anchoring.cid !== null && data.documents.anchoring.cid !== undefined) {
    addFinding(
      findings,
      "error",
      "anchoring-self-cid",
      domainPath,
      "documents.anchoring.cid must remain null in the serialized domain.md; the exact CID is supplied out-of-band by the canonical anchoring record or envelope.",
    );
  }

  const validationBlock = data.validation;
  if (isRecord(validationBlock) && typeof validationBlock.stale_after === "string" && typeof data.last_updated === "string") {
    const staleAfterMs = parseIsoDurationMs(validationBlock.stale_after);
    const lastUpdatedMs = Date.parse(`${data.last_updated}T00:00:00Z`);
    if (staleAfterMs !== null && !Number.isNaN(lastUpdatedMs) && Date.now() - lastUpdatedMs > staleAfterMs) {
      addFinding(
        findings,
        "warning",
        "stale-domain-index",
        domainPath,
        `last_updated ${data.last_updated} is older than validation.stale_after ${validationBlock.stale_after}.`,
      );
    }
  }

  if (!isRecord(data.domain)) {
    addFinding(findings, "error", "domain-shape", domainPath, "domain must be a mapping.");
    return profile;
  }
  const domain = data.domain;
  const domainType = domain.type;

  if (mode === "derived") {
    if (domainType === "protocol") {
      addFinding(findings, "error", "derived-protocol-type", domainPath, "Derived output cannot use type protocol.");
    }
    if (typeof domain.class !== "string" || domain.class.trim() === "") {
      addFinding(findings, "error", "derived-class", domainPath, "Derived output requires domain.class.");
    } else if (expectedClass !== undefined && domain.class !== expectedClass) {
      addFinding(findings, "error", "derived-class-mismatch", domainPath, `Expected domain.class ${JSON.stringify(expectedClass)}.`);
    }
  } else if (mode === "protocol") {
    if (domainType !== "protocol") {
      addFinding(findings, "error", "protocol-type", domainPath, "Protocol output requires domain.type: protocol.");
    }
  } else if (mode === "standalone") {
    if (domainType === "protocol") {
      addFinding(findings, "error", "standalone-lineage", domainPath, "Standalone output cannot use domain.type: protocol.");
    }
    if (domain.class !== null && domain.class !== undefined) {
      addFinding(findings, "error", "standalone-lineage", domainPath, "Standalone output cannot declare protocol-template lineage in domain.class.");
    }
  }

  const entries = extractDocumentEntries(data.documents);
  if (!entries) {
    addFinding(
      findings,
      "error",
      "documents-shape",
      domainPath,
      "documents must be a list or a mapping with entries list.",
    );
    return profile;
  }
  const documentIds = ensureUniqueIds(entries, "document", domainPath, findings);

  const roles: string[] = [];
  entries.forEach((entry, index) => {
    const role = entry.role;
    if (typeof role !== "string" || role.trim() === "") {
      addFinding(findings, "error", "document-role", domainPath, `documents entry ${index} has no role.`);
      return;
    }
    roles.push(role);
    if (role === "manifest" && (entry.category !== "manifest" || entry.authority !== "defining")) {
      addFinding(findings, "error", "manifest-contract", domainPath, "Manifest must be defining with category manifest.");
    }
    if (role === "manifest" && entry.disclosure_pass !== 3) {
      addFinding(findings, "warning", "document-pass-mismatch", domainPath, "Manifest should use disclosure pass 3.");
    }
    if (role === "description" && entry.disclosure_pass !== 2) {
      addFinding(findings, "warning", "document-pass-mismatch", domainPath, "Description should use disclosure pass 2.");
    }
    if (role === "changelog" && (entry.authority !== "advisory" || entry.disclosure_pass !== 2)) {
      addFinding(findings, "warning", "document-pass-mismatch", domainPath, "Changelog should be advisory at disclosure pass 2.");
    }
    if (entry.sensitivity !== "public" && entry.access_policy === "public") {
      addFinding(findings, "error", "privacy-public-sensitive", domainPath, `Document role ${JSON.stringify(role)} is sensitive but public.`);
    }
  });

  const canonicalRoles = new Set(["description", "changelog", "manifest"]);
  const duplicates = [...new Set(roles.filter((role, index) => roles.indexOf(role) !== index))].sort();
  for (const duplicate of duplicates) {
    addFinding(
      findings,
      canonicalRoles.has(duplicate) ? "error" : "warning",
      "duplicate-document-role",
      domainPath,
      `Document role ${JSON.stringify(duplicate)} appears more than once.`,
    );
  }
  if (!roles.includes("description")) {
    addFinding(findings, "error", "missing-description-doc", domainPath, 'No documents entry with role "description".');
  }
  if (!roles.includes("changelog")) {
    addFinding(findings, "error", "missing-changelog-doc", domainPath, 'No documents entry with role "changelog".');
  }
  if (typeof domainType === "string" && MANIFEST_DOMAIN_TYPES.has(domainType) && !roles.includes("manifest")) {
    addFinding(
      findings,
      "warning",
      "missing-manifest",
      domainPath,
      `Domain type ${JSON.stringify(domainType)} defines a manifest document, but no manifest documents entry exists.`,
    );
  }

  const controllerEntries = recordsAt(data.controllers, "entries");
  const controllerIds = ensureUniqueIds(controllerEntries, "controller", domainPath, findings);
  if (isRecord(data.controllers) && isRecord(data.controllers.summary)) {
    const primary = data.controllers.summary.primary_controller;
    if (typeof primary === "string" && !controllerIds.has(primary)) {
      addFinding(findings, "error", "missing-controller", domainPath, "Primary controller does not resolve in controllers.entries.");
    }
  }

  const rightEntries = recordsAt(data.rights, "entries");
  const rightIds = ensureUniqueIds(rightEntries, "right", domainPath, findings);
  const resourceEntries = recordsAt(data.resources, "entries");
  const resourceIds = ensureUniqueIds(resourceEntries, "resource", domainPath, findings);
  const resourcesById = new Map(
    resourceEntries
      .filter((entry): entry is RecordValue & { id: string } => typeof entry.id === "string")
      .map((entry) => [entry.id.normalize("NFC"), entry]),
  );
  const serviceEntries = recordsAt(data.services, "entries");
  const serviceIds = ensureUniqueIds(serviceEntries, "service", domainPath, findings);
  const accountEntries = recordsAt(data.accounts, "entries");
  ensureUniqueIds(accountEntries, "account", domainPath, findings, "name");
  const walletIds = new Set(
    accountEntries.flatMap((entry) =>
      [entry.name, entry.address]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.normalize("NFC")),
    ),
  );
  const agentEntries = recordsAt(data.agents, "entries");
  const agentIds = ensureUniqueIds(agentEntries, "agent", domainPath, findings);
  for (const agent of agentEntries) {
    if (typeof agent.service === "string" && agent.service !== "" && !isExternalReference(agent.service) && !serviceIds.has(agent.service)) {
      addFinding(findings, "error", "broken-local-reference", domainPath, `Agent ${String(agent.id)} references missing service ${JSON.stringify(agent.service)}.`);
    }
  }
  const linkedEntries = recordsAt(data.linked_entities, "entries");
  const linkedEntityIds = ensureUniqueIds(linkedEntries, "linked entity", domainPath, findings);
  for (const linked of linkedEntries) {
    if (typeof linked.relationship !== "string" || linked.relationship.trim() === "") {
      addFinding(findings, "warning", "linked-entity-without-rel", domainPath, `Linked entity ${String(linked.id)} lacks a relationship.`);
    }
  }
  const claimCollections = recordsAt(data.claims, "collections");
  const linkedClaims = recordsAt(data.claims, "linked_claims");
  const claimReferenceEntries = [
    ...claimCollections,
    ...claimCollections.flatMap((collection) => recordsAt(collection, "claim_types")),
    ...linkedClaims,
  ];
  const claimIds = ensureUniqueIds(
    claimReferenceEntries,
    "claim reference",
    domainPath,
    findings,
  );
  const agentControllerIds = new Set(
    controllerEntries
      .filter((entry) => entry.type === "agent")
      .map((entry) => entry.id)
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.normalize("NFC")),
  );

  validateConstitution(
    data,
    domainPath,
    {
      documentEntries: entries,
      documents: documentIds,
      controllers: controllerIds,
      rights: rightIds,
      resources: resourceIds,
      resourcesById,
      services: serviceIds,
      agents: agentIds,
      agentControllers: agentControllerIds,
      linkedEntities: linkedEntityIds,
      claims: claimIds,
      wallets: walletIds,
    },
    findings,
  );

  if (isRecord(data.source_of_truth)) {
    const order = new Set(
      Array.isArray(data.source_of_truth.conflict_resolution_order)
        ? data.source_of_truth.conflict_resolution_order.filter((item): item is string => typeof item === "string")
        : [],
    );
    for (const scope of recordsAt(data.source_of_truth, "authority_scopes")) {
      if (!Array.isArray(scope.sources)) continue;
      for (const source of scope.sources) {
        if (typeof source === "string" && !order.has(source)) {
          addFinding(findings, "error", "unscoped-authority-conflict", domainPath, `Authority scope source ${JSON.stringify(source)} is absent from conflict_resolution_order.`);
        }
      }
    }
  }

  const podEntries = recordsAt(data.pods, "entries");
  ensureUniqueIds(podEntries, "pod", domainPath, findings);
  const flowById = new Map<string, { flow: RecordValue; transitions: Set<string> }>();
  for (const pod of podEntries) {
    for (const role of recordsAt(pod, "roles")) {
      if (!Array.isArray(role.rights)) continue;
      for (const right of role.rights) {
        if (typeof right === "string" && !rightIds.has(right)) {
          addFinding(findings, "error", "broken-local-reference", domainPath, `Pod ${String(pod.id)} role ${String(role.id)} references missing right ${JSON.stringify(right)}.`);
        }
      }
    }
    for (const flow of recordsAt(pod, "flows")) {
      if (typeof flow.id !== "string") continue;
      if (flowById.has(flow.id)) {
        addFinding(findings, "error", "duplicate-entry-id", domainPath, `Duplicate flow id ${JSON.stringify(flow.id)}.`);
      }
      const states = new Set(Array.isArray(flow.states) ? flow.states.filter((item): item is string => typeof item === "string") : []);
      const transitions = recordsAt(flow, "transitions");
      const transitionIds = ensureUniqueIds(transitions, `transition in ${flow.id}`, domainPath, findings);
      flowById.set(flow.id, { flow, transitions: transitionIds });
      if (typeof flow.initial_state === "string" && !states.has(flow.initial_state)) {
        addFinding(findings, "error", "invalid-flow", domainPath, `Flow ${flow.id} initial state is not declared.`);
      }
      const reachable = new Set<string>(typeof flow.initial_state === "string" ? [flow.initial_state] : []);
      let changed = true;
      while (changed) {
        changed = false;
        for (const transition of transitions) {
          if (typeof transition.from === "string" && typeof transition.to === "string" && reachable.has(transition.from) && !reachable.has(transition.to)) {
            reachable.add(transition.to);
            changed = true;
          }
        }
      }
      for (const transition of transitions) {
        if (typeof transition.from === "string" && !states.has(transition.from) || typeof transition.to === "string" && !states.has(transition.to)) {
          addFinding(findings, "error", "invalid-flow", domainPath, `Flow ${flow.id} transition ${String(transition.id)} references an unknown state.`);
        }
        if (Array.isArray(transition.actor_rights)) {
          for (const right of transition.actor_rights) {
            if (typeof right === "string" && !rightIds.has(right)) {
              addFinding(findings, "error", "broken-local-reference", domainPath, `Flow ${flow.id} references missing actor right ${JSON.stringify(right)}.`);
            }
          }
        }
        const effects = Array.isArray(transition.effects) ? transition.effects : [];
        if (effects.some((effect) => ["credential", "payment", "mint", "burn", "transfer"].includes(String(effect))) && transition.human_review !== true) {
          addFinding(findings, "error", "invalid-flow", domainPath, `Value or credential effect in ${flow.id}/${String(transition.id)} requires human review.`);
        }
      }
      for (const state of states) {
        if (!reachable.has(state)) {
          addFinding(findings, "error", "invalid-flow", domainPath, `Flow ${flow.id} state ${JSON.stringify(state)} is unreachable.`);
        }
      }
    }
  }

  ensureUniqueIds(claimCollections, "claim collection", domainPath, findings);
  for (const collection of claimCollections) {
    const claimTypes = recordsAt(collection, "claim_types");
    ensureUniqueIds(claimTypes, `claim type in ${String(collection.id)}`, domainPath, findings);
    for (const claimType of claimTypes) {
      for (const field of ["evaluator_right", "determiner_right"] as const) {
        const right = claimType[field];
        if (typeof right === "string" && !rightIds.has(right)) {
          addFinding(findings, "error", "broken-local-reference", domainPath, `Claim ${String(claimType.id)} references missing ${field} ${JSON.stringify(right)}.`);
        }
      }
      if (isRecord(claimType.human_review_policy) && typeof claimType.human_review_policy.reviewer_right === "string" && !rightIds.has(claimType.human_review_policy.reviewer_right)) {
        addFinding(findings, "error", "broken-local-reference", domainPath, `Claim ${String(claimType.id)} reviewer right does not resolve.`);
      }
      if (isRecord(claimType.rubric) && typeof claimType.rubric.resource_id === "string" && !isExternalReference(claimType.rubric.resource_id) && !resourceIds.has(claimType.rubric.resource_id)) {
        addFinding(findings, "error", "broken-local-reference", domainPath, `Claim ${String(claimType.id)} rubric does not resolve.`);
      }
      for (const requirement of recordsAt(claimType, "evidence_requirements")) {
        if (typeof requirement.resource_id === "string" && !isExternalReference(requirement.resource_id) && !resourceIds.has(requirement.resource_id)) {
          addFinding(findings, "error", "broken-local-reference", domainPath, `Claim ${String(claimType.id)} evidence resource ${JSON.stringify(requirement.resource_id)} does not resolve.`);
        }
      }
      const allowedOutcomes = new Set(Array.isArray(claimType.allowed_outcomes) ? claimType.allowed_outcomes : []);
      const reviewRequiredFor = isRecord(claimType.human_review_policy) && Array.isArray(claimType.human_review_policy.required_for)
        ? claimType.human_review_policy.required_for
        : [];
      if (reviewRequiredFor.length === 0 && !allowedOutcomes.has("disputed") && !allowedOutcomes.has("manual_review_required")) {
        addFinding(findings, "warning", "claim-without-review-path", domainPath, `Claim ${String(claimType.id)} lacks a human-review or dispute path.`);
      }
      for (const action of recordsAt(claimType, "next_actions")) {
        if (!allowedOutcomes.has(action.outcome)) {
          addFinding(findings, "error", "incomplete-claim-contract", domainPath, `Claim ${String(claimType.id)} next action uses undeclared outcome ${JSON.stringify(action.outcome)}.`);
        }
        if (typeof action.flow_id !== "string" || !flowById.has(action.flow_id)) {
          addFinding(findings, "error", "broken-local-reference", domainPath, `Claim ${String(claimType.id)} next action flow does not resolve.`);
        } else if (typeof action.transition !== "string" || !flowById.get(action.flow_id)!.transitions.has(action.transition)) {
          addFinding(findings, "error", "broken-local-reference", domainPath, `Claim ${String(claimType.id)} next action transition does not resolve.`);
        }
      }
    }
  }

  const sensitiveLevels = new Set(["restricted", "regulated"]);
  const hasSensitiveData =
    entries.some((entry) => typeof entry.sensitivity === "string" && sensitiveLevels.has(entry.sensitivity))
    || resourceEntries.some((entry) => typeof entry.sensitivity === "string" && sensitiveLevels.has(entry.sensitivity))
    || claimCollections.some((collection) => recordsAt(collection, "claim_types").some((claimType) =>
      recordsAt(claimType, "evidence_requirements").some((requirement) =>
        typeof requirement.sensitivity === "string" && sensitiveLevels.has(requirement.sensitivity))));
  const notApplicable = new Set(
    isRecord(data.documents) && Array.isArray(data.documents.not_applicable)
      ? data.documents.not_applicable.filter((item): item is string => typeof item === "string")
      : [],
  );
  const expectedOperationalDocs: Array<[string, boolean, string]> = [
    ["operations", podEntries.some((pod) => recordsAt(pod, "flows").length > 0), "the domain has live flows"],
    ["governance", typeof domainType === "string" && ["dao", "organisation", "project", "pod"].includes(domainType), "control is collective"],
    ["agents", agentEntries.length > 0, "at least one agent operates"],
    ["data-policy", hasSensitiveData, "restricted or regulated data flows through the domain"],
  ];
  for (const [expectedRole, expected, reason] of expectedOperationalDocs) {
    if (expected && !roles.includes(expectedRole) && !notApplicable.has(expectedRole)) {
      addFinding(
        findings,
        "warning",
        "operational-doc-expected",
        domainPath,
        `Expected operational document role ${JSON.stringify(expectedRole)} because ${reason}; add it or record it in documents.not_applicable.`,
      );
    }
  }

  return profile;
}

function validateTemplate(
  templatePath: string,
  text: string,
  expectedProtocol: string | undefined,
  expectedType: string | undefined,
  findings: Finding[],
): void {
  const parts = resolve(templatePath).split(sep);
  const templatesIndex = parts.lastIndexOf("templates");
  if (templatesIndex < 0 || templatesIndex + 1 >= parts.length) {
    addFinding(findings, "error", "template-path", templatePath, "Template path must be below templates/<derived-type>/.");
  } else if (expectedType !== undefined && parts[templatesIndex + 1] !== expectedType) {
    addFinding(
      findings,
      "error",
      "template-path-type",
      templatePath,
      `Template path type is ${JSON.stringify(parts[templatesIndex + 1])}, expected ${JSON.stringify(expectedType)}.`,
    );
  }

  const data = parseFrontmatter(templatePath, text, findings);
  if (!data) {
    return;
  }
  if (!isRecord(data["x-template"]) || data["x-template"].is_template !== true) {
    addFinding(findings, "error", "template-marker", templatePath, "Template marker is missing or false.");
    return;
  }
  const marker = data["x-template"];
  const instantiated = marker.instantiates_type;
  if (typeof instantiated !== "string" || instantiated === "" || instantiated === "protocol") {
    addFinding(findings, "error", "template-type", templatePath, "instantiates_type must be a non-protocol type.");
  } else if (expectedType !== undefined && instantiated !== expectedType) {
    addFinding(findings, "error", "template-type-mismatch", templatePath, `Expected instantiates_type ${JSON.stringify(expectedType)}.`);
  }
  const protocol = marker.protocol;
  if (typeof protocol !== "string" || protocol.trim() === "") {
    addFinding(findings, "error", "template-protocol", templatePath, "Template protocol DID is required.");
  } else if (expectedProtocol !== undefined && protocol !== expectedProtocol) {
    addFinding(findings, "error", "template-protocol-mismatch", templatePath, `Expected protocol ${JSON.stringify(expectedProtocol)}.`);
  }
  if (!basename(templatePath).endsWith(".tmpl")) {
    addFinding(findings, "error", "template-suffix", templatePath, "Template filename must end in .tmpl.");
  }
}

function usage(message?: string): never {
  if (message) {
    console.error(`ERROR invocation: ${message}`);
  }
  console.error(
    "Usage: npx tsx scripts/validate-render.ts <root> --mode derived|protocol|standalone|template " +
      "[--expected-profile authoring_draft|persisted_draft|anchored|runtime] [--expected-class DID] " +
      "[--expected-protocol DID] [--expected-type TYPE] [--json]",
  );
  process.exit(2);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: CliArgs = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--version") {
      console.log(`validate-render.ts ${VALIDATOR_VERSION}`);
      process.exit(0);
    } else if (value === "--json") {
      args.json = true;
    } else if (value === "--mode") {
      const mode = argv[++index];
      if (mode !== "derived" && mode !== "protocol" && mode !== "standalone" && mode !== "template") {
        usage("--mode requires derived, protocol, standalone, or template.");
      }
      args.mode = mode;
    } else if (value === "--expected-profile") {
      const profile = argv[++index];
      if (profile !== "authoring_draft" && profile !== "persisted_draft" && profile !== "anchored" && profile !== "runtime") {
        usage("--expected-profile requires authoring_draft, persisted_draft, anchored, or runtime.");
      }
      args.expectedProfile = profile;
    } else if (value === "--expected-class") {
      args.expectedClass = argv[++index] ?? usage("--expected-class requires a value.");
    } else if (value === "--expected-protocol") {
      args.expectedProtocol = argv[++index] ?? usage("--expected-protocol requires a value.");
    } else if (value === "--expected-type") {
      args.expectedType = argv[++index] ?? usage("--expected-type requires a value.");
    } else if (value.startsWith("--")) {
      usage(`Unknown option ${value}.`);
    } else if (args.root === undefined) {
      args.root = value;
    } else {
      usage(`Unexpected argument ${value}.`);
    }
  }
  if (!args.root) {
    usage("root is required.");
  }
  if (!args.mode) {
    usage("--mode is required.");
  }
  return args as ParsedArgs;
}

export async function main(options: MainOptions): Promise<ValidationReport> {
  const root = resolve(options.root);
  const findings: Finding[] = [];
  let profile: ConformanceProfile | null = null;

  if (options.mode === "derived" && !options.expectedClass) {
    addFinding(findings, "error", "expected-class-required", root, "Derived mode requires --expected-class.");
  }
  if (options.mode === "template") {
    if (!options.expectedProtocol) {
      addFinding(findings, "error", "expected-protocol-required", root, "Template mode requires --expected-protocol.");
    }
    if (!options.expectedType) {
      addFinding(findings, "error", "expected-type-required", root, "Template mode requires --expected-type.");
    }
  }

  let rootStat;
  try {
    rootStat = lstatSync(root);
  } catch (error) {
    addFinding(findings, "error", "input-missing", root, String(error));
  }

  if (options.mode === "template") {
    if (!rootStat?.isFile() || rootStat.isSymbolicLink()) {
      addFinding(findings, "error", "template-input", root, "Template mode requires one regular file.");
    } else {
      const text = loadText(root, findings);
      if (text !== undefined) {
        validateTemplate(root, text, options.expectedProtocol, options.expectedType, findings);
      }
    }
  } else if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) {
    addFinding(findings, "error", "package-input", root, "Rendered package root must be a regular directory.");
  } else {
    const texts = validateCommonFiles(root, options.mode, findings);
    const domainPath = join(root, "domain.md");
    const domainText = texts.get(domainPath);
    if (domainText === undefined) {
      addFinding(findings, "error", "domain-file", domainPath, "domain.md is missing or unreadable.");
    } else {
      if (Buffer.byteLength(domainText, "utf8") > MAX_DOMAIN_BYTES) {
        addFinding(findings, "error", "file-too-large", domainPath, `domain.md exceeds ${MAX_DOMAIN_BYTES} bytes.`);
      }
      profile = validateDomain(
        domainPath,
        domainText,
        options.mode,
        options.expectedProfile,
        options.expectedClass,
        findings,
      );
    }
  }

  const errors = findings.filter((item) => item.severity === "error").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  return {
    validator: "domain-author/validate-render.ts",
    validator_version: VALIDATOR_VERSION,
    mode: options.mode,
    profile,
    root,
    ok: errors === 0,
    errors,
    warnings,
    findings,
    scope: "static schema and semantic conformance; external CID, canonical-state, capability, freshness, and runtime authorization checks remain required",
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  main({
    root: args.root,
    mode: args.mode,
    expectedProfile: args.expectedProfile,
    expectedClass: args.expectedClass,
    expectedProtocol: args.expectedProtocol,
    expectedType: args.expectedType,
  })
    .then((report) => {
      if (args.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        for (const item of report.findings) {
          console.log(`${item.severity.toUpperCase()} ${item.code} ${item.path}: ${item.message}`);
        }
        console.log(report.ok ? "PASS" : `FAIL (${report.errors} errors)`);
        console.log(report.scope);
      }
      process.exitCode = report.ok ? 0 : 1;
    })
    .catch((error: unknown) => {
      console.error(`ERROR validator: ${String(error)}`);
      process.exitCode = 2;
    });
}
