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
