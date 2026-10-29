---
name: software-review-accessibility-review
description: "Draft a request (an ask) for a qualified human specialist to test the accessibility, usability or localisation of a named user task through IXO Expert Reviews: the agreed WCAG version and level, assistive technology, languages, devices and connectivity, the evidence the reviewer must return, and payment and follow-up terms. Use when someone wants an expert accessibility or usability audit, screen-reader or assistive-technology testing, a WCAG conformance review, or local-language usability testing commissioned from a specialist, even if they never say ask. Not for auditing a page or design yourself, and never for declaring WCAG conformance from an automated scan. For speed or cost use software-review-performance-review; for agent tool behaviour use software-review-agent-review."
license: Apache-2.0
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: adapted-skill-import
---

# Accessibility, usability and localisation review asks

Modified from Anthropic's `accessibility-review` SKILL.md (Apache-2.0); the
changes are listed in [PROVENANCE.json](PROVENANCE.json).

An ask is a request, posted through IXO Expert Reviews, for a qualified human
specialist to review a named build. This skill drafts the ask for testing a named
user task on an agreed build/environment; drafting it is not a review.

Read [the ask contract](references/ask-contract.md) and start from the blank draft
that `scripts/check_ask.py --template` prints (see the end of this file). Keep
missing scope, access, user needs, success/failure, evidence, qualifications,
payment or follow-up terms null, with a question in `missing_inputs`, and leave
the draft `needs-input`. Use the tables below as the evidence you request, never
as prefilled findings.

Agree the standard/version/level, task sample and exclusions. Design inspection
can identify intended semantics; only runtime testing can observe actual keyboard,
focus or screen-reader behavior. Name browser, OS and assistive-technology versions.
A passing automated check does not certify accessibility or establish complete
compliance, because automated tools see only part of the criteria. Report untested
areas and require manual/expert testing where needed. Consult the dated
[WCAG 2.2 Recommendation](https://www.w3.org/TR/2024/REC-WCAG22-20241212/) for
criterion level, scope and exceptions; this selected list is not the standard.

## Selected WCAG checks (not a complete conformance checklist)

### Perceivable
- **1.1.1** Non-text content has alt text
- **1.3.1** Info and structure conveyed semantically
- **1.4.3** Contrast ratio >= 4.5:1 (normal text), >= 3:1 (large text)
- **1.4.11** Non-text contrast >= 3:1 (UI components, graphics)

### Operable
- **2.1.1** All functionality available via keyboard
- **2.4.3** Logical focus order
- **2.4.7** Visible focus indicator
- **2.5.5 (AAA)** Enhanced target size: 44x44 CSS pixels, subject to exceptions. This is not an AA requirement.
- For a WCAG 2.2 AA scope, consult **2.5.8** (minimum target size, including spacing and exceptions) in the dated standard linked above.

### Understandable
- **3.2.1** Predictable on focus (no unexpected changes)
- **3.3.1** Error identification (describe the error)
- **3.3.2** Labels or instructions for inputs

### Robust
- **4.1.2** Name, role, value for all UI components

## Common Issues

1. Insufficient color contrast
2. Missing form labels
3. No keyboard access to interactive elements
4. Missing alt text on meaningful images
5. Focus traps in modals
6. Missing ARIA landmarks
7. Auto-playing media without controls
8. Time limits without extension options

## Testing Approach

1. Automated scan with named tool/version and recorded limitations; automated checks cover only part of accessibility.
2. Keyboard-only navigation
3. Screen reader testing (VoiceOver, NVDA)
4. Color contrast verification
5. Zoom to 200% — does layout break?

## Requested reviewer evidence (after the ask is agreed)

```markdown
## Bounded Accessibility Review: [Design/Page Name]
**Agreed standard/version/level:** [Scope] | **Tested build/environment:** [Version] | **Date:** [Date]
**Limitations and untested criteria:** [List]

### Summary
**Issues found:** [X] | **Critical:** [X] | **Major:** [X] | **Minor:** [X]

### Findings

#### Perceivable
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [1.4.3 Contrast] | 🔴 Critical | [Fix] |

#### Operable
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [2.1.1 Keyboard] | 🟡 Major | [Fix] |

#### Understandable
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [3.3.2 Labels] | 🟢 Minor | [Fix] |

#### Robust
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [4.1.2 Name, Role, Value] | 🟡 Major | [Fix] |

### Color Contrast Check
| Element | Foreground | Background | Ratio | Required | Pass? |
|---------|-----------|------------|-------|----------|-------|
| [Body text] | [color] | [color] | [X]:1 | 4.5:1 | ✅/❌ |

### Keyboard Navigation
| Element | Tab Order | Enter/Space | Escape | Arrow Keys |
|---------|-----------|-------------|--------|------------|
| [Element] | [Order] | [Behavior] | [Behavior] | [Behavior] |

### Screen Reader
| Element | Announced As | Issue |
|---------|-------------|-------|
| [Element] | [What SR says] | [Problem if any] |

### Priority Fixes
1. **[Critical fix]** — Affects [who] and blocks [what]
2. **[Major fix]** — Improves [what] for [who]
3. **[Minor fix]** — [Observed impact and reason for priority]
```


## Usability and localisation

Read [localisation scenarios](references/localisation.md) when the task spans
languages, cultures, devices/connectivity or assistive technology. Select relevant
combinations rather than assuming translation quality proves task usability. Ask
about each of its four dimensions separately (language variant and script, culture
and local task conventions, device and connectivity, assistive technology), because
a language code says nothing about the others. Request reviewers fluent in the named
language variant who also know the task's subject area and have accessibility
expertise. Say in the ask that a translation or an automated scan alone cannot
establish usability, and require task completion, comprehensible errors and
recovery observations; avoid concluding that a design screenshot proves runtime
accessibility.

Keep findings linked to observed interactions. State user impact and uncertainty,
then interpretation/recommendation, then the designated specialist's evaluation.
No ticket creation, publishing, payment commitment or compliance certification is
authorised by this skill. Follow-up tests the agreed fixes on a named new build.

## Checking the draft

`scripts/check_ask.py`, in this skill's folder, checks a JSON ask offline against
the contract, this skill's pinned source identity and the draft-only decisions.
Call it by its full path, since the working directory is usually the user's
project:

```bash
python3 /path/to/software-review-accessibility-review/scripts/check_ask.py --template > ask.json
python3 /path/to/software-review-accessibility-review/scripts/check_ask.py ask.json
```

It prints `ready-for-approval` (exit 0) or `needs-input` with the failing fields
(exit 1). Passing is a structural check, not evidence of accessibility.
