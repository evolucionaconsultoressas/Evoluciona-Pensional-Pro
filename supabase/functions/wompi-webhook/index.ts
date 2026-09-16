// ============================================================
// wompi-webhook
// Recibe el evento "transaction.updated" de Wompi, valida que
// venga realmente de Wompi (firma de eventos), y si el pago fue
// aprobado, extiende la fecha_expiracion de la licencia sola.
//
// Se despliega desde Supabase Dashboard → Edge Functions.
// URL resultante: pégala en Wompi → Configuración → Eventos (Webhooks).
//
// Necesita estos secretos configurados (Edge Functions → Secrets):
//   WOMPI_EVENTS_SECRET
//   SUPABASE_SERVICE_ROLE_KEY   (la "service_role", no la anon — permite
//                                 escribir en licencias/pagos saltando RLS)
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const event = body.event;
    const data = body.data;
    const signatureRecibida = body.signature?.checksum;
    const timestamp = body.timestamp;
    const propiedades = body.signature?.properties || [];

    // ---- Validar que el evento viene realmente de Wompi ----
    const eventsSecret = Deno.env.get("WOMPI_EVENTS_SECRET")!;
    let cadena = "";
    for (const prop of propiedades) {
      // prop viene como "transaction.id", "transaction.status", etc.
      const [obj, campo] = prop.split(".");
      cadena += data[obj]?.[campo] ?? "";
    }
    cadena += timestamp + eventsSecret;

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(cadena));
    const signatureCalculada = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signatureCalculada !== signatureRecibida) {
      console.error("Firma de evento inválida — posible intento falso");
      return new Response(JSON.stringify({ error: "Firma inválida" }), { status: 401 });
    }

    if (event !== "transaction.updated") {
      return new Response(JSON.stringify({ ok: true, ignorado: true }), { status: 200 });
    }

    const transaction = data.transaction;
    const estado = transaction.status; // APPROVED | DECLINED | VOIDED | ERROR
    const reference = transaction.reference;
    const wompiTransactionId = transaction.id;

    // Parsear la referencia: userId_plan_periodo_timestamp
    const partes = reference.split("_");
    const timestampRef = partes.pop();
    const periodo = partes.pop();
    const plan = partes.pop();
    const userId = partes.join("_"); // lo que quede es el uuid del usuario

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Idempotencia: si ya procesamos esta transacción, no lo hacemos de nuevo
    const { data: pagoExistente } = await supabaseAdmin
      .from("pagos")
      .select("id")
      .eq("wompi_transaction_id", wompiTransactionId)
      .single();

    if (pagoExistente) {
      return new Response(JSON.stringify({ ok: true, yaProcesado: true }), { status: 200 });
    }

    await supabaseAdmin.from("pagos").insert({
      user_id: userId,
      plan,
      periodo,
      monto_cop: transaction.amount_in_cents / 100,
      wompi_transaction_id: wompiTransactionId,
      estado
    });

    if (estado === "APPROVED") {
      const { data: licenciaActual } = await supabaseAdmin
        .from("licencias")
        .select("fecha_expiracion")
        .eq("user_id", userId)
        .single();

      const hoy = new Date();
      const baseFecha = (licenciaActual && new Date(licenciaActual.fecha_expiracion) > hoy)
        ? new Date(licenciaActual.fecha_expiracion)
        : hoy;

      const nuevaFecha = new Date(baseFecha);
      if (periodo === "anual") nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
      else nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

      await supabaseAdmin
        .from("licencias")
        .update({
          activo: true,
          fecha_expiracion: nuevaFecha.toISOString().split("T")[0],
          plan
        })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    console.error("Error en wompi-webhook:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
