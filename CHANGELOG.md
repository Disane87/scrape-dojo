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
