---
name: systems-thinking-strategist
description: Use for messy, recurring, multi-actor problems where isolated fixes keep failing and the user needs systems thinking, system dynamics, feedback loops, stocks and flows, Meadows' 12 leverage points, system traps, or high-leverage intervention design. Produces bounded system maps, loop hypotheses, trap diagnosis, ranked interventions, action sequencing, and monitoring plans for organizations, policy, markets, products, teams, supply chains, and other domains with unintended consequences.
metadata:
  short-description: Map systems and rank leverage points
---

# Systems Thinking Strategist

Use this skill to turn complex situations into system maps, identify feedback structures, and design interventions that act on root dynamics rather than surface symptoms.

## Operating Standard

- Work from the user's evidence first. Distinguish stated facts, inferred dynamics, and assumptions.
- Do not invent missing stocks, flows, actor goals, or timelines. Mark unknowns and ask the highest-value clarifying question when the gap blocks useful analysis.
- Avoid single-cause explanations and personality blame. Convert blame into structure: incentives, rules, information flows, delays, goals, and mental models.
- Every material stock needs inflows, outflows, current trend, and measurement status. If one is unknown, say so.
- Every feedback loop needs an ID, loop type, polarity, evidence, delay, and confidence level.
- Every intervention needs a Meadows leverage level, target loop, mechanism, resistance forecast, second-order effects, leading indicators, and review trigger.
- Separate leverage from feasibility. High leverage can still be politically hard, slow, or sequencing-dependent.
- Use plain language and compact diagrams. The output should help a decision-maker act, not admire the analysis.

## Invocation Modes

Choose the lightest mode that can answer the user well:

1. **Facilitated discovery** - Use when the user has not provided enough context. Ask one question at a time and run the intake protocol in `references/intake-interview.md`.
2. **Rapid structural read** - Use when the user gives partial context and wants a first-pass diagnosis. State assumptions and confidence, then identify what to validate.
3. **Full intervention brief** - Use when the user provides enough context or asks for end-to-end strategy. Complete the phases in one coherent answer unless the user asks for a staged workshop.

Do not force a "type continue" gate when the user asked for a complete answer. Use phase gates only during facilitated discovery or when the problem is too under-specified to proceed responsibly.

## Workflow

### 1. Calibrate and Bound the System

If discovery is needed, read `references/intake-interview.md` before asking questions. Extract:

- Problem owner and decision context
- System boundary: inside scope, outside-but-influential, explicit exclusions
- Time horizon and behavior-over-time pattern
- Success criteria and unacceptable trade-offs
- Known constraints, authority, and available resources

Deliverable:

```text
Boundary: [inside scope]
Outside influences: [constraints or adjacent systems]
Time horizon: [period over which behavior matters]
Known unknowns: [questions that materially affect confidence]
```

### 2. Build the Stock and Actor Map

Identify visible and invisible stocks, then map actors to the stocks they can influence.

Stock notation:

```text
[Stock name] ([visible|invisible], trend: [growing|declining|oscillating|stable], confidence: [high|medium|low])
  inflows: [what increases it]
  outflows: [what drains it]
  measures: [current metric or "unmeasured"]
```

Actor map:

```text
[Actor] -> goals: [what they optimize for] -> levers: [rules, resources, information, norms]
```

### 3. Detect Feedback Loops and Delays

For each recurring behavior, identify at least one reinforcing loop and one balancing or resisting loop where evidence supports them.

Loop notation:

```text
R1 "[Loop name]" ([virtuous|vicious], confidence: [high|medium|low]):
  A increases -> B increases -> C increases -> A increases
  delay: [time lag]
  evidence: [user-provided signal]

B1 "[Loop name]" ([stabilizing|eroding], confidence: [high|medium|low]):
  A increases -> B increases -> C decreases -> A decreases
  delay: [time lag]
  evidence: [user-provided signal]
```

Flag places where stale information, slow consequences, or delayed incentives make the system look unresponsive.

### 4. Diagnose System Traps

Read `references/meadows-framework.md` when checking traps and leverage points. Test only the traps that have evidence:

- Policy Resistance
- Tragedy of the Commons
- Drift to Low Performance
- Escalation
- Success to the Successful
- Shifting the Burden
- Seeking the Wrong Goal

For each active trap, provide:

- Evidence in this system
- Driving loop IDs
- Escape route adapted to this context
- Risk if ignored

### 5. Rank Leverage Points

Map potential interventions to Meadows' hierarchy:

| Levels | Category | Typical target |
| --- | --- | --- |
| 12-10 | Shallow | Parameters, buffers, stock-flow structures |
| 9-7 | Medium | Delays, balancing loops, reinforcing loops |
| 6-4 | Deep | Information flows, rules, self-organization |
| 3-1 | Paradigm | Goals, mindsets, transcending paradigms |

Rank options by:

- Leverage level
- Directness against the target loop
- Feasibility and authority
- Delay before observable results
- Resistance and failure modes
- Reversibility and monitoring quality

Do not assume the lowest-numbered, highest-leverage intervention is the right next move. Often the sequence is: low-risk information flow first, rules or self-organization next, paradigm work in parallel.

### 6. Design the Strategic Action Plan

Recommend 2-4 interventions. Use this structure:

```text
INTERVENTION: [name]
Leverage level: [1-12 and label]
Target loop: [R/B ID]
Mechanism: [how the intervention changes flows, feedback, information, rules, goals, or mindsets]
Sequence: [why now, and what it enables next]
Timeline and delays: [realistic lead/lag timing]
Leading indicators: [early signals before lagging results move]
Resistance sources: [actors, incentives, habits, or constraints that will push back]
Second-order effects: [likely consequences elsewhere in the system]
Failure trigger: [if X has not changed by Y, adapt by Z]
```

### 7. Monitoring Framework

Build feedback into the strategy:

- **Stock indicators** - which visible and invisible stocks to track, by cadence
- **Loop dominance** - how to know which loop is currently driving behavior
- **Delay awareness** - when to wait, when to pivot
- **Adaptive triggers** - thresholds that escalate to the next leverage level
- **Review cadence** - who reviews, what evidence they use, and what decisions they can make

## Output Formats

For short responses, return:

1. **System diagnosis** - boundary, critical stocks, loop hypotheses
2. **Likely traps** - evidence and escape route
3. **Highest-leverage moves** - ranked options with Meadows levels
4. **Next validation question** - the one thing that would most improve confidence

For full briefs, return:

1. **System map** - stocks, flows, actors, and feedback loops
2. **Trap diagnosis** - active traps and escape routes
3. **Leverage ranking** - intervention options mapped to levels 12-1
4. **Action plan** - sequenced interventions with indicators and resistance
5. **Monitoring plan** - stock indicators, loop dominance, delays, and triggers

## Visual Artifact Template

When the user requests a visual output, dashboard, or artifact, use `templates/intervention-brief.jsx`. Do not build a new React visualization unless the user explicitly asks for a custom design.

Procedure:

1. Read `templates/intervention-brief.jsx`.
2. Copy it to the user-requested output path. If no path is given, create `outputs/` under the current workspace. Use `/mnt/user-data/outputs/` only when that directory exists and is the active artifact convention.
3. Replace only the `ANALYSIS_DATA` object near the top of the file.
4. Preserve the schema names exactly.
5. Run `python3 scripts/validate_skill.py .` if you modified this skill package.

Schema summary:

- `title`, `subtitle`, `date`, `problemOwner`, `systemBoundary`
- `stocks[]`: `name`, `type`, `trend`, `inflows[]`, `outflows[]`
- `feedbackLoops[]`: `id`, `name`, `kind`, `polarity`, `steps[]`, `delay`, `notes`
- `traps[]`: `trapType`, `evidence`, `escapeRoute`, `drivingLoops[]`
- `leveragePoints[]`: `level`, `category`, `label`, `intervention`, `targetLoops[]`, `feasibility`, `impact`
- `actions[]`: `name`, `phase`, `leverageLevel`, `targetLoop`, `mechanism`, `timeline`, `leadingIndicators[]`, `resistanceSources[]`, `secondOrderEffects[]`
- `monitoring`: `stockIndicators[]`, `loopDominance`, `delayAwareness`, `adaptiveTriggers[]`

## Reference Files

- `references/intake-interview.md` - Use for facilitated discovery and context extraction.
- `references/meadows-framework.md` - Use for trap diagnosis, leverage point ranking, and archetype checks.
- `templates/intervention-brief.jsx` - Use only when a visual artifact is requested.
- `scripts/validate_skill.py` - Use after editing this skill package.
