import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_campus360_demo";
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "rzp_sec_test_campus360_secret";
    const COMMISSION_PERCENT = Number(Deno.env.get("CAMPUS_COMMISSION_PERCENT") || "10.0");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productId, handoverLocation, handoverNotes } = await req.json();
    if (!productId) {
      return new Response(JSON.stringify({ error: "Missing productId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch product details
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*, profiles!products_seller_id_fkey(full_name, phone, department)")
      .eq("id", productId)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (product.seller_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot book or purchase your own product" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Commission calculations (e.g. 10% of 1000 = 100, seller = 900)
    const totalAmount = Number(product.price);
    const platformCommission = Math.round(totalAmount * (COMMISSION_PERCENT / 100) * 100) / 100;
    const sellerNetAmount = Math.round((totalAmount - platformCommission) * 100) / 100;
    const amountInPaise = Math.round(totalAmount * 100);

    // Call Razorpay API to generate order
    let razorpayOrderId = `order_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;

    if (RAZORPAY_KEY_ID.startsWith("rzp_test_") && RAZORPAY_KEY_SECRET !== "rzp_sec_test_campus360_secret") {
      try {
        const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            notes: {
              productId,
              buyerId: user.id,
              mode: "TEST_MODE",
              collegePlatform: "Campus360",
            },
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          razorpayOrderId = rzpData.id;
        }
      } catch (e) {
        console.warn("Live Razorpay call failed, using mock test order id:", e);
      }
    }

    // Generate unique order number
    const orderNumber = `CB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    // Create pending order record in Supabase
    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        product_id: product.id,
        buyer_id: user.id,
        seller_id: product.seller_id,
        total_amount: totalAmount,
        platform_commission: platformCommission,
        seller_net_amount: sellerNetAmount,
        status: "PENDING_PAYMENT",
        handover_location: handoverLocation || "Campus Central Library",
        handover_notes: handoverNotes || null,
        gateway_order_id: razorpayOrderId,
        seller_settlement_status: "PENDING_SETTLEMENT",
        commission_rate: COMMISSION_PERCENT,
        payment_provider: "RAZORPAY_TEST",
      })
      .select()
      .single();

    if (orderErr) {
      return new Response(JSON.stringify({ error: orderErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return order details and public key to frontend (KEY SECRET IS NEVER RETURNED)
    return new Response(
      JSON.stringify({
        success: true,
        order: newOrder,
        razorpayOrder: {
          id: razorpayOrderId,
          amount: amountInPaise,
          amountInRupees: totalAmount,
          currency: "INR",
          keyId: RAZORPAY_KEY_ID,
          platformCommission,
          sellerNetAmount,
          commissionPercent: COMMISSION_PERCENT,
          status: "created",
          productTitle: product.title,
        },
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

