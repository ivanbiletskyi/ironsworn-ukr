# Bootstrap Ironsworn TTRPG Website

We're building a React application in `/website` to serve the English and Ukrainian translations of Ironsworn TTRPG, taking inspiration from the `/website_example` (Grimwild) project.

## User Review Required
> [!IMPORTANT]
> - Do you want an automated language switcher, or have both English and Ukrainian visible at the same time? I plan to implement a Language Switcher (EN/UKR) at the top navigation.
> - The routing will be structured around the chapters in the `md` folder (e.g., Basics, Your Character, Moves, Your World, etc.). Is this acceptable?
> - `website_example` uses Vite. I will generate a standard React + Vite + Typescript project inside `website`.

## Proposed Changes

### Vite React Scaffold
We will use Vite to scaffold the base app in the `website` directory.
#### [NEW] `/website/package.json`
- Will install `react-router-dom`, `react-markdown`, `remark-gfm`
- Will add `copy-md` and `copy-md:watch` scripts.
#### [NEW] `/website/vite.config.ts`, `index.html`, `tsconfig.json`

---

### Scripts
#### [NEW] `/website/copy-markdown.js`
- Will copy the contents of `../md/Ironsworn-md-en` to `public/md/en`
- Will copy the contents of `../md/Ironsworn-md-ukr` to `public/md/ukr`

---

### Application Logic & Components
We will base these on `website_example`, adapting them for Ironsworn.
#### [NEW] `/website/src/App.tsx`
- Adds React Router for routing through chapters (Basics, Moves, Regions, etc.)
- Wrap it with a Context or state for Language Selection (EN / UKR).
#### [NEW] `/website/src/components/Navigation.tsx`
- Navigation menu with links to the chapters.
- Include a layout toggle or dropdown to switch languages.
#### [NEW] `/website/src/components/MarkdownRenderer.tsx`
- Takes the current language state and the chapter name, and loads the corresponding markdown (`/md/${lang}/fileName.md`).
#### [NEW] `/website/src/index.css` & `App.css`
- Copy the base styles from `website_example`, modifying the theme/colors to fit Ironsworn if necessary.

## Verification Plan

### Automated Tests
- Run `yarn install` and verify dependencies install without error.
- Run `yarn copy-md` and verify `public/md/en` and `public/md/ukr` contain the markdown files.
- Run `yarn build` to ensure the project compiles cleanly via TypeScript and Vite.

### Manual Verification
- Start the server using `yarn dev`
- Or use the agent browser tool to open the local server and verify that:
  - Markdown renders correctly on different pages.
  - The language switcher updates the content from English to Ukrainian seamlessly.
