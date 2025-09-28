import { Router, Request, Response } from "express";
import { paymentMiddleware } from "x402-express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

const router = Router();

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.polygon.technology";
const LITELLM_URL = process.env.LITELLM_URL || "http://localhost:8080";

// Simplified cost estimation function
const estimateCost = (requestBody: any) => {
    // Simple model pricing per token (small, uniform pricing)
    const modelPricing: Record<string, number> = {
        'gpt-4': 0.00001,
        'gpt-3.5-turbo': 0.000005,
        'claude-3': 0.000008,
        'gemini-pro': 0.000003,
        'llama-2': 0.000002,
        'default': 0.000005
    };

    const model = requestBody.model || 'gpt-3.5-turbo';
    const maxTokens = requestBody.max_tokens || 150;

    // Get price per token for the model (fallback to default)
    const pricePerToken = modelPricing[model] || modelPricing['default'];

    // Calculate model cost based on max tokens
    const modelCost = maxTokens * pricePerToken;

    // x402 fixed fee
    const x402Fee = 0.002;

    return {
        model,
        maxTokens,
        pricePerToken,
        modelCost,
        x402Fee,
        totalCost: modelCost + x402Fee
    };
};

// Simple cost comparison function
const compareCosts = (estimatedCost: any, actualResponse: any) => {
    if (!actualResponse.usage) {
        console.log("⚠️  No usage data in response - cannot compare costs");
        return null;
    }

    const actualTokens = actualResponse.usage.total_tokens;
    const actualModelCost = actualTokens * estimatedCost.pricePerToken;
    const actualTotalCost = actualModelCost + estimatedCost.x402Fee;
    const difference = actualTotalCost - estimatedCost.totalCost;

    return {
        estimatedCost: estimatedCost.totalCost,
        actualCost: actualTotalCost,
        difference: difference
    };
};

// Function to refund user given an amount
const refundUser = async (amount: number, userAddress: string) => {
    try {
        console.log(`💸 Processing refund of $${amount.toFixed(6)} to ${userAddress}`);

        // TODO: Implement actual refund logic here
        // This would typically involve:
        // 1. Creating a transaction to send USDC back to the user
        // 2. Using the wallet client to sign and send the transaction
        // 3. Waiting for confirmation

        // For now, just log the refund
        console.log(`✅ Refund processed: $${amount.toFixed(6)} USDC to ${userAddress}`);

        return {
            success: true,
            amount: amount,
            recipient: userAddress,
            transactionHash: `0x${Math.random().toString(16).slice(2, 66)}` // Mock tx hash
        };
    } catch (error) {
        console.error("❌ Refund failed:", error);
        return {
            success: false,
            amount: amount,
            recipient: userAddress,
            error: error
        };
    }
};

if (!PAYMENT_ADDRESS) {
    throw new Error("PAYMENT_ADDRESS environment variable is required");
}

console.log("Configuring x402 LLM proxy...");
console.log("Payment Address:", PAYMENT_ADDRESS);
console.log("Facilitator URL:", FACILITATOR_URL);
console.log("LiteLLM URL:", LITELLM_URL);

// Protect only the required endpoint with x402 (per-request RoutesConfig)
router.use((req, res, next) => {
    const price =
        req?.body && typeof req.body === "object"
            ? `$${estimateCost(req.body).totalCost.toFixed(6)}`
            : "$0.002";

    return paymentMiddleware(
        PAYMENT_ADDRESS,
        {
            "POST /v1/chat/completions": {
                price,
                network: "polygon-amoy",
                config: {
                    description: "Proxy to LiteLLM/OpenRouter chat completions with x402 micropayments",
                    inputSchema: {
                        type: "object",
                        properties: {
                            model: { type: "string", description: "Model to use for completion" },
                            messages: {
                                type: "array",
                                description: "Array of message objects",
                                items: {
                                    type: "object",
                                    properties: {
                                        role: { type: "string" },
                                        content: { type: "string" }
                                    }
                                }
                            },
                            max_tokens: { type: "number", description: "Maximum tokens to generate" },
                            temperature: { type: "number", description: "Sampling temperature" },
                            stream: { type: "boolean", description: "Whether to stream responses" }
                        },
                        required: ["model", "messages"]
                    },
                    outputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            object: { type: "string" },
                            model: { type: "string" },
                            choices: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        message: {
                                            type: "object",
                                            properties: {
                                                role: { type: "string" },
                                                content: { type: "string" }
                                            }
                                        },
                                        finish_reason: { type: "string" },
                                        index: { type: "number" }
                                    }
                                }
                            },
                            usage: {
                                type: "object",
                                properties: {
                                    prompt_tokens: { type: "number" },
                                    completion_tokens: { type: "number" },
                                    total_tokens: { type: "number" }
                                }
                            }
                        }
                    }
                }
            }
        },
        { url: FACILITATOR_URL }
    )(req, res, next);
});

// Required endpoint: proxy to LiteLLM after x402 verification
router.post("/v1/chat/completions", async (req: Request, res: Response) => {
    try {
        console.log("✅ Payment verified! Processing chat completion request...");
        console.log("Request body:", JSON.stringify(req.body, null, 2));

        // Calculate and log cost estimation
        const costEstimate = estimateCost(req.body);
        console.log("\n💰 Cost Estimation:");
        console.log(`  Model: ${costEstimate.model}`);
        console.log(`  Max Tokens: ${costEstimate.maxTokens}`);
        console.log(`  Model Cost: $${costEstimate.modelCost.toFixed(6)}`);
        console.log(`  x402 Fee: $${costEstimate.x402Fee.toFixed(3)}`);
        console.log(`  Total Cost: $${costEstimate.totalCost.toFixed(6)}`);

        console.log(`Proxying request to ${LITELLM_URL}/v1/chat/completions`);
        
        const upstream = await fetch(`${LITELLM_URL}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "authorization": `Bearer ${process.env.LITELLM_KEY}`,
                "x-request-id": req.header("x-request-id") || "",
            },
            body: JSON.stringify(req.body),
        });

        const text = await upstream.text();
        
        console.log(`Upstream response status: ${upstream.status}`);
        if (!upstream.ok) {
            console.error("Upstream error response:", text);
        } else {
            console.log("Upstream response:", text.substring(0, 200) + "...");

            // Compare estimated vs actual costs
            try {
                const actualResponse = JSON.parse(text);
                const costComparison = compareCosts(costEstimate, actualResponse);

                if (costComparison) {
                    console.log("\n📊 Cost Comparison:");
                    console.log(`  Estimated Cost: $${costComparison.estimatedCost.toFixed(6)}`);
                    console.log(`  Actual Cost: $${costComparison.actualCost.toFixed(6)}`);
                    console.log(`  Difference: $${costComparison.difference.toFixed(6)}`);

                    // If user should get a refund (they paid more than actual cost)
                    if (costComparison.difference < 0) {
                        const refundAmount = Math.abs(costComparison.difference);
                        console.log(`  💰 Refund due: $${refundAmount.toFixed(6)}`);

                        // TODO: Get user address from x402 payment data
                        // const userAddress = "0x..."; // Extract from payment
                        // const refundResult = await refundUser(refundAmount, userAddress);
                        // console.log("  Refund result:", refundResult);
                    }
                }
            } catch (parseError) {
                console.log("⚠️  Could not parse response for cost comparison:", parseError);
            }
        }

        // Check if response has already been sent
        if (res.headersSent) {
            console.log("Response already sent, skipping");
            return;
        }

        return res.status(upstream.status).type("application/json").send(text);
    } catch (e: any) {
        console.error("Proxy error:", e);

        // Check if response has already been sent
        if (res.headersSent) {
            console.log("Response already sent in catch block, skipping");
            return;
        }

        return res.status(500).json({ error: e?.message || "proxy error" });
    }
});

export default router;
