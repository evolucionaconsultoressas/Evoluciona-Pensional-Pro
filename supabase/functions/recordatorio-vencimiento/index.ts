// ============================================================
// recordatorio-vencimiento
// Corre una vez al día (programada con Cron Jobs en Supabase).
// Busca licencias que vencen en los próximos 5 días y les manda
// un correo con el link para renovar — sin que tú intervengas.
//
// Necesita estos secretos configurados (Edge Functions → Secrets):
//   RESEND_API_KEY     (cuenta gratuita en resend.com)
//   SUPABASE_SERVICE_ROLE_KEY
//   SITIO_URL           ej: https://evoluciona.com/pensional
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const hoy = new Date();
  const enCincoDias = new Date(hoy);
  enCincoDias.setDate(hoy.getDate() + 5);
  const hoyStr = hoy.toISOString().split("T")[0];
  const limiteStr = enCincoDias.toISOString().split("T")[0];

  const { data: licencias, error } = await supabaseAdmin
    .from("licencias")
    .select("user_id, nombre, fecha_expiracion, plan, recordatorio_enviado")
    .eq("activo", true)
    .gte("fecha_expiracion", hoyStr)
    .lte("fecha_expiracion", limiteStr)
    .neq("recordatorio_enviado", hoyStr);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const sitioUrl = Deno.env.get("SITIO_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  let enviados = 0;

  for (const lic of licencias ?? []) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(lic.user_id);
    const email = userData?.user?.email;
    if (!email) continue;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Evoluciona Pensional PRO <licencias@evoluciona.com>",
        to: email,
        subject: "Tu licencia de Evoluciona Pensional PRO vence pronto",
        html: `
          <p>Hola ${lic.nombre || ""},</p>
          <p>Tu licencia (${lic.plan}) vence el <strong>${lic.fecha_expiracion}</strong>.</p>
          <p>Para no perder el acceso, renueva aquí:</p>
          <p><a href="${sitioUrl}/renovar.html" style="background:#1C3A2B;color:#fff;padding:12px 22px;border-radius:4px;text-decoration:none;">Renovar mi licencia</a></p>
        `
      })
    });

    await supabaseAdmin
      .from("licencias")
      .update({ recordatorio_enviado: hoyStr })
      .eq("user_id", lic.user_id);

    enviados++;
  }

  return new Response(JSON.stringify({ ok: true, enviados }), { status: 200 });
});
