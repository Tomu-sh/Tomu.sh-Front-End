import express from "express";
import dotenv from "dotenv";
import x402LlmRouter from "./routes/x402Llm";

dotenv.config();

const app = express();
app.use(express.json());

// Only required endpoints - x402 protected LLM proxy
app.use(x402LlmRouter);

const PORT = process.env.PORT || 4021;
app.listen(PORT, () => {
    console.log(`\n🚀 x402 LLM proxy running on http://localhost:${PORT}`);
    console.log("  POST /v1/chat/completions - Protected by x402; proxied to LiteLLM");
    console.log("\n💡 Make sure to set up your .env file with PAYMENT_ADDRESS, FACILITATOR_URL, and LITELLM_URL");
});

export default app;
