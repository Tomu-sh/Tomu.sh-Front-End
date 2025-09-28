import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import 'dotenv/config';

const privateKey = process.env.CLIENT_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("PRIVATE_KEY not set in .env file");
}

// Ensure private key has 0x prefix
const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

const account = privateKeyToAccount(formattedPrivateKey);

// Create wallet client for payments
const walletClient = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http()
});

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http()
});

console.log("🔑 Using wallet address:", account.address);
console.log("🔧 Environment variables:");
console.log("  FACILITATOR_URL:", process.env.FACILITATOR_URL);
console.log("  SERVER_URL:", process.env.SERVER_URL);
console.log("  Private key loaded:", !!privateKey);

const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.polygon.technology";
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4021';

console.log("🌐 Using FACILITATOR_URL:", FACILITATOR_URL);
console.log("🌐 Using SERVER_URL:", SERVER_URL);

const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);
console.log("✅ x402 fetch wrapper created successfully");


// Check wallet balance (USDC on Polygon Amoy)
const checkUSDCBalance = async () => {
  try {
    // USDC contract address on Polygon Amoy testnet
    const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
    
    console.log("💰 Checking USDC balance...");
    console.log("  USDC Contract:", USDC_ADDRESS);
    console.log("  Wallet:", account.address);
    
    // Simple balance check using viem
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
        {
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
        }
      ],
      functionName: 'balanceOf',
      args: [account.address],
    });
    
    const decimals = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: [
        {
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
        }
      ],
      functionName: 'decimals',
    });
    
    const balanceFormatted = Number(balance) / Math.pow(10, Number(decimals));
    console.log(`💵 USDC Balance: ${balanceFormatted} USDC`);
    
    if (balanceFormatted < 0.01) {
      console.warn("⚠️  Low USDC balance! You may need more USDC for payments.");
      console.warn("   Get testnet USDC from: https://faucet.circle.com/");
    }
    
    return balanceFormatted;
  } catch (error) {
    console.warn("⚠️  Could not check USDC balance:", error.message);
    return null;
  }
};

// Test LLM chat completion with x402 payment
const testChatCompletion = async () => {
  console.log("\n🤖 Testing x402 LLM Chat Completion");
  console.log("=" .repeat(50));
  
  const url = `${SERVER_URL}/v1/chat/completions`;
  console.log(`🌐 URL: ${url}`);
  
  const requestBody = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user", 
        content: "Hello! Please respond with just your name and a brief greeting."
      }
    ],
    max_tokens: 50,
    temperature: 0.7
  };
  
  console.log("📝 Request:", JSON.stringify(requestBody, null, 2));
  
  try {
    console.log("🚀 Making x402 request...");
    console.log("📤 Request headers:", {
      'Content-Type': 'application/json'
    });
    
    const response = await fetchWithPayment(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        // Add any additional headers your LiteLLM instance might need
        // 'Authorization': 'Bearer your-api-key-here'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log("📥 Response received:");
    console.log("  Status:", response.status, response.statusText);
    console.log("  Headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Error response body:", errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log("\n✅ LLM Response:");
    console.log(JSON.stringify(responseData, null, 2));
    
    // Check for payment response
    const paymentResponseHeader = response.headers.get("x-payment-response");
    if (paymentResponseHeader) {
      const paymentResponse = decodeXPaymentResponse(paymentResponseHeader);
      console.log("\n💰 Payment Details:");
      console.log(JSON.stringify(paymentResponse, null, 2));
    } else {
      console.log("\n💡 No payment response header found");
    }
    
    // Extract and display the AI message
    if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
      console.log("\n🎯 AI Message:", responseData.choices[0].message.content);
    }
    
    // Display usage information
    if (responseData.usage) {
      console.log("\n📊 Token Usage:");
      console.log(`  Prompt tokens: ${responseData.usage.prompt_tokens}`);
      console.log(`  Completion tokens: ${responseData.usage.completion_tokens}`);
      console.log(`  Total tokens: ${responseData.usage.total_tokens}`);
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Full error:", error);
    
    if (error.response) {
      try {
        const errorText = await error.response.text();
        console.error("📄 Response text:", errorText);
        console.error("📊 Response status:", error.response.status);
        console.error("📋 Response headers:", Object.fromEntries(error.response.headers));
        
        if (error.response.status === 402) {
          console.error("💰 This is a 402 Payment Required response");
          console.error("💡 The x402-fetch should have handled this automatically");
          console.error("🔍 Check if your wallet has USDC and the facilitator is reachable");
        }
      } catch (parseError) {
        console.error("🔍 Could not parse error response:", parseError);
      }
    } else {
      console.error("❌ No response object in error");
    }
  }
};

// Test multiple requests to show idempotency and different prompts
const runMultipleTests = async () => {
  console.log("🚀 Starting x402 LLM Client Tests");
  console.log("💰 Cost: $0.002 USDC per request");
  console.log("🌐 Network: Polygon Amoy testnet");
  console.log("\n");
  
  // Check USDC balance first
  await checkUSDCBalance();
  console.log("\n");
  
  // Test 1: Basic chat completion
  await testChatCompletion();
  
  // Wait a bit between requests
  console.log("\n⏳ Waiting 2 seconds before next test...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Different prompt
  console.log("\n🤖 Testing second request with different prompt");
  console.log("=" .repeat(50));
  
  const url2 = `${SERVER_URL}/v1/chat/completions`;
  const requestBody2 = {
    model: "gpt-3.5-turbo", 
    messages: [
      {
        role: "user",
        content: "What's 2+2? Give me just the number."
      }
    ],
    max_tokens: 10
  };
  
  try {
    const response2 = await fetchWithPayment(url2, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody2)
    });
    
    const responseData2 = await response2.json();
    console.log("✅ Second Response:", responseData2.choices[0].message.content);
    
    const paymentResponse2 = decodeXPaymentResponse(response2.headers.get("x-payment-response"));
    if (paymentResponse2) {
      console.log("💰 Second Payment:", paymentResponse2);
    }
    
  } catch (error) {
    console.error("❌ Second request failed:", error.message);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("✨ All tests completed!");
  console.log("💡 Check your wallet for USDC transactions on Polygon Amoy");
};

// Run the tests
runMultipleTests().catch(error => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
});
