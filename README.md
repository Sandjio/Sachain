# Sachain

A decentralized crowdfunding platform built on Hedera Hashgraph, enabling transparent and secure fundraising campaigns.

## 🚀 Features

- **Decentralized Campaigns**: Create and manage crowdfunding campaigns on Hedera
- **Transparent Funding**: All transactions recorded on Hedera ledger
- **Smart Contract Integration**: Automated fund distribution and milestone tracking
- **Modern Web Interface**: React/Next.js frontend with responsive design
- **AWS Infrastructure**: Scalable backend services using AWS CDK

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
