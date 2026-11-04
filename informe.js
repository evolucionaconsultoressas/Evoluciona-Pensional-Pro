/* ============================================================
   informe.js — Evoluciona Pensional PRO
   Agrega a cada herramienta un botón «Descargar informe en PDF»
   que aparece cuando se muestra el resultado.

   Se incluye con <script src="informe.js"></script> al final de
   cada una de las 8 herramientas. No depende de ninguna llave.

   Cómo funciona: arma una versión limpia de la página (datos del
   cliente + resultado + espacio para notas) y abre la ventana de
   impresión del navegador, donde se elige «Guardar como PDF».
   ============================================================ */
(function(){
  "use strict";

  var CSS = [
    /* barra con el botón (en pantalla) */
    "#informe-bar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:18px 0 6px;padding:14px 18px;background:#fff;border:1px solid #DAD4C3;border-left:4px solid #A8823A;border-radius:4px;font-family:'Public Sans',sans-serif;}",
    "#informe-bar button{background:#1C3A2B;color:#F6F3EC;border:1px solid #1C3A2B;border-radius:4px;padding:11px 20px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:inherit;}",
    "#informe-bar button:hover{background:#2C5741;}",
    "#informe-bar span{font-size:13px;color:#5B5F53;flex:1;min-width:200px;}",
    /* el informe nunca se ve en pantalla */
    "#informe-print{display:none;}",
    /* al imprimir el informe: se oculta todo lo demás */
    "@media print{",
    "  @page{size:A4;margin:15mm 14mm;}",
    "  body.imprimiendo-informe > *:not(#informe-print){display:none !important;}",
    "  body.imprimiendo-informe{background:#fff !important;display:block !important;opacity:1 !important;padding:0 !important;min-height:0 !important;}",
    "  body.imprimiendo-informe #informe-print{display:block !important;}",
    "}",
    /* estilos del informe */
    "#informe-print{font-family:'Public Sans',Arial,sans-serif;color:#22261F;font-size:11.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}",
    "#informe-print *{box-sizing:border-box;}",
    "#informe-print .inf-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #A8823A;padding-bottom:10px;margin-bottom:16px;}",
    "#informe-print .inf-brand{font-family:'Fraunces',Georgia,serif;font-size:20px;color:#1C3A2B;font-weight:600;}",
    "#informe-print .inf-brand span{font-family:'Public Sans',Arial,sans-serif;font-size:9px;background:#1C3A2B;color:#fff;padding:2px 6px;border-radius:2px;margin-left:6px;vertical-align:middle;}",
    "#informe-print .inf-meta{font-size:10.5px;color:#5B5F53;text-align:right;}",
    "#informe-print .inf-title{font-family:'Fraunces',Georgia,serif;font-size:22px;color:#1C3A2B;font-weight:500;margin:0 0 4px;}",
    "#informe-print .inf-sub{margin:0 0 6px;color:#5B5F53;font-size:12px;}",
    "#informe-print h2.inf-h{font-family:'Fraunces',Georgia,serif;font-size:15px;color:#1C3A2B;font-weight:600;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #DAD4C3;break-after:avoid;}",
    "#informe-print h3.inf-s{font-size:11.5px;color:#5B5F53;font-weight:600;margin:12px 0 4px;break-after:avoid;}",
    "#informe-print table.inf-t{width:100%;border-collapse:collapse;margin-bottom:4px;}",
    "#informe-print table.inf-t td{padding:4px 8px;border-bottom:1px solid #EEE9DB;vertical-align:top;font-size:11px;}",
    "#informe-print table.inf-t td.k{width:58%;color:#5B5F53;}",
    "#informe-print table.inf-t td.v{font-weight:600;}",
    "#informe-print table.inf-t tr{break-inside:avoid;}",
    "#informe-print .inf-result .verdict-card,#informe-print .inf-result .profile-card,#informe-print .inf-result .headline-card,#informe-print .inf-result .summary-header{background:#F1EEE4 !important;color:#22261F !important;border:1px solid #DAD4C3 !important;border-left:4px solid #1C3A2B !important;border-radius:4px !important;padding:12px 16px !important;margin:0 0 10px !important;}",
    "#informe-print .inf-result .verdict-card *,#informe-print .inf-result .profile-card *,#informe-print .inf-result .headline-card *,#informe-print .inf-result .summary-header *{color:#22261F !important;}",
    "#informe-print .inf-result h1,#informe-print .inf-result h2,#informe-print .inf-result h3{font-family:'Fraunces',Georgia,serif;color:#1C3A2B;}",
    "#informe-print .inf-result .big{font-size:20px !important;margin:2px 0 !important;}",
    "#informe-print .inf-result .verdict-card,#informe-print .inf-result .profile-card,#informe-print .inf-result .headline-card,#informe-print .inf-result .summary-header,#informe-print .inf-result .metric-grid,#informe-print .inf-result .summary-metrics{break-inside:avoid;}",
    "#informe-print .inf-result .group-title{break-after:avoid;}",
    "#informe-print .inf-result .opcion-card,#informe-print .inf-result .exp-item,#informe-print .inf-result .note,#informe-print .inf-result .flag,#informe-print .inf-result .metric,#informe-print .inf-result .legal-note,#informe-print .inf-result .concept-box,#informe-print .inf-result .internal-box,#informe-print .inf-result .next-step,#informe-print .inf-result .card,#informe-print .inf-result .breakdown-row,#informe-print .inf-result tr{break-inside:avoid;}",
    "#informe-print .inf-result .metric-grid,#informe-print .inf-result .summary-metrics{display:grid !important;grid-template-columns:repeat(2,1fr) !important;gap:8px !important;}",
    "#informe-print .inf-result .smetric{background:#fff !important;border:1px solid #DAD4C3 !important;}",
    "#informe-print .inf-result .card{box-shadow:none !important;border:1px solid #DAD4C3 !important;padding:12px 14px !important;margin:10px 0 !important;}",
    "#informe-print .inf-result table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:8px;}",
    "#informe-print .inf-result th,#informe-print .inf-result td{padding:5px 6px;border-bottom:1px solid #DAD4C3;text-align:left;vertical-align:top;}",
    "#informe-print .inf-result .group-title{font-size:12px;font-weight:700;color:#1C3A2B;margin:14px 0 6px;}",
    "#informe-print .inf-result p{margin:4px 0;}",
    "#informe-print .inf-result .disclaimer{font-size:9.5px;color:#5B5F53;border-top:1px solid #DAD4C3;padding-top:8px;margin-top:12px;}",
    "#informe-print .inf-result .opciones-list{display:block !important;}",
    "#informe-print .inf-result .opcion-card{margin-bottom:10px !important;}",
    "#informe-print .inf-result .opcion-head{display:block !important;}",
    "#informe-print .inf-result .opcion-badge{display:inline-block !important;margin:2px 0 4px;}",
    "#informe-print .inf-notas{border:1px solid #DAD4C3;border-radius:4px;padding:4px 14px 10px;break-inside:avoid;}",
    "#informe-print .inf-notas div{height:24px;border-bottom:1px solid #DAD4C3;}",
    "#informe-print .inf-foot{margin-top:18px;padding-top:8px;border-top:1px solid #DAD4C3;font-size:9.5px;color:#5B5F53;text-align:center;}"
  ].join("\n");

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function dmy(v){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v); return m ? m[3]+"/"+m[2]+"/"+m[1] : v; }
  function val(id){ var el=document.getElementById(id); return el ? el.value : ""; }
  function hoyLargo(){ return new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"}); }
  function hoyISO(){ return new Date().toISOString().slice(0,10); }

  /* ---------- Recolección de datos (según la herramienta) ---------- */
  function datosWizard(){
    var secs = (typeof getSections==="function") ? getSections() : (typeof sections!=="undefined" ? sections : null);
    if(!secs || typeof answers==="undefined") return null;
    var out=[];
    secs.forEach(function(s){
      var items=[];
      s.fields.forEach(function(f){
        var v = answers[f.id];
        if(v===undefined || v==="" || v===null) return;
        if(f.showIf && answers[f.showIf.field]!==f.showIf.equals) return;
        if(typeof f.show==="function" && !f.show(answers)) return;
        items.push([String(f.q).replace(/\s+/g," "), f.type==="date" ? dmy(v) : String(v)]);
      });
      if(items.length) out.push({ titulo:s.title, items:items });
    });
    return { cliente: answers.nombre || "", secciones: out };
  }
  function datosOmisos(){
    var secs=[{ titulo:"Datos del caso", items:[
      ["Cliente", val("clienteNombre")], ["Cédula / referencia del caso", val("clienteRef")], ["Asesor que diligencia", val("asesorNombre")],
      ["Tasa de interés moratorio (E.A.)", val("tasaMora")+"%"], ["Fecha proyectada de pago", val("fechaPago") ? dmy(val("fechaPago")) : "Hoy"] ]}];
    periods.forEach(function(p,i){
      secs.push({ titulo:"Período omiso "+(i+1), items:[
        ["Tipo de vinculación", p.tipoVinculacion], ["Empresa o actividad", p.empresaActividad||"—"],
        ["Fecha en que debió reportarse", dmy(p.fechaDebioReportarse)], ["Inicio del período", dmy(p.fechaInicio)], ["Fin del período", dmy(p.fechaFin)],
        ["Salario devengado en el último periodo de omisión", p.ibc] ]});
    });
    return { cliente: val("clienteNombre"), asesor: val("asesorNombre"), secciones: sinVacios(secs) };
  }
  function datosEmpresarial(){
    var secs=[{ titulo:"Datos de la empresa", items:[
      ["Empresa", val("empresaNombre")], ["NIT", val("empresaNit")], ["Contacto", val("contactoNombre")], ["WhatsApp", val("contactoTelefono")], ["Correo", val("contactoEmail")] ]}];
    employees.forEach(function(e,i){
      var items=[["Nombre",e.nombre||"—"],["Cargo",e.cargo||"—"],["Sexo",e.sexo],["Fecha de nacimiento",dmy(e.fnac)],["Fecha de ingreso",dmy(e.fingreso)],["Régimen",e.regimen],["¿Se conocen sus semanas totales?",e.semanasConocidas]];
      if(e.semanasConocidas==="Sí lo sabemos") items.push(["Semanas cotizadas totales", e.semanas]);
      secs.push({ titulo:"Trabajador "+(i+1)+(e.nombre?" — "+e.nombre:""), items:items });
    });
    return { cliente: val("empresaNombre"), secciones: sinVacios(secs) };
  }
  function sinVacios(secs){ secs.forEach(function(s){ s.items=s.items.filter(function(it){ return it[1]!==""&&it[1]!=null&&it[1]!=="%"; }); }); return secs; }
  function recolectar(){
    if(typeof periods!=="undefined") return datosOmisos();
    if(typeof employees!=="undefined") return datosEmpresarial();
    return datosWizard();
  }

  /* ---------- Limpieza del resultado clonado ---------- */
  function resultadoLimpio(){
    var rw=document.getElementById("resultWrap");
    var clon=rw.cloneNode(true);
    // quitar la barra del botón, botones, mensajes de envío y bloques de "guardar"
    var bar=clon.querySelector("#informe-bar"); if(bar) bar.remove();
    var guardar=clon.querySelector("#btnEnviar"); if(guardar){ var c=guardar.closest(".card"); (c||guardar).remove(); }
    clon.querySelectorAll("button,.sent-msg,.warn-msg,script").forEach(function(n){ n.remove(); });
    clon.querySelectorAll("[id]").forEach(function(n){ n.removeAttribute("id"); });
    clon.querySelectorAll("[onclick]").forEach(function(n){ n.removeAttribute("onclick"); });
    clon.className="inf-result-inner";
    clon.removeAttribute("id");
    clon.style.display="block";
    return clon;
  }

  /* ---------- Armado del informe ---------- */
  function nombreHerramienta(){
    var h=document.querySelector(".top h1, header h1, h1");
    return (h && h.textContent.trim()) || document.title.split("|")[0].trim();
  }
  function construir(d){
    var asesor = d.asesor || (window.usuarioPensionalPro && window.usuarioPensionalPro.nombre) || "";
    var wrap=document.createElement("div");
    wrap.id="informe-print";
    var secHTML = d.secciones.map(function(s){
      return '<h3 class="inf-s">'+esc(s.titulo)+'</h3><table class="inf-t">'+
        s.items.map(function(it){ return '<tr><td class="k">'+esc(it[0])+'</td><td class="v">'+esc(it[1])+'</td></tr>'; }).join("")+'</table>';
    }).join("");
    var notas=""; for(var i=0;i<8;i++) notas+="<div></div>";
    wrap.innerHTML =
      '<div class="inf-head"><div class="inf-brand">Evoluciona Pensional <span>PRO</span></div>'+
      '<div class="inf-meta">Informe de asesoría<br>'+esc(hoyLargo())+'</div></div>'+
      '<h1 class="inf-title">'+esc(nombreHerramienta())+'</h1>'+
      '<p class="inf-sub">'+(d.cliente?'Cliente: <b>'+esc(d.cliente)+'</b> &nbsp;·&nbsp; ':'')+'Elaborado por: <b>'+(asesor?esc(asesor):'______________________')+'</b></p>'+
      '<h2 class="inf-h">Datos registrados en la asesoría</h2>'+secHTML+
      '<h2 class="inf-h">Resultado</h2><div class="inf-result"></div>'+
      '<h2 class="inf-h">Notas del asesor</h2><div class="inf-notas">'+notas+'</div>'+
      '<p class="inf-foot">Evoluciona Consultores S.A.S. · Sistema Pensional Pro® — Herramienta de orientación y análisis. No constituye liquidación oficial ni concepto jurídico.</p>';
    wrap.querySelector(".inf-result").appendChild(resultadoLimpio());
    return wrap;
  }

  /* ---------- Generar (abre la ventana de impresión) ---------- */
  function generar(){
    var d;
    try{ d=recolectar(); }catch(e){ console.error(e); d=null; }
    if(!d){ alert("No se pudo armar el informe en esta pantalla."); return; }
    var previo=document.getElementById("informe-print"); if(previo) previo.remove();
    var informe=construir(d);
    document.body.appendChild(informe);
    var tituloOriginal=document.title;
    document.title="Informe - "+(d.cliente||"cliente")+" - "+nombreHerramienta()+" - "+hoyISO();
    document.body.classList.add("imprimiendo-informe");
    var restaurado=false;
    function restaurar(){
      if(restaurado) return; restaurado=true;
      document.body.classList.remove("imprimiendo-informe");
      document.title=tituloOriginal;
      window.removeEventListener("afterprint",restaurar);
    }
    window.addEventListener("afterprint",restaurar);
    setTimeout(restaurar,60000);
    setTimeout(function(){ window.print(); },60);
  }

  /* ---------- Botón que aparece junto con el resultado ---------- */
  function insertarBarra(rw){
    if(document.getElementById("informe-bar")) return;
    var bar=document.createElement("div");
    bar.id="informe-bar";
    bar.innerHTML='<button type="button">Descargar informe en PDF</button><span>Se abre la ventana de impresión: elige «Guardar como PDF» como destino.</span>';
    bar.querySelector("button").addEventListener("click",generar);
    rw.insertBefore(bar, rw.firstChild);
  }
  function init(){
    var st=document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
    var rw=document.getElementById("resultWrap");
    if(!rw) return;
    function revisar(){ if(rw.classList.contains("show")) insertarBarra(rw); }
    new MutationObserver(revisar).observe(rw,{attributes:true,attributeFilter:["class"]});
    revisar();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();

  // para pruebas
  window.__informe={ recolectar:recolectar, construir:construir, generar:generar };
})();
