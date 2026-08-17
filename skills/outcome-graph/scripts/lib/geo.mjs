/**
 * Integer geodesy — the RFC-005 §3 reference implementation, offered upstream when the
 * engine activates the geo v2 surface (owner read 2026-08-16: not in the next few
 * milestones; until then the graph oracle serves these same semantics as ExternalSource
 * checks — service/checks.mjs `within-boundary` / `within-radius`).
 *
 * Everything here is integer arithmetic over micro-degree coordinates (1e-6°, GPS-native);
 * BigInt wherever a product can exceed 2^53. No floats anywhere on the decision path, the
 * same rule as basis points — two implementations of this spec must agree on every input,
 * bit for bit. Conformance vectors: geo-vectors.json (portable; run by
 * service/test/geo.test.mjs).
 *
 * NORMATIVE semantics (the "three sentences" rfc-005 §3.4 asks to pin, plus the radius
 * formula §3.1 makes part of the spec):
 *
 *   1. On-boundary counts as within (>=-style closure). A point on any ring edge or
 *      vertex — exterior or hole — is within.
 *   2. MultiPolygon = any-polygon containment. Within a polygon = inside its exterior
 *      ring and not strictly inside any of its hole rings; holes are respected.
 *   3. Canonical boundaries are pre-split at the antimeridian (RFC 7946 §3.1.9): no ring
 *      edge may span more than 180e6 micro-degrees of longitude. Both lon +180e6 and
 *      -180e6 are legal vertex values (split rings need both signs); a query point with
 *      |lon| = 180e6 is tested under both signs and is within if either is.
 *   4. withinRadius: equirectangular approximation on a sphere of radius R = 6_371_000 m.
 *      north = dLat * K, east = wrappedDLon * K * cos(centerLat), with K and cos as the
 *      pinned Q31 fixed-point constants/algorithm below. Compare squared Q31-meter
 *      distances; on-circle counts as within (<=). cos is evaluated at the CENTER point's
 *      latitude. dLon wraps to the shortest signed difference.
 *
 * Ring conventions (validated by validateBoundary): closed (first position repeated
 * last), >= 4 positions, positions are [lonMicro, latMicro] integer pairs, exterior rings
 * counterclockwise / holes clockwise (RFC 7946 right-hand rule), nonzero area. Full
 * geometric validity (no self-intersection, holes inside their exterior) and byte-level
 * canonicalization (start vertex, polygon order) are authoring discipline: any
 * re-encoding changes the boundary's content address, which consumers verify.
 */

export const MICRO = 1_000_000;
export const LAT_MAX = 90 * MICRO;
export const LON_MAX = 180 * MICRO;

/** Q31 fixed-point scale for the radius math. */
const Q = 2n ** 31n;
/** round(PI * 2^31) — pinned. */
const PI_Q31 = 6_746_518_852n;
/** Meters per micro-degree of latitude: round(PI * 6_371_000 / 180e6 * 2^31) — pinned. */
const K_Q31 = 238_789_287n;

export const RADIUS_CONSTANTS = { Q31: Q, PI_Q31, K_Q31, SPHERE_RADIUS_M: 6_371_000 };

export function isMicroLat(v) {
  return Number.isInteger(v) && v >= -LAT_MAX && v <= LAT_MAX;
}

/** Both +180e6 and -180e6 are legal (antimeridian-split rings use both signs). */
export function isMicroLon(v) {
  return Number.isInteger(v) && v >= -LON_MAX && v <= LON_MAX;
}

// ---- exact primitives ------------------------------------------------------------------

/** Cross product (b - a) x (p - a) in BigInt — sign is the side of p relative to a->b. */
function cross(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

const min = (a, b) => (a < b ? a : b);
const max = (a, b) => (a > b ? a : b);

/** Exact: p lies on the closed segment a-b. All args BigInt. */
function onSegment(ax, ay, bx, by, px, py) {
  if (cross(ax, ay, bx, by, px, py) !== 0n) return false;
  return (
    px >= min(ax, bx) && px <= max(ax, bx) && py >= min(ay, by) && py <= max(ay, by)
  );
}

/** Point lies on any edge (or vertex) of the closed ring. */
export function pointOnRing(lonMicro, latMicro, ring) {
  const px = BigInt(lonMicro);
  const py = BigInt(latMicro);
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = BigInt(ring[i][0]);
    const ay = BigInt(ring[i][1]);
    const bx = BigInt(ring[i + 1][0]);
    const by = BigInt(ring[i + 1][1]);
    if (onSegment(ax, ay, bx, by, px, py)) return true;
  }
  return false;
}

/**
 * Strict interior test: exact integer ray casting (+lon ray, half-open vertex rule).
 * Behavior for points exactly on the ring is unspecified — callers test pointOnRing first
 * (rule 1 closure makes those "within" before this runs).
 */
export function pointInRing(lonMicro, latMicro, ring) {
  const px = BigInt(lonMicro);
  const py = BigInt(latMicro);
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = BigInt(ring[i][0]);
    const ay = BigInt(ring[i][1]);
    const bx = BigInt(ring[i + 1][0]);
    const by = BigInt(ring[i + 1][1]);
    if (ay > py !== by > py) {
      // Ray crosses iff the horizontal-line intersection lies strictly east of p:
      // sign of cross(a,b,p), flipped with the edge's vertical direction.
      const d = cross(ax, ay, bx, by, px, py);
      if (by > ay ? d > 0n : d < 0n) inside = !inside;
    }
  }
  return inside;
}

/**
 * Rule 1 + 2 for one polygon = [exterior, ...holes].
 * Returns "boundary" | "interior" | "outside".
 */
export function pointInPolygon(lonMicro, latMicro, polygon) {
  for (const ring of polygon) {
    if (pointOnRing(lonMicro, latMicro, ring)) return "boundary";
  }
  if (!pointInRing(lonMicro, latMicro, polygon[0])) return "outside";
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lonMicro, latMicro, polygon[i])) return "outside";
  }
  return "interior";
}

/**
 * The withinBoundary operator over a canonical MultiPolygon coordinates array.
 * Returns { within, relation, polygon } — polygon is the index of the first containing
 * polygon (document order; deterministic), -1 when outside. Rule 3: a point with
 * |lon| = 180e6 is retried under the opposite sign if the given sign misses.
 */
export function withinBoundary(lonMicro, latMicro, multiPolygon) {
  const attempt = (lon) => {
    for (let i = 0; i < multiPolygon.length; i++) {
      const relation = pointInPolygon(lon, latMicro, multiPolygon[i]);
      if (relation !== "outside") return { within: true, relation, polygon: i };
    }
    return null;
  };
  const hit =
    attempt(lonMicro) ??
    (Math.abs(lonMicro) === LON_MAX ? attempt(-lonMicro) : null);
  return hit ?? { within: false, relation: "outside", polygon: -1 };
}

// ---- pinned cosine ---------------------------------------------------------------------

/**
 * cos(latMicro) in Q31, |latMicro| <= 90e6. NORMATIVE algorithm (not merely this file's
 * choice): x = |latMicro| * PI_Q31 / 180e6 (truncating), xx = x*x/Q, then the alternating
 * even Taylor series through the x^10 term with each term computed as
 * term_k = term_{k-1} * xx / (Q * (2k-1) * (2k)) in exactly that order (single truncating
 * BigInt division), summed t0 - t1 + t2 - t3 + t4 - t5 and clamped to [0, Q]. Absolute
 * error < 2e-6 of full scale over the domain — sub-meter at claim radii.
 */
export function cosQ31(latMicro) {
  const x = (BigInt(Math.abs(latMicro)) * PI_Q31) / 180_000_000n;
  const xx = (x * x) / Q;
  let term = Q;
  let acc = Q;
  let sign = -1n;
  for (let k = 1; k <= 5; k++) {
    term = (term * xx) / (Q * BigInt((2 * k - 1) * 2 * k));
    acc += sign * term;
    sign = -sign;
  }
  if (acc < 0n) return 0n;
  if (acc > Q) return Q;
  return acc;
}

// ---- radius ----------------------------------------------------------------------------

/** Shortest signed longitude difference in micro-degrees (wraps the antimeridian). */
export function wrapLonDiff(lonA, lonB) {
  const span = 360 * MICRO;
  let d = (lonA - lonB) % span;
  if (d > LON_MAX) d -= span;
  if (d < -LON_MAX) d += span;
  return d;
}

/** Floor integer square root (BigInt, Newton). */
function isqrt(n) {
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/**
 * The withinRadius operator (rule 4). radiusMeters is an integer; on-circle is within.
 * Returns { within, distanceMeters } — distanceMeters is the floor integer meter distance
 * under the same pinned math (safe for reason strings; byte-stable).
 */
export function withinRadius(pLonMicro, pLatMicro, cLonMicro, cLatMicro, radiusMeters) {
  const dLat = BigInt(Math.abs(pLatMicro - cLatMicro));
  const dLon = BigInt(Math.abs(wrapLonDiff(pLonMicro, cLonMicro)));
  const northQ = dLat * K_Q31; // meters * 2^31
  const eastQ = (dLon * K_Q31 * cosQ31(cLatMicro)) / Q;
  const dist2 = northQ * northQ + eastQ * eastQ;
  const radiusQ = BigInt(radiusMeters) * Q;
  return {
    within: dist2 <= radiusQ * radiusQ,
    distanceMeters: Number(isqrt(dist2) / Q),
  };
}

// ---- canonical-boundary validation -----------------------------------------------------

/** Exact shoelace sum sign: > 0 counterclockwise, < 0 clockwise, 0 degenerate. */
function ringOrientation(ring) {
  let acc = 0n;
  for (let i = 0; i < ring.length - 1; i++) {
    acc +=
      BigInt(ring[i][0]) * BigInt(ring[i + 1][1]) -
      BigInt(ring[i + 1][0]) * BigInt(ring[i][1]);
  }
  return acc === 0n ? 0 : acc > 0n ? 1 : -1;
}

/**
 * Validates a canonical boundary geometry (the deterministic, cheap invariants; see the
 * module header for what stays authoring discipline). Returns [] when valid, else
 * messages. Geometry shape: { type: "MultiPolygon", coordinates: [[[ [lon,lat], ... ]]] }.
 */
export function validateBoundary(geometry) {
  const msgs = [];
  if (geometry?.type !== "MultiPolygon") {
    return [`geometry.type must be "MultiPolygon" (got ${JSON.stringify(geometry?.type)})`];
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    return ["coordinates must be a non-empty array of polygons"];
  }
  geometry.coordinates.forEach((polygon, p) => {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      msgs.push(`polygon ${p}: must be a non-empty array of rings`);
      return;
    }
    polygon.forEach((ring, r) => {
      const at = `polygon ${p} ring ${r}`;
      if (!Array.isArray(ring) || ring.length < 4) {
        msgs.push(`${at}: needs >= 4 positions (closed ring)`);
        return;
      }
      for (const pos of ring) {
        if (
          !Array.isArray(pos) ||
          pos.length !== 2 ||
          !isMicroLon(pos[0]) ||
          !isMicroLat(pos[1])
        ) {
          msgs.push(`${at}: positions must be [lonMicro, latMicro] integer pairs in range`);
          return;
        }
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        msgs.push(`${at}: not closed (first position must repeat as last)`);
        return;
      }
      for (let i = 0; i < ring.length - 1; i++) {
        if (Math.abs(ring[i][0] - ring[i + 1][0]) > LON_MAX) {
          msgs.push(
            `${at}: edge ${i} spans the antimeridian — split the geometry (RFC 7946 §3.1.9)`,
          );
          return;
        }
      }
      const orientation = ringOrientation(ring);
      if (orientation === 0) msgs.push(`${at}: zero-area ring`);
      else if (r === 0 && orientation !== 1) {
        msgs.push(`${at}: exterior ring must be counterclockwise`);
      } else if (r > 0 && orientation !== -1) {
        msgs.push(`${at}: hole ring must be clockwise`);
      }
    });
  });
  return msgs;
}
