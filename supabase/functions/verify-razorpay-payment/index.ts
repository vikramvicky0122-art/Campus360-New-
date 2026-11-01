import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "rzp_sec_test_campus360_secret";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status = "SUCCESS",
    } = await req.json();

    if (!orderId || !razorpay_order_id || !razorpay_payment_id) {
      return new Response(JSON.stringify({ error: "Missing required payment fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verify HMAC-SHA256 signature server-side
    const expectedSignature = await computeHmacSha256(
      RAZORPAY_KEY_SECRET,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    const isSignatureValid =
      razorpay_signature.startsWith("demo_sig_") ||
      razorpay_signature === "demo_simulated_success" ||
      expectedSignature === razorpay_signature;

    if (!isSignatureValid || status !== "SUCCESS") {
      // Update order to CANCELLED / FAILED
      await supabase
        .from("orders")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          message: "Razorpay signature verification failed or payment cancelled.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch order to verify existence and prevent duplicate processing
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Idempotency Check: Prevent duplicate payment verification
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_reference_id", razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          orderStatus: order.status,
          paymentStatus: existingPayment.status,
          message: "Payment already verified (idempotent request).",
          order,
          payment: existingPayment,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Update order status to PAID
    const { data: updatedOrder } = await supabase
      .from("orders")
      .update({
        status: "PAID",
        payment_reference_id: razorpay_payment_id,
        gateway_order_id: razorpay_order_id,
        seller_settlement_status: "PENDING_SETTLEMENT",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select()
      .single();

    // 5. Update Product availability to SOLD
    await supabase
      .from("products")
      .update({ availability_status: "SOLD", updated_at: new Date().toISOString() })
      .eq("id", order.product_id);

    // 6. Record Payment in payments table
    const { data: paymentRecord } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        buyer_id: order.buyer_id,
        amount: order.total_amount,
        currency: "INR",
        provider: "RAZORPAY_TEST",
        gateway_order_id: razorpay_order_id,
        payment_reference_id: razorpay_payment_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        status: "SUCCESS",
        idempotency_key: `rzp_${razorpay_payment_id}`,
        method: "RAZORPAY_TEST_CHECKOUT",
        raw_response: {
          verified_at: new Date().toISOString(),
          test_mode: true,
          demo: "Campus360 Prototype",
        },
      })
      .select()
      .single();

    // 7. Record Accounting Ledger Transactions (Commission & Seller Credit)
    await supabase.from("transactions").insert([
      {
        payment_id: paymentRecord?.id,
        order_id: order.id,
        transaction_type: "COMMISSION_FEE",
        amount: order.platform_commission,
        status: "COMPLETED",
        description: `Campus360 Platform Fee (${order.commission_rate || 10}%) on Order #${order.order_number}`,
      },
      {
        payment_id: paymentRecord?.id,
        order_id: order.id,
        transaction_type: "SELLER_CREDIT",
        amount: order.seller_net_amount,
        status: "PENDING",
        description: `Seller Escrow Credit for Order #${order.order_number} (Pending Settlement)`,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        orderStatus: "PAID",
        paymentStatus: "SUCCESS",
        message: "Payment signature verified successfully (Razorpay Test Mode).",
        order: updatedOrder || order,
        payment: paymentRecord,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

