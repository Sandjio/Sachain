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
│  │  ├─ BUILD_ID
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
│  │  │  ├─ .previewinfo
│  │  │  ├─ .rscinfo
│  │  │  ├─ .tsbuildinfo
│  │  │  ├─ eslint
│  │  │  │  └─ .cache_1u76iy8
│  │  │  ├─ swc
│  │  │  │  └─ plugins
│  │  │  │     └─ v7_linux_x86_64_17.0.0
│  │  │  └─ webpack
│  │  │     ├─ client-production
│  │  │     │  ├─ 0.pack
│  │  │     │  └─ index.pack
│  │  │     ├─ edge-server-production
│  │  │     │  ├─ 0.pack
│  │  │     │  └─ index.pack
│  │  │     └─ server-production
│  │  │        ├─ 0.pack
│  │  │        └─ index.pack
│  │  ├─ diagnostics
│  │  │  ├─ build-diagnostics.json
│  │  │  └─ framework.json
│  │  ├─ dynamic-css-manifest.json
│  │  ├─ export-marker.json
│  │  ├─ fallback-build-manifest.json
│  │  ├─ images-manifest.json
│  │  ├─ next-minimal-server.js.nft.json
│  │  ├─ next-server.js.nft.json
│  │  ├─ package.json
│  │  ├─ postcss.js
│  │  ├─ postcss.js.map
│  │  ├─ prerender-manifest.json
│  │  ├─ react-loadable-manifest.json
│  │  ├─ required-server-files.json
│  │  ├─ routes-manifest.json
│  │  ├─ server
│  │  │  ├─ app-paths-manifest.json
│  │  │  ├─ chunks
│  │  │  │  ├─ 199.js
│  │  │  │  ├─ 377.js
│  │  │  │  ├─ 515.js
│  │  │  │  ├─ 634.js
│  │  │  │  ├─ 763.js
│  │  │  │  └─ ssr
│  │  │  │     ├─ 4787e_next_dist_9c7a27cf._.js
│  │  │  │     ├─ 4787e_next_dist_9c7a27cf._.js.map
│  │  │  │     ├─ 4787e_next_dist_dddd176d._.js
│  │  │  │     ├─ 4787e_next_dist_dddd176d._.js.map
│  │  │  │     ├─ [externals]_next_dist_shared_lib_no-fallback-error_external_d7a8835d.js
│  │  │  │     ├─ [externals]_next_dist_shared_lib_no-fallback-error_external_d7a8835d.js.map
│  │  │  │     ├─ [root-of-the-server]__04b014cc._.js
│  │  │  │     ├─ [root-of-the-server]__04b014cc._.js.map
│  │  │  │     ├─ [root-of-the-server]__126a8b15._.js
│  │  │  │     ├─ [root-of-the-server]__126a8b15._.js.map
│  │  │  │     ├─ [root-of-the-server]__12ccf0bd._.js
│  │  │  │     ├─ [root-of-the-server]__12ccf0bd._.js.map
│  │  │  │     ├─ [root-of-the-server]__1399c189._.js
│  │  │  │     ├─ [root-of-the-server]__1399c189._.js.map
│  │  │  │     ├─ [root-of-the-server]__15e44134._.js
│  │  │  │     ├─ [root-of-the-server]__15e44134._.js.map
│  │  │  │     ├─ [root-of-the-server]__1e28c0bc._.js
│  │  │  │     ├─ [root-of-the-server]__1e28c0bc._.js.map
│  │  │  │     ├─ [root-of-the-server]__1e61771b._.js
│  │  │  │     ├─ [root-of-the-server]__1e61771b._.js.map
│  │  │  │     ├─ [root-of-the-server]__24f23bc9._.js
│  │  │  │     ├─ [root-of-the-server]__24f23bc9._.js.map
│  │  │  │     ├─ [root-of-the-server]__2842dc62._.js
│  │  │  │     ├─ [root-of-the-server]__2842dc62._.js.map
│  │  │  │     ├─ [root-of-the-server]__29a4f3bc._.js
│  │  │  │     ├─ [root-of-the-server]__29a4f3bc._.js.map
│  │  │  │     ├─ [root-of-the-server]__2fd2c516._.js
│  │  │  │     ├─ [root-of-the-server]__2fd2c516._.js.map
│  │  │  │     ├─ [root-of-the-server]__37097ea7._.js
│  │  │  │     ├─ [root-of-the-server]__37097ea7._.js.map
│  │  │  │     ├─ [root-of-the-server]__3ba8fa17._.js
│  │  │  │     ├─ [root-of-the-server]__3ba8fa17._.js.map
│  │  │  │     ├─ [root-of-the-server]__42eee2aa._.js
│  │  │  │     ├─ [root-of-the-server]__42eee2aa._.js.map
│  │  │  │     ├─ [root-of-the-server]__43a6caec._.js
│  │  │  │     ├─ [root-of-the-server]__43a6caec._.js.map
│  │  │  │     ├─ [root-of-the-server]__44f6730b._.js
│  │  │  │     ├─ [root-of-the-server]__44f6730b._.js.map
│  │  │  │     ├─ [root-of-the-server]__473fc5ea._.js
│  │  │  │     ├─ [root-of-the-server]__473fc5ea._.js.map
│  │  │  │     ├─ [root-of-the-server]__4fe2bddc._.js
│  │  │  │     ├─ [root-of-the-server]__4fe2bddc._.js.map
│  │  │  │     ├─ [root-of-the-server]__83a7c2ca._.js
│  │  │  │     ├─ [root-of-the-server]__83a7c2ca._.js.map
│  │  │  │     ├─ [root-of-the-server]__8616f20f._.js
│  │  │  │     ├─ [root-of-the-server]__8616f20f._.js.map
│  │  │  │     ├─ [root-of-the-server]__906e67a5._.js
│  │  │  │     ├─ [root-of-the-server]__906e67a5._.js.map
│  │  │  │     ├─ [root-of-the-server]__93ade7bd._.js
│  │  │  │     ├─ [root-of-the-server]__93ade7bd._.js.map
│  │  │  │     ├─ [root-of-the-server]__a1ca224e._.js
│  │  │  │     ├─ [root-of-the-server]__a1ca224e._.js.map
│  │  │  │     ├─ [root-of-the-server]__ac11e8e0._.js
│  │  │  │     ├─ [root-of-the-server]__ac11e8e0._.js.map
│  │  │  │     ├─ [root-of-the-server]__b5d88519._.js
│  │  │  │     ├─ [root-of-the-server]__b5d88519._.js.map
│  │  │  │     ├─ [root-of-the-server]__bf297342._.js
│  │  │  │     ├─ [root-of-the-server]__bf297342._.js.map
│  │  │  │     ├─ [root-of-the-server]__ca97ad39._.js
│  │  │  │     ├─ [root-of-the-server]__ca97ad39._.js.map
│  │  │  │     ├─ [root-of-the-server]__d015a27f._.js
│  │  │  │     ├─ [root-of-the-server]__d015a27f._.js.map
│  │  │  │     ├─ [root-of-the-server]__e432638c._.js
│  │  │  │     ├─ [root-of-the-server]__e432638c._.js.map
│  │  │  │     ├─ [root-of-the-server]__e87a4777._.js
│  │  │  │     ├─ [root-of-the-server]__e87a4777._.js.map
│  │  │  │     ├─ [root-of-the-server]__f0727df3._.js
│  │  │  │     ├─ [root-of-the-server]__f0727df3._.js.map
│  │  │  │     ├─ [root-of-the-server]__fd87627b._.js
│  │  │  │     ├─ [root-of-the-server]__fd87627b._.js.map
│  │  │  │     ├─ [turbopack]_runtime.js
│  │  │  │     └─ [turbopack]_runtime.js.map
│  │  │  ├─ dynamic-css-manifest.js
│  │  │  ├─ functions-config-manifest.json
│  │  │  ├─ interception-route-rewrite-manifest.js
│  │  │  ├─ middleware-build-manifest.js
│  │  │  ├─ middleware-manifest.json
│  │  │  ├─ middleware-react-loadable-manifest.js
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
│  │  │  │  ├─ _app.js.nft.json
│  │  │  │  ├─ _document
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ _document.js
│  │  │  │  ├─ _document.js.map
│  │  │  │  ├─ _document.js.nft.json
│  │  │  │  ├─ _error
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ _error.js
│  │  │  │  ├─ _error.js.map
│  │  │  │  ├─ _error.js.nft.json
│  │  │  │  ├─ auth
│  │  │  │  │  ├─ [tab]
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ [tab].js
│  │  │  │  │  ├─ [tab].js.map
│  │  │  │  │  ├─ [tab].js.nft.json
│  │  │  │  │  ├─ login
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ login.js
│  │  │  │  │  ├─ login.js.map
│  │  │  │  │  ├─ login.js.nft.json
│  │  │  │  │  ├─ signup
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ signup.js
│  │  │  │  │  ├─ signup.js.map
│  │  │  │  │  └─ signup.js.nft.json
│  │  │  │  ├─ dashboards
│  │  │  │  │  ├─ admin
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ admin.js
│  │  │  │  │  ├─ admin.js.map
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ investor
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ investor.js
│  │  │  │  │  ├─ investor.js.map
│  │  │  │  │  ├─ investor.js.nft.json
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  ├─ react-loadable-manifest.json
│  │  │  │  │  ├─ startup
│  │  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  │  ├─ startup.js
│  │  │  │  │  ├─ startup.js.map
│  │  │  │  │  └─ startup.js.nft.json
│  │  │  │  ├─ dashboards.js
│  │  │  │  ├─ dashboards.js.map
│  │  │  │  ├─ en
│  │  │  │  │  ├─ 404.html
│  │  │  │  │  ├─ 500.html
│  │  │  │  │  ├─ auth
│  │  │  │  │  │  ├─ [tab].html
│  │  │  │  │  │  ├─ login.html
│  │  │  │  │  │  └─ signup.html
│  │  │  │  │  └─ dashboards
│  │  │  │  │     ├─ investor.html
│  │  │  │  │     └─ startup.html
│  │  │  │  ├─ en.html
│  │  │  │  ├─ en.json
│  │  │  │  ├─ fr
│  │  │  │  │  ├─ 404.html
│  │  │  │  │  ├─ 500.html
│  │  │  │  │  ├─ auth
│  │  │  │  │  │  ├─ [tab].html
│  │  │  │  │  │  ├─ login.html
│  │  │  │  │  │  └─ signup.html
│  │  │  │  │  └─ dashboards
│  │  │  │  │     ├─ investor.html
│  │  │  │  │     └─ startup.html
│  │  │  │  ├─ fr.html
│  │  │  │  ├─ fr.json
│  │  │  │  ├─ index
│  │  │  │  │  ├─ build-manifest.json
│  │  │  │  │  ├─ next-font-manifest.json
│  │  │  │  │  ├─ pages-manifest.json
│  │  │  │  │  └─ react-loadable-manifest.json
│  │  │  │  ├─ index.js
│  │  │  │  ├─ index.js.map
│  │  │  │  └─ index.js.nft.json
│  │  │  ├─ pages-manifest.json
│  │  │  ├─ server-reference-manifest.js
│  │  │  ├─ server-reference-manifest.json
│  │  │  └─ webpack-runtime.js
│  │  ├─ static
│  │  │  ├─ YpeOvAvGaAbrMt2srLLEp
│  │  │  │  ├─ _buildManifest.js
│  │  │  │  └─ _ssgManifest.js
│  │  │  ├─ chunks
│  │  │  │  ├─ 4787e_next_d1fcd2fd._.js
│  │  │  │  ├─ 4787e_next_d1fcd2fd._.js.map
│  │  │  │  ├─ 4787e_next_dist_01ca92c9._.js
│  │  │  │  ├─ 4787e_next_dist_01ca92c9._.js.map
│  │  │  │  ├─ 4787e_next_dist_9d49c10f._.js
│  │  │  │  ├─ 4787e_next_dist_9d49c10f._.js.map
│  │  │  │  ├─ 4787e_next_dist_client_2923b3ae._.js
│  │  │  │  ├─ 4787e_next_dist_client_2923b3ae._.js.map
│  │  │  │  ├─ 4787e_next_dist_client_3c4c3702._.js
│  │  │  │  ├─ 4787e_next_dist_client_3c4c3702._.js.map
│  │  │  │  ├─ 4787e_next_dist_compiled_303f463f._.js
│  │  │  │  ├─ 4787e_next_dist_compiled_303f463f._.js.map
│  │  │  │  ├─ 4787e_next_dist_compiled_f92fb76d._.js
│  │  │  │  ├─ 4787e_next_dist_compiled_f92fb76d._.js.map
│  │  │  │  ├─ 4787e_next_dist_compiled_next-devtools_index_9a27b047.js
│  │  │  │  ├─ 4787e_next_dist_compiled_next-devtools_index_9a27b047.js.map
│  │  │  │  ├─ 4787e_next_dist_shared_lib_6469e95c._.js
│  │  │  │  ├─ 4787e_next_dist_shared_lib_6469e95c._.js.map
│  │  │  │  ├─ 4787e_next_dist_shared_lib_7270dab5._.js
│  │  │  │  ├─ 4787e_next_dist_shared_lib_7270dab5._.js.map
│  │  │  │  ├─ 4787e_next_dist_shared_lib_ca08c8e9._.js
│  │  │  │  ├─ 4787e_next_dist_shared_lib_ca08c8e9._.js.map
│  │  │  │  ├─ 4787e_next_e28b909e._.js
│  │  │  │  ├─ 4787e_next_e28b909e._.js.map
│  │  │  │  ├─ 4787e_next_error_7dcf62fc.js
│  │  │  │  ├─ 4787e_next_error_7dcf62fc.js.map
│  │  │  │  ├─ 4787e_next_router_d99673c6.js
│  │  │  │  ├─ 4787e_next_router_d99673c6.js.map
│  │  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_6c1d7978._.js
│  │  │  │  ├─ 5920c_@aws-sdk_client-cognito-identity-provider_6c1d7978._.js.map
│  │  │  │  ├─ 74-9cffb87adeec4ac4.js
│  │  │  │  ├─ 7fbd0_zod_v4_1f06bfac._.js
│  │  │  │  ├─ 7fbd0_zod_v4_1f06bfac._.js.map
│  │  │  │  ├─ 8484d_tailwind-merge_dist_bundle-mjs_mjs_efdef8cd._.js
│  │  │  │  ├─ 8484d_tailwind-merge_dist_bundle-mjs_mjs_efdef8cd._.js.map
│  │  │  │  ├─ 864-803dabf510b9880a.js
│  │  │  │  ├─ 880-7945ed57364aae99.js
│  │  │  │  ├─ 997-75dad5a03cc5564d.js
│  │  │  │  ├─ [next]_entry_page-loader_ts_f2cd5c7a._.js
│  │  │  │  ├─ [next]_entry_page-loader_ts_f2cd5c7a._.js.map
│  │  │  │  ├─ [root-of-the-server]__11e6a6d4._.js
│  │  │  │  ├─ [root-of-the-server]__11e6a6d4._.js.map
│  │  │  │  ├─ [root-of-the-server]__1c48944b._.js
│  │  │  │  ├─ [root-of-the-server]__1c48944b._.js.map
│  │  │  │  ├─ [root-of-the-server]__292db1e4._.js
│  │  │  │  ├─ [root-of-the-server]__292db1e4._.js.map
│  │  │  │  ├─ [root-of-the-server]__352ef131._.js
│  │  │  │  ├─ [root-of-the-server]__352ef131._.js.map
│  │  │  │  ├─ [root-of-the-server]__3624f3ea._.js
│  │  │  │  ├─ [root-of-the-server]__3624f3ea._.js.map
│  │  │  │  ├─ [root-of-the-server]__38300fbb._.js
│  │  │  │  ├─ [root-of-the-server]__38300fbb._.js.map
│  │  │  │  ├─ [root-of-the-server]__3f8fec48._.js
│  │  │  │  ├─ [root-of-the-server]__3f8fec48._.js.map
│  │  │  │  ├─ [root-of-the-server]__400f4f9e._.js
│  │  │  │  ├─ [root-of-the-server]__400f4f9e._.js.map
│  │  │  │  ├─ [root-of-the-server]__40cf05b3._.js
│  │  │  │  ├─ [root-of-the-server]__40cf05b3._.js.map
│  │  │  │  ├─ [root-of-the-server]__4a6ce806._.js
│  │  │  │  ├─ [root-of-the-server]__4a6ce806._.js.map
│  │  │  │  ├─ [root-of-the-server]__50d5e834._.js
│  │  │  │  ├─ [root-of-the-server]__50d5e834._.js.map
│  │  │  │  ├─ [root-of-the-server]__526abf02._.js
│  │  │  │  ├─ [root-of-the-server]__526abf02._.js.map
│  │  │  │  ├─ [root-of-the-server]__58ed3b29._.js
│  │  │  │  ├─ [root-of-the-server]__58ed3b29._.js.map
│  │  │  │  ├─ [root-of-the-server]__5b1dfcc5._.js
│  │  │  │  ├─ [root-of-the-server]__5b1dfcc5._.js.map
│  │  │  │  ├─ [root-of-the-server]__5c0bc7bb._.js
│  │  │  │  ├─ [root-of-the-server]__5c0bc7bb._.js.map
│  │  │  │  ├─ [root-of-the-server]__758bbf8a._.js
│  │  │  │  ├─ [root-of-the-server]__758bbf8a._.js.map
│  │  │  │  ├─ [root-of-the-server]__7ac56eac._.js
│  │  │  │  ├─ [root-of-the-server]__7ac56eac._.js.map
│  │  │  │  ├─ [root-of-the-server]__81b538ba._.js
│  │  │  │  ├─ [root-of-the-server]__81b538ba._.js.map
│  │  │  │  ├─ [root-of-the-server]__9e271bd1._.js
│  │  │  │  ├─ [root-of-the-server]__9e271bd1._.js.map
│  │  │  │  ├─ [root-of-the-server]__a1e2e424._.js
│  │  │  │  ├─ [root-of-the-server]__a1e2e424._.js.map
│  │  │  │  ├─ [root-of-the-server]__b2a1663b._.js
│  │  │  │  ├─ [root-of-the-server]__b2a1663b._.js.map
│  │  │  │  ├─ [root-of-the-server]__b35e77d5._.js
│  │  │  │  ├─ [root-of-the-server]__b35e77d5._.js.map
│  │  │  │  ├─ [root-of-the-server]__b9bb30cf._.js
│  │  │  │  ├─ [root-of-the-server]__b9bb30cf._.js.map
│  │  │  │  ├─ [root-of-the-server]__c194513e._.js
│  │  │  │  ├─ [root-of-the-server]__c194513e._.js.map
│  │  │  │  ├─ [root-of-the-server]__c803ea20._.js
│  │  │  │  ├─ [root-of-the-server]__c803ea20._.js.map
│  │  │  │  ├─ [root-of-the-server]__ca96392e._.js
│  │  │  │  ├─ [root-of-the-server]__ca96392e._.js.map
│  │  │  │  ├─ [root-of-the-server]__d5f63d55._.js
│  │  │  │  ├─ [root-of-the-server]__d5f63d55._.js.map
│  │  │  │  ├─ [root-of-the-server]__e12ce875._.js
│  │  │  │  ├─ [root-of-the-server]__e12ce875._.js.map
│  │  │  │  ├─ [root-of-the-server]__eb46ea2b._.js
│  │  │  │  ├─ [root-of-the-server]__eb46ea2b._.js.map
│  │  │  │  ├─ [root-of-the-server]__f5ec1fb7._.js
│  │  │  │  ├─ [root-of-the-server]__f5ec1fb7._.js.map
│  │  │  │  ├─ [root-of-the-server]__fcbe03bf._.js
│  │  │  │  ├─ [root-of-the-server]__fcbe03bf._.js.map
│  │  │  │  ├─ [root-of-the-server]__fe85be58._.js
│  │  │  │  ├─ [root-of-the-server]__fe85be58._.js.map
│  │  │  │  ├─ a14e7_react-dom_638ad3bb._.js
│  │  │  │  ├─ a14e7_react-dom_638ad3bb._.js.map
│  │  │  │  ├─ framework-609ad57edae63d42.js
│  │  │  │  ├─ main-717317da23a28e96.js
│  │  │  │  ├─ pages
│  │  │  │  │  ├─ _app-c6bfbf321e953fec.js
│  │  │  │  │  ├─ _app.js
│  │  │  │  │  ├─ _error-f220751c38606401.js
│  │  │  │  │  ├─ _error.js
│  │  │  │  │  ├─ auth
│  │  │  │  │  │  ├─ [tab]-5cdd1584fa36e4dc.js
│  │  │  │  │  │  ├─ [tab].js
│  │  │  │  │  │  ├─ login-f6241ab4edd3169c.js
│  │  │  │  │  │  ├─ login.js
│  │  │  │  │  │  ├─ signup-6524a11caa750ebc.js
│  │  │  │  │  │  └─ signup.js
│  │  │  │  │  ├─ dashboards
│  │  │  │  │  │  ├─ admin.js
│  │  │  │  │  │  ├─ investor-add6db231d32a93a.js
│  │  │  │  │  │  ├─ investor.js
│  │  │  │  │  │  ├─ startup-ddeb58c5ef52d78f.js
│  │  │  │  │  │  └─ startup.js
│  │  │  │  │  ├─ dashboards.js
│  │  │  │  │  ├─ index-3839cf31277e82f2.js
│  │  │  │  │  └─ index.js
│  │  │  │  ├─ polyfills-42372ed130431b0a.js
│  │  │  │  ├─ src_pages__app_172de710._.js
│  │  │  │  ├─ src_pages__app_172de710._.js.map
│  │  │  │  ├─ src_pages__app_5771e187._.js
│  │  │  │  ├─ src_pages__app_89aa9c24._.js
│  │  │  │  ├─ src_pages__app_89aa9c24._.js.map
│  │  │  │  ├─ src_pages__error_530f4538._.js
│  │  │  │  ├─ src_pages__error_530f4538._.js.map
│  │  │  │  ├─ src_pages__error_5771e187._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_2d2e6227._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_2d2e6227._.js.map
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_698e785d._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_698e785d._.js.map
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_a4d8cb6f._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_a4d8cb6f._.js.map
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_fe24fc84._.js
│  │  │  │  ├─ src_pages_auth_[tab]_tsx_fe24fc84._.js.map
│  │  │  │  ├─ src_pages_auth_login_tsx_5689abd3._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_5689abd3._.js.map
│  │  │  │  ├─ src_pages_auth_login_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_71bb4974._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_71bb4974._.js.map
│  │  │  │  ├─ src_pages_auth_login_tsx_deef01e7._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_deef01e7._.js.map
│  │  │  │  ├─ src_pages_auth_login_tsx_e3af7194._.js
│  │  │  │  ├─ src_pages_auth_login_tsx_e3af7194._.js.map
│  │  │  │  ├─ src_pages_auth_signup_tsx_2e61641a._.js
│  │  │  │  ├─ src_pages_auth_signup_tsx_2e61641a._.js.map
│  │  │  │  ├─ src_pages_auth_signup_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_admin_tsx_4a38e38a._.js
│  │  │  │  ├─ src_pages_dashboards_admin_tsx_4a38e38a._.js.map
│  │  │  │  ├─ src_pages_dashboards_admin_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_index_tsx_4ec6878b._.js
│  │  │  │  ├─ src_pages_dashboards_index_tsx_4ec6878b._.js.map
│  │  │  │  ├─ src_pages_dashboards_index_tsx_56700f19._.js
│  │  │  │  ├─ src_pages_dashboards_index_tsx_56700f19._.js.map
│  │  │  │  ├─ src_pages_dashboards_index_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_785e3c10._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_785e3c10._.js.map
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_7b2405d8._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_7b2405d8._.js.map
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_9afc72b9._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_9afc72b9._.js.map
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_a9dc404c._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_a9dc404c._.js.map
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_c81e483b._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_c81e483b._.js.map
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_edbedddf._.js
│  │  │  │  ├─ src_pages_dashboards_investor_tsx_edbedddf._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_1340b375._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_1340b375._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_25f2d59d._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_25f2d59d._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_27117578._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_27117578._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_3753225f._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_3753225f._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_38ef122b._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_38ef122b._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_5771e187._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_777cad0a._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_777cad0a._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_7d03db92._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_7d03db92._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_8978675b._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_8978675b._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_8c762c6f._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_8c762c6f._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_adad602f._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_adad602f._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_b1caa232._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_b1caa232._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_b88d4b12._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_b88d4b12._.js.map
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_f95d0e68._.js
│  │  │  │  ├─ src_pages_dashboards_startup_tsx_f95d0e68._.js.map
│  │  │  │  ├─ src_pages_index_28870b05._.js
│  │  │  │  ├─ src_pages_index_28870b05._.js.map
│  │  │  │  ├─ src_pages_index_4e1460b1._.js
│  │  │  │  ├─ src_pages_index_4e1460b1._.js.map
│  │  │  │  ├─ src_pages_index_55d4b046._.js
│  │  │  │  ├─ src_pages_index_55d4b046._.js.map
│  │  │  │  ├─ src_pages_index_5771e187._.js
│  │  │  │  ├─ src_pages_index_c8b3487d._.js
│  │  │  │  ├─ src_pages_index_c8b3487d._.js.map
│  │  │  │  ├─ src_styles_globals_4738091e.css
│  │  │  │  ├─ src_styles_globals_4738091e.css.map
│  │  │  │  └─ webpack-2aa3ab9bb630d3af.js
│  │  │  ├─ css
│  │  │  │  └─ 4d8a6db9e733e963.css
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
│  │  │  └─ auth
│  │  │     ├─ components
│  │  │     │  ├─ GetStartedModal.tsx
│  │  │     │  ├─ LoginForm.tsx
│  │  │     │  ├─ SignupForm.tsx
│  │  │     │  ├─ TabAuthWrapper.tsx
│  │  │     │  └─ signup
│  │  │     │     ├─ SignupFormWizard.tsx
│  │  │     │     ├─ SignupStep1.tsx
│  │  │     │     ├─ SignupStep2.tsx
│  │  │     │     ├─ SignupStep3.tsx
│  │  │     │     └─ Step4Success.tsx
│  │  │     ├─ core
│  │  │     │  ├─ cognitoProvider.ts
│  │  │     │  └─ kycService.ts
│  │  │     ├─ hook
│  │  │     │  ├─ useKyc.ts
│  │  │     │  ├─ useLogin.ts
│  │  │     │  └─ useSignup.ts
│  │  │     ├─ store
│  │  │     │  └─ signup.store.ts
│  │  │     └─ types
│  │  │        └─ authTypes.ts
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
│  │  │  │  ├─ admin.tsx
│  │  │  │  ├─ index.tsx
│  │  │  │  ├─ investor.tsx
│  │  │  │  └─ startup.tsx
│  │  │  ├─ index.tsx
│  │  │  └─ unauthorized.tsx
│  │  ├─ provider
│  │  │  └─ AuthProvider.tsx
│  │  ├─ store
│  │  │  └─ authStore.ts
│  │  ├─ styles
│  │  │  └─ globals.css
│  │  └─ utils
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