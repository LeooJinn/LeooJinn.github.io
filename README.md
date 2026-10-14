# LeooJinn.github.io

Personal portfolio for Jiaxiang Jin, built as a dependency-free static site for GitHub Pages.

## Run locally

From this directory, start any local static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish with GitHub Pages

1. Create a public repository named `LeooJinn.github.io` under the `LeooJinn` GitHub account.
2. Copy these files into the repository's default branch.
3. In GitHub, open **Settings > Pages**.
4. Set the source to **Deploy from a branch**, choose the default branch, and choose `/ (root)`.
5. Open `https://leoojinn.github.io/` after GitHub finishes the deployment.

This site has no build step. GitHub Pages serves `index.html` directly.

## Interactive layer

The page uses native browser APIs only:

- Intersection Observer for scroll reveals, active section navigation, timeline state, and mobile scene progression.
- A pinned, scroll-driven hero sequence that turns a live canvas signal network from question to shipped work.
- Section scenes that carry the same visual language through the manifesto, project workbench, Build Lab, experience route map, about signal field, resume capsule, and contact landing zone.
- Canvas for the interactive Build Lab, with separate visual scenes for Sonder, the C++ Search Engine, and Rocket Landing RL.
- Pointer input for the hero tilt and canvas scene exploration.
- Native tabs, buttons, and details elements for keyboard-accessible project exploration.
- `prefers-reduced-motion` support that makes the canvas static and removes spatial motion.

## Content to update

- Replace the current project descriptions or add more repository cards in `index.html`.
- Keep `assets/Jiaxiang-Jin-Resume.pdf` up to date when the public resume changes.
- Update the experience timeline as new roles or internships are added.
- Add a profile photo only if you want one. The current hero uses a real project image so the page is not dependent on a placeholder portrait.
- If the public GitHub username changes, update repository and profile links in `index.html`.
