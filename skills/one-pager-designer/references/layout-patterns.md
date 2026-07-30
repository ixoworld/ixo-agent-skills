# Layout Patterns - Skeleton HTML for Each

Pick one based on purpose. Do not improvise a new layout - these are tested shapes.

## 1. Hero + 3-column (product / service brief)

```html
<header>
  <h1>[Headline as a sentence]</h1>
  <p class="lede">[Subhead, one sentence, why the reader cares]</p>
</header>

<section class="cols-3">
  <div>
    <h3>[Feature 1]</h3>
    <p>[Benefit in plain English, 1-2 sentences]</p>
  </div>
  <div>
    <h3>[Feature 2]</h3>
    <p>[Benefit]</p>
  </div>
  <div>
    <h3>[Feature 3]</h3>
    <p>[Benefit]</p>
  </div>
</section>

<aside class="proof">
  <p>[Proof point: stat, customer quote, logo bar text]</p>
</aside>

<footer class="cta">
  <p><strong>[Specific next step]</strong> - [how to take it]</p>
</footer>
```

## 2. Problem-Solution (pitch / fundraise)

```html
<header>
  <p class="eyebrow">[Company or project name]</p>
  <h1>[The headline claim - one sentence]</h1>
</header>

<section>
  <h2>The problem</h2>
  <p>[One paragraph. Include one number that anchors the size of the problem.]</p>
</section>

<section>
  <h2>What we do</h2>
  <p>[One paragraph. The solution, in language a non-expert would repeat.]</p>
</section>

<section class="cols-2">
  <div>
    <h3>Traction</h3>
    <ul>
      <li>[Metric with number]</li>
      <li>[Metric with number]</li>
      <li>[Metric with number]</li>
    </ul>
  </div>
  <div>
    <h3>Team</h3>
    <p>[One sentence on why this team. Names of 2-3 key people.]</p>
  </div>
</section>

<footer class="ask">
  <p><strong>The ask:</strong> [Specific - amount, meeting, intro, decision by date]</p>
</footer>
```

## 3. TL;DR-led (executive summary)

```html
<header>
  <h1>[Subject of the summary]</h1>
  <p class="meta">For: [audience] - From: [author] - [date]</p>
</header>

<aside class="tldr">
  <h2>TL;DR</h2>
  <p>[Three to five sentences. The whole summary in this box.]</p>
</aside>

<section>
  <h2>Context</h2>
  <p>[What prompted this and what the reader needs to know to understand the recommendation.]</p>
</section>

<section>
  <h2>Options considered</h2>
  <ol>
    <li><strong>[Option A]</strong> - [one-line pros/cons]</li>
    <li><strong>[Option B]</strong> - [one-line pros/cons]</li>
    <li><strong>[Option C]</strong> - [one-line pros/cons]</li>
  </ol>
</section>

<section>
  <h2>Recommendation</h2>
  <p>[Which option and why, in 2-3 sentences.]</p>
</section>

<footer>
  <h3>Next steps</h3>
  <ul>
    <li>[Action, owner, date]</li>
    <li>[Action, owner, date]</li>
  </ul>
</footer>
```

## 4. Goals-led (project / campaign brief)

```html
<header>
  <p class="eyebrow">Project brief</p>
  <h1>[Project name]</h1>
</header>

<section>
  <h2>Goal</h2>
  <p>[One sentence stating the outcome and how it will be measured.]</p>
</section>

<section>
  <h2>Why now</h2>
  <p>[One paragraph on the window of opportunity or the cost of inaction.]</p>
</section>

<section>
  <h2>Approach</h2>
  <ol class="phases">
    <li><strong>Phase 1 - [name]</strong> ([dates]): [what happens]</li>
    <li><strong>Phase 2 - [name]</strong> ([dates]): [what happens]</li>
    <li><strong>Phase 3 - [name]</strong> ([dates]): [what happens]</li>
  </ol>
</section>

<section class="cols-2">
  <div>
    <h3>Success looks like</h3>
    <ul>
      <li>[Metric and target]</li>
      <li>[Metric and target]</li>
    </ul>
  </div>
  <div>
    <h3>Owner and team</h3>
    <p>[Lead name and role, supporting team in one line]</p>
  </div>
</section>
```

## 5. Bio-led (profile / portfolio)

```html
<header class="bio-header">
  <h1>[Name]</h1>
  <p class="role">[Role - Specialism]</p>
</header>

<section class="intro">
  <p>[Two sentences. What you do and who for. Plain English. No "passionate about leveraging".]</p>
</section>

<section class="cols-3 highlights">
  <div>
    <h3>[Highlight 1]</h3>
    <p>[One-sentence proof, with a number if possible]</p>
  </div>
  <div>
    <h3>[Highlight 2]</h3>
    <p>[One-sentence proof]</p>
  </div>
  <div>
    <h3>[Highlight 3]</h3>
    <p>[One-sentence proof]</p>
  </div>
</section>

<footer class="contact">
  <p>[Email] - [Phone or LinkedIn or website]</p>
</footer>
```

## 6. Event card (invitation)

```html
<header class="event">
  <p class="eyebrow">[Host org]</p>
  <h1>[Event name]</h1>
  <p class="when-where"><strong>[Date and time]</strong> - [Location or "online"]</p>
</header>

<section>
  <h2>What to expect</h2>
  <p>[One paragraph. Tone matches the event - warm if community, crisp if corporate.]</p>
</section>

<section>
  <h2>Programme</h2>
  <ul class="agenda">
    <li><strong>[Time]</strong> - [Item]</li>
    <li><strong>[Time]</strong> - [Item]</li>
    <li><strong>[Time]</strong> - [Item]</li>
  </ul>
</section>

<footer class="rsvp">
  <p><strong>RSVP by [date]</strong> - [How to RSVP]</p>
</footer>
```

## Grid CSS for the patterns above

```css
.cols-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.cols-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media print {
  .cols-2, .cols-3 {
    page-break-inside: avoid;
  }
}
```
