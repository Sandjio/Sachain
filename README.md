# Sachain

Sachain is an innovative fundraising platform that empowers entrepreneurs to raise capital by tokenizing shares of their projects on the Hedera Token Service (HTS). Through Sachain, entrepreneurs can seamlessly issue digital shares as tokens, allowing investors to purchase and trade these shares securely and transparently on a decentralized marketplace. This creates a fluid, trustless ecosystem where investors can buy, sell, and transfer ownership of project shares with ease, unlocking new liquidity opportunities and democratizing access to early-stage investments.

## 🚀 Features

## For Entrepreneurs

- **Project Tokenization**: Easily create and issue tokenized shares of their projects using Hedera Token Service
- **Fundraising Campaign Management**: Set fundraising goals, timelines, and terms for share issuance
- **KYC/AML Verification**: Integrated identity verification to comply with regulations and ensure investor legitimacy
- **Dashboard & Analytics**: Real-time insights into fundraising progress, investor activity, and token distribution
- **Shareholder Management**: View and manage investor lists, token allocations, and voting rights
- **Smart Contract Automation**: Automated share issuance, dividend distribution, and voting mechanisms via smart contracts.

## For Investors

- **Investor Onboarding & Verification**: Smooth sign-up with identity verification and compliance checks
- **Marketplace for Shares**: Browse, buy, and sell tokenized shares of various projects securely
- **Portfolio Tracking**: Monitor share holdings, valuations, and transaction history
- **Secondary Trading**: Enable peer-to-peer trading of shares with transparent transaction records
- **Voting & Governance** : Participate in project governance by exercising voting rights attached to shares
- **Dividend & Profit Sharing**: Receive automated dividends or profit shares distributed through smart contracts.

## For Both

- **Wallet Management**: Can credit and withdraw funds from their wallet by transfering to a different wallet on mobile money accounts
- **Transactions history**: Each Transaction is stored on the Hedera DLT and can be queried
- **Notifications**: Notify users about important updates through emails
- **Messaging**: Implement a chatbot and a message channel for investors and entrepreneurs

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 19 and Tailwind CSS
- **Backend**: Node.js/TypeScript Lambda functions
- **Infrastructure**: AWS CDK for cloud resources
- **Blockchain**: Hedera Hashgraph for transaction processing

## 📋 Prerequisites

- Node.js 18+ and npm
- AWS CLI configured
- Hedera testnet account

## 🛠️ Quick Start

1. **Clone and install**:

   ```bash
   git clone <repository-url>
   cd Sachain
   npm install
   ```

2. **Start development**:

   ```bash
   npm run dev
   ```

3. **Build all services**:
   ```bash
   npm run build
   ```

## 📁 Project Structure

```
Sachain/
├── sachain-frontend/     # Next.js web application
├── backend/             # Lambda functions and APIs
├── sachain-infrastructure/ # AWS CDK infrastructure
└── package.json         # Workspace configuration
```

## 🧪 Testing

```bash
npm run test
```

## 📖 Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Frontend README](sachain-frontend/README.md)
- [Infrastructure README](sachain-infrastructure/README.md)

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and development process.




```
Sachain
├─ AUDIT_COMPLIANCE_IMPLEMENTATION.md
├─ CONTRIBUTING.md
├─ LICENSE
├─ README.md
├─ SECURITY_IMPLEMENTATION.md
├─ backend
│  ├─ ERROR_HANDLING.md
│  ├─ docs
│  │  ├─ README.md
│  │  ├─ error-codes.md
│  │  ├─ integration-guide.md
│  │  └─ openapi.yaml
│  ├─ jest.config.js
│  ├─ package.json
│  ├─ src
│  │  ├─ __tests__
│  │  │  └─ integration
│  │  │     ├─ compliance-workflow.integration.test.ts
│  │  │     └─ kyc-workflow.integration.test.ts
│  │  ├─ lambdas
│  │  │  ├─ admin-review
│  │  │  │  ├─ __tests__
│  │  │  │  │  ├─ approval-rejection.test.ts
│  │  │  │  │  ├─ audit-logging.test.ts
│  │  │  │  │  ├─ basic.test.ts
│  │  │  │  │  ├─ enhanced-audit-error-handling.test.ts
│  │  │  │  │  ├─ error-scenarios.test.ts
│  │  │  │  │  ├─ index.test.ts
│  │  │  │  │  └─ simple.test.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ compliance
│  │  │  │  ├─ __tests__
│  │  │  │  │  └─ index.test.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ kyc-processing
│  │  │  │  ├─ __tests__
│  │  │  │  │  ├─ admin-notification.test.ts
│  │  │  │  │  ├─ document-status-update.test.ts
│  │  │  │  │  ├─ error-handling-retry.test.ts
│  │  │  │  │  ├─ event-publisher.test.ts
│  │  │  │  │  ├─ event-validator.test.ts
│  │  │  │  │  └─ index.test.ts
│  │  │  │  ├─ event-publisher.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ kyc-upload
│  │  │  │  ├─ __tests__
│  │  │  │  │  ├─ error-scenarios.test.ts
│  │  │  │  │  ├─ index.test.ts
│  │  │  │  │  └─ metrics.test.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ post-auth
│  │  │  │  ├─ __tests__
│  │  │  │  │  └─ index.test.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ types.ts
│  │  │  └─ user-notification
│  │  │     ├─ __tests__
│  │  │     │  └─ index.test.ts
│  │  │     ├─ index.ts
│  │  │     └─ types.ts
│  │  ├─ models
│  │  │  ├─ compliance.ts
│  │  │  └─ index.ts
│  │  ├─ repositories
│  │  │  ├─ __tests__
│  │  │  │  ├─ compliance-repository.test.ts
│  │  │  │  ├─ kyc-document-repository.test.ts
│  │  │  │  └─ user-repository.test.ts
│  │  │  ├─ audit-log-repository.ts
│  │  │  ├─ base-repository.ts
│  │  │  ├─ compliance-repository.ts
│  │  │  ├─ kyc-document-repository.ts
│  │  │  └─ user-repository.ts
│  │  └─ utils
│  │     ├─ __tests__
│  │     │  ├─ audit-enhancer.test.ts
│  │     │  ├─ cloudwatch-metrics-simple.test.ts
│  │     │  ├─ cloudwatch-metrics.test.ts
│  │     │  ├─ enhanced-error-handler.test.ts
│  │     │  ├─ eventbridge-service.test.ts
│  │     │  ├─ file-validation.test.ts
│  │     │  ├─ integration-error-retry.test.ts
│  │     │  ├─ notification-service.test.ts
│  │     │  ├─ retry.test.ts
│  │     │  ├─ s3-direct-upload.test.ts
│  │     │  ├─ s3-upload.test.ts
│  │     │  ├─ structured-logger.test.ts
│  │     │  └─ xray-tracing.test.ts
│  │     ├─ audit-enhancer.ts
│  │     ├─ cloudwatch-metrics.ts
│  │     ├─ error-handler.ts
│  │     ├─ eventbridge-service.ts
│  │     ├─ file-validation.ts
│  │     ├─ jwt-utils.ts
│  │     ├─ notification-service.ts
│  │     ├─ retry.ts
│  │     ├─ s3-direct-upload.ts
│  │     ├─ s3-upload.ts
│  │     ├─ structured-logger.ts
│  │     └─ xray-tracing.ts
│  └─ tsconfig.json
├─ package-lock.json
├─ package.json
├─ sachain-frontend
│  ├─ .env.local
│  ├─ .next
│  │  ├─ app-build-manifest.json
│  │  ├─ build
│  │  │  └─ chunks
│  │  │     ├─ [root-of-the-server]__4b6f6259._.js
│  │  │     ├─ [root-of-the-server]__4b6f6259._.js.map
│  │  │     ├─ [root-of-the-server]__9abb3e35._.js
│  │  │     ├─ [root-of-the-server]__9abb3e35._.js.map
│  │  │     ├─ [turbopack-node]_transforms_postcss_ts_32dae4f3._.js
│  │  │     ├─ [turbopack-node]_transforms_postcss_ts_32dae4f3._.js.map
│  │  │     ├─ [turbopack]_runtime.js
│  │  │     └─ [turbopack]_runtime.js.map
│  │  ├─ build-manifest.json
│  │  ├─ cache
│  │  │  └─ .rscinfo
│  │  ├─ fallback-build-manifest.json
│  │  ├─ package.json
│  │  ├─ postcss.js
│  │  ├─ postcss.js.map
│  │  ├─ prerender-manifest.json
│  │  ├─ routes-manifest.json
│  │  ├─ server
│  │  │  ├─ app-paths-manifest.json
│  │  │  ├─ chunks
│  │  │  │  └─ ssr
│  │  │  │     ├─ [externals]_next_dist_shared_lib_no-fallback-error_external_d7a8835d.js
│  │  │  │     ├─ [externals]_next_dist_shared_lib_no-fallback-error_external_d7a8835d.js.map
│  │  │  │     ├─ [root-of-the-server]__0cfcf9f4._.js
│  │  │  │     ├─ [root-of-the-server]__0cfcf9f4._.js.map
│  │  │  │     ├─ [root-of-the-server]__376337a0._.js
│  │  │  │     ├─ [root-of-the-server]__376337a0._.js.map
│  │  │  │     ├─ [root-of-the-server]__3ba8fa17._.js
│  │  │  │     ├─ [root-of-the-server]__3ba8fa17._.js.map
│  │  │  │     ├─ [root-of-the-server]__3e53421e._.js
│  │  │  │     ├─ [root-of-the-server]__3e53421e._.js.map
│  │  │  │     ├─ [root-of-the-server]__4141ae07._.js
│  │  │  │     ├─ [root-of-the-server]__4141ae07._.js.map
│  │  │  │     ├─ [root-of-the-server]__42eee2aa._.js
│  │  │  │     ├─ [root-of-the-server]__42eee2aa._.js.map
│  │  │  │     ├─ [root-of-the-server]__44f6730b._.js
│  │  │  │     ├─ [root-of-the-server]__44f6730b._.js.map
│  │  │  │     ├─ [root-of-the-server]__5e599573._.js
│  │  │  │     ├─ [root-of-the-server]__5e599573._.js.map
│  │  │  │     ├─ [root-of-the-server]__6ffc3410._.js
│  │  │  │     ├─ [root-of-the-server]__6ffc3410._.js.map
│  │  │  │     ├─ [root-of-the-server]__7340057c._.js
│  │  │  │     ├─ [root-of-the-server]__7340057c._.js.map
│  │  │  │     ├─ [root-of-the-server]__786598b6._.js
│  │  │  │     ├─ [root-of-the-server]__786598b6._.js.map
│  │  │  │     ├─ [root-of-the-server]__83a7c2ca._.js
│  │  │  │     ├─ [root-of-the-server]__83a7c2ca._.js.map
│  │  │  │     ├─ [root-of-the-server]__8616f20f._.js
│  │  │  │     ├─ [root-of-the-server]__8616f20f._.js.map
│  │  │  │     ├─ [root-of-the-server]__938cb130._.js
│  │  │  │     ├─ [root-of-the-server]__938cb130._.js.map
│  │  │  │     ├─ [root-of-the-server]__93ade7bd._.js
│  │  │  │     ├─ [root-of-the-server]__93ade7bd._.js.map
│  │  │  │     ├─ [root-of-the-server]__a392857f._.js
│  │  │  │     ├─ [root-of-the-server]__a392857f._.js.map
│  │  │  │     ├─ [root-of-the-server]__abec5e31._.js
│  │  │  │     ├─ [root-of-the-server]__abec5e31._.js.map
│  │  │  │     ├─ [root-of-the-server]__d962f988._.js
│  │  │  │     ├─ [root-of-the-server]__d962f988._.js.map
│  │  │  │     ├─ [root-of-the-server]__e87a4777._.js
│  │  │  │     ├─ [root-of-the-server]__e87a4777._.js.map
│  │  │  │     ├─ [root-of-the-server]__f334d1a5._.js
│  │  │  │     ├─ [root-of-the-server]__f334d1a5._.js.map
│  │  │  │     ├─ [turbopack]_runtime.js
│  │  │  │     └─ [turbopack]_runtime.js.map
│  │  │  ├─ interception-route-rewrite-manifest.js
│  │  │  ├─ middleware-build-manifest.js
│  │  │  ├─ middleware-manifest.json
│  │  │  ├─ next-font-manifest.js
│  │  │  ├─ next-font-manifest.json
│  │  │  ├─ pages
│  │  │  │  ├─ _app
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ _app.js
│  │  │  │  ├─ _app.js.map
│  │  │  │  ├─ _document
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ _document.js
│  │  │  │  ├─ _document.js.map
│  │  │  │  ├─ _error
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ _error.js
│  │  │  │  ├─ _error.js.map
│  │  │  │  ├─ auth
│  │  │  │  │  ├─ [tab]
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ [tab].js
│  │  │  │  │  ├─ [tab].js.map
│  │  │  │  │  ├─ login
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ login.js
│  │  │  │  │  └─ login.js.map
│  │  │  │  ├─ dashboards
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ investor
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ investor.js
│  │  │  │  │  ├─ investor.js.map
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  ├─ react-loadable-manifest.json
│  │  │  │  │  ├─ startup
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ startup.js
│  │  │  │  │  └─ startup.js.map
│  │  │  │  ├─ dashboards.js
│  │  │  │  ├─ dashboards.js.map
│  │  │  │  ├─ index
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ index.js
│  │  │  │  └─ index.js.map
│  │  │  ├─ pages-manifest.json
│  │  │  ├─ server-reference-manifest.js
│  │  │  └─ server-reference-manifest.json
│  │  ├─ static
│  │  │  ├─ chunks
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_61cb7299._.js
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_61cb7299._.js.map
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_account_4f062afa._.js
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_account_4f062afa._.js.map
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_contract_f1d078e5._.js
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_contract_f1d078e5._.js.map
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_token_5f580d00._.js
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_token_5f580d00._.js.map
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_transaction_bdf4a153._.js
│  │  │  │  ├─ 09926_@hashgraph_sdk_lib_transaction_bdf4a153._.js.map
│  │  │  │  ├─ 1a8f1_@noble_curves_esm_a8445e64._.js
│  │  │  │  ├─ 1a8f1_@noble_curves_esm_a8445e64._.js.map
│  │  │  │  ├─ 41ef3_@hashgraph_cryptography_src_265d94a1._.js
│  │  │  │  ├─ 41ef3_@hashgraph_cryptography_src_265d94a1._.js.map
│  │  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_6c1d7978._.js
│  │  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_6c1d7978._.js.map
│  │  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_fefa768c._.js
│  │  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_fefa768c._.js.map
│  │  │  │  ├─ 7fbd0_zod_v4_1f06bfac._.js
│  │  │  │  ├─ 7fbd0_zod_v4_1f06bfac._.js.map
│  │  │  │  ├─ 8484d_tailwind-merge_dist_bundle-mjs_mjs_efdef8cd._.js
│  │  │  │  ├─ 8484d_tailwind-merge_dist_bundle-mjs_mjs_efdef8cd._.js.map
│  │  │  │  ├─ [next]_entry_page-loader_ts_b3755954._.js
│  │  │  │  ├─ [next]_entry_page-loader_ts_b3755954._.js.map
│  │  │  │  ├─ [root-of-the-server]__07d833bd._.js
│  │  │  │  ├─ [root-of-the-server]__07d833bd._.js.map
│  │  │  │  ├─ [root-of-the-server]__0be13f56._.js
│  │  │  │  ├─ [root-of-the-server]__0be13f56._.js.map
│  │  │  │  ├─ [root-of-the-server]__1d58f813._.js
│  │  │  │  ├─ [root-of-the-server]__1d58f813._.js.map
│  │  │  │  ├─ [root-of-the-server]__292db1e4._.js
│  │  │  │  ├─ [root-of-the-server]__292db1e4._.js.map
│  │  │  │  ├─ [root-of-the-server]__2e0dd3dc._.js
│  │  │  │  ├─ [root-of-the-server]__2e0dd3dc._.js.map
│  │  │  │  ├─ [root-of-the-server]__400f4f9e._.js
│  │  │  │  ├─ [root-of-the-server]__400f4f9e._.js.map
│  │  │  │  ├─ [root-of-the-server]__40cf05b3._.js
│  │  │  │  ├─ [root-of-the-server]__40cf05b3._.js.map
│  │  │  │  ├─ [root-of-the-server]__56a706ab._.js
│  │  │  │  ├─ [root-of-the-server]__56a706ab._.js.map
│  │  │  │  ├─ [root-of-the-server]__5b1dfcc5._.js
│  │  │  │  ├─ [root-of-the-server]__5b1dfcc5._.js.map
│  │  │  │  ├─ [root-of-the-server]__7bb195d1._.js
│  │  │  │  ├─ [root-of-the-server]__7bb195d1._.js.map
│  │  │  │  ├─ [root-of-the-server]__915e6774._.js
│  │  │  │  ├─ [root-of-the-server]__915e6774._.js.map
│  │  │  │  ├─ [root-of-the-server]__91762464._.js
│  │  │  │  ├─ [root-of-the-server]__91762464._.js.map
│  │  │  │  ├─ [root-of-the-server]__9272c710._.js
│  │  │  │  ├─ [root-of-the-server]__9272c710._.js.map
│  │  │  │  ├─ [root-of-the-server]__a6140dc4._.js
│  │  │  │  ├─ [root-of-the-server]__a6140dc4._.js.map
│  │  │  │  ├─ [root-of-the-server]__b35e77d5._.js
│  │  │  │  ├─ [root-of-the-server]__b35e77d5._.js.map
│  │  │  │  ├─ [root-of-the-server]__b61d6297._.js
│  │  │  │  ├─ [root-of-the-server]__b61d6297._.js.map
│  │  │  │  ├─ [root-of-the-server]__c194513e._.js
│  │  │  │  ├─ [root-of-the-server]__c194513e._.js.map
│  │  │  │  ├─ [root-of-the-server]__c8611425._.js
│  │  │  │  ├─ [root-of-the-server]__c8611425._.js.map
│  │  │  │  ├─ [root-of-the-server]__ce645f88._.js
│  │  │  │  ├─ [root-of-the-server]__ce645f88._.js.map
│  │  │  │  ├─ [root-of-the-server]__d90c7df2._.js
│  │  │  │  ├─ [root-of-the-server]__d90c7df2._.js.map
│  │  │  │  ├─ a14e7_react-dom_638ad3bb._.js
│  │  │  │  ├─ a14e7_react-dom_638ad3bb._.js.map
│  │  │  │  ├─ b23af_next_dist_5aaf8b22._.js
│  │  │  │  ├─ b23af_next_dist_5aaf8b22._.js.map
│  │  │  │  ├─ b23af_next_dist_client_b1261408._.js
│  │  │  │  ├─ b23af_next_dist_client_b1261408._.js.map
│  │  │  │  ├─ b23af_next_dist_compiled_16c212d7._.js
│  │  │  │  ├─ b23af_next_dist_compiled_16c212d7._.js.map
│  │  │  │  ├─ b23af_next_dist_compiled_72640c7b._.js
│  │  │  │  ├─ b23af_next_dist_compiled_72640c7b._.js.map
│  │  │  │  ├─ b23af_next_dist_compiled_next-devtools_index_e58cb2d1.js
│  │  │  │  ├─ b23af_next_dist_compiled_next-devtools_index_e58cb2d1.js.map
│  │  │  │  ├─ b23af_next_dist_e2a46610._.js
│  │  │  │  ├─ b23af_next_dist_e2a46610._.js.map
│  │  │  │  ├─ b23af_next_dist_shared_lib_75028229._.js
│  │  │  │  ├─ b23af_next_dist_shared_lib_75028229._.js.map
│  │  │  │  ├─ b23af_next_dist_shared_lib_a7fa718c._.js
│  │  │  │  ├─ b23af_next_dist_shared_lib_a7fa718c._.js.map
│  │  │  │  ├─ b23af_next_error_3d12fc61.js
│  │  │  │  ├─ b23af_next_error_3d12fc61.js.map
│  │  │  │  ├─ b23af_next_router_4725d949.js
│  │  │  │  ├─ b23af_next_router_4725d949.js.map
│  │  │  │  ├─ cd16f_@hashgraph_proto_lib_da8f796c._.js
│  │  │  │  ├─ cd16f_@hashgraph_proto_lib_da8f796c._.js.map
│  │  │  │  ├─ pages
│  │  │  │  │  ├─ _app.js
│  │  │  │  │  ├─ _error.js
│  │  │  │  │  ├─ auth
│  │  │  │  │  │  ├─ [tab].js
│  │  │  │  │  │  └─ login.js
│  │  │  │  │  ├─ dashboards
│  │  │  │  │  │  ├─ investor.js
│  │  │  │  │  │  └─ startup.js
│  │  │  │  │  ├─ dashboards.js
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ src_pages__app_5771e187._.js
│  │  │  │  ├─ src_pages__app_b3283621._.js
│  │  │  │  ├─ src_pages__app_b3283621._.js.map
│  │  │  │  ├─ src_pages__error_5771e187._.js
│  │  │  │  ├─ src_pages__error_f7a77632._.js
│  │  │  │  ├─ src_pages__error_f7a77632._.js.map
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_34a90dda._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_34a90dda._.js.map
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_67312997._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_67312997._.js.map
│  │  │  │  ├─ src_pages_auth_login_tsx_3d8da33c._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_3d8da33c._.js.map
│  │  │  │  ├─ src_pages_auth_login_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_cd9c79a3._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_cd9c79a3._.js.map
│  │  │  │  ├─ src_pages_dashboards_index_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_index_tsx_f079ec81._.js
│  │  │  │  ├─ src_pages_dashboards_index_tsx_f079ec81._.js.map
│  │  │  │  ├─ src_pages_dashboards_investor_index_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_investor_index_tsx_c43f94cc._.js
│  │  │  │  ├─ src_pages_dashboards_investor_index_tsx_c43f94cc._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_164ad513._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_164ad513._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_3eba1d34._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_3eba1d34._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_61d4cf0b._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_61d4cf0b._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_6729face._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_6729face._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_7c94f7e8._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_7c94f7e8._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_84cb834b._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_84cb834b._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_8b7483e8._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_8b7483e8._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_98119c90._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_98119c90._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_aeee9db1._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_aeee9db1._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_cef0ee4f._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_cef0ee4f._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_dac96717._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_dac96717._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_eaa33556._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_eaa33556._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_f12f16ff._.js
│  │  │  │  ├─ src_pages_dashboards_startup_index_tsx_f12f16ff._.js.map
│  │  │  │  ├─ src_pages_index_5771e187._.js
│  │  │  │  ├─ src_pages_index_8acda347._.js
│  │  │  │  ├─ src_pages_index_8acda347._.js.map
│  │  │  │  ├─ src_styles_globals_4738091e.css
│  │  │  │  └─ src_styles_globals_4738091e.css.map
│  │  │  └─ development
│  │  │     ├─ _buildManifest.js
│  │  │     ├─ _clientMiddlewareManifest.json
│  │  │     └─ _ssgManifest.js
│  │  ├─ trace
│  │  └─ types
│  ├─ .prettierrc
│  ├─ .vercel
│  │  ├─ README.txt
│  │  └─ project.json
│  ├─ README.md
│  ├─ components.json
│  ├─ eslint.config.mjs
│  ├─ next-env.d.ts
│  ├─ next.config.js
│  ├─ next.config.ts
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ favicon.ico
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ next.svg
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  ├─ src
│  │  ├─ components
│  │  │  ├─ CTASection.tsx
│  │  │  ├─ DataTable.tsx
│  │  │  ├─ FeatureProjects.tsx
│  │  │  ├─ Features.tsx
│  │  │  ├─ Footer.tsx
│  │  │  ├─ Header.tsx
│  │  │  ├─ HeroPanel.tsx
│  │  │  ├─ HeroSection.tsx
│  │  │  ├─ HowItWorks.tsx
│  │  │  ├─ LanguageSwitcher.tsx
│  │  │  ├─ Navbar.tsx
│  │  │  ├─ Navigation.tsx
│  │  │  ├─ PlatformBenefits.tsx
│  │  │  ├─ StatSection.tsx
│  │  │  ├─ SummaryCards.tsx
│  │  │  ├─ UserSections.tsx
│  │  │  ├─ auth
│  │  │  │  └─ RequireAuth.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ admin
│  │  │  │  ├─ investor
│  │  │  │  └─ startup
│  │  │  ├─ figma
│  │  │  │  └─ ImageWithFallback.tsx
│  │  │  ├─ icons.tsx
│  │  │  └─ ui
│  │  │     ├─ accordion.tsx
│  │  │     ├─ alert-dialog.tsx
│  │  │     ├─ alert.tsx
│  │  │     ├─ aspect-ratio.tsx
│  │  │     ├─ avatar.tsx
│  │  │     ├─ badge.tsx
│  │  │     ├─ breadcrumb.tsx
│  │  │     ├─ button.tsx
│  │  │     ├─ calendar.tsx
│  │  │     ├─ card.tsx
│  │  │     ├─ carousel.tsx
│  │  │     ├─ chart.tsx
│  │  │     ├─ checkbox.tsx
│  │  │     ├─ collapsible.tsx
│  │  │     ├─ command.tsx
│  │  │     ├─ context-menu.tsx
│  │  │     ├─ dialog.tsx
│  │  │     ├─ drawer.tsx
│  │  │     ├─ dropdown-menu.tsx
│  │  │     ├─ form.tsx
│  │  │     ├─ hover-card.tsx
│  │  │     ├─ input-otp.tsx
│  │  │     ├─ input.tsx
│  │  │     ├─ label.tsx
│  │  │     ├─ menubar.tsx
│  │  │     ├─ navigation-menu.tsx
│  │  │     ├─ pagination.tsx
│  │  │     ├─ popover.tsx
│  │  │     ├─ progress.tsx
│  │  │     ├─ radio-group.tsx
│  │  │     ├─ resizable.tsx
│  │  │     ├─ scroll-area.tsx
│  │  │     ├─ select.tsx
│  │  │     ├─ separator.tsx
│  │  │     ├─ sheet.tsx
│  │  │     ├─ sidebar.tsx
│  │  │     ├─ skeleton.tsx
│  │  │     ├─ slider.tsx
│  │  │     ├─ sonner.tsx
│  │  │     ├─ switch.tsx
│  │  │     ├─ table.tsx
│  │  │     ├─ tabs.tsx
│  │  │     ├─ textarea.tsx
│  │  │     ├─ toggle-group.tsx
│  │  │     ├─ toggle.tsx
│  │  │     ├─ tooltip.tsx
│  │  │     └─ use-mobile.ts
│  │  ├─ data
│  │  │  ├─ statsData.ts
│  │  │  └─ step4SuccessData.ts
│  │  ├─ features
│  │  │  ├─ auth
│  │  │  │  ├─ components
│  │  │  │  │  ├─ GetStartedModal.tsx
│  │  │  │  │  ├─ LoginForm.tsx
│  │  │  │  │  ├─ SignupForm.tsx
│  │  │  │  │  ├─ TabAuthWrapper.tsx
│  │  │  │  │  └─ signup
│  │  │  │  │     ├─ SignupFormWizard.tsx
│  │  │  │  │     ├─ SignupStep1.tsx
│  │  │  │  │     ├─ SignupStep2.tsx
│  │  │  │  │     ├─ SignupStep3.tsx
│  │  │  │  │     └─ Step4Success.tsx
│  │  │  │  ├─ core
│  │  │  │  │  ├─ cognitoProvider.ts
│  │  │  │  │  └─ kycService.ts
│  │  │  │  ├─ hook
│  │  │  │  │  ├─ useKyc.ts
│  │  │  │  │  ├─ useLogin.ts
│  │  │  │  │  ├─ useSignOut.ts
│  │  │  │  │  └─ useSignup.ts
│  │  │  │  ├─ store
│  │  │  │  │  └─ signup.store.ts
│  │  │  │  └─ types
│  │  │  │     └─ authTypes.ts
│  │  │  ├─ profil
│  │  │  │  └─ ProfilPage.tsx
│  │  │  ├─ project
│  │  │  │  ├─ components
│  │  │  │  │  ├─ EmptyState.tsx
│  │  │  │  │  ├─ FilterBar.tsx
│  │  │  │  │  ├─ ProjectCard.tsx
│  │  │  │  │  ├─ ProjectList.tsx
│  │  │  │  │  ├─ StartupProjectList.tsx
│  │  │  │  │  ├─ StatCard.tsx
│  │  │  │  │  └─ modals
│  │  │  │  │     └─ ConfirmDeleteModal.tsx
│  │  │  │  ├─ core
│  │  │  │  │  ├─ api.ts
│  │  │  │  │  └─ types.ts
│  │  │  │  ├─ form
│  │  │  │  │  ├─ FileUpload.tsx
│  │  │  │  │  ├─ FormNavigation.tsx
│  │  │  │  │  ├─ MultiStepProjectForm.tsx
│  │  │  │  │  ├─ Step1ProjectDetails.tsx
│  │  │  │  │  ├─ Step2ShareOffering.tsx
│  │  │  │  │  ├─ Step3ReviewPublish.tsx
│  │  │  │  │  └─ SuccessState.tsx
│  │  │  │  ├─ hook
│  │  │  │  │  ├─ useCreateProject.ts
│  │  │  │  │  └─ useProjects.ts
│  │  │  │  └─ store
│  │  │  │     └─ projectStore.ts
│  │  │  └─ wallet
│  │  │     ├─ components
│  │  │     │  ├─ ConnectSteps.tsx
│  │  │     │  ├─ ConnectWalletDialog.tsx
│  │  │     │  ├─ ErrorState.tsx
│  │  │     │  ├─ HelpSection.tsx
│  │  │     │  ├─ SuccessState.tsx
│  │  │     │  ├─ WalletConnection.tsx
│  │  │     │  ├─ WalletCreation.tsx
│  │  │     │  ├─ WalletOption.tsx
│  │  │     │  ├─ WalletStatus.tsx
│  │  │     │  └─ walletManagement.tsx
│  │  │     ├─ hooks
│  │  │     │  ├─ useConnectWalletDialog.ts
│  │  │     │  ├─ useWalletConnect.ts
│  │  │     │  └─ useWalletCreation.ts
│  │  │     └─ service
│  │  ├─ hooks
│  │  │  └─ useTranslate.ts
│  │  ├─ layout
│  │  │  ├─ DashboardLayout.tsx
│  │  │  ├─ PublicLayout.tsx
│  │  │  └─ dashboard
│  │  │     ├─ Header.tsx
│  │  │     ├─ MainContent.tsx
│  │  │     ├─ MobileMenu.tsx
│  │  │     ├─ Sidebar.tsx
│  │  │     └─ navConfig.ts
│  │  ├─ lib
│  │  │  ├─ api.ts
│  │  │  └─ utils.ts
│  │  ├─ locales
│  │  │  ├─ en.json
│  │  │  └─ fr.json
│  │  ├─ pages
│  │  │  ├─ _app.tsx
│  │  │  ├─ _document.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ [tab].tsx
│  │  │  │  └─ login.tsx
│  │  │  ├─ dashboards
│  │  │  │  ├─ admin
│  │  │  │  │  └─ index.tsx
│  │  │  │  ├─ index.tsx
│  │  │  │  ├─ investor
│  │  │  │  │  └─ index.tsx
│  │  │  │  └─ startup
│  │  │  │     ├─ StartupHome.tsx
│  │  │  │     ├─ index.tsx
│  │  │  │     ├─ projects
│  │  │  │     │  ├─ [id].tsx
│  │  │  │     │  ├─ create.tsx
│  │  │  │     │  ├─ edit
│  │  │  │     │  │  └─ [id].tsx
│  │  │  │     │  └─ index.tsx
│  │  │  │     └─ wallet.tsx
│  │  │  ├─ index.tsx
│  │  │  └─ unauthorized.tsx
│  │  ├─ provider
│  │  │  └─ AuthProvider.tsx
│  │  ├─ store
│  │  │  └─ authStore.ts
│  │  ├─ styles
│  │  │  └─ globals.css
│  │  └─ utils
│  │     ├─ downloadWalletDetails.ts
│  │     └─ jwt.ts
│  └─ tsconfig.json
└─ sachain-infrastructure
   ├─ .npmignore
   ├─ DEPLOYMENT.md
   ├─ DEPLOYMENT_VALIDATION_REPORT.md
   ├─ README.md
   ├─ bin
   │  └─ sachain-infrastructure.ts
   ├─ cdk.context.json
   ├─ cdk.json
   ├─ config
   │  ├─ environments.json
   │  └─ secrets.ts
   ├─ jest.config.js
   ├─ lib
   │  ├─ config.ts
   │  ├─ constructs
   │  │  ├─ alarm-configuration.ts
   │  │  ├─ cognito.ts
   │  │  ├─ dashboard-configuration.ts
   │  │  ├─ dynamodb.ts
   │  │  ├─ eventbridge.ts
   │  │  ├─ index.ts
   │  │  ├─ lambda.ts
   │  │  ├─ monitoring.ts
   │  │  ├─ post-auth-lambda.ts
   │  │  ├─ s3.ts
   │  │  └─ security.ts
   │  ├─ index.ts
   │  ├─ interfaces
   │  │  ├─ cross-stack-references.ts
   │  │  └─ index.ts
   │  ├─ stacks
   │  │  ├─ README.md
   │  │  ├─ core-stack.ts
   │  │  ├─ index.ts
   │  │  ├─ lambda-stack.ts
   │  │  ├─ monitoring-stack.ts
   │  │  └─ security-stack.ts
   │  └─ utils
   │     ├─ cross-stack-imports.ts
   │     ├─ cross-stack-validator.ts
   │     ├─ deployment-error-handler.ts
   │     ├─ iam-policy-validator.ts
   │     └─ index.ts
   ├─ package.json
   ├─ scripts
   │  ├─ ci-cd-pipeline.yml
   │  ├─ deploy.sh
   │  ├─ e2e-validation.sh
   │  ├─ security-performance-tests.sh
   │  └─ validate-deployment.sh
   ├─ test
   │  ├─ constructs
   │  │  ├─ admin-monitoring.test.ts
   │  │  ├─ admin-review-lambda.test.ts
   │  │  ├─ alarm-configuration.test.ts
   │  │  ├─ cognito.test.ts
   │  │  ├─ dynamodb-validation.ts
   │  │  ├─ dynamodb.test.ts
   │  │  ├─ eventbridge-processing.test.ts
   │  │  ├─ eventbridge.test.ts
   │  │  ├─ iam-permissions-refactor.test.ts
   │  │  ├─ infrastructure-integration.test.ts
   │  │  ├─ kyc-processing-lambda.test.ts
   │  │  ├─ lambda-kyc-upload-simple.test.ts
   │  │  ├─ lambda-kyc-upload.test.ts
   │  │  ├─ post-auth-lambda.test.ts
   │  │  ├─ s3.test.ts
   │  │  ├─ security-final.test.ts
   │  │  ├─ security-iam-policies.test.ts
   │  │  ├─ security-integration.test.ts
   │  │  └─ security-validation.test.ts
   │  ├─ cross-stack-references.test.ts
   │  ├─ deployment-validation-simple.test.ts
   │  ├─ deployment-validation.test.ts
   │  ├─ e2e-validation.test.ts
   │  ├─ sachain-infrastructure.test.ts
   │  ├─ setup.ts
   │  ├─ stacks
   │  │  ├─ core-stack-integration.test.ts
   │  │  ├─ core-stack.test.ts
   │  │  ├─ lambda-stack.test.ts
   │  │  ├─ monitoring-stack.test.ts
   │  │  └─ security-stack.test.ts
   │  └─ utils
   │     ├─ deployment-error-handler.test.ts
   │     ├─ enhanced-cross-stack-validator.test.ts
   │     └─ iam-policy-validator.test.ts
   ├─ tsconfig.json
   └─ tsconfig.test.json

```