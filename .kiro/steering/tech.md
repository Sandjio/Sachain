# Technology Stack

## Architecture Overview

- **Frontend**: Next.js 15 with React 19 and Tailwind CSS v4
- **Backend**: Node.js/TypeScript Lambda functions on AWS
- **Infrastructure**: AWS CDK for Infrastructure as Code
- **Blockchain**: Hedera Hashgraph for transaction processing and tokenization

## Build System

The project uses npm workspaces for monorepo management with three main packages:

- `sachain-frontend` - Next.js web application
- `backend` - AWS Lambda functions and APIs
- `sachain-infrastructure` - AWS CDK infrastructure definitions

## Frontend Stack

- **Framework**: Next.js 15 with Turbopack for development
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4 with PostCSS
- **TypeScript**: v5 with strict mode enabled
- **Linting**: ESLint with Next.js configuration

## Backend Stack

- **Runtime**: Node.js with TypeScript
- **Target**: ES2020 for Lambda compatibility
- **AWS SDK**: v2 for AWS service integration
- **Testing**: Jest with ts-jest
- **Development**: ts-node-dev for hot reloading

## Infrastructure Stack

- **IaC Tool**: AWS CDK v2
- **Language**: TypeScript
- **Testing**: Jest for infrastructure tests
- **Deployment**: CDK CLI

## Common Commands

### Development

```bash
# Start all services in development mode
npm run dev

# Start specific workspace
npm run dev --workspace=sachain-frontend
```

### Building

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=backend
```

### Testing

```bash
# Run all tests
npm run test

# Test specific workspace
npm run test --workspace=sachain-infrastructure
```

### Infrastructure

```bash
# Deploy infrastructure
cd sachain-infrastructure
npm run cdk deploy

# Watch for changes
npm run watch
```

## Development Tools

- **Package Manager**: npm with workspaces
- **TypeScript**: Consistent v5 across all packages
- **Hot Reloading**: Turbopack (frontend), ts-node-dev (backend)
- **Code Quality**: ESLint, TypeScript strict mode
