# Contributing to Sachain

Thank you for your interest in contributing to Sachain! This guide will help you get started.

## 🚀 Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`

## 🏗️ Development Setup

### Prerequisites
- Node.js 18+
- AWS CLI configured
- Hedera testnet account

### Local Development
```bash
# Install all workspace dependencies
npm install

# Start all services in development mode
npm run dev

# Run tests
npm run test

# Build all projects
npm run build
```

## 📁 Project Structure

- `sachain-frontend/` - Next.js web application
- `backend/` - Lambda functions and API services
- `sachain-infrastructure/` - AWS CDK infrastructure code

## 🎯 Contribution Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting
- Run `npm run lint` before committing
- Write meaningful commit messages

### Pull Request Process
1. Ensure your code builds without errors
2. Add tests for new functionality
3. Update documentation if needed
4. Create a clear PR description
5. Link any related issues

### Commit Messages
Use conventional commits format:
```
feat: add campaign creation functionality
fix: resolve transaction validation issue
docs: update API documentation
```

## 🧪 Testing

- Write unit tests for new features
- Ensure all tests pass: `npm run test`
- Test across different environments

## 🐛 Reporting Issues

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## 💡 Feature Requests

For new features:
- Check existing issues first
- Provide clear use case
- Discuss implementation approach

## 📞 Getting Help

- Open an issue for questions
- Check existing documentation
- Review closed issues for solutions

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.