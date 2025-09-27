# x402 LLM Proxy Server

A minimal TypeScript Express server that proxies LLM API calls through x402 micropayments. Users pay $0.002 USDC per API call via the x402 protocol on Polygon Amoy testnet.

## Features

- 🔐 **x402 Payment Protection**: Automatic micropayments for LLM API access
- 🤖 **LiteLLM Proxy**: Forwards chat completions to your LiteLLM instance
- 🏗️ **TypeScript**: Full TypeScript support with proper type definitions
- ⚡ **Minimal**: Single protected endpoint, focused implementation

## Prerequisites

1. **Node.js** (v18 or later)
2. **LiteLLM instance** running (default: `http://localhost:8080`)
3. **Wallet with USDC** on Polygon Amoy testnet
   - Get testnet USDC from [Circle's Faucet](https://faucet.circle.com/)
   - Select "Polygon PoS Amoy" from the network dropdown

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your values:

```env
# Your receiving address (for payments)
PAYMENT_ADDRESS=0xYourPolygonAddress

# The Polygon facilitator URL (no need to change for testnet)
FACILITATOR_URL=https://x402.polygon.technology

# LiteLLM instance URL
LITELLM_URL=http://localhost:8080

# Server configuration
PORT=4021
```

### 3. Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Or build and run
npm run build
npm start
```

The server will start on `http://localhost:4021`

### 4. Test the LLM Proxy

Make a chat completion request:

```bash
curl -X POST http://localhost:4021/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-or-v1-..." \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

## API Endpoints

### Protected Endpoints

- `POST /v1/chat/completions` - **$0.002 USDC** - LLM chat completions (proxied to LiteLLM)

## How It Works

### Payment Flow

1. **Initial Request**: Client makes LLM API request to `/v1/chat/completions`
2. **402 Response**: Server returns HTTP 402 with payment requirements ($0.002 USDC)
3. **Payment Authorization**: Client signs EIP-3009 payment authorization
4. **Payment Verification**: x402 facilitator verifies the payment on Polygon
5. **Proxy to LiteLLM**: Server forwards request to LiteLLM instance
6. **Response Delivery**: LiteLLM response returned to client

## Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

## Project Structure

```
server/
├── src/
│   ├── server.ts              # Main Express server
│   ├── routes/
│   │   └── x402Llm.ts        # x402 protected LLM proxy router
│   └── example.ts            # Previous demo endpoints (not mounted)
├── dist/                     # Compiled JavaScript (after build)
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── env.example              # Environment variables template
└── README.md               # This file
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PAYMENT_ADDRESS` | Your wallet address to receive payments | Yes |
| `FACILITATOR_URL` | x402 facilitator URL | No (defaults to Polygon) |
| `LITELLM_URL` | LiteLLM instance URL | No (defaults to localhost:8080) |
| `PORT` | Server port | No (defaults to 4021) |

## Troubleshooting

### Common Issues

1. **"PAYMENT_ADDRESS environment variable is required"**
   - Make sure you have a `.env` file with `PAYMENT_ADDRESS` set

2. **"Insufficient funds"**
   - Get testnet USDC from [Circle's Faucet](https://faucet.circle.com/)

3. **"Payment verification failed"**
   - Check that users have enough USDC in their wallets
   - Verify the facilitator URL is correct

4. **"Connection refused" to LiteLLM**
   - Make sure LiteLLM is running on the configured URL
   - Check the `LITELLM_URL` environment variable

### Debug Commands

```bash
# Check facilitator health
curl https://x402.polygon.technology/healthz

# Check LiteLLM health
curl http://localhost:8080/health

# Test x402 proxy
curl -X POST http://localhost:4021/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'
```

## To run client
pnpm run test:client