## [1.7.0](https://github.com/disane87/scrape-dojo/compare/v1.6.0...v1.7.0) (2026-03-08)

- Delete config/.secrets.key ([](https://github.com/disane87/scrape-dojo/commit/5ce4bc0031dc67efd123839182a07c38cd9de43f))

### feat

- **📔 docs:** add robots.txt with sitemap reference ([](https://github.com/disane87/scrape-dojo/commit/7cc70890cf55de2218e42f96d4a67b7743f01b89))

## [1.6.0](https://github.com/disane87/scrape-dojo/compare/v1.5.2...v1.6.0) (2026-03-07)

### fix

- **🏷️ release:** clone commit object to fix immutable object error ([](https://github.com/disane87/scrape-dojo/commit/9f7725f83bd9dbf8176d5b883836f94c456f8fbd))
- **🐳 docker:** resolve EACCES and startup issues with custom PUID/PGID #52 ([](https://github.com/disane87/scrape-dojo/commit/6ce3bc276feccd45670bf25aeb698e5fdacd22b3)), closes [#52](https://github.com/disane87/scrape-dojo/issues/52) [#52](https://github.com/disane87/scrape-dojo/issues/52)

### feat

- **📔 docs:** add health check and initial setup documentation ([](https://github.com/disane87/scrape-dojo/commit/b24cc8cd00575377d6d760744a24aaf1a3d475be))
- **📔 docs:** add SEO, OG image, changelog pages, and contributor avatars to landing page ([](https://github.com/disane87/scrape-dojo/commit/9dbaafca30dd67939f49a7d3d66802fd60d8fe37))
- **📔 docs:** improve landing page OG metadata and contributors ([](https://github.com/disane87/scrape-dojo/commit/1e2923a15bd052ce9ce9b464618f9e41160a5bc6))

### chore

- **🏷️ release:** migrate release config to JS and enforce commit scopes ([](https://github.com/disane87/scrape-dojo/commit/7d2717893550dd7443a33b9fc6aaca515d1d79e6))

- Merge branch 'main' of https://github.com/Disane87/scrape-dojo ([](https://github.com/disane87/scrape-dojo/commit/1280132916a2b0881c4c673f0edbe096c1a9356c))

## [1.5.2](https://github.com/disane87/scrape-dojo/compare/v1.5.1...v1.5.2) (2026-03-07)

### 🛠️ Fixes

- **docker:** resolve EACCES and startup issues with custom PUID/PGID [#52](https://github.com/disane87/scrape-dojo/issues/52) ([6d2584a](https://github.com/disane87/scrape-dojo/commit/6d2584ad53d4dcbeabde6b7b3f9faab2afd8b89b))

## [1.5.1](https://github.com/disane87/scrape-dojo/compare/v1.5.0...v1.5.1) (2026-03-07)

### 🛠️ Fixes

- **docker:** resolve EACCES permission errors with custom PUID/PGID [#52](https://github.com/disane87/scrape-dojo/issues/52) ([8219f17](https://github.com/disane87/scrape-dojo/commit/8219f176920b2d26d54107762c7238bee1c9b7e5))

## [1.5.0](https://github.com/disane87/scrape-dojo/compare/v1.4.0...v1.5.0) (2026-03-07)

### 🚀 Features

- add sponsor button and styles to navigation and footer ([799da34](https://github.com/disane87/scrape-dojo/commit/799da34b3d2849576bc9b776f04cc32312337c17))

### 🛠️ Fixes

- update supervisord configuration for log file path and user setting ([d672fa3](https://github.com/disane87/scrape-dojo/commit/d672fa3573772d3d4f150ad6c33969963406e90a))

### 📔 Docs

- add sponsor buttons and dynamic version to docs ([4f10aa8](https://github.com/disane87/scrape-dojo/commit/4f10aa848c3013685af5ffbc176187657335ef5f))

## [1.4.0](https://github.com/disane87/scrape-dojo/compare/v1.3.0...v1.4.0) (2026-03-07)

### 🚀 Features

- enforce conventional commits and fix CI paths-ignore ([cbb9015](https://github.com/disane87/scrape-dojo/commit/cbb901561af24f332e354ddf5064fb54044749fd))

### 📔 Docs

- add AI-Aided Development note to README and documentation ([67d0f9b](https://github.com/disane87/scrape-dojo/commit/67d0f9b80a08881337e197f58cc3981cdab1f107))

## [1.3.0](https://github.com/disane87/scrape-dojo/compare/v1.2.0...v1.3.0) (2026-03-07)

### 🚀 Features

- add website workflow request template for scraping configurations ([36989f0](https://github.com/disane87/scrape-dojo/commit/36989f079c2ca564e98fa257fac5b9aabba42941))

### 🛠️ Fixes

- replace defunct contrib-rocks/action with akhilmhdh/contributors-readme-action ([e77945d](https://github.com/disane87/scrape-dojo/commit/e77945d5cfe7ec7324b3b73ed4e53203748f90b6))

## [1.2.0](https://github.com/disane87/scrape-dojo/compare/v1.1.0...v1.2.0) (2026-03-07)

### 🚀 Features

- add Umami analytics tracking (production only) ([84ae0cf](https://github.com/disane87/scrape-dojo/commit/84ae0cf791816ed36e31bbaac65711f44b4bd169))

### 🛠️ Fixes

- enable DB_SYNCHRONIZE by default for first-start table creation ([05851fe](https://github.com/disane87/scrape-dojo/commit/05851fe545eb527e4cb9555774485e70f65eb1a6))
- log synchronize state on startup for better debugging ([bd8434c](https://github.com/disane87/scrape-dojo/commit/bd8434c593626efbfc84d9bde604c7a0eeeab0b0))
- re-enable GitHub badges (repo now public) and fix edit link path ([e0cac65](https://github.com/disane87/scrape-dojo/commit/e0cac65f1786e36fbb01f2599dc77ae341e36494))
- trigger release for DB_SYNCHRONIZE fix and Umami tracking ([f3a506d](https://github.com/disane87/scrape-dojo/commit/f3a506d46f3f6e0c735f7a61db658f9a76249338))
- use RELEASE_TOKEN for semantic-release to bypass branch protection ([807ed8f](https://github.com/disane87/scrape-dojo/commit/807ed8ffdff276815fc57d057531bd25e3fde037))

### 📔 Docs

- add DB_SYNCHRONIZE to quickstart env vars table (DE + EN) ([bd9cc69](https://github.com/disane87/scrape-dojo/commit/bd9cc694c2d876ec5d2e78fb6620acca81dc76c3))
- add emojis to community health files ([#46](https://github.com/disane87/scrape-dojo/issues/46)) ([ee94218](https://github.com/disane87/scrape-dojo/commit/ee9421886be13ac47ddeec1e46b48d1d7948d096))
- overhaul README and improve docs navigation ([6bd94b5](https://github.com/disane87/scrape-dojo/commit/6bd94b5185c4db40febce8bef59f8f43ec9b7ee1))

## [1.1.0](https://github.com/disane87/scrape-dojo/compare/v1.0.23...v1.1.0) (2026-03-07)

### 🚀 Features

- enhance changelog functionality with modal display and version tracking ([8e256c3](https://github.com/disane87/scrape-dojo/commit/8e256c33b7936cb0fe08c2ae2208fac53713d241))

### 🛠️ Fixes

- remove redundant builds from release, add pnpm mount cache to Dockerfile ([4b57181](https://github.com/disane87/scrape-dojo/commit/4b57181ea1f82239d47d963e7945501ac9410d08))

## [1.0.23](https://github.com/disane87/scrape-dojo/compare/v1.0.22...v1.0.23) (2026-03-07)

### Bug Fixes

- add contents:read permission to Docker workflow for checkout ([687003e](https://github.com/disane87/scrape-dojo/commit/687003e4d188c6c09c0a847d45fefbb25b73a0df))

## [1.0.22](https://github.com/disane87/scrape-dojo/compare/v1.0.21...v1.0.22) (2026-03-07)

### Bug Fixes

- modular CI pipeline with test → release → docker chain ([80724d1](https://github.com/disane87/scrape-dojo/commit/80724d13230c2e5f955d0fcd15f8d06e8dfd5856))

## [1.0.21](https://github.com/disane87/scrape-dojo/compare/v1.0.20...v1.0.21) (2026-03-06)

### Bug Fixes

- replace pnpm prune with separate prod-deps Docker stage ([6dc0b40](https://github.com/disane87/scrape-dojo/commit/6dc0b409a68ed87bdbd3439f6224e011667fb0d0))

## [1.0.20](https://github.com/disane87/scrape-dojo/compare/v1.0.19...v1.0.20) (2026-03-06)

### Bug Fixes

- integrate Docker build into Release workflow ([88a3edf](https://github.com/disane87/scrape-dojo/commit/88a3edf24f61047cc250b40380b1f0ddf2843408))

## [1.0.19](https://github.com/disane87/scrape-dojo/compare/v1.0.18...v1.0.19) (2026-03-06)

### Bug Fixes

- trigger Docker workflow on release event instead of tag push ([5879d0c](https://github.com/disane87/scrape-dojo/commit/5879d0c4063f1ad35dd35df48cd8443d8bdbf813))

## [1.0.18](https://github.com/disane87/scrape-dojo/compare/v1.0.17...v1.0.18) (2026-03-06)

### Bug Fixes

- force test file isolation to prevent stale DOCUMENT in TestBed ([85fc887](https://github.com/disane87/scrape-dojo/commit/85fc887d0892af27bf034d4c051dec8792974dc7))

## [1.0.17](https://github.com/disane87/scrape-dojo/compare/v1.0.16...v1.0.17) (2026-03-06)

### Bug Fixes

- force resetTestEnvironment to rebind DOCUMENT token per test file ([06f51bf](https://github.com/disane87/scrape-dojo/commit/06f51bff14db412164013d21fbcb404d3ce309fc))

## [1.0.16](https://github.com/disane87/scrape-dojo/compare/v1.0.15...v1.0.16) (2026-03-06)

### Bug Fixes

- switch to happy-dom for Angular TestBed component test compat ([122c181](https://github.com/disane87/scrape-dojo/commit/122c18178001ff64a9a1aee975fd39de72c69005))

## [1.0.15](https://github.com/disane87/scrape-dojo/compare/v1.0.14...v1.0.15) (2026-03-06)

### Bug Fixes

- use vmThreads pool for proper jsdom document scope in CI ([f57ef5f](https://github.com/disane87/scrape-dojo/commit/f57ef5f7cf7f4c66243c1b22d582b2f966d94ef1))

## [1.0.14](https://github.com/disane87/scrape-dojo/compare/v1.0.13...v1.0.14) (2026-03-06)

### Bug Fixes

- use resetTestEnvironment for clean init + minimal afterEach cleanup ([59ffd93](https://github.com/disane87/scrape-dojo/commit/59ffd935427c05c4cf784317e1eb88fdfef8c1b2))

## [1.0.13](https://github.com/disane87/scrape-dojo/compare/v1.0.12...v1.0.13) (2026-03-06)

### Bug Fixes

- remove Object.defineProperty polyfills that corrupt JSDOM on Linux ([371c53c](https://github.com/disane87/scrape-dojo/commit/371c53cdfe52992798ae0727d508f1809ee1d30b))

## [1.0.12](https://github.com/disane87/scrape-dojo/compare/v1.0.11...v1.0.12) (2026-03-06)

### Bug Fixes

- reset TestBed \_testModuleRef directly to avoid DOM root destruction ([c226eb2](https://github.com/disane87/scrape-dojo/commit/c226eb273891bd589a97db5eccce7fb276123877))

## [1.0.11](https://github.com/disane87/scrape-dojo/compare/v1.0.10...v1.0.11) (2026-03-06)

### Bug Fixes

- bridge vitest globals to globalThis before Angular import ([050c110](https://github.com/disane87/scrape-dojo/commit/050c110b2123a8ac874848c98f652f63688835e0))

## [1.0.10](https://github.com/disane87/scrape-dojo/compare/v1.0.9...v1.0.10) (2026-03-06)

### Bug Fixes

- expose vitest globals to globalThis for Angular TestBed cleanup ([9924cef](https://github.com/disane87/scrape-dojo/commit/9924cefd4ca4d3079c17df940f440caf9cdd7576))

## [1.0.9](https://github.com/disane87/scrape-dojo/compare/v1.0.8...v1.0.9) (2026-03-06)

### Bug Fixes

- use try/catch init + afterEach reset for TestBed CI compat ([8436b12](https://github.com/disane87/scrape-dojo/commit/8436b129cd467434d980bc3f0c2c1eac57636705))

## [1.0.8](https://github.com/disane87/scrape-dojo/compare/v1.0.7...v1.0.8) (2026-03-06)

### Bug Fixes

- add afterEach resetTestingModule to fix TestBed state on Linux CI ([e65f666](https://github.com/disane87/scrape-dojo/commit/e65f6662fc558cbd86817c805d902fb817b36201))

## [1.0.7](https://github.com/disane87/scrape-dojo/compare/v1.0.6...v1.0.7) (2026-03-06)

### Bug Fixes

- reset TestBed environment before init to fix CI compatibility ([2b4c66e](https://github.com/disane87/scrape-dojo/commit/2b4c66e56313ecf105e5932b63457ba1ecc5e212))

## [1.0.6](https://github.com/disane87/scrape-dojo/compare/v1.0.5...v1.0.6) (2026-03-06)

### Bug Fixes

- guard style.transform defineProperty for Linux CI environments ([2850134](https://github.com/disane87/scrape-dojo/commit/28501347915aafba861eb018ad25feb0964d6552))

## [1.0.5](https://github.com/disane87/scrape-dojo/compare/v1.0.4...v1.0.5) (2026-03-06)

### Bug Fixes

- guard TestBed initialization to prevent double-init in CI ([f4b0142](https://github.com/disane87/scrape-dojo/commit/f4b01428799b57d81b40707e96a91f2ef3c0aede))

## [1.0.4](https://github.com/disane87/scrape-dojo/compare/v1.0.3...v1.0.4) (2026-03-06)

### Bug Fixes

- use npx vitest with --root for UI tests in CI ([ee513f7](https://github.com/disane87/scrape-dojo/commit/ee513f7809ff55ea46816007b504a5a3711610cb))

## [1.0.3](https://github.com/disane87/scrape-dojo/compare/v1.0.2...v1.0.3) (2026-03-06)

### Bug Fixes

- run vitest directly with --root for UI tests in CI ([79d5e42](https://github.com/disane87/scrape-dojo/commit/79d5e4245f23d5f79f91cf905abb7b3b4b534548))

## [1.0.2](https://github.com/disane87/scrape-dojo/compare/v1.0.1...v1.0.2) (2026-03-06)

### Bug Fixes

- use Nx runner for UI tests with NX_NO_CLOUD=true ([75fbd91](https://github.com/disane87/scrape-dojo/commit/75fbd9106f7737c86e5bd819824e4cae9c63e532))

## [1.0.1](https://github.com/disane87/scrape-dojo/compare/v1.0.0...v1.0.1) (2026-03-06)

### Bug Fixes

- use npx vitest for UI CI tests instead of pnpm exec ([bb00181](https://github.com/disane87/scrape-dojo/commit/bb00181eaced5be679de37005cf2b89666a72b01))

## 1.0.0 (2026-03-06)

### Features

- added astro etc. ([e8fbc07](https://github.com/disane87/scrape-dojo/commit/e8fbc07817044e0203ec9f43634a76794c351121))
- **auth:** Add MFA and trusted device functionality ([e068a32](https://github.com/disane87/scrape-dojo/commit/e068a32e8ea976e933598184b1613633299c2371))
- **docs:** add user guide for automated scrapes with scheduler and secrets management ([571b794](https://github.com/disane87/scrape-dojo/commit/571b79460298f18b39afc0366a40b69680ca8f51))
- enhance Amazon scraper with optional parameters and wait actions for popover handling ([bf3acbe](https://github.com/disane87/scrape-dojo/commit/bf3acbec2c5199dbd2106036ac47124023817489))
- enhance documentation with emojis for better readability and organization ([7c3f8be](https://github.com/disane87/scrape-dojo/commit/7c3f8be761685552ae9e59c1008ad6b54423ae8e))
- enhance error handling and reconnection logic in ScrapeEventsService; update Amazon scrape configuration for improved delays and new actions ([6643841](https://github.com/disane87/scrape-dojo/commit/66438411c1dd1c4fc2db14d486fbf16f473dbe82))
- enhance settings modal with action buttons and update localization for password change ([e560bac](https://github.com/disane87/scrape-dojo/commit/e560bac2ecf3c566ce0b6c556107a114c709899b))
- implement OTP alternative actions and enhance navigation handling; update Amazon scrape configuration ([9fcf978](https://github.com/disane87/scrape-dojo/commit/9fcf9786a43c5d8eef107956bf1827405b3552d7))
- refactor top navigation to use router for modal navigation ([0b2345a](https://github.com/disane87/scrape-dojo/commit/0b2345aad0adb520407302c9833b2155cce21004))
- remove landing page and its associated styles and scripts ([f44bcde](https://github.com/disane87/scrape-dojo/commit/f44bcde04905ad1f3264257abec9b6c9977ae223))
- replace inline SVG logos with separate logo files for better maintainability ([5b411ea](https://github.com/disane87/scrape-dojo/commit/5b411eaab738156a277ef98ba65fdac34e158e00))
- replace local logos with Simple Icons CDN and add professional syntax highlighting ([6b79f62](https://github.com/disane87/scrape-dojo/commit/6b79f62e4a0518bc3bff78c7f68e7169045e1782))
- single combined Docker image with multi-arch GHCR publishing ([cc5f132](https://github.com/disane87/scrape-dojo/commit/cc5f13210888fb75da649e398929528036b17ca4))
- update .gitignore to include new directories and enhance astro.config with edit link for documentation ([7613d40](https://github.com/disane87/scrape-dojo/commit/7613d409c5de498a272d5d15edd02464b6a760d3))

### Bug Fixes

- add conventional-changelog-conventionalcommits and fix UI CI tests ([e28f5b0](https://github.com/disane87/scrape-dojo/commit/e28f5b00b760bfb7bc4afd90a8b260b216815b83))
- add PNG favicon to Starlight config ([8c814d6](https://github.com/disane87/scrape-dojo/commit/8c814d6fe3c90c55f82e9587505223bfae95f156))
- add solid background to step circles and replace placeholder icons with real SVG logos ([ccf533b](https://github.com/disane87/scrape-dojo/commit/ccf533bdbdeb96642dac70b523422f9fc4f54ac2))
- change pnpm install to use --no-frozen-lockfile for dependency installation ([ffda569](https://github.com/disane87/scrape-dojo/commit/ffda569fd03d2ebc8bf5cd6d1f1f0e1971281b24))
- correct build output path for docs deployment ([7b153c4](https://github.com/disane87/scrape-dojo/commit/7b153c49239274c53614031663b479d1591e0186))
- correct nth-child selectors for step circles ([8ce1742](https://github.com/disane87/scrape-dojo/commit/8ce1742fe9006c2a49e2c52c0841eb7b9c9188de))
- correct timeline vertical alignment on landing page ([d55595b](https://github.com/disane87/scrape-dojo/commit/d55595b4cceb3fb1c1a2ff0108de1ab3b99c7f94))
- **docs:** fix broken links in footer navigation ([5fe0bd4](https://github.com/disane87/scrape-dojo/commit/5fe0bd4186474df22afd7d2aa658b4e0bb68e96b))
- ensure step circles appear above timeline ([dc3f112](https://github.com/disane87/scrape-dojo/commit/dc3f112173703adcdcaf85a8f0678b5a9854fe86))
- exclude \_test dir from tsconfig.app.json and increase CI memory ([4ec46c9](https://github.com/disane87/scrape-dojo/commit/4ec46c929866b6284cd5c4f8ff3ceebc1bed88a8))
- exclude test utils from build and add verbose CI output ([0bef906](https://github.com/disane87/scrape-dojo/commit/0bef9064432b28696db76aefb5fafa1112066a8a))
- GitHub Workflows mit pnpm Store-Caching optimiert ([e2b8b01](https://github.com/disane87/scrape-dojo/commit/e2b8b015b9125fadbc09e1d41716de057fc5c34a))
- remove /scrape-dojo/ base path from all internal links ([b63a573](https://github.com/disane87/scrape-dojo/commit/b63a573798702a5808b272d2129adedf89fdb5dc))
- resolve ESLint errors in UI source files ([172ff6f](https://github.com/disane87/scrape-dojo/commit/172ff6f769239ab708066a7cb2e0223a7280e716))
- restore logo file and update logo path after logos directory cleanup ([fc46b80](https://github.com/disane87/scrape-dojo/commit/fc46b809eaf3666ca7fe8b3aa9c912e56de4fed8))
- update dependency installation and build steps in GitHub Actions workflow ([5f3508c](https://github.com/disane87/scrape-dojo/commit/5f3508c97cb19c325dcfa93d6e80ad37aef14eeb))
- update dependency installation command in GitHub Actions workflow ([4a213d1](https://github.com/disane87/scrape-dojo/commit/4a213d1dc72ea2ea46832a0840151f75052fc4f7))
- update site URL from GitHub Pages to scrape-dojo.com ([8e614c6](https://github.com/disane87/scrape-dojo/commit/8e614c65a32209f8b0613c55ec1ba3bdbc18c0fc))
- use PNG app icon as favicon instead of SVG ([fe97fa6](https://github.com/disane87/scrape-dojo/commit/fe97fa68a76b6c693866c1920892a4ecd1b66d2c))

# Changelog

> Dieses Changelog wird automatisch via Semantic Release generiert.
