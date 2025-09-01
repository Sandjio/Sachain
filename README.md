This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

```
sachain-frontend
├─ components.json
├─ eslint.config.mjs
├─ next.config.js
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ public
│  ├─ favicon.ico
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ onboardimages
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ src
│  ├─ components
│  │  ├─ CTASection.tsx
│  │  ├─ Footer.tsx
│  │  ├─ Header.tsx
│  │  ├─ HowItWorks.tsx
│  │  ├─ icons.tsx
│  │  ├─ LanguageSwitcher.tsx
│  │  ├─ PlatformBenefits.tsx
│  │  ├─ ui
│  │  │  ├─ badge.tsx
│  │  │  ├─ button.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ carousel.tsx
│  │  │  ├─ dialog.tsx
│  │  │  ├─ dropdown-menu.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ switch.tsx
│  │  │  ├─ tabs.tsx
│  │  │  └─ tooltip.tsx
│  │  └─ UserSections.tsx
│  ├─ features
│  │  └─ auth
│  │     ├─ api
│  │     ├─ components
│  │     └─ hook
│  ├─ hooks
│  │  └─ useTranslate.ts
│  ├─ layout
│  │  └─ PublicLayout.tsx
│  ├─ lib
│  │  ├─ api
│  │  ├─ configs
│  │  ├─ hedera
│  │  ├─ utils
│  │  └─ utils.ts
│  ├─ locales
│  │  ├─ en.json
│  │  └─ fr.json
│  ├─ pages
│  │  ├─ index.tsx
│  │  ├─ login.tsx
│  │  ├─ signup.tsx
│  │  ├─ _app.tsx
│  │  └─ _document.tsx
│  ├─ store
│  │  ├─ authStore.ts
│  │  └─ useAppStore.ts
│  └─ styles
│     └─ globals.css
└─ tsconfig.json

```
```
SachainFrontend
├─ .next
│  ├─ app-build-manifest.json
│  ├─ build
│  │  └─ chunks
│  │     ├─ [root-of-the-server]__4b6f6259._.js
│  │     ├─ [root-of-the-server]__4b6f6259._.js.map
│  │     ├─ [root-of-the-server]__9abb3e35._.js
│  │     ├─ [root-of-the-server]__9abb3e35._.js.map
│  │     ├─ [turbopack-node]_transforms_postcss_ts_32dae4f3._.js
│  │     ├─ [turbopack-node]_transforms_postcss_ts_32dae4f3._.js.map
│  │     ├─ [turbopack]_runtime.js
│  │     └─ [turbopack]_runtime.js.map
│  ├─ build-manifest.json
│  ├─ cache
│  │  └─ .rscinfo
│  ├─ fallback-build-manifest.json
│  ├─ package.json
│  ├─ postcss.js
│  ├─ postcss.js.map
│  ├─ prerender-manifest.json
│  ├─ routes-manifest.json
│  ├─ server
│  │  ├─ app-paths-manifest.json
│  │  ├─ chunks
│  │  │  └─ ssr
│  │  │     ├─ 4787e_next_dist_3bd8e46d._.js
│  │  │     ├─ 4787e_next_dist_3bd8e46d._.js.map
│  │  │     ├─ [externals]_next_dist_shared_lib_no-fallback-error_external_d7a8835d.js
│  │  │     ├─ [externals]_next_dist_shared_lib_no-fallback-error_external_d7a8835d.js.map
│  │  │     ├─ [root-of-the-server]__069dc21a._.js
│  │  │     ├─ [root-of-the-server]__069dc21a._.js.map
│  │  │     ├─ [root-of-the-server]__1a957fcf._.js
│  │  │     ├─ [root-of-the-server]__1a957fcf._.js.map
│  │  │     ├─ [root-of-the-server]__41d828cd._.js
│  │  │     ├─ [root-of-the-server]__41d828cd._.js.map
│  │  │     ├─ [root-of-the-server]__4da943ab._.js
│  │  │     ├─ [root-of-the-server]__4da943ab._.js.map
│  │  │     ├─ [root-of-the-server]__60b55bb7._.js
│  │  │     ├─ [root-of-the-server]__60b55bb7._.js.map
│  │  │     ├─ [root-of-the-server]__65504e4e._.js
│  │  │     ├─ [root-of-the-server]__65504e4e._.js.map
│  │  │     ├─ [root-of-the-server]__711e2ee7._.js
│  │  │     ├─ [root-of-the-server]__711e2ee7._.js.map
│  │  │     ├─ [root-of-the-server]__80691a69._.js
│  │  │     ├─ [root-of-the-server]__80691a69._.js.map
│  │  │     ├─ [root-of-the-server]__8c84fac9._.js
│  │  │     ├─ [root-of-the-server]__8c84fac9._.js.map
│  │  │     ├─ [root-of-the-server]__8c884835._.js
│  │  │     ├─ [root-of-the-server]__8c884835._.js.map
│  │  │     ├─ [root-of-the-server]__93ade7bd._.js
│  │  │     ├─ [root-of-the-server]__93ade7bd._.js.map
│  │  │     ├─ [root-of-the-server]__96ad8e6d._.js
│  │  │     ├─ [root-of-the-server]__96ad8e6d._.js.map
│  │  │     ├─ [root-of-the-server]__c85729b4._.js
│  │  │     ├─ [root-of-the-server]__c85729b4._.js.map
│  │  │     ├─ [root-of-the-server]__ca94e6c9._.js
│  │  │     ├─ [root-of-the-server]__ca94e6c9._.js.map
│  │  │     ├─ [root-of-the-server]__cac21ffc._.js
│  │  │     ├─ [root-of-the-server]__cac21ffc._.js.map
│  │  │     ├─ [root-of-the-server]__d7027f29._.js
│  │  │     ├─ [root-of-the-server]__d7027f29._.js.map
│  │  │     ├─ [root-of-the-server]__e6460ce4._.js
│  │  │     ├─ [root-of-the-server]__e6460ce4._.js.map
│  │  │     ├─ [turbopack]_runtime.js
│  │  │     └─ [turbopack]_runtime.js.map
│  │  ├─ interception-route-rewrite-manifest.js
│  │  ├─ middleware-build-manifest.js
│  │  ├─ middleware-manifest.json
│  │  ├─ next-font-manifest.js
│  │  ├─ next-font-manifest.json
│  │  ├─ pages
│  │  │  ├─ _app
│  │  │  │  ├─ build-manifest.json
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  └─ react-loadable-manifest.json
│  │  │  ├─ _app.js
│  │  │  ├─ _app.js.map
│  │  │  ├─ _document
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  └─ react-loadable-manifest.json
│  │  │  ├─ _document.js
│  │  │  ├─ _document.js.map
│  │  │  ├─ _error
│  │  │  │  ├─ build-manifest.json
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  └─ react-loadable-manifest.json
│  │  │  ├─ _error.js
│  │  │  ├─ _error.js.map
│  │  │  ├─ index
│  │  │  │  ├─ build-manifest.json
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  └─ react-loadable-manifest.json
│  │  │  ├─ index.js
│  │  │  ├─ index.js.map
│  │  │  ├─ login
│  │  │  │  ├─ build-manifest.json
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  └─ react-loadable-manifest.json
│  │  │  ├─ login.js
│  │  │  ├─ login.js.map
│  │  │  ├─ signup
│  │  │  │  ├─ build-manifest.json
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  └─ react-loadable-manifest.json
│  │  │  ├─ signup.js
│  │  │  └─ signup.js.map
│  │  ├─ pages-manifest.json
│  │  ├─ server-reference-manifest.js
│  │  └─ server-reference-manifest.json
│  ├─ static
│  │  ├─ chunks
│  │  │  ├─ 4787e_next_c750b4b3._.js
│  │  │  ├─ 4787e_next_c750b4b3._.js.map
│  │  │  ├─ 4787e_next_dist_01ca92c9._.js
│  │  │  ├─ 4787e_next_dist_01ca92c9._.js.map
│  │  │  ├─ 4787e_next_dist_9d49c10f._.js
│  │  │  ├─ 4787e_next_dist_9d49c10f._.js.map
│  │  │  ├─ 4787e_next_dist_client_2923b3ae._.js
│  │  │  ├─ 4787e_next_dist_client_2923b3ae._.js.map
│  │  │  ├─ 4787e_next_dist_client_2a1f61ce._.js
│  │  │  ├─ 4787e_next_dist_client_2a1f61ce._.js.map
│  │  │  ├─ 4787e_next_dist_client_3c4c3702._.js
│  │  │  ├─ 4787e_next_dist_client_3c4c3702._.js.map
│  │  │  ├─ 4787e_next_dist_compiled_303f463f._.js
│  │  │  ├─ 4787e_next_dist_compiled_303f463f._.js.map
│  │  │  ├─ 4787e_next_dist_compiled_bbf5e188._.js
│  │  │  ├─ 4787e_next_dist_compiled_bbf5e188._.js.map
│  │  │  ├─ 4787e_next_dist_compiled_f92fb76d._.js
│  │  │  ├─ 4787e_next_dist_compiled_f92fb76d._.js.map
│  │  │  ├─ 4787e_next_dist_compiled_next-devtools_index_9a27b047.js
│  │  │  ├─ 4787e_next_dist_compiled_next-devtools_index_9a27b047.js.map
│  │  │  ├─ 4787e_next_dist_shared_lib_322936cf._.js
│  │  │  ├─ 4787e_next_dist_shared_lib_322936cf._.js.map
│  │  │  ├─ 4787e_next_dist_shared_lib_6469e95c._.js
│  │  │  ├─ 4787e_next_dist_shared_lib_6469e95c._.js.map
│  │  │  ├─ 4787e_next_dist_shared_lib_7270dab5._.js
│  │  │  ├─ 4787e_next_dist_shared_lib_7270dab5._.js.map
│  │  │  ├─ 4787e_next_dist_shared_lib_ca08c8e9._.js
│  │  │  ├─ 4787e_next_dist_shared_lib_ca08c8e9._.js.map
│  │  │  ├─ 4787e_next_e28b909e._.js
│  │  │  ├─ 4787e_next_e28b909e._.js.map
│  │  │  ├─ 4787e_next_error_7dcf62fc.js
│  │  │  ├─ 4787e_next_error_7dcf62fc.js.map
│  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_6c1d7978._.js
│  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_6c1d7978._.js.map
│  │  │  ├─ 7fbd0_zod_v4_1f06bfac._.js
│  │  │  ├─ 7fbd0_zod_v4_1f06bfac._.js.map
│  │  │  ├─ 8484d_tailwind-merge_dist_bundle-mjs_mjs_efdef8cd._.js
│  │  │  ├─ 8484d_tailwind-merge_dist_bundle-mjs_mjs_efdef8cd._.js.map
│  │  │  ├─ [next]_entry_page-loader_ts_f2cd5c7a._.js
│  │  │  ├─ [next]_entry_page-loader_ts_f2cd5c7a._.js.map
│  │  │  ├─ [root-of-the-server]__0292c836._.js
│  │  │  ├─ [root-of-the-server]__0292c836._.js.map
│  │  │  ├─ [root-of-the-server]__196f7df4._.js
│  │  │  ├─ [root-of-the-server]__196f7df4._.js.map
│  │  │  ├─ [root-of-the-server]__237a8f88._.js
│  │  │  ├─ [root-of-the-server]__237a8f88._.js.map
│  │  │  ├─ [root-of-the-server]__240323e1._.js
│  │  │  ├─ [root-of-the-server]__240323e1._.js.map
│  │  │  ├─ [root-of-the-server]__275d5f11._.js
│  │  │  ├─ [root-of-the-server]__275d5f11._.js.map
│  │  │  ├─ [root-of-the-server]__3dce38a0._.js
│  │  │  ├─ [root-of-the-server]__3dce38a0._.js.map
│  │  │  ├─ [root-of-the-server]__412ab546._.js
│  │  │  ├─ [root-of-the-server]__412ab546._.js.map
│  │  │  ├─ [root-of-the-server]__58e13db6._.js
│  │  │  ├─ [root-of-the-server]__58e13db6._.js.map
│  │  │  ├─ [root-of-the-server]__5d9386dd._.js
│  │  │  ├─ [root-of-the-server]__5d9386dd._.js.map
│  │  │  ├─ [root-of-the-server]__76716f99._.js
│  │  │  ├─ [root-of-the-server]__76716f99._.js.map
│  │  │  ├─ [root-of-the-server]__905c868c._.js
│  │  │  ├─ [root-of-the-server]__905c868c._.js.map
│  │  │  ├─ [root-of-the-server]__a93da8ce._.js
│  │  │  ├─ [root-of-the-server]__a93da8ce._.js.map
│  │  │  ├─ [root-of-the-server]__c0a48bc0._.js
│  │  │  ├─ [root-of-the-server]__c0a48bc0._.js.map
│  │  │  ├─ [root-of-the-server]__c194513e._.js
│  │  │  ├─ [root-of-the-server]__c194513e._.js.map
│  │  │  ├─ [root-of-the-server]__d29478f8._.js
│  │  │  ├─ [root-of-the-server]__d29478f8._.js.map
│  │  │  ├─ a14e7_react-dom_638ad3bb._.js
│  │  │  ├─ a14e7_react-dom_638ad3bb._.js.map
│  │  │  ├─ pages
│  │  │  │  ├─ _app.js
│  │  │  │  ├─ _error.js
│  │  │  │  ├─ index.js
│  │  │  │  ├─ login.js
│  │  │  │  └─ signup.js
│  │  │  ├─ src_pages__app_05c500b7._.js
│  │  │  ├─ src_pages__app_05c500b7._.js.map
│  │  │  ├─ src_pages__app_5771e187._.js
│  │  │  ├─ src_pages__error_530f4538._.js
│  │  │  ├─ src_pages__error_530f4538._.js.map
│  │  │  ├─ src_pages__error_5771e187._.js
│  │  │  ├─ src_pages_index_04839ac8._.js
│  │  │  ├─ src_pages_index_04839ac8._.js.map
│  │  │  ├─ src_pages_index_0dc83058._.js
│  │  │  ├─ src_pages_index_0dc83058._.js.map
│  │  │  ├─ src_pages_index_1d662383._.js
│  │  │  ├─ src_pages_index_1d662383._.js.map
│  │  │  ├─ src_pages_index_207a4485._.js
│  │  │  ├─ src_pages_index_207a4485._.js.map
│  │  │  ├─ src_pages_index_2a69b174._.js
│  │  │  ├─ src_pages_index_2a69b174._.js.map
│  │  │  ├─ src_pages_index_4bba7dd7._.js
│  │  │  ├─ src_pages_index_4bba7dd7._.js.map
│  │  │  ├─ src_pages_index_5604eacc._.js
│  │  │  ├─ src_pages_index_5604eacc._.js.map
│  │  │  ├─ src_pages_index_5771e187._.js
│  │  │  ├─ src_pages_index_6db62c2f._.js
│  │  │  ├─ src_pages_index_6db62c2f._.js.map
│  │  │  ├─ src_pages_index_724b2577._.js
│  │  │  ├─ src_pages_index_724b2577._.js.map
│  │  │  ├─ src_pages_index_8378601b._.js
│  │  │  ├─ src_pages_index_8378601b._.js.map
│  │  │  ├─ src_pages_index_bbb043ab._.js
│  │  │  ├─ src_pages_index_bbb043ab._.js.map
│  │  │  ├─ src_pages_index_bd4ddc2b._.js
│  │  │  ├─ src_pages_index_bd4ddc2b._.js.map
│  │  │  ├─ src_pages_index_f193fa67._.js
│  │  │  ├─ src_pages_index_f193fa67._.js.map
│  │  │  ├─ src_pages_login_3c1cf567._.js
│  │  │  ├─ src_pages_login_3c1cf567._.js.map
│  │  │  ├─ src_pages_login_5771e187._.js
│  │  │  ├─ src_pages_signup_5771e187._.js
│  │  │  ├─ src_pages_signup_b3b288e6._.js
│  │  │  ├─ src_pages_signup_b3b288e6._.js.map
│  │  │  ├─ src_styles_globals_4738091e.css
│  │  │  └─ src_styles_globals_4738091e.css.map
│  │  └─ development
│  │     ├─ _buildManifest.js
│  │     ├─ _clientMiddlewareManifest.json
│  │     └─ _ssgManifest.js
│  ├─ trace
│  └─ types
├─ README.md
├─ components.json
├─ eslint.config.mjs
├─ next.config.js
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ public
│  ├─ favicon.ico
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ src
│  ├─ components
│  │  ├─ CTASection.tsx
│  │  ├─ DataTable.tsx
│  │  ├─ FeatureProjects.tsx
│  │  ├─ Features.tsx
│  │  ├─ Footer.tsx
│  │  ├─ Header.tsx
│  │  ├─ HeroPanel.tsx
│  │  ├─ HeroSection.tsx
│  │  ├─ HowItWorks.tsx
│  │  ├─ LanguageSwitcher.tsx
│  │  ├─ Navbar.tsx
│  │  ├─ Navigation.tsx
│  │  ├─ PlatformBenefits.tsx
│  │  ├─ StatSection.tsx
│  │  ├─ SummaryCards.tsx
│  │  ├─ UserSections.tsx
│  │  ├─ figma
│  │  │  └─ ImageWithFallback.tsx
│  │  ├─ icons.tsx
│  │  └─ ui
│  │     ├─ accordion.tsx
│  │     ├─ alert-dialog.tsx
│  │     ├─ alert.tsx
│  │     ├─ aspect-ratio.tsx
│  │     ├─ avatar.tsx
│  │     ├─ badge.tsx
│  │     ├─ breadcrumb.tsx
│  │     ├─ button.tsx
│  │     ├─ calendar.tsx
│  │     ├─ card.tsx
│  │     ├─ carousel.tsx
│  │     ├─ chart.tsx
│  │     ├─ checkbox.tsx
│  │     ├─ collapsible.tsx
│  │     ├─ command.tsx
│  │     ├─ context-menu.tsx
│  │     ├─ dialog.tsx
│  │     ├─ drawer.tsx
│  │     ├─ dropdown-menu.tsx
│  │     ├─ form.tsx
│  │     ├─ hover-card.tsx
│  │     ├─ input-otp.tsx
│  │     ├─ input.tsx
│  │     ├─ label.tsx
│  │     ├─ menubar.tsx
│  │     ├─ navigation-menu.tsx
│  │     ├─ pagination.tsx
│  │     ├─ popover.tsx
│  │     ├─ progress.tsx
│  │     ├─ radio-group.tsx
│  │     ├─ resizable.tsx
│  │     ├─ scroll-area.tsx
│  │     ├─ select.tsx
│  │     ├─ separator.tsx
│  │     ├─ sheet.tsx
│  │     ├─ sidebar.tsx
│  │     ├─ skeleton.tsx
│  │     ├─ slider.tsx
│  │     ├─ sonner.tsx
│  │     ├─ switch.tsx
│  │     ├─ table.tsx
│  │     ├─ tabs.tsx
│  │     ├─ textarea.tsx
│  │     ├─ toggle-group.tsx
│  │     ├─ toggle.tsx
│  │     ├─ tooltip.tsx
│  │     └─ use-mobile.ts
│  ├─ features
│  │  ├─ auth
│  │  │  ├─ components
│  │  │  │  ├─ GetStartedModal.tsx
│  │  │  │  ├─ LoginForm.tsx
│  │  │  │  ├─ SignupForm.tsx
│  │  │  │  └─ signup
│  │  │  │     ├─ SignupFormWizard.tsx
│  │  │  │     ├─ SignupStep1.tsx
│  │  │  │     ├─ SignupStep2.tsx
│  │  │  │     ├─ SignupStep3.tsx
│  │  │  │     └─ Step4Success.tsx
│  │  │  ├─ core
│  │  │  │  ├─ cognitoProvider.ts
│  │  │  │  └─ kycService.ts
│  │  │  ├─ hook
│  │  │  │  ├─ useKyc.ts
│  │  │  │  ├─ useLogin.ts
│  │  │  │  └─ useSignup.ts
│  │  │  ├─ store
│  │  │  │  └─ signup.store.ts
│  │  │  └─ types
│  │  │     └─ authTypes.ts
│  │  └─ project
│  ├─ hooks
│  │  └─ useTranslate.ts
│  ├─ layout
│  │  └─ PublicLayout.tsx
│  ├─ lib
│  │  └─ utils.ts
│  ├─ locales
│  │  ├─ en.json
│  │  └─ fr.json
│  ├─ pages
│  │  ├─ _app.tsx
│  │  ├─ _document.tsx
│  │  ├─ index.tsx
│  │  ├─ login.tsx
│  │  └─ signup.tsx
│  ├─ store
│  │  ├─ authStore.ts
│  │  └─ useAppStore.ts
│  ├─ styles
│  │  └─ globals.css
│  └─ utils
│     └─ jwt.ts
└─ tsconfig.json

```