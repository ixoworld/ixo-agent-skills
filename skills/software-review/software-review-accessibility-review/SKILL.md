---
name: software-review-accessibility-review
description: Author bounded accessibility, usability and localisation review asks for named user tasks, with manual expert evidence and explicit limits on automated conclusions.
license: Apache-2.0
metadata:
  namespace: software-review
  author: IXO
  version: "1.0.0"
  provenance-kind: adapted-skill-import
---

# Accessibility, usability and localisation review asks

Adapted import of Anthropic's `accessibility-review` SKILL.md. The categories,
common issues, testing approach and evidence tables below retain its structure;
IXO changes are recorded in [PROVENANCE.json](PROVENANCE.json).

First read [the ask contract](references/ask-contract.md). Author an ask for a
qualified specialist to test a named user task on an agreed build/environment.
Return `needs-input` for missing scope, access, user needs, success/failure,
evidence, qualifications, payment or follow-up terms. Use the tables as requested
evidence, never prefilled findings. This skill does not perform a review merely
by drafting it.

Agree the standard/version/level, task sample and exclusions. Design inspection
can identify intended semantics; only runtime testing can observe actual keyboard,
focus or screen-reader behavior. Name browser, OS and assistive-technology versions.
A passing automated check does not certify accessibility or establish complete
compliance. Report untested areas and require manual/expert testing where needed.
The source's 44px criterion was AAA, and its claimed automated coverage percentage
has been removed. Consult the dated [WCAG 2.2 Recommendation](https://www.w3.org/TR/2024/REC-WCAG22-20241212/)
for criterion level, scope and exceptions; this selected list is not the standard.

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
- For a WCAG 2.2 AA scope, consult **2.5.8** (minimum target size, including spacing and exceptions) in the dated standard linked below.

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
combinations rather than assuming translation quality proves task usability.
Require task completion, comprehensible errors and recovery observations; avoid
concluding that a design screenshot proves runtime accessibility.

Keep findings linked to observed interactions. State user impact and uncertainty,
then interpretation/recommendation, then the designated specialist's evaluation.
No ticket creation, publishing, payment commitment or compliance certification is
authorised by this skill. Follow-up tests the agreed fixes on a named new build.
