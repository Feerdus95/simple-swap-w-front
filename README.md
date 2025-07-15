# SimpleSwap DEX - Module 4 Practical Project

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)]()
[![Vercel](https://vercelbadge.vercel.app/api/datejer/vercel-badge)](https://simple-swap-w-front.vercel.app)

> 🌐 **Live Demo:** [simple-swap-w-front.vercel.app](https://simple-swap-w-front.vercel.app)

---

## 📋 Project Description

SimpleSwap is a fully functional **Decentralized Exchange (DEX)** implementing an **Automated Market Maker (AMM)** with token swap and liquidity management features. This project was developed as a practical assignment for Module 4, meeting all specified requirements.

## 🏗️ Architecture

### Backend (Smart Contracts)

- **SimpleSwap.sol**: Main DEX contract with swap and liquidity features
- **TestTokenA.sol**: Test token TTA (18 decimals)
- **TestTokenB.sol**: Test token TTB (6 decimals, similar to USDC)

### Frontend (Next.js)

- **Next.js 15** with App Router
- **React 18** with TypeScript
- **Wagmi/Viem** for blockchain interaction
- **Shadcn/ui** for UI components
- **Tailwind CSS** for styling

## 🚀 Implemented Features

### ✅ 1. Contract Interaction

- **Wallet Connection**: Full MetaMask integration
- **Token Swaps**: Swap TTA ↔ TTB with automatic price calculation
- **Liquidity Management**: Add and remove liquidity from pools
- **Price Display**: Real-time prices and pool statistics
- **Token Faucet**: Obtain test tokens for testing

### ✅ 2. Technical Features

- **Input Validation**: Amount and address verification
- **Error Handling**: Clear and specific error messages
- **Slippage Protection**: Slippage configuration (5% default)
- **Transaction Timeouts**: Configurable deadlines
- **Token Approval**: Automatic approval flow

### ✅ 3. Security

- **Reentrancy Protection**: Implemented in smart contracts
- **Slippage Validation**: Front-running protection
- **Balance Verification**: Check balances before transactions
- **Robust Error Handling**: Try-catch in all operations

### ✅ 4. User-Facing DEX Features

- **Price Impact & Slippage Info**: Transparent display of price impact and expected output, showing real AMM effects and fee.
- **Approve/Swap Two-Step Flow**: Following DeFi and ERC-20 security standards, all swaps require explicit “Approve” before “Swap”.

## 🛠️ Technologies Used

### Smart Contracts

- **Solidity ^0.8.20**
- **OpenZeppelin Contracts**
- **Hardhat** (for testing and deployment)

### Frontend

- **Next.js 15.2.4**
- **React 18.2.0**
- **TypeScript 5**
- **Wagmi 2.15.6**
- **Viem 2.31.7**
- **Tailwind CSS 3.4.17**
- **Shadcn/ui**

### Testing

- **Hardhat Testing Framework**
- **Test Suites**: 3 (95 tests in total)
- **Code coverage**:
  - **Total**: 100% lines, 90.91% branches, 100% functions
  - **SimpleSwap.sol**: 100% lines, 89.8% branches, 100% functions
  - **TestHelper.sol**: 100% lines, 100% branches, 100% functions
  - **TestTokenA.sol**: 100% lines, 100% branches, 100% functions
  - **TestTokenB.sol**: 100% lines, 100% branches, 100% functions

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- MetaMask installed
- Ethereum Sepolia account with test ETH

### 1. Clone the repository

```bash
git clone <repository-url>
cd simple-swap-w-front
```

### 2. Install dependencies

```bash
cd frontend
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the `frontend` folder:

```env
NEXT_PUBLIC_INFURA_API_KEY=your_infura_api_key
```

### 4. Run the project

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🎯 How to Use the Application

### 1. Connect Wallet

- Open the app in your browser
- Click on "Connect Wallet" and connect MetaMask
- Make sure you are on the Sepolia network

### 2. Get Test Tokens

- Go to the "Faucet" tab
- Click "Get 10" or "Get 100" for each token (TTA and TTB)
- Confirm the transactions in MetaMask

### 3. Create Liquidity Pool

- Go to the "Liquidity" tab
- Select TTA and TTB tokens
- Approve both tokens ("Approve" buttons)
- Enter the desired amounts
- Click "Add Liquidity"

### 4. Perform Swaps

- Go to the "Swap" tab
- Select input and output tokens
- Enter the amount to swap
- Review the expected output, price impact and AMM rate shown
- Approve the swap (if first time using the app, "Approve" button)
- Click "Swap"

### 5. View Prices

- Go to the "Prices" tab
- Select the token pair
- View prices and pool statistics

### Price Impact

- Price Impact shows how much your swap deviates (as a %) from the current pool rate, due to the constant product formula (x \* y = k) and pool fee.
- High Price Impact can occur with small pools or large trades. This is expected and normal in AMMs.

### Approve Step

- Approve Step is a security measure (ERC-20 standard).
- You must approve the DEX contract before it can spend your tokens.
- This protect your funds and is required by all major DeFi protocols.
- You only need to approve once per token per contract.

## 🔧 Contract Configuration

### Deployed Addresses (Sepolia)

- **SimpleSwap**: `0xC5fd570BFF105Ec45b0817c86a4d4525ced25bE4`
- **TestTokenA (TTA)**: `0xd6ae949f6405c366d23cc30422d684b6e76551ca`
- **TestTokenB (TTB)**: `0xd35dad90ed974961c5299654def0a87478d82a15`

### Testing with Hardhat

```bash
cd contracts
npm install
npx hardhat test
npx hardhat coverage
```

## 📊 Test Coverage

The project includes comprehensive tests for all contracts with coverage ≥90%:

```bash
npx hardhat coverage
```

### Included Tests

#### Core Functionality

- ✅ Token swaps with exact input amounts
- ✅ Liquidity addition and removal
- ✅ Price and output amount calculations

#### Edge Cases

- ✅ Swapping with insufficient balance but sufficient allowance
- ✅ Zero-amount transactions
- ✅ Expired transaction deadlines
- ✅ Invalid token pairs

#### Security

- ✅ Reentrancy protection
- ✅ Slippage validation
- ✅ Deadline enforcement
- ✅ Balance and allowance validations
- ✅ Access control for owner-only functions

#### Error Handling

- ✅ Clear error messages for failed transactions
- ✅ Insufficient balance validations
- ✅ Invalid input validations
- ✅ Failed transaction reverts with proper messages

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set up environment variables
3. Automatic deployment on every push

### Smart Contracts

Contracts are deployed on Ethereum Sepolia and are fully functional.

## 📝 Project Structure

```
simple-swap-w-front/
├── contracts/                 # Smart contracts
│   ├── SimpleSwap.sol        # Main DEX contract
│   ├── TestTokenA.sol        # Test token A
│   ├── TestTokenB.sol        # Test token B
│   ├── TestHelper.sol        # Test helper contract
│   └── README.md             # Contracts documentation
├── test/                     # Unit tests
│   ├── SimpleSwap.test.ts    # SimpleSwap contract tests
│   ├── TestTokenA.test.ts    # TestTokenA contract tests
│   └── TestTokenB.test.ts    # TestTokenB contract tests
├── frontend/                 # Next.js application
│   ├── app/                  # App Router
│   ├── components/           # React components
│   │   ├── swap-interface.tsx
│   │   ├── liquidity-interface.tsx
│   │   ├── price-display.tsx
│   │   ├── token-faucet.tsx
│   │   └── wallet-connect.tsx
│   ├── lib/                  # Utilities and constants
│   └── public/               # Static files
└── README.md                 # This file
```

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Theme**: Support for both themes
- **Visual Feedback**: Loading states and success/error messages
- **Real-Time Validation**: Instant input verification

## 🔒 Security

### Smart Contracts

- ✅ Reentrancy protection
- ✅ Slippage validation
- ✅ Overflow protection
- ✅ Deadline validation
- ✅ Zero address checks

### Frontend

- ✅ Input validation
- ✅ Error handling
- ✅ Transaction confirmation
- ✅ Balance verification

## 📈 Quality Metrics

- **Test Coverage**: ≥88%
- **Linting**: No errors
- **TypeScript**: Strict mode enabled
- **Performance**: Production optimized

## 🤝 Contributing

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 👨‍💻 Author

**Feerdus95** - Developer of this SimpleSwap contract's and frontend project

## 🙏 Acknowledgements

- OpenZeppelin for contract libraries
- Vercel for the deployment platform
- The Ethereum community for development tools

---

## ✅ Practical Project Requirements Checklist

- [x] **Contract interaction**: Complete frontend with all features
- [x] **Development and Testing Environment**: Hardhat configured with coverage ≥50% (90% currently)
- [x] **Allowed tools**: Next.js, React, TypeScript, Wagmi
- [x] **Storage**: GitHub repository
- [x] **Deployment**: Frontend deployed on Vercel

**Project Status**: ✅ **COMPLETED AND FUNCTIONAL**
