import { useState } from "react";

/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SYSTEMS INTERVENTION BRIEF — DATA-DRIVEN TEMPLATE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * HOW TO USE THIS TEMPLATE:
 *
 * 1. Replace the ANALYSIS_DATA object below with the
 *    actual analysis results from the systems thinking
 *    exercise. Follow the schema exactly.
 *
 * 2. Save as a .jsx file to the requested output path.
 *
 * The template handles all layout, interaction, and
 * visual design. The agent only needs to populate data.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// ┌──────────────────────────────────────────────────┐
// │  ANALYSIS DATA — REPLACE THIS WITH REAL RESULTS  │
// └──────────────────────────────────────────────────┘

const ANALYSIS_DATA = {

  // ── Metadata ──────────────────────────────────────
  title: "Systems Intervention Brief",
  subtitle: "Challenge title goes here",
  date: "2026-04-19",
  problemOwner: "Name / Role",
  systemBoundary: "One-sentence description of what's inside the analysis scope.",

  // ── Stocks ────────────────────────────────────────
  // visible: measured, on dashboards
  // invisible: unmeasured but influential (trust, morale, etc.)
  stocks: [
    {
      name: "Example Stock",
      type: "visible",         // "visible" | "invisible"
      trend: "declining",      // "growing" | "declining" | "oscillating" | "stable"
      inflows: ["Inflow A", "Inflow B"],
      outflows: ["Outflow A"],
    },
    // Add more stocks...
  ],

  // ── Feedback Loops ────────────────────────────────
  // kind: "reinforcing" = R (self-amplifying)
  //       "balancing"    = B (goal-seeking)
  feedbackLoops: [
    {
      id: "R1",
      name: "Example Virtuous Cycle",
      kind: "reinforcing",     // "reinforcing" | "balancing"
      polarity: "virtuous",    // "virtuous" | "vicious" (for R) or "stabilizing" | "eroding" (for B)
      steps: ["A increases", "B increases", "C increases", "A increases"],
      delay: null,             // null or "3-6 months" etc.
      notes: "Optional context on why this loop matters.",
    },
    // Add more loops...
  ],

  // ── System Traps ──────────────────────────────────
  // Only include traps that are ACTIVE in this system.
  // trapType must be one of the 7 canonical names.
  traps: [
    {
      trapType: "Shifting the Burden",
      evidence: "Description of how this trap manifests in the system.",
      escapeRoute: "The specific escape strategy for this situation.",
      drivingLoops: ["R1"],    // IDs from feedbackLoops
    },
    // Add more traps...
  ],

  // ── Leverage Points ───────────────────────────────
  // level: 1-12 (Meadows hierarchy, 1 = highest leverage)
  // category: "shallow" (12-10) | "medium" (9-7) | "deep" (6-4) | "paradigm" (3-1)
  leveragePoints: [
    {
      level: 6,
      category: "deep",
      label: "Information Flows",
      intervention: "Description of the specific intervention at this leverage level.",
      targetLoops: ["R1"],
      feasibility: "medium",   // "low" | "medium" | "high"
      impact: "high",          // "low" | "medium" | "high"
    },
    // Add more leverage points...
  ],

  // ── Action Plan ───────────────────────────────────
  // Sequenced interventions. phase: "quick-win" | "structural" | "paradigm"
  actions: [
    {
      name: "Intervention Name",
      phase: "quick-win",       // "quick-win" | "structural" | "paradigm"
      leverageLevel: 9,
      targetLoop: "R1",
      mechanism: "How this intervention works through system dynamics.",
      timeline: "0-3 months",
      leadingIndicators: ["Indicator A", "Indicator B"],
      resistanceSources: ["Source A"],
      secondOrderEffects: ["Effect A"],
    },
    // Add more actions...
  ],

  // ── Monitoring Framework ──────────────────────────
  monitoring: {
    stockIndicators: [
      { stock: "Example Stock", indicator: "What to measure", frequency: "Weekly", direction: "increasing" },
    ],
    loopDominance: "Which loops to watch for dominance shifts and how to detect them.",
    delayAwareness: "Key delays in the system and how to distinguish 'patience needed' from 'pivot needed'.",
    adaptiveTriggers: [
      { condition: "If [indicator] hasn't moved by [timeframe]", response: "Escalate to [next leverage level]" },
    ],
  },
};

// ┌──────────────────────────────────────────────────┐
// │        TEMPLATE CODE — DO NOT MODIFY BELOW       │
// └──────────────────────────────────────────────────┘

const COLORS = {
  bg: "#0a0c10",
  surface: "#12151c",
  surfaceHover: "#181c26",
  border: "#1e2433",
  borderAccent: "#2a3148",
  text: "#c8cdd8",
  textMuted: "#6b7280",
  textBright: "#e8ecf4",
  heading: "#f0f2f7",
  accent: "#3b82f6",
  accentDim: "#1e3a5f",
  reinforcing: "#f59e0b",
  reinforcingDim: "rgba(245,158,11,0.08)",
  balancing: "#06b6d4",
  balancingDim: "rgba(6,182,212,0.08)",
  virtuous: "#22c55e",
  vicious: "#ef4444",
  trapRed: "#dc2626",
  trapRedDim: "rgba(220,38,38,0.06)",
  escapeGreen: "#10b981",
  escapeGreenDim: "rgba(16,185,129,0.06)",
  shallow: "#94a3b8",
  medium: "#a78bfa",
  deep: "#f59e0b",
  paradigm: "#ec4899",
  quickWin: "#22c55e",
  structural: "#3b82f6",
  paradigmAction: "#a855f7",
  visible: "#3b82f6",
  invisible: "#a855f7",
  growing: "#22c55e",
  increasing: "#22c55e",
  declining: "#ef4444",
  decreasing: "#ef4444",
  oscillating: "#f59e0b",
  stable: "#6b7280",
};

const LEVERAGE_LABELS = {
  12: "Parameters", 11: "Buffers", 10: "Stock-Flow Structures",
  9: "Delays", 8: "Balancing Feedback", 7: "Reinforcing Feedback",
  6: "Information Flows", 5: "Rules", 4: "Self-Organization",
  3: "Goals", 2: "Mindset / Paradigm", 1: "Transcending Paradigms",
};

const CATEGORY_META = {
  shallow: { color: COLORS.shallow, label: "Shallow Leverage", range: "12–10" },
  medium: { color: COLORS.medium, label: "Medium Leverage", range: "9–7" },
  deep: { color: COLORS.deep, label: "Deep Leverage", range: "6–4" },
  paradigm: { color: COLORS.paradigm, label: "Paradigm Leverage", range: "3–1" },
};

const PHASE_META = {
  "quick-win": { color: COLORS.quickWin, label: "Quick Win", icon: "⚡" },
  structural: { color: COLORS.structural, label: "Structural", icon: "🔧" },
  paradigm: { color: COLORS.paradigmAction, label: "Paradigm", icon: "💡" },
};

const TREND_ICON = { growing: "↗", declining: "↘", oscillating: "↕", stable: "→" };

function categoryForLevel(level) {
  const numericLevel = Number(level);
  if (numericLevel >= 10) return "shallow";
  if (numericLevel >= 7) return "medium";
  if (numericLevel >= 4) return "deep";
  return "paradigm";
}

function metaForCategory(category, level) {
  return CATEGORY_META[category] || CATEGORY_META[categoryForLevel(level)];
}

// ── Shared Components ───────────────────────────────

function Badge({ children, color, style }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
        letterSpacing: 0, textTransform: "uppercase",
        background: color + "18", color, border: `1px solid ${color}30`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children, number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
      {number && (
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.accent,
          background: COLORS.accentDim, padding: "2px 8px", borderRadius: 4,
          fontWeight: 500, letterSpacing: 0,
        }}>
          {number}
        </span>
      )}
      <h2 style={{
        margin: 0, fontSize: 18, fontWeight: 600, color: COLORS.heading,
        fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: 0,
      }}>
        {children}
      </h2>
    </div>
  );
}

function Card({ children, style, onClick, hoverable }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? COLORS.surfaceHover : COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: "16px 20px",
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function LoopChain({ steps, kind }) {
  const color = kind === "reinforcing" ? COLORS.reinforcing : COLORS.balancing;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 8 }}>
      {steps.map((step, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{
            fontSize: 12, color: COLORS.textBright, fontFamily: "'DM Mono', monospace",
            background: kind === "reinforcing" ? COLORS.reinforcingDim : COLORS.balancingDim,
            padding: "3px 8px", borderRadius: 4, border: `1px solid ${color}20`,
          }}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <span style={{ color: color + "80", fontSize: 14, fontWeight: 700 }}>→</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Section Renderers ───────────────────────────────

function HeaderSection({ data }) {
  return (
    <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: COLORS.accent,
          boxShadow: `0 0 12px ${COLORS.accent}60`,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0, textTransform: "uppercase", color: COLORS.accent }}>
          Systems Intervention Brief
        </span>
      </div>
      <h1 style={{
        margin: "8px 0 12px", fontSize: 32, fontWeight: 700, color: COLORS.heading,
        fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: 0, lineHeight: 1.2,
      }}>
        {data.subtitle || data.title}
      </h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13, color: COLORS.textMuted }}>
        <span>{data.date}</span>
        <span style={{ color: COLORS.border }}>·</span>
        <span>{data.problemOwner}</span>
      </div>
      {data.systemBoundary && (
        <p style={{ marginTop: 16, fontSize: 14, color: COLORS.text, lineHeight: 1.6, maxWidth: 720 }}>
          <span style={{ color: COLORS.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0, marginRight: 8 }}>
            System Boundary
          </span>
          {data.systemBoundary}
        </p>
      )}
    </div>
  );
}

function StocksSection({ stocks }) {
  if (!stocks?.length) return null;
  const visible = stocks.filter(s => s.type === "visible");
  const invisible = stocks.filter(s => s.type === "invisible");

  const StockCard = ({ stock }) => {
    const [open, setOpen] = useState(false);
    const trendColor = COLORS[stock.trend] || COLORS.stable;
    return (
      <Card hoverable onClick={() => setOpen(!open)} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, color: trendColor }}>{TREND_ICON[stock.trend] || "→"}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textBright }}>{stock.name}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge color={trendColor}>{stock.trend}</Badge>
            <Badge color={stock.type === "visible" ? COLORS.visible : COLORS.invisible}>{stock.type}</Badge>
            <span style={{ fontSize: 12, color: COLORS.textMuted, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
          </div>
        </div>
        {open && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
            {stock.inflows?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: COLORS.growing, fontWeight: 600, letterSpacing: 0, textTransform: "uppercase" }}>Inflows</span>
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {stock.inflows.map((f, i) => (
                    <span key={i} style={{ fontSize: 12, color: COLORS.text, background: COLORS.surfaceHover, padding: "2px 8px", borderRadius: 4 }}>
                      ← {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stock.outflows?.length > 0 && (
              <div>
                <span style={{ fontSize: 11, color: COLORS.declining, fontWeight: 600, letterSpacing: 0, textTransform: "uppercase" }}>Outflows</span>
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {stock.outflows.map((f, i) => (
                    <span key={i} style={{ fontSize: 12, color: COLORS.text, background: COLORS.surfaceHover, padding: "2px 8px", borderRadius: 4 }}>
                      → {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle number="01">System Stocks</SectionTitle>
      {visible.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.visible, letterSpacing: 0, textTransform: "uppercase", marginBottom: 8 }}>
            Visible · Measured
          </div>
          {visible.map((s, i) => <StockCard key={i} stock={s} />)}
        </div>
      )}
      {invisible.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.invisible, letterSpacing: 0, textTransform: "uppercase", marginBottom: 8 }}>
            Invisible · Unmeasured
          </div>
          {invisible.map((s, i) => <StockCard key={i} stock={s} />)}
        </div>
      )}
    </div>
  );
}

function LoopsSection({ loops }) {
  if (!loops?.length) return null;
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle number="02">Feedback Loops</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loops.map((loop, i) => {
          const color = loop.kind === "reinforcing" ? COLORS.reinforcing : COLORS.balancing;
          const polarityColor = loop.polarity === "virtuous" || loop.polarity === "stabilizing"
            ? COLORS.virtuous : COLORS.vicious;
          return (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color,
                    background: loop.kind === "reinforcing" ? COLORS.reinforcingDim : COLORS.balancingDim,
                    padding: "2px 8px", borderRadius: 4,
                  }}>
                    {loop.id}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textBright }}>{loop.name}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge color={color}>{loop.kind}</Badge>
                  <Badge color={polarityColor}>{loop.polarity}</Badge>
                </div>
              </div>
              <LoopChain steps={loop.steps} kind={loop.kind} />
              {loop.delay && (
                <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>
                  <span style={{ color: COLORS.reinforcing }}>⏱</span> Delay: {loop.delay}
                </div>
              )}
              {loop.notes && (
                <p style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{loop.notes}</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TrapsSection({ traps, loops }) {
  if (!traps?.length) return null;
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle number="03">Active System Traps</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {traps.map((trap, i) => (
          <Card key={i} style={{ borderLeft: `3px solid ${COLORS.trapRed}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.trapRed }}>{trap.trapType}</span>
              {trap.drivingLoops?.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  {trap.drivingLoops.map((lid, j) => {
                    const loop = loops?.find(l => l.id === lid);
                    const c = loop?.kind === "reinforcing" ? COLORS.reinforcing : COLORS.balancing;
                    return <Badge key={j} color={c}>{lid}</Badge>;
                  })}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 12, padding: "10px 14px", background: COLORS.trapRedDim, borderRadius: 6, border: `1px solid ${COLORS.trapRed}15` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.trapRed, textTransform: "uppercase", letterSpacing: 0, marginBottom: 4 }}>Evidence</div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{trap.evidence}</p>
            </div>
            <div style={{ padding: "10px 14px", background: COLORS.escapeGreenDim, borderRadius: 6, border: `1px solid ${COLORS.escapeGreen}15` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.escapeGreen, textTransform: "uppercase", letterSpacing: 0, marginBottom: 4 }}>Escape Route</div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{trap.escapeRoute}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LeverageSection({ points }) {
  if (!points?.length) return null;
  const sorted = [...points].sort((a, b) => Number(a.level || 99) - Number(b.level || 99));

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle number="04">Leverage Point Analysis</SectionTitle>

      {/* Leverage ladder visualization */}
      <div style={{ marginBottom: 20, padding: 20, background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0 }}>
            Leverage Hierarchy — Interventions Mapped
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Array.from({ length: 12 }, (_, i) => 12 - i).map(level => {
            const cat = categoryForLevel(level);
            const meta = metaForCategory(cat, level);
            const hasIntervention = sorted.some(p => Number(p.level) === level);
            const width = `${((13 - level) / 12) * 100}%`;
            return (
              <div key={level} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.textMuted,
                  width: 20, textAlign: "right", flexShrink: 0,
                }}>
                  {level}
                </span>
                <div style={{
                  height: 22, width, borderRadius: 3,
                  background: hasIntervention ? meta.color + "30" : COLORS.surfaceHover,
                  border: hasIntervention ? `1px solid ${meta.color}50` : `1px solid ${COLORS.border}`,
                  display: "flex", alignItems: "center", paddingLeft: 8,
                  transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 10, color: hasIntervention ? meta.color : COLORS.textMuted, fontWeight: 500 }}>
                    {LEVERAGE_LABELS[level]}
                  </span>
                </div>
                {hasIntervention && (
                  <span style={{ fontSize: 14, color: meta.color }}>◆</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 10, color: COLORS.textMuted }}>
          <span>← Low leverage (easy, low impact)</span>
          <span>High leverage (hard, transformational) →</span>
        </div>
      </div>

      {/* Detailed intervention cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((pt, i) => {
          const meta = metaForCategory(pt.category, pt.level);
          return (
            <Card key={i} style={{ borderLeft: `3px solid ${meta.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 800,
                    color: meta.color,
                  }}>
                    {pt.level}
                  </span>
                  <span style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{pt.label}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge color={meta.color}>{meta.label}</Badge>
                  {pt.feasibility && <Badge color={pt.feasibility === "high" ? COLORS.virtuous : pt.feasibility === "medium" ? COLORS.reinforcing : COLORS.vicious}>
                    {pt.feasibility} feasibility
                  </Badge>}
                  {pt.impact && <Badge color={pt.impact === "high" ? COLORS.virtuous : pt.impact === "medium" ? COLORS.reinforcing : COLORS.textMuted}>
                    {pt.impact} impact
                  </Badge>}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{pt.intervention}</p>
              {pt.targetLoops?.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>Targets:</span>
                  {pt.targetLoops.map((lid, j) => <Badge key={j} color={COLORS.accent}>{lid}</Badge>)}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ActionPlanSection({ actions }) {
  if (!actions?.length) return null;
  const phases = ["quick-win", "structural", "paradigm"];
  const grouped = phases.map(p => ({ phase: p, items: actions.filter(a => a.phase === p) })).filter(g => g.items.length > 0);

  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle number="05">Strategic Action Plan</SectionTitle>
      {grouped.map((group, gi) => {
        const meta = PHASE_META[group.phase] || PHASE_META.structural;
        return (
          <div key={gi} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{meta.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: 0 }}>
                {meta.label} Phase
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.items.map((action, ai) => (
                <ActionCard key={ai} action={action} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionCard({ action }) {
  const [open, setOpen] = useState(false);
  const meta = PHASE_META[action.phase] || PHASE_META.structural;
  const leverageMeta = metaForCategory(undefined, action.leverageLevel);
  const leverageLabel = action.leverageLevel ? `L${action.leverageLevel}` : "L?";
  return (
    <Card hoverable onClick={() => setOpen(!open)} style={{ borderLeft: `3px solid ${meta.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textBright }}>{action.name}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Badge color={leverageMeta.color}>
            {leverageLabel}
          </Badge>
          <Badge color={COLORS.accent}>{action.targetLoop}</Badge>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'DM Mono', monospace" }}>{action.timeline}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, display: "grid", gap: 12 }}>
          <DetailRow label="Mechanism" value={action.mechanism} />
          {action.leadingIndicators?.length > 0 && (
            <DetailRow label="Leading Indicators" value={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {action.leadingIndicators.map((ind, k) => (
                  <span key={k} style={{ fontSize: 12, color: COLORS.textBright, background: COLORS.surfaceHover, padding: "2px 8px", borderRadius: 4 }}>
                    {ind}
                  </span>
                ))}
              </div>
            } />
          )}
          {action.resistanceSources?.length > 0 && (
            <DetailRow label="Resistance" value={action.resistanceSources.join("; ")} color={COLORS.vicious} />
          )}
          {action.secondOrderEffects?.length > 0 && (
            <DetailRow label="2nd-Order Effects" value={action.secondOrderEffects.join("; ")} />
          )}
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: color || COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0, marginBottom: 3 }}>
        {label}
      </div>
      {typeof value === "string" ? (
        <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{value}</p>
      ) : value}
    </div>
  );
}

function MonitoringSection({ monitoring }) {
  if (!monitoring) return null;
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionTitle number="06">Monitoring Framework</SectionTitle>
      <div style={{ display: "grid", gap: 12 }}>
        {/* Stock indicators */}
        {monitoring.stockIndicators?.length > 0 && (
          <Card>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0, marginBottom: 10 }}>
              Stock Indicators
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {monitoring.stockIndicators.map((si, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 10px", background: COLORS.surfaceHover, borderRadius: 4 }}>
                  <span style={{ fontSize: 14, color: COLORS[si.direction] || COLORS.text }}>
                    {si.direction === "increasing" ? "↗" : si.direction === "decreasing" ? "↘" : "→"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textBright, minWidth: 120 }}>{si.stock}</span>
                  <span style={{ fontSize: 12, color: COLORS.text, flex: 1 }}>{si.indicator}</span>
                  <Badge color={COLORS.textMuted}>{si.frequency}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Loop dominance & delay */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {monitoring.loopDominance && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.reinforcing, textTransform: "uppercase", letterSpacing: 0, marginBottom: 8 }}>
                Loop Dominance
              </div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{monitoring.loopDominance}</p>
            </Card>
          )}
          {monitoring.delayAwareness && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.balancing, textTransform: "uppercase", letterSpacing: 0, marginBottom: 8 }}>
                Delay Awareness
              </div>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{monitoring.delayAwareness}</p>
            </Card>
          )}
        </div>

        {/* Adaptive triggers */}
        {monitoring.adaptiveTriggers?.length > 0 && (
          <Card>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.paradigm, textTransform: "uppercase", letterSpacing: 0, marginBottom: 10 }}>
              Adaptive Triggers
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {monitoring.adaptiveTriggers.map((tr, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: 10, alignItems: "center", padding: "8px 12px", background: COLORS.surfaceHover, borderRadius: 4 }}>
                  <span style={{ fontSize: 12, color: COLORS.text }}>{tr.condition}</span>
                  <span style={{ fontSize: 14, color: COLORS.paradigm }}>→</span>
                  <span style={{ fontSize: 12, color: COLORS.paradigm, fontWeight: 600 }}>{tr.response}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────

const TABS = [
  { key: "stocks", label: "Stocks" },
  { key: "loops", label: "Loops" },
  { key: "traps", label: "Traps" },
  { key: "leverage", label: "Leverage" },
  { key: "actions", label: "Actions" },
  { key: "monitoring", label: "Monitor" },
];

export default function SystemsInterventionBrief() {
  const [activeTab, setActiveTab] = useState("all");
  const data = ANALYSIS_DATA;

  const showSection = (key) => activeTab === "all" || activeTab === key;

  return (
    <div style={{
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      background: COLORS.bg, color: COLORS.text,
      minHeight: "100vh", padding: "32px 24px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <HeaderSection data={data} />

        {/* Tab navigation */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 32, flexWrap: "wrap",
          padding: 4, background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`,
        }}>
          <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>All</TabButton>
          {TABS.map(tab => (
            <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Sections */}
        {showSection("stocks") && <StocksSection stocks={data.stocks} />}
        {showSection("loops") && <LoopsSection loops={data.feedbackLoops} />}
        {showSection("traps") && <TrapsSection traps={data.traps} loops={data.feedbackLoops} />}
        {showSection("leverage") && <LeverageSection points={data.leveragePoints} />}
        {showSection("actions") && <ActionPlanSection actions={data.actions} />}
        {showSection("monitoring") && <MonitoringSection monitoring={data.monitoring} />}

        {/* Footer */}
        <div style={{
          marginTop: 48, paddingTop: 20, borderTop: `1px solid ${COLORS.border}`,
          fontSize: 11, color: COLORS.textMuted, textAlign: "center",
        }}>
          Systems Intervention Brief · Meadows Framework · Generated {data.date}
        </div>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? COLORS.accent + "20" : "transparent",
        color: active ? COLORS.accent : COLORS.textMuted,
        border: active ? `1px solid ${COLORS.accent}30` : "1px solid transparent",
        borderRadius: 6, padding: "6px 14px", fontSize: 12,
        fontWeight: active ? 600 : 500, cursor: "pointer",
        transition: "all 0.15s", fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}
