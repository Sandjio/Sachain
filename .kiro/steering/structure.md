# Project Structure

## Monorepo Organization

Sachain follows a monorepo structure with npm workspaces, organized into three main packages:

```
Sachain/
├── sachain-frontend/        # Next.js web application
├── backend/                 # Lambda functions, APIs and other backend related code
├── sachain-infrastructure/  # AWS CDK infrastructure
└── package.json            # Workspace configuration
```

## Frontend Structure (`sachain-frontend/`)

```
sachain-frontend/
├── src/
│   └── app/                 # Next.js App Router
│       ├── layout.tsx       # Root layout component
│       ├── page.tsx         # Home page
│       ├── globals.css      # Global styles
│       └── favicon.ico      # Site favicon
├── public/                  # Static assets
├── .next/                   # Next.js build output
├── next.config.ts           # Next.js configuration
├── tsconfig.json           # TypeScript config
├── postcss.config.mjs      # PostCSS config for Tailwind
└── eslint.config.mjs       # ESLint configuration
```

## Backend Structure (`backend/`)

```
backend/
├── src/                    # Source code (to be created)
├── dist/                   # TypeScript build output
├── package.json           # Backend dependencies
└── tsconfig.json          # TypeScript config (ES2020 target)
```

## Infrastructure Structure (`sachain-infrastructure/`)

```
sachain-infrastructure/
├── lib/
│   └── sachain-infrastructure-stack.ts  # Main CDK stack
├── bin/                    # CDK app entry point
├── test/                   # Infrastructure tests
├── cdk.json               # CDK configuration
└── package.json           # CDK dependencies
```

## Configuration Files

- **Root `package.json`**: Defines workspaces and common scripts
- **TypeScript configs**: Each package has its own `tsconfig.json` with appropriate targets
- **CDK config**: `cdk.json` defines CDK app settings and feature flags
- **Next.js config**: `next.config.ts` for frontend build configuration

## Naming Conventions

- **Packages**: kebab-case with `sachain-` prefix
- **Files**: kebab-case for config files, PascalCase for React components
- **Directories**: kebab-case for general folders, camelCase for Next.js app routes

## Development Workflow

1. **Root level**: Use for workspace-wide operations (`npm run dev`, `npm run build`)
2. **Package level**: Navigate to specific packages for targeted operations
3. **Infrastructure**: Deploy from `sachain-infrastructure` directory using CDK CLI

## Key Patterns

- **Monorepo**: All related services in single repository
- **Workspace scripts**: Common commands available at root level
- **TypeScript everywhere**: Consistent TS usage across all packages
- **Infrastructure as Code**: AWS resources defined in CDK TypeScript
