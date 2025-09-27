import { Router, Request, Response } from "express";
import { paymentMiddleware } from "x402-express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

const router = Router();

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.polygon.technology";
const LITELLM_URL = process.env.LITELLM_URL || "http://localhost:8080";

if (!PAYMENT_ADDRESS) {
    throw new Error("PAYMENT_ADDRESS environment variable is required");
}

console.log("Configuring x402 LLM proxy...");
console.log("Payment Address:", PAYMENT_ADDRESS);
console.log("Facilitator URL:", FACILITATOR_URL);
console.log("LiteLLM URL:", LITELLM_URL);

// Protect only the required endpoint with x402
router.use(paymentMiddleware(
    PAYMENT_ADDRESS,
    {
        "POST /v1/chat/completions": {
            price: "$0.002",            // set flat price per call (adjust as needed)
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
));

// Required endpoint: proxy to LiteLLM after x402 verification
router.post("/v1/chat/completions", async (req: Request, res: Response) => {
    try {
        console.log("✅ Payment verified! Processing chat completion request...");
        console.log("Request body:", JSON.stringify(req.body, null, 2));

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
