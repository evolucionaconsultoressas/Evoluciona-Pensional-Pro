/* ============================================================
   auth-check.js
   Incluir con <script src="auth-check.js"></script> ANTES del
   cierre de </body> en panel.html y en cada una de las 8
   herramientas, justo después de cargar el SDK de Supabase:

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   <script src="auth-check.js"></script>

   Redirige a login.html si no hay sesión activa, si la licencia
   está vencida/inactiva, o si el token de sesión de esta pestaña
   ya no es válido (por ejemplo, porque el usuario inició sesión
   en otro dispositivo).
   ============================================================ */

const SUPABASE_URL = "https://mdhdlnfhnqvjelecerla.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8CdFdPL3mCYzRfALVDO96A_J5mYv9uh";
const sbAuthCheck = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let heartbeatInterval = null;

(async function verificarAcceso(){
  const { data: { session } } = await sbAuthCheck.auth.getSession();
  const miToken = localStorage.getItem("pensional_pro_token");

  if(!session || !miToken){
    window.location.href = "login.html";
    return;
  }

  const { data: licencia, error } = await sbAuthCheck
    .from("licencias")
    .select("activo, fecha_expiracion, nombre, plan")
    .eq("user_id", session.user.id)
    .single();

  const vencida = licencia ? new Date(licencia.fecha_expiracion) < new Date() : true;

  if(error || !licencia || !licencia.activo || vencida){
    await cerrarSesionPensionalPro();
    return;
  }

  // Confirma que ESTE token de sesión sigue siendo el válido
  // (si alguien más inició sesión con la misma cuenta, esta fila ya no existirá)
  const { data: sesionRow } = await sbAuthCheck
    .from("sesiones_activas")
    .select("token")
    .eq("token", miToken)
    .single();

  if(!sesionRow){
    localStorage.removeItem("pensional_pro_token");
    await sbAuthCheck.auth.signOut();
    window.location.href = "login.html?expirada=1";
    return;
  }

  // Late deja los datos de sesión disponibles para la página (ej. mostrar nombre del usuario)
  window.usuarioPensionalPro = { email: session.user.email, ...licencia };
  window.dispatchEvent(new CustomEvent("accesoVerificado", { detail: window.usuarioPensionalPro }));

  // Heartbeat cada 60 segundos, para que la sesión no se libere mientras se sigue usando
  heartbeatInterval = setInterval(async ()=>{
    await sbAuthCheck.rpc("actualizar_heartbeat", { mi_token: miToken });
  }, 60000);
})();

async function cerrarSesionPensionalPro(){
  const miToken = localStorage.getItem("pensional_pro_token");
  if(heartbeatInterval) clearInterval(heartbeatInterval);
  if(miToken){
    await sbAuthCheck.from("sesiones_activas").delete().eq("token", miToken);
    localStorage.removeItem("pensional_pro_token");
  }
  await sbAuthCheck.auth.signOut();
  window.location.href = "login.html";
}
