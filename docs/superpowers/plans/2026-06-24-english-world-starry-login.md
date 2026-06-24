# English World Starry Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium starry vocabulary-map login page for `/login` while preserving the current auth behavior.

**Architecture:** Keep authentication logic in `Login.tsx` and move the upgrade through presentational wrappers, CSS, and a single generated image asset. Use CSS variables for pointer parallax so interaction remains lightweight and easy to disable with `prefers-reduced-motion`.

**Tech Stack:** React 18, TypeScript, Ant Design 5, CSS, Vite static asset imports, GPT Image 2 generated PNG.

## Global Constraints

- Preserve the existing login, registration, redirects, validation, and `data-cy` selectors.
- Keep the implementation scoped to the English World frontend.
- Do not change authentication APIs, backend code, routes, or authenticated English World screens.
- Do not add a heavy 3D engine.
- Store the generated image under `apps/english-world/src/assets/login-starry-vocabulary.png`.
- Provide a CSS gradient fallback if the image fails to load.
- Respect `prefers-reduced-motion` by disabling drift, parallax, and long-running transitions.

---

## File Structure

- Create: `apps/english-world/src/assets/login-starry-vocabulary.png`
  - GPT Image 2 generated starry vocabulary-map background.
- Modify: `apps/english-world/src/page/login/Login.tsx`
  - Add the background asset import, pointer-position style variables, ambient word chips, status strip, and presentation wrappers.
  - Keep existing auth handlers and all `data-cy` selectors.
- Modify: `apps/english-world/src/page/login/Login.css`
  - Replace the default gradient/card styles with starfield layout, glass panel, parallax layers, mobile layout, and reduced-motion rules.
- Test: existing login E2E selectors in `apps/english-world/cypress/e2e/login.cy.ts`
  - No selector changes required.

### Task 1: Generate the Starry Vocabulary Background

**Files:**
- Create: `apps/english-world/src/assets/login-starry-vocabulary.png`

**Interfaces:**
- Consumes: CSS/TS import path `@/assets/login-starry-vocabulary.png`.
- Produces: a static PNG usable by Vite asset imports.

- [ ] **Step 1: Generate the image**

Run from `/Users/liulin/Desktop/font/english`:

```bash
bash /Users/liulin/.codex/skills/gpt-image-2/scripts/gen.sh \
  --prompt "Create a premium deep-space vocabulary learning background for an AI English learning web app login page. Vast starry sky, elegant nebula depth, subtle blue violet and cyan green lighting, floating English word fragments, constellation-like memory nodes connected by thin luminous lines, intelligent and calm, high-end education technology, no UI panels, no readable brand names, wide 16:9 composition, enough dark negative space near the center-right for a glass login panel." \
  --out /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/assets/login-starry-vocabulary.png \
  --timeout-sec 300
```

Expected: command prints the output PNG path and the file exists.

- [ ] **Step 2: Inspect the asset**

Run:

```bash
file /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/assets/login-starry-vocabulary.png
```

Expected: output includes `PNG image data`.

### Task 2: Add the Starry Login Markup

**Files:**
- Modify: `apps/english-world/src/page/login/Login.tsx`

**Interfaces:**
- Consumes: `loginStarryVocabulary` image import from `@/assets/login-starry-vocabulary.png`.
- Produces: CSS custom properties `--login-parallax-x` and `--login-parallax-y` on `.login-container`.

- [ ] **Step 1: Update imports and types**

Add the asset import and pointer style type:

```tsx
import loginStarryVocabulary from "@/assets/login-starry-vocabulary.png";
```

```tsx
type LoginContainerStyle = React.CSSProperties & {
  "--login-parallax-x": string;
  "--login-parallax-y": string;
};
```

- [ ] **Step 2: Add ambient chip data**

Add above the component:

```tsx
const AMBIENT_WORDS = [
  { word: "memory", tone: "cyan" },
  { word: "context", tone: "violet" },
  { word: "review", tone: "green" },
  { word: "fluent", tone: "blue" },
  { word: "listen", tone: "cyan" },
];
```

- [ ] **Step 3: Add pointer parallax state**

Inside `Login`:

```tsx
const [parallax, setParallax] = useState({ x: 0, y: 0 });

const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  setParallax({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
};

const loginContainerStyle: LoginContainerStyle = {
  "--login-parallax-x": `${parallax.x * 18}px`,
  "--login-parallax-y": `${parallax.y * 18}px`,
  backgroundImage: `linear-gradient(135deg, rgba(3, 7, 18, 0.74), rgba(18, 24, 57, 0.7)), url(${loginStarryVocabulary})`,
};
```

- [ ] **Step 4: Replace the return shell**

Wrap the existing `Tabs`/`Form` content inside:

```tsx
<div
  className="login-container"
  style={loginContainerStyle}
  onPointerMove={handlePointerMove}
>
  <div className="login-starfield" aria-hidden="true" />
  <div className="login-orbit" aria-hidden="true" />
  <section className="login-hero" aria-label="英语世界登录">
    <div className="login-copy">
      <div className="login-kicker">AI vocabulary constellation</div>
      <h1>把每个单词点亮成星图</h1>
      <p>登录后进入今日复习、AI 语境实验室和记忆地图，让单词不再散落。</p>
      <div className="login-word-cloud" aria-hidden="true">
        {AMBIENT_WORDS.map((item) => (
          <span key={item.word} className={`login-word-chip login-word-chip-${item.tone}`}>
            {item.word}
          </span>
        ))}
      </div>
    </div>

    <Card className="login-card">
      <div className="login-card-header">
        <span className="login-card-orb" />
        <div>
          <div className="login-title">英语世界 · AI 单词</div>
          <div className="login-subtitle">进入你的词汇星域</div>
        </div>
      </div>
      <div className="login-status-strip">
        <span>今日复习</span>
        <strong>Ready</strong>
        <span>记忆地图同步</span>
      </div>
      {existing tabs and forms}
    </Card>
  </section>
</div>
```

Expected: all existing form items and `data-cy` values remain unchanged.

### Task 3: Restyle the Login Page

**Files:**
- Modify: `apps/english-world/src/page/login/Login.css`

**Interfaces:**
- Consumes: classes added in Task 2.
- Produces: full-screen starry layout with mobile and reduced-motion behavior.

- [ ] **Step 1: Replace the base layout**

Use a full-viewport background:

```css
.login-container {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background-color: #030712;
  background-position: center;
  background-size: cover;
  color: #f8fbff;
}
```

- [ ] **Step 2: Add starfield depth layers**

Add pseudo-depth layers using radial gradients and parallax variables:

```css
.login-starfield,
.login-orbit {
  position: absolute;
  inset: -8%;
  pointer-events: none;
}

.login-starfield {
  transform: translate3d(var(--login-parallax-x), var(--login-parallax-y), 0);
  background:
    radial-gradient(circle at 18% 24%, rgba(125, 211, 252, 0.3), transparent 22%),
    radial-gradient(circle at 78% 18%, rgba(167, 139, 250, 0.28), transparent 20%),
    radial-gradient(circle at 48% 78%, rgba(45, 212, 191, 0.16), transparent 24%);
  transition: transform 180ms ease-out;
}

.login-orbit {
  opacity: 0.55;
  background:
    linear-gradient(110deg, transparent 20%, rgba(148, 163, 184, 0.2) 20.2%, transparent 20.6%),
    linear-gradient(32deg, transparent 64%, rgba(34, 211, 238, 0.18) 64.2%, transparent 64.8%);
}
```

- [ ] **Step 3: Style hero copy and chips**

Keep text readable and chips decorative:

```css
.login-hero {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 64px;
  align-items: center;
}

.login-copy h1 {
  margin: 0;
  max-width: 560px;
  font-size: 48px;
  line-height: 1.08;
  letter-spacing: 0;
}

.login-copy p {
  margin: 18px 0 0;
  max-width: 520px;
  color: rgba(226, 232, 240, 0.78);
  font-size: 17px;
  line-height: 1.8;
}

.login-word-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}
```

- [ ] **Step 4: Style the glass card and controls**

Make the Ant Design card read as a glass panel:

```css
.login-card {
  width: 100%;
  border: 1px solid rgba(191, 219, 254, 0.24);
  border-radius: 20px;
  background: rgba(8, 13, 30, 0.72);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(22px);
}

.login-card .ant-card-body {
  padding: 28px;
}

.login-card .ant-input-affix-wrapper,
.login-card .ant-input {
  border-color: rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.76);
  color: #f8fbff;
}

.login-card .ant-btn-primary {
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2dd4bf, #60a5fa 48%, #a78bfa);
  font-weight: 700;
}
```

- [ ] **Step 5: Add responsive and reduced-motion rules**

For mobile:

```css
@media (max-width: 860px) {
  .login-container {
    padding: 28px 16px;
  }

  .login-hero {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .login-copy h1 {
    font-size: 32px;
  }

  .login-copy p {
    font-size: 15px;
  }

  .login-word-cloud {
    display: none;
  }
}
```

For reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  .login-starfield,
  .login-word-chip,
  .login-card .ant-btn-primary {
    animation: none;
    transition: none;
    transform: none;
  }
}
```

### Task 4: Verify Behavior and Visual Quality

**Files:**
- Test existing app behavior; no source files required.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: confidence that login selectors, build, and visual layout work.

- [ ] **Step 1: Run frontend unit tests**

Run from `/Users/liulin/Desktop/font/english/react-font`:

```bash
pnpm --filter @font/english-world exec vitest run
```

Expected: command exits 0.

- [ ] **Step 2: Run frontend build**

Run:

```bash
pnpm --filter @font/english-world build
```

Expected: command exits 0.

- [ ] **Step 3: Start Vite for manual visual QA**

Run:

```bash
pnpm --filter @font/english-world dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite serves the app at `http://127.0.0.1:5173/`.

- [ ] **Step 4: Inspect `/login` at desktop and mobile widths**

Use the browser to verify:

- The starfield image renders.
- The card is readable.
- Tabs switch.
- Login and register fields are clickable.
- Text does not overlap at desktop or mobile widths.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add apps/english-world/src/assets/login-starry-vocabulary.png apps/english-world/src/page/login/Login.tsx apps/english-world/src/page/login/Login.css docs/superpowers/plans/2026-06-24-english-world-starry-login.md
git commit -m "feat: add starry login experience"
```

Expected: commit succeeds after verification.
