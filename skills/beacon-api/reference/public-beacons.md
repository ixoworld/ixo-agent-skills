# Public Beacons for Development

Use these endpoints for client development, examples, and smoke checks. Public Beacon behavior changes over time, so run `/info`, `/configuration`, `/entry_types`, `/map`, and `/filtering_terms` before relying on a query.

## Progenetix / bycon

- Base URL: `https://progenetix.org/beacon/`
- Status: public production Beacon, Beacon+ / bycon implementation.
- Good for: public record-level examples, biosample filtering, CNV and variant queries, endpoint discovery, testing response parsing.
- Live identity check:

```bash
curl -fsS https://progenetix.org/beacon/info \
  | jq '.response.id, .response.name, .meta.apiVersion'
```

Notes: Progenetix commonly returns record-level data publicly and currently reports a Beacon+ API version. It accepts NCIT disease filters such as `NCIT:C3058` and supports the canonical `NC_000017.11` sequence query shape.

## ELIXIR / BSC Beacon Network

- Live v2 backend: `https://beacons.bsc.es/beacon-network/v2.0.0/`
- Legacy/public name: ELIXIR Beacon Network. Older references may mention `https://beacon-network.elixir-europe.org/`.
- Status: federated aggregator / Meta-Beacon.
- Good for: testing network fan-out and grouped per-Beacon responses.

```bash
curl -fsS https://beacons.bsc.es/beacon-network/v2.0.0/info \
  | jq '.response.id, .response.name, .meta.apiVersion'
curl -fsS https://beacons.bsc.es/beacon-network/v2.0.0/configuration \
  | jq '.response.securityAttributes, (.response.entryTypes | keys)'
```

Notes: Current network responses expose per-Beacon groups under `response.resultSets[]` with `beaconId`. Use POST for structured network queries; GET fan-out can be slower or implementation-sensitive.

## Beacon v2 Reference / Production Implementations

- Reference implementation repo: `https://github.com/EGA-archive/beacon2-ri-api`
- Production implementation repo: `https://github.com/EGA-archive/beacon2-pi-api`
- Good for: checking implementation behavior, local Beacon test fixtures, request body examples, and deployment assumptions.

Notes: These repos are implementation references, not always public live data endpoints. Hosted EGA or controlled-access Beacons may require authentication and GA4GH Passport-compatible tokens.

## Registry and Current Implementations

- Beacon implementations registry: `https://genomebeacons.org/implementations/`
- Progenetix implementation page: `https://docs.genomebeacons.org/implementations/org.progenetix/`
- Beacon protocol docs: `https://docs.genomebeacons.org/`
- Main spec/source repo: `https://github.com/ga4gh-beacon/beacon-v2`

Use the registry for the current list of Beacons. Treat any static URL list as a starting point, not an uptime guarantee.

## Auth-Gated Beacons

Some Beacons return only boolean or count data anonymously and require OAuth bearer tokens, registered identity, controlled-access approval, or GA4GH Passport-style credentials for record-level responses.

```bash
TOKEN="..."
curl -fsS "$BASE/g_variants?geneId=BRCA1&requestedGranularity=record" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.responseSummary'
```

Never assume anonymous access to record data. Check `/configuration.securityAttributes` first, and expect a Beacon to cap requested granularity.
