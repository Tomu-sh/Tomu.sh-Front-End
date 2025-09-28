# **Tomu – Pay-as-you-go LLM Access**  
### Micropayments for AI platforms using **x402-ws-stream** on Polygon

Tomu is a Web3 platform that lets users access **AI image generation and LLM services** with **per-use micropayments**, eliminating the need for fixed subscriptions.  

It showcases how the **x402 WebSocket Streaming Payments Extension (x402-ws-stream)** enables **agentic, real-time billing** on **Polygon**.

---

## 💡 Concept

Traditional AI platforms force users into fixed monthly subscriptions.  

Tomu removes that barrier: **users pay only for what they use**, while developers earn revenue on every single LLM call or image request.

Our current public demo focuses on **AI picture generation**, but the same protocol can later be applied to **live video** or any other real-time metered resource.

---

## ❗ Problem

* **High friction:** Monthly subscriptions discourage first-time users.  
* **Slow payments for real-time content:** Conventional payment rails can’t keep up with live or streaming AI experiences.  
* **Privacy & trust issues:** Existing solutions often require custom escrow or expose user data on-chain.

---

## 🚀 Solution

Tomu integrates **x402-ws-stream**, a draft extension to x402 designed for **micropay real-time streams** (video, API, or AI data) with low latency and predictable UX:

1. **User** requests an AI task (image generation).  
2. **Tomu backend agent** (Express + Convex) opens a **single WebSocket** to the user.  
   * **Content stream** and **payment control channel** are multiplexed on the same connection.  
3. The backend sends a `stream.require` asking for a **pre-payment** for the next **time slice**.  
4. The user’s wallet signs an **x402 “exact” scheme PaymentPayload** (EIP-3009 style) and replies with `stream.pay`.  
5. Tomu calls the **Facilitator** over WS (`x402.verify` and optional `x402.settle`).  
6. Once verified, Tomu streams the AI output until the slice expires.  
7. The process repeats; if the next pre-payment doesn’t arrive before TTL expiry, Tomu **pauses the stream**.

The WebSocket side of this flow is **demonstrated via CLI** for clarity.

Result: **instant, trust-minimized, per-slice billing**—no fixed subscriptions.

---

## 🛠 How We Use the x402 Protocol / API

| ETHGlobal Agentic Payments guideline | Tomu’s implementation |
|--------------------------------------|------------------------|
| **Micropayments / Subscription sign-up** | Each AI image generation call is a **time-sliced x402 micropayment** using the “exact” scheme on Polygon with EIP-3009 USDC payloads. |
| **Agentic payment flows for everyday purchases** | The **Tomu backend agent** automates the 402 challenge and recurring pre-payments. It schedules the next slice before TTL expiry and pauses/resumes automatically. |
| **Private payments options for agents** | x402-ws-stream keeps most data **off-chain**; only settlement proofs are posted to Polygon, giving strong privacy with low on-chain footprint. |
| **Agent-run point of sale (refunds, dispute resolution, tracking & reconciliation)** | x402 state-channel receipts provide **real-time transaction tracking** and enable **refunds and reconciliation**. We can choose on-chain-per-slice settlement for trustless guarantees or deferred batch settlement for lower fees. |
| **How are you using this Protocol / API?** | We implement the **full x402-ws-stream flow**: `stream.init`, `stream.require`, `stream.pay`, `stream.accept/reject`, `stream.keepalive`, with facilitator calls to `x402.verify` and `x402.settle`. The backend handles signing, verification and settlement over WebSockets. |

---

### How We Are Using this Protocol / API (Detailed)

* **Time-sliced micropayments** – Every AI image generation request is billed as a sequence of small prepaid “slices”.  
  * The backend issues a `stream.require` frame defining the unit price, slice duration and TTL.  
  * The user’s wallet replies with a signed **x402 “exact” PaymentPayload** (EIP-3009 USDC style) via `stream.pay`.

* **Facilitator verification & settlement** –  
  * Our **Express + Convex** backend acts as the Seller and connects to the **Facilitator WebSocket**.  
  * It calls `x402.verify` to confirm the payment and, when we choose trustless settlement, `x402.settle` to write the slice to Polygon.

* **Autonomous agentic flow** –  
  * The backend automatically pauses the AI stream if the next slice is not prepaid before the TTL expires (`stream.pause`) and resumes once the next `stream.pay` arrives.  
  * This implements the **agent-run point-of-sale** pattern required for the Agentic Payments track.

* **Privacy & low latency** –  
  * All content, payment control and even optional EVM RPC calls are multiplexed over a **single WebSocket (wss://)**.  
  * Only the final settlement proof is posted on-chain, keeping user data off-chain while maintaining trustless guarantees.

* **Demo focus** – For the hackathon demo we stream **AI picture generation** results; the same protocol could support live video or any real-time API/data stream.

This setup shows x402-ws-stream exactly as intended: a low-latency, agentic payment channel that verifies, settles and gates real-time AI output on Polygon.

---

### How We Are Using this Protocol / API (Fluence)

To run our backend stack we leveraged **Fluence** to provision and manage the infrastructure:

* **Fluence VM** – We created a virtual machine using Fluence as the base environment.  
* On this VM we deployed:
  * **Modified LiteLLM** service to handle AI model requests,
  * **Convex** backend services,
  * **x402 Facilitator** for ws-stream verification and settlement,
  * **Nginx** as reverse proxy and load balancer.

This Fluence-based setup let us spin up a fully integrated environment quickly and securely—combining payments, AI model hosting, and the facilitator node inside one managed VM for the hackathon.

---

## 🔑 Key Features from x402-ws-stream

* **Transport:** All content, payment and EVM RPC calls use **WebSockets (wss://)**.  
* **Roles:** Buyer – requests metered resource; Seller – gates access and streams while prepaid; Facilitator – verifies and optionally settles payments.  
* **Slice Accounting:** 60 s typical unit; TTL ~30 s; validBefore window sliceEnd + 5–10 s.  
* **Normative Requirements:** x402 scheme = “exact”, EIP-3009 payloads, unique nonce per slice, pause at TTL expiry without next prepay.

---

## ⚙️ Tech Stack

**Frontend**

* **Vite + React**  
* **RainbowKit** wallet connection  
* **ENS** names/avatars

**Backend**

* **Express.js** + **Convex** serverless backend (Chef template)  
* **x402-ws-stream** transactions on Polygon  
* **OpenRouter** AI models: Stable Diffusion XL, DALL·E 3, Claude 3 Haiku  
* **Fluence VM deployment** with Modified LiteLLM, Convex, x402 Facilitator and Nginx

---

### Environment Setup

Run:

    npm install
    npm run dev

Create a `.env` file with:

    VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
    OPENROUTER_API_KEY=your_openrouter_api_key

---

## 🌐 Deployment

Connected to Convex deployment:  
[`impartial-koala-301`](https://dashboard.convex.dev/d/impartial-koala-301)

---

## 🏁 Why It Fits the “Agentic Payments” Track

Tomu is a **working demonstration of agent-run micropayments** on Polygon:

* **Automated request → prepay slice → settlement** cycle with **x402-ws-stream**.  
* **Private, trust-minimized billing** using off-chain state channels.  
* Built-in **refunds, dispute resolution, transaction tracking and reconciliation**.  
* Shows how an **autonomous backend agent** can manage a **point of sale** for real-time, per-use digital services.

---

**Tomu demonstrates that x402-ws-stream can power real-time, pay-as-you-go LLM access**, turning agentic micropayments into a scalable, subscription-free model for AI platforms—starting today with **AI picture generation** and ready for future **live-video or data streaming** use cases.
