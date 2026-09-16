// ============================================================
// crear-firma-pago
// Genera la referencia y la firma de integridad para abrir el
// widget de pago de Wompi, sin exponer el secreto de integridad
// en el navegador.
//
// Se despliega desde Supabase Dashboard → Edge Functions.
// Necesita estos secretos configurados (Edge Functions → Secrets):
//   WOMPI_PUBLIC_KEY
//   WOMPI_INTEGRITY_SECRET
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: corsHeaders });
    }

    const { plan, periodo } = await req.json();
    if (!["individual", "firma"].includes(plan) || !["mensual", "anual"].includes(periodo)) {
      return new Response(JSON.stringify({ error: "Plan o periodo inválido" }), { status: 400, headers: corsHeaders });
    }

    // Busca el precio vigente en la tabla "planes"
    const { data: planData, error: planError } = await supabaseClient
      .from("planes")
      .select("monto_cop")
      .eq("plan", plan)
      .eq("periodo", periodo)
      .eq("activo", true)
      .single();

    if (planError || !planData) {
      return new Response(JSON.stringify({ error: "No se encontró el plan" }), { status: 404, headers: corsHeaders });
    }

    const amountInCents = planData.monto_cop * 100;
    const currency = "COP";
    // user.id usa guiones (uuid) — usamos "_" como separador para poder
    // parsearlo de vuelta sin ambigüedad en el webhook.
    const reference = `${user.id}_${plan}_${periodo}_${Date.now()}`;

    const integritySecret = Deno.env.get("WOMPI_INTEGRITY_SECRET")!;
    const cadena = `${reference}${amountInCents}${currency}${integritySecret}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(cadena));
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return new Response(JSON.stringify({
      reference,
      amountInCents,
      currency,
      signature,
      publicKey: Deno.env.get("WOMPI_PUBLIC_KEY"),
      customerEmail: user.email
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
