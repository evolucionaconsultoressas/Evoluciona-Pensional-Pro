/* ============================================================
   auth-check.js
   Se incluye en panel.html y en las 8 herramientas, justo después
   de cargar el SDK de Supabase:

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   <script src="auth-check.js"></script>

   - Sin sesión: manda a login.html
   - Licencia vencida o inactiva (con sesión válida): manda a renovar.html
   - Token de sesión ya no válido (se inició sesión en otro dispositivo): login.html
   ============================================================ */

const SUPABASE_URL = "https://mdhdlnfhnqvjelecerla.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8CdFdPL3mCYzRfALVDO96A_J5mYv9uh";
const sbAuthCheck = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let heartbeatInterval = null;

(async function verificarAcceso(){
  const { data: { session } } = await sbAuthCheck.auth.getSession();
  const miToken = localStorage.getItem("pensional_pro_token");

  if(!session || !miToken){
    window.location.replace("login.html");
    return;
  }

  const { data: licencia, error } = await sbAuthCheck
    .from("licencias")
    .select("activo, fecha_expiracion, nombre, plan")
    .eq("user_id", session.user.id)
    .single();

  // Cuenta sin ninguna licencia asociada: se cierra la sesión.
  if(error || !licencia){
    await cerrarSesionPensionalPro();
    return;
  }

  // Licencia vencida o inactiva: la persona sigue con sesión y va a pagar.
  const vencida = new Date(licencia.fecha_expiracion) < new Date();
  if(!licencia.activo || vencida){
    window.location.replace("renovar.html");
    return;
  }

  // Confirma que ESTE token de sesión sigue siendo el válido
  const { data: sesionRow } = await sbAuthCheck
    .from("sesiones_activas")
    .select("token")
    .eq("token", miToken)
    .maybeSingle();

  if(!sesionRow){
    localStorage.removeItem("pensional_pro_token");
    await sbAuthCheck.auth.signOut();
    window.location.replace("login.html?expirada=1");
    return;
  }

  window.usuarioPensionalPro = { email: session.user.email, ...licencia };
  window.dispatchEvent(new CustomEvent("accesoVerificado", { detail: window.usuarioPensionalPro }));

  // Heartbeat cada 60 segundos, para que la sesión no se libere mientras se usa
  heartbeatInterval = setInterval(async ()=>{
    await sbAuthCheck.rpc("actualizar_heartbeat", { mi_token: miToken });
  }, 60000);
})();

// Cierra la sesión y lleva a la portada. Siempre termina: si la base de datos
// tarda más de 3 segundos, igual limpia el navegador y redirige.
async function cerrarSesionPensionalPro(){
  const miToken = localStorage.getItem("pensional_pro_token");
  if(heartbeatInterval) clearInterval(heartbeatInterval);

  const conTimeout = (promesa, ms = 3000) =>
    Promise.race([promesa, new Promise(resolve => setTimeout(resolve, ms))]);

  try{
    if(miToken){
      await conTimeout(sbAuthCheck.from("sesiones_activas").delete().eq("token", miToken));
    }
    await conTimeout(sbAuthCheck.auth.signOut());
  }catch(e){
    console.error("Error al cerrar sesión:", e);
  }finally{
    localStorage.removeItem("pensional_pro_token");
    Object.keys(localStorage)
      .filter(k => k.startsWith("sb-"))
      .forEach(k => localStorage.removeItem(k));
    window.location.replace("/");
  }
}
