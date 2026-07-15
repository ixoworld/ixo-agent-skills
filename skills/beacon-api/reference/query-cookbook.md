# Beacon Query Cookbook

Each recipe includes curl and TypeScript. Replace `BASE` after running the discovery sequence from `SKILL.md`.

## 1. Does This Beacon Contain a Specific SNV?

Use a sequence query and ask only for a boolean answer. This is the cheapest form and is closest to the original Beacon pattern.

```bash
BASE="https://progenetix.org/beacon"
curl -fsS "$BASE/g_variants?referenceName=NC_000017.11&start=7577120&referenceBases=G&alternateBases=A&requestedGranularity=boolean" \
  | jq '.responseSummary'
```

```ts
const base = "https://progenetix.org/beacon";
const url = new URL(`${base}/g_variants`);
url.search = new URLSearchParams({
  referenceName: "NC_000017.11",
  start: "7577120",
  referenceBases: "G",
  alternateBases: "A",
  requestedGranularity: "boolean",
}).toString();
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
console.log((await response.json()).responseSummary);
```

## 2. Count BRCA1 Variants

Use a `geneId` query with count granularity on a Beacon that indexes HGNC symbols. Gene lookup is implementation-defined; if `BRCA1` is unsupported, check `/filtering_terms` or convert the gene to a range query for that reference build.

```bash
BASE="https://your-beacon.example/beacon"
curl -fsS "$BASE/g_variants?geneId=BRCA1&requestedGranularity=count" \
  | jq '.responseSummary'
```

```ts
const base = "https://your-beacon.example/beacon";
const url = new URL(`${base}/g_variants`);
url.search = new URLSearchParams({
  geneId: "BRCA1",
  requestedGranularity: "count",
}).toString();
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
console.log((await response.json()).responseSummary);
```

Verified public Progenetix gene-query shape:

```bash
curl -fsS 'https://progenetix.org/beacon/g_variants?geneId=EIF4A1&variantMaxLength=1000000&variantType=DEL&requestedGranularity=count' \
  | jq '.responseSummary'
```

## 3. Find Structural Deletions Overlapping TP53

Use a bracket query for fuzzy structural variants. The two `start` values and two `end` values define tolerated intervals around the structural variant breakpoints; encode arrays as comma-concatenated strings in GET requests.

```bash
BASE="https://progenetix.org/beacon"
curl -fsS "$BASE/g_variants?assemblyId=GRCh38&referenceName=17&variantType=DEL&filterLogic=AND&start=7500000,7676592&end=7669607,7800000" \
  | jq '.responseSummary'
```

```ts
const base = "https://progenetix.org/beacon";
const url = new URL(`${base}/g_variants`);
url.search = new URLSearchParams({
  assemblyId: "GRCh38",
  referenceName: "17",
  variantType: "DEL",
  filterLogic: "AND",
  start: "7500000,7676592",
  end: "7669607,7800000",
}).toString();
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
console.log((await response.json()).responseSummary);
```

## 4. List Biosamples for a Disease Ontology Term

Discover supported disease terms with `/filtering_terms`, then pass the CURIE in `filters`. `NCIT:C3058` is a live Progenetix example.

```bash
BASE="https://progenetix.org/beacon"
curl -fsS "$BASE/biosamples?filters=NCIT:C3058&limit=5" \
  | jq '.responseSummary, .response.resultSets[0].results[].id'
```

```ts
const base = "https://progenetix.org/beacon";
const url = new URL(`${base}/biosamples`);
url.search = new URLSearchParams({ filters: "NCIT:C3058", limit: "5" }).toString();
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
const data = await response.json();
console.log(data.responseSummary);
console.log(data.response?.resultSets?.[0]?.results?.map((row: { id?: string }) => row.id));
```

## 5. Get All Variants for an Individual

Use related-entry sub-resources when `/map` shows they exist. The exact individual id must come from the target Beacon; record access may require authentication.

```bash
BASE="https://your-beacon.example/beacon"
INDIVIDUAL_ID="individual-id-from-this-beacon"
curl -fsS "$BASE/individuals/$INDIVIDUAL_ID/g_variants?limit=10" \
  | jq '.responseSummary, .response.resultSets[0].results'
```

```ts
const base = "https://your-beacon.example/beacon";
const individualId = "individual-id-from-this-beacon";
const url = new URL(`${base}/individuals/${encodeURIComponent(individualId)}/g_variants`);
url.search = new URLSearchParams({ limit: "10" }).toString();
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
console.log(await response.json());
```

## 6. Discover Available Filtering Terms

Call `/filtering_terms` before using ontology filters. Page through terms and inspect `id`, `label`, `type`, and any scope fields the Beacon returns.

```bash
BASE="https://progenetix.org/beacon"
curl -fsS "$BASE/filtering_terms?limit=20" \
  | jq '.response.filteringTerms // .response.resultSets[0].results'
```

```ts
const base = "https://progenetix.org/beacon";
const url = new URL(`${base}/filtering_terms`);
url.search = new URLSearchParams({ limit: "20" }).toString();
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
const data = await response.json();
const terms = data.response?.filteringTerms ?? data.response?.resultSets?.[0]?.results ?? [];
console.log(terms.map((term: { id?: string; label?: string; type?: string }) => term));
```

## 7. Page Through a Large Result Set

Ask for a small page first, read `responseSummary.numTotalResults`, then increment `skip` by `limit`. Keep `limit` moderate because record responses can be large.

```bash
BASE="https://progenetix.org/beacon"
curl -fsS "$BASE/biosamples?filters=NCIT:C3058&skip=0&limit=5" \
  | jq '.responseSummary.numTotalResults, .response.resultSets[0].results[].id'
curl -fsS "$BASE/biosamples?filters=NCIT:C3058&skip=5&limit=5" \
  | jq '.response.resultSets[0].results[].id'
```

```ts
const base = "https://progenetix.org/beacon";
const limit = 5;
for (let skip = 0; skip < 15; skip += limit) {
  const url = new URL(`${base}/biosamples`);
  url.search = new URLSearchParams({
    filters: "NCIT:C3058",
    skip: String(skip),
    limit: String(limit),
  }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const data = await response.json();
  console.log({ skip, total: data.responseSummary?.numTotalResults });
  console.log(data.response?.resultSets?.[0]?.results ?? []);
}
```

## 8. Fan Out Across the Beacon Network

POST to a Beacon network aggregator after discovering its `/configuration` and `/map`. The live BSC/ELIXIR backend is a standard Beacon v2 aggregator. Interpret grouped result sets by `beaconId`; some client libraries describe these as response sets.

```bash
BASE="https://beacons.bsc.es/beacon-network/v2.0.0"
curl -fsS -X POST "$BASE/g_variants" \
  -H 'Content-Type: application/json' \
  -d '{"meta":{"apiVersion":"2.0"},"query":{"requestParameters":{"referenceName":"NC_000017.11","start":[7577120],"referenceBases":"G","alternateBases":"A"},"requestedGranularity":"boolean"}}' \
  | jq '.response.resultSets[] | {beaconId, exists}'
```

```ts
const base = "https://beacons.bsc.es/beacon-network/v2.0.0";
const response = await fetch(`${base}/g_variants`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    meta: { apiVersion: "2.0" },
    query: {
      requestParameters: {
        referenceName: "NC_000017.11",
        start: [7577120],
        referenceBases: "G",
        alternateBases: "A",
      },
      requestedGranularity: "boolean",
    },
  }),
});
if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
const data = await response.json();
console.log(data.response?.resultSets?.map((set: { beaconId?: string; exists?: boolean }) => ({
  beaconId: set.beaconId,
  exists: set.exists,
})));
```
