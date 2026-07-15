---
name: beacon-api
description: Use when working with the GA4GH Beacon v2 API - discovering or querying federated genomics beacons, building requests against /g_variants, /individuals, /biosamples, /analyses, /runs, /datasets, /cohorts, /filtering_terms, /configuration, /entry_types, /map, /info, /service-info; or interpreting beacon responses (boolean/count/record granularity, resultSets). Triggers on URLs like progenetix.org/beacon/, beacon-network.elixir-europe.org, and on terms like Beacon v2, GA4GH Beacon, g_variants, beacon network.
---

# GA4GH Beacon v2 API

Use this skill when an agent needs to discover or query GA4GH Beacon v2 endpoints as a client. It is consumer-focused: query Beacons, inspect responses, and build curl or TypeScript requests. Do not use it as hosting or server-implementation guidance.

## What Beacon Is

Beacon is a discovery protocol for genomic and phenoclinical data. A client asks whether records exist, how many records match, or which records can be returned. It is not a bulk data download API. Federated Beacon networks let many independent Beacons share one API contract so the same query can be sent to multiple holders.

## Decision Flow

1. If the user asks "does anything match?", use `requestedGranularity=boolean`.
2. If they ask "how many?", use `requestedGranularity=count`.
3. If they ask "which records?", use `requestedGranularity=record`; expect authentication or redaction on many Beacons.
4. If they do not know what exists, start with `/configuration`, `/entry_types`, `/map`, and `/filtering_terms` before querying.
5. If the target is a network or aggregator, issue the same query to the network root and interpret per-Beacon result sets.

## Mandatory Discovery Sequence

Run discovery before composing a serious query:

```bash
BASE="https://progenetix.org/beacon"
curl -fsS "$BASE/info" | jq '.response.id, .response.name'
curl -fsS "$BASE/service-info" | jq '.response // .'
curl -fsS "$BASE/configuration" | jq '.response.securityAttributes, .response.entryTypes | keys'
curl -fsS "$BASE/entry_types" | jq '.response'
curl -fsS "$BASE/map" | jq '.response'
curl -fsS "$BASE/filtering_terms?limit=20" | jq '.response.filteringTerms // .response.resultSets[0].results'
```

- `/info` confirms the Beacon is alive and returns Beacon-native metadata.
- `/service-info` returns the GA4GH Service Info form when implemented.
- `/configuration` reports entry types, default granularity, production status, and security levels.
- `/entry_types` and `/map` reveal which endpoints actually exist and how related endpoints are exposed.
- `/filtering_terms` lists ontology or local terms accepted in `filters`, often NCIT, EFO, HP, MONDO, or implementation-specific terms.

## Variant Query Cheat Sheet

Beacon coordinates use 0-based interbase positions inherited from Beacon v1. Convert carefully from 1-based VCF-style positions. `referenceName` may be a chromosome name such as `17` or a sequence accession such as `NC_000017.11`; check `/configuration` and live examples because implementations differ.

Sequence query for an SNV or small INDEL:

```bash
curl -fsS 'https://progenetix.org/beacon/g_variants?referenceName=NC_000017.11&start=7577120&referenceBases=G&alternateBases=A' \
  | jq '.responseSummary'
```

Required parameters: `referenceName`, single `start`, `referenceBases`, `alternateBases`.

Range query for variants overlapping a region:

```bash
BASE="https://your-beacon.example/beacon"
curl -fsS "$BASE/g_variants?assemblyId=GRCh38&referenceName=17&start=7572837&end=7578641&requestedGranularity=count" \
  | jq '.responseSummary'
```

Required parameters: `referenceName`, single `start`, single `end`. Optional scoping: `variantType`, `alternateBases`, `aminoacidChange`, `variantMinLength`, `variantMaxLength`.

Bracket query for fuzzy structural variants:

```bash
curl -fsS 'https://progenetix.org/beacon/g_variants?assemblyId=GRCh38&referenceName=17&variantType=DEL&filterLogic=AND&start=7500000,7676592&end=7669607,7800000' \
  | jq '.responseSummary'
```

Required parameters: `referenceName`, two `start` values and two `end` values. In GET requests, encode arrays as comma-concatenated values such as `start=min,max`.

GeneId query for gene-centered variants:

```bash
curl -fsS 'https://progenetix.org/beacon/g_variants?geneId=EIF4A1&variantMaxLength=1000000&variantType=DEL&requestedGranularity=count' \
  | jq '.responseSummary'
```

Required parameter: `geneId`, usually an HGNC symbol. Optional scoping: `variantType`, `alternateBases`, `aminoacidChange`, `variantMinLength`, `variantMaxLength`. Gene lookup behavior is implementation-defined, so fall back to range coordinates if a Beacon does not support the symbol you need.

## GET vs POST

Use GET for simple ad-hoc queries with scalar query string parameters. Use POST when you need arrays, multiple filters, pagination, requested schemas, or a request body that can be logged and replayed.

```json
{
  "meta": { "apiVersion": "2.0" },
  "query": {
    "requestParameters": {
      "referenceName": "NC_000017.11",
      "start": [7577120],
      "referenceBases": "G",
      "alternateBases": "A"
    },
    "filters": [{ "id": "NCIT:C3058", "scope": "biosample" }],
    "pagination": { "skip": 0, "limit": 10 },
    "requestedGranularity": "count"
  }
}
```

Some examples in the Beacon documentation wrap genomic parameters under `g_variant` inside `requestParameters`; many live implementations accept the flat form. Use the form shown by the target Beacon's examples, OpenAPI, or error messages.

## Granularity, Auth, and Pagination

`requestedGranularity` may be `boolean`, `count`, or `record`. The Beacon can cap the response at its configured `defaultGranularity` or at the caller's access tier. Security levels are `PUBLIC`, `REGISTERED`, and `CONTROLLED`; record-level detail commonly needs an OAuth bearer token or GA4GH Passport flow.

Use `skip` and `limit` for paging. Default `limit` is often 10. Always inspect `responseSummary.numTotalResults` before paging through record responses.

## Federation

Beacon networks fan out a query to registered Beacons. The aggregator is itself a Beacon, so start with the same discovery sequence. Network responses are grouped per Beacon; current aggregators commonly expose `response.resultSets[]` with `beaconId`, while some clients or older notes may call these response sets.

```bash
curl -fsS -X POST 'https://beacons.bsc.es/beacon-network/v2.0.0/g_variants' \
  -H 'Content-Type: application/json' \
  -d '{"meta":{"apiVersion":"2.0"},"query":{"requestParameters":{"referenceName":"NC_000017.11","start":[7577120],"referenceBases":"G","alternateBases":"A"},"requestedGranularity":"boolean"}}' \
  | jq '.response.resultSets[] | {beaconId, exists}'
```

## Worked Examples

Sequence query against Progenetix:

```bash
curl -fsS 'https://progenetix.org/beacon/g_variants?referenceName=NC_000017.11&start=7577120&referenceBases=G&alternateBases=A' \
  | jq '.responseSummary'
```

```ts
const url = new URL("https://progenetix.org/beacon/g_variants");
url.search = new URLSearchParams({
  referenceName: "NC_000017.11",
  start: "7577120",
  referenceBases: "G",
  alternateBases: "A",
}).toString();

const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
const beacon = await response.json();
console.log(beacon.responseSummary);
```

Disease filter across biosamples:

```bash
curl -fsS 'https://progenetix.org/beacon/biosamples?filters=NCIT:C3058&limit=5' \
  | jq '.responseSummary'
```

```ts
const url = new URL("https://progenetix.org/beacon/biosamples");
url.search = new URLSearchParams({ filters: "NCIT:C3058", limit: "5" }).toString();

const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
const beacon = await response.json();
console.log(beacon.responseSummary);
console.log(beacon.response?.resultSets?.[0]?.results ?? []);
```

## Common Pitfalls

- Using 1-based VCF coordinates instead of Beacon's 0-based interbase coordinates.
- Mixing chromosome names and RefSeq accessions without checking the target Beacon.
- Requesting `record` granularity while unauthenticated or against a boolean-only Beacon.
- Sending repeated `start` query parameters for bracket queries instead of `start=min,max`.
- Assuming every Beacon implements every entry type. Check `/map`.
- Treating `filters` as free text. Discover accepted ontology terms with `/filtering_terms`.
- Assuming a public Beacon's behavior is universal. Beacon v2 permits implementation-specific filtering, schema, and security choices.

## Deeper References

- Load `reference/endpoints.md` for endpoint-by-endpoint behavior and response shapes.
- Load `reference/query-cookbook.md` for eight curl and TypeScript recipes.
- Load `reference/public-beacons.md` for public development Beacons and registry links.
