# Beacon v2 Endpoint Catalog

Use this catalog after loading `SKILL.md` when you need endpoint-specific behavior. Always discover the target Beacon first; Beacon v2 defines the contract, but each instance chooses which entry types, filters, schemas, security tiers, and related endpoints it exposes.

## Common Response Shapes

Data endpoints usually return:

```json
{
  "meta": {},
  "responseSummary": { "exists": true, "numTotalResults": 123 },
  "response": {
    "resultSets": [
      {
        "id": "dataset-or-collection-id",
        "exists": true,
        "resultsCount": 10,
        "results": []
      }
    ]
  }
}
```

`boolean` responses may only include `exists`. `count` responses add `numTotalResults`. `record` responses include records under `response.resultSets[].results`. Network aggregators may include `beaconId` on each result set.

## Service and Discovery Endpoints

### `/`

Root endpoint. Often returns the same service metadata as `/info`, a small welcome document, or links. Use it only to confirm the root path; prefer the explicit discovery endpoints below.

```bash
curl -fsS "$BASE/" | jq '.response // .'
```

### `/info`

Beacon-native service metadata: identifier, name, description, organization, API version, timestamps, and documentation links.

```bash
curl -fsS "$BASE/info" | jq '.response.id, .response.name'
```

### `/service-info`

GA4GH Service Info form. Use when integrating with GA4GH service registries or tools expecting the common Service Info schema.

```bash
curl -fsS "$BASE/service-info" | jq '.response // .'
```

### `/configuration`

Core client-discovery document. Inspect `maturityAttributes.productionStatus`, `securityAttributes.defaultGranularity`, `securityAttributes.securityLevels`, and `entryTypes`.

```bash
curl -fsS "$BASE/configuration" \
  | jq '.response.maturityAttributes, .response.securityAttributes, (.response.entryTypes | keys)'
```

### `/entry_types`

Entry type definitions implemented by this Beacon. Look for model names, default schemas, supported schemas, and whether an entry can be queried by id or by related entries.

```bash
curl -fsS "$BASE/entry_types" | jq '.response'
```

### `/map`

Sitemap-like description of available routes. This is the safest source before calling sub-resources such as `/individuals/{id}/g_variants`.

```bash
curl -fsS "$BASE/map" | jq '.response.endpointSets // .response'
```

### `/filtering_terms`

Filter vocabulary accepted by the Beacon. Terms may be ontology CURIEs such as `NCIT:C3058`, `HP:0001250`, `EFO:0030067`, or local alphanumeric values. Some Beacons support filtering by scope or entry type.

```bash
curl -fsS "$BASE/filtering_terms?limit=20" \
  | jq '.response.filteringTerms // .response.resultSets[0].results'
```

## Entry-Type Endpoints

### `/g_variants`

Genomic variation discovery. Distinguishing query parameters:

- Sequence: `referenceName`, `start`, `referenceBases`, `alternateBases`.
- Range: `referenceName`, `start`, `end`.
- Bracket: `referenceName`, `start=min,max`, `end=min,max`, optional `variantType`.
- Gene: `geneId`, optional `variantType`, `variantMinLength`, `variantMaxLength`, `aminoacidChange`, `alternateBases`.
- Common: `filters`, `datasetIds`, `requestedGranularity`, `skip`, `limit`.

```bash
curl -fsS "$BASE/g_variants?referenceName=NC_000017.11&start=7577120&referenceBases=G&alternateBases=A" \
  | jq '.responseSummary'
```

At record granularity, `response.resultSets[].results[]` contains genomic variation records according to the Beacon's supported schema.

### `/individuals`

Individual-level metadata, often phenotypic or demographic fields with links to biosamples, analyses, runs, datasets, cohorts, and variants. Distinguishing parameters are usually `filters`, `datasetIds`, `skip`, `limit`, and `requestedGranularity`; implementation-specific filters do the real scoping.

```bash
curl -fsS "$BASE/individuals?filters=NCIT:C3058&limit=5" | jq '.responseSummary'
```

Record responses contain individual documents under `response.resultSets[].results[]`.

### `/biosamples`

Biosample-level metadata: sample identifiers, individual linkage, diagnosis, tissue or origin, collection moment, cohorts, and related analyses. Common parameters: `filters`, `datasetIds`, `skip`, `limit`, `requestedGranularity`.

```bash
curl -fsS "$BASE/biosamples?filters=NCIT:C3058&limit=5" \
  | jq '.responseSummary, .response.resultSets[0].results[0].id'
```

Record responses contain biosample documents under `response.resultSets[].results[]`.

### `/analyses`

Analysis records describe processing performed on data, such as pipelines, methods, files, dates, and links to biosamples or runs. Common parameters: `filters`, `datasetIds`, `skip`, `limit`, `requestedGranularity`.

```bash
curl -fsS "$BASE/analyses?limit=5" | jq '.responseSummary'
```

Record responses contain analysis documents under `response.resultSets[].results[]`.

### `/runs`

Run records describe sequencing or assay runs and often connect analyses, biosamples, and datasets. Common parameters: `filters`, `datasetIds`, `skip`, `limit`, `requestedGranularity`.

```bash
curl -fsS "$BASE/runs?limit=5" | jq '.responseSummary'
```

Record responses contain run documents under `response.resultSets[].results[]`.

### `/datasets`

Dataset metadata and collection descriptions. This is a useful first record endpoint because it explains data partitions before querying individuals or variants. Common parameters: `filters`, `skip`, `limit`, `requestedGranularity`.

```bash
curl -fsS "$BASE/datasets?limit=5" | jq '.responseSummary'
```

Record responses contain dataset metadata under `response.resultSets[].results[]`; some Beacons use collection-style responses here.

### `/cohorts`

Cohort metadata and aggregate descriptors. Common parameters: `filters`, `datasetIds`, `skip`, `limit`, `requestedGranularity`.

```bash
curl -fsS "$BASE/cohorts?limit=5" | jq '.responseSummary'
```

Record responses contain cohort documents under `response.resultSets[].results[]`.

## Sub-Resource Pattern

Beacon routes can expose single-entry and related-entry resources:

```text
/{entryType}/{id}
/{entryType}/{id}/{relatedEntryType}
```

Examples:

```bash
curl -fsS "$BASE/biosamples/pgxbs-m84d2qtr" | jq '.responseSummary'
curl -fsS "$BASE/biosamples/pgxbs-m84d2qtr/analyses" | jq '.responseSummary'
curl -fsS "$BASE/individuals/{id}/g_variants" | jq '.responseSummary'
curl -fsS "$BASE/g_variants/{id}/biosamples" | jq '.responseSummary'
```

Do not assume these exist. Confirm support in `/map`; related-entry paths are the first place implementations diverge.
