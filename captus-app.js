
// ═══════════════════════════════════════════════════
// CONFIGURACIÓN SUPABASE
// ═══════════════════════════════════════════════════
const SUPA_URL = 'https://ykglfcjxbgrutpyrjrzv.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZ2xmY2p4YmdydXRweXJqcnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTk1ODAsImV4cCI6MjA5NDMzNTU4MH0.lZP5ZecJifxWYX9eDK08i2vEgJ8gnmXEyAFgoD4xTKI';

// ── MODIFICADO: función para crear un cliente fresco sin lock bloqueado ──
function crearClienteSupa() {
  return supabase.createClient(SUPA_URL, SUPA_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // lock timeout corto para evitar bloqueos eternos
      lockAcquireTimeout: 5000
    }
  });
}
let sb = crearClienteSupa();

// ══════════════════════════════════════════════════════
// ▼▼▼ NUEVO: SISTEMA DE LOGIN ▼▼▼
// ══════════════════════════════════════════════════════

function showLoginScreen(visible) {
  const el = document.getElementById('login-screen');
  if (!el) return;
  el.style.display = visible ? 'flex' : 'none';
}

function showApp(visible) {
  const el = document.querySelector('.app');
  if (!el) return;
  el.style.display = visible ? 'flex' : 'none';
}

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errorEl  = document.getElementById('login-error');

  if (!email || !password) {
    errorEl.textContent = 'Completá email y contraseña';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Ingresando…';
  errorEl.style.display = 'none';

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    btn.disabled    = false;
    btn.textContent = 'Ingresar →';
    errorEl.textContent = 'Email o contraseña incorrectos';
    errorEl.style.display = 'block';
    return;
  }
  // Si hay éxito, onAuthStateChange se dispara solo y arranca la app
}

// ══════════════════════════════════════════════════════
// ▼▼▼ ETAPA 4 — MÓDULO B: SISTEMA DE PLANES ▼▼▼
// ══════════════════════════════════════════════════════

// ── tieneFeature: consulta si el plan activo incluye una feature ──
// Uso: tieneFeature('calculadora_impresion') → true/false
function tieneFeature(feature) {
  if (!planActual || !planActual.features) return false;
  return planActual.features.includes(feature);
}

// ── aplicarRestriccionesPlan: muestra/oculta elementos según el plan ──
function aplicarRestriccionesPlan() {
  // ── MODIFICADO ETAPA 4: Presupuestador invisible para todos excepto plan interno ──
  const navCalc = document.getElementById('nav-calc');
  if (navCalc) {
    if (!tieneFeature('calculadora_impresion')) {
      navCalc.style.display = 'none'; // completamente oculto
    } else {
      navCalc.style.display = ''; // visible solo para plan interno
    }
  }

  // Catálogo público: solo pro e interno
  const navCatalogo = document.getElementById('nav-catalogo');
  if (navCatalogo) {
    if (!tieneFeature('catalogo')) {
      navCatalogo.style.opacity = '0.4';
      navCatalogo.style.cursor  = 'not-allowed';
      navCatalogo.onclick       = () => mostrarBloqueo('catalogo');
      navCatalogo.title         = '🔒 Disponible en Plan Pro';
    }
  }
}

// ── mostrarBloqueo: toast informativo cuando se toca una feature bloqueada ──
function mostrarBloqueo(feature) {
  const nombres = {
    'calculadora_impresion': 'el Presupuestador',
    'catalogo':              'el Catálogo público',
    'reportes_avanzados':    'los Reportes avanzados',
    'cuenta_corriente':      'las Cuentas corrientes',
  };
  const nombre = nombres[feature] || 'esta función';
  showToast(`🔒 ${nombre} requiere Plan Pro. Ir a Mi Plan para hacer upgrade.`);
}

// ── renderPantallaPlan: genera el HTML de la pantalla "Mi Plan" ──
async function renderPantallaPlan() {
  const el = document.getElementById('plan-content');
  if (!el) return;
  if (!negocioId) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Todavía cargando…</div></div>';
    return;
  }
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-text">Cargando plan…</div></div>';

  // Recargar datos frescos desde Supabase
  // ── MODIFICADO ETAPA 4: incluir campos de trial ──
  const { data: sus } = await sb
    .from('suscripciones')
    .select('plan_id, estado, fecha_vencimiento, es_trial, trial_expira, planes(nombre, precio_gs, descripcion, features)')
    .eq('negocio_id', negocioId)
    .single();
  // ── FIN MODIFICADO ──

  const { data: todosPlanes } = await sb
    .from('planes')
    .select('*')
    .eq('activo', true)
    .order('precio_gs');

  
  if (!sus) {
    el.innerHTML = '<div class="empty-state">No se encontró información del plan.</div>';
    return;
  }

  try {
    const planId    = sus.plan_id;
    
    const planNombre = sus.planes?.nombre || planId;
    
    const features   = sus.planes?.features || [];
    
    const badgeColor = { 'gratis':'var(--ink3)', 'pro':'var(--blue)', 'interno':'var(--purple)' }[planId] || 'var(--ink3)';
    const badgeBg    = { 'gratis':'var(--surface2)', 'pro':'var(--blue-l)', 'interno':'var(--purple-l)' }[planId] || 'var(--surface2)';
    const featureLabels = {
      'pos':'🛒 Punto de venta','productos_50':'📦 Hasta 50 productos',
      'productos_ilimitados':'📦 Productos ilimitados','clientes_20':'👥 Hasta 20 clientes',
      'clientes_ilimitados':'👥 Clientes ilimitados','reportes_basicos':'📊 Reportes básicos',
      'reportes_avanzados':'📈 Reportes avanzados','catalogo':'🌐 Catálogo público',
      'cuenta_corriente':'💳 Cuentas corrientes','calculadora_impresion':'🧮 Presupuestador',
      'admin_panel':'⚙️ Panel de administración',
    };
    
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="background:${badgeBg};color:${badgeColor};border-radius:100px;padding:6px 16px;font-weight:800;font-size:.9rem;">
          ${planId === 'interno' ? '⭐' : planId === 'pro' ? '🚀' : '🎁'} ${planNombre}
        </div>
        <div style="font-size:.8rem;color:var(--ink3);">
          Estado: <strong style="color:${sus.estado === 'activa' ? 'var(--green)' : 'var(--red)'};">${sus.estado}</strong>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-title">✅ Incluido en tu plan</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${features.map(f => `<div style="font-size:.83rem;padding:6px 8px;background:var(--green-l);border-radius:var(--r-sm);color:#166534;">${featureLabels[f] || f}</div>`).join('')}
        </div>
      </div>
      ${planId === 'interno' ? `
        <div style="background:var(--purple-l);border-radius:var(--r);padding:16px;border:1.5px solid #c4b5fd;">
          <div style="font-weight:800;color:#6d28d9;margin-bottom:4px;">⭐ Plan Interno</div>
          <div style="font-size:.83rem;color:#7c3aed;">Tenés acceso completo a todas las funciones de Nomi.</div>
        </div>` : planId === 'pro' ? `
        <div style="background:var(--blue-l);border-radius:var(--r);padding:16px;border:1.5px solid #93c5fd;">
          <div style="font-weight:800;color:#1d4ed8;margin-bottom:4px;">🚀 Plan Pro activo</div>
          <div style="font-size:.83rem;color:#2563eb;">Tenés acceso a todas las funciones disponibles.</div>
        </div>` : `
        <div style="margin-bottom:20px;">
          <button class="btn btn-primary" style="width:100%;" onclick="solicitarUpgrade()">
            ⬆️ Hacer Upgrade a Pro — Gs 150.000/mes
          </button>
        </div>`}
    `;
    
  } catch(err) {
    console.error('DEBUG error en render:', err);
    el.innerHTML = '<div class="empty-state">Error al renderizar: ' + err.message + '</div>';
  }

  const planId    = sus.plan_id;
  const planNombre = sus.planes?.nombre || planId;
  const planPrecio = sus.planes?.precio_gs || 0;
  const features   = sus.planes?.features || [];

  // ── Badge de color según plan ──
  const badgeColor = {
    'gratis':   'var(--ink3)',
    'pro':      'var(--blue)',
    'interno':  'var(--purple)',
  }[planId] || 'var(--ink3)';

  const badgeBg = {
    'gratis':   'var(--surface2)',
    'pro':      'var(--blue-l)',
    'interno':  'var(--purple-l)',
  }[planId] || 'var(--surface2)';

  // ── Labels amigables para cada feature ──
  const featureLabels = {
    'pos':                     '🛒 Punto de venta',
    'productos_50':            '📦 Hasta 50 productos',
    'productos_ilimitados':    '📦 Productos ilimitados',
    'clientes_20':             '👥 Hasta 20 clientes',
    'clientes_ilimitados':     '👥 Clientes ilimitados',
    'reportes_basicos':        '📊 Reportes básicos',
    'reportes_avanzados':      '📈 Reportes avanzados + gráficos',
    'catalogo':                '🌐 Catálogo público',
    'cuenta_corriente':        '💳 Cuentas corrientes / Fiado',
    'calculadora_impresion':   '🧮 Presupuestador de impresión',
    'admin_panel':             '⚙️ Panel de administración',
  };

  // ── Comparación de planes (excluye 'interno' de la vista pública) ──
  const planesPublicos = (todosPlanes || []).filter(p => p.id !== 'interno');

  const planesHTML = planesPublicos.map(plan => {
    const esCurrent = plan.id === planId;
    const fs = plan.features || [];
    return `
      <div style="border:1.5px solid ${esCurrent ? 'var(--ink)' : 'var(--border)'};
        border-radius:var(--r);padding:18px;background:${esCurrent ? 'var(--surface2)' : 'var(--surface)'};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-weight:800;font-size:1rem;">${plan.nombre}</div>
          ${esCurrent ? `<span style="background:var(--green-l);color:var(--green);border-radius:100px;padding:2px 10px;font-size:.72rem;font-weight:700;">Tu plan actual</span>` : ''}
        </div>
        <div style="font-size:1.3rem;font-weight:800;margin-bottom:4px;">
          ${plan.precio_gs === 0 ? 'Gratis' : 'Gs ' + plan.precio_gs.toLocaleString('es-PY') + '<span style="font-size:.8rem;font-weight:500;color:var(--ink3);">/mes</span>'}
        </div>
        <div style="font-size:.78rem;color:var(--ink3);margin-bottom:12px;">${plan.descripcion || ''}</div>
        ${fs.map(f => `<div style="font-size:.8rem;padding:3px 0;color:var(--ink2);">✅ ${featureLabels[f] || f}</div>`).join('')}
        ${!esCurrent && plan.id === 'pro' ? `
          <button class="btn btn-primary btn-sm" style="width:100%;margin-top:14px;" onclick="solicitarUpgrade()">
            ⬆️ Upgrade a Pro
          </button>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `
    <!-- Badge plan actual -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="background:${badgeBg};color:${badgeColor};border-radius:100px;
        padding:6px 16px;font-weight:800;font-size:.9rem;">
        ${planId === 'interno' ? '⭐' : planId === 'pro' ? '🚀' : '🎁'} ${planNombre}
      </div>
      <div style="font-size:.8rem;color:var(--ink3);">
        Estado: <strong style="color:${sus.estado === 'activa' ? 'var(--green)' : 'var(--red)'};">${sus.estado}</strong>
      </div>
    </div>

    <!-- Features del plan actual -->
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">✅ Incluido en tu plan</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${features.map(f => `
          <div style="font-size:.83rem;padding:6px 8px;background:var(--green-l);
            border-radius:var(--r-sm);color:#166534;">
            ${featureLabels[f] || f}
          </div>`).join('')}
      </div>
    </div>

    <!-- Banner plan interno o botón upgrade -->
    ${planId === 'interno' ? `
      <div style="background:var(--purple-l);border-radius:var(--r);padding:16px;
        border:1.5px solid #c4b5fd;margin-bottom:20px;">
        <div style="font-weight:800;color:#6d28d9;margin-bottom:4px;">⭐ Plan Interno</div>
        <div style="font-size:.83rem;color:#7c3aed;">
          Tenés acceso completo a todas las funciones de Nomi.
        </div>
      </div>` : planId === 'pro' ? `
      <div style="background:var(--blue-l);border-radius:var(--r);padding:16px;
        border:1.5px solid #93c5fd;margin-bottom:20px;">
        <div style="font-weight:800;color:#1d4ed8;margin-bottom:4px;">🚀 Plan Pro activo</div>
        <div style="font-size:.83rem;color:#2563eb;">
          Tenés acceso a todas las funciones disponibles.
        </div>
      </div>` : `
      <div style="margin-bottom:20px;">
        <button class="btn btn-primary" style="width:100%;" onclick="solicitarUpgrade()">
          ⬆️ Hacer Upgrade a Pro — Gs 150.000/mes
        </button>
      </div>`}
  `;
}

// ── solicitarUpgrade: abre el modal de pago manual (Módulo C) ──
function solicitarUpgrade() {
  openModal('upgrade-overlay');
}

// ══════════════════════════════════════════════════════
// ▲▲▲ FIN ETAPA 4 — MÓDULO B ▲▲▲
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// ▼▼▼ ETAPA 4 — MÓDULO C: PAGO MANUAL ▼▼▼
// ══════════════════════════════════════════════════════

// ── enviarSolicitudUpgrade: guarda la solicitud en Supabase ──
// y abre WhatsApp con los datos pre-cargados para notificarte
async function enviarSolicitudUpgrade() {
  const nombre      = document.getElementById('upg-nombre').value.trim();
  const comprobante = document.getElementById('upg-comprobante').value.trim();
  const tel         = document.getElementById('upg-tel').value.trim();
  const errEl       = document.getElementById('upg-error');
  const btn         = document.getElementById('upg-btn');

  // ── Validación ──
  errEl.style.display = 'none';
  if (!nombre) {
    errEl.textContent   = '⚠️ Ingresá tu nombre completo.';
    errEl.style.display = 'block';
    return;
  }
  if (!comprobante) {
    errEl.textContent   = '⚠️ Ingresá el número de comprobante.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled     = true;
  btn.textContent  = 'Enviando…';

  try {
    // ── Guardar solicitud en Supabase ──
    const { error } = await sb.from('solicitudes_upgrade').insert({
      negocio_id:     negocioId,
      negocio_nombre: DB.config.nombre || 'Sin nombre',
      contacto_nombre: nombre,
      contacto_tel:    tel || null,
      comprobante_nro: comprobante,
      estado:          'pendiente',
    });

    if (error) throw error;

    // ── Armar mensaje de WhatsApp para notificarte ──
    // ══ REEMPLAZÁ 595981000000 con tu número real (sin + ni espacios) ══
    const tuNumero = '595992270261';
    const msg = encodeURIComponent(
      `🔔 *Solicitud de Upgrade — Nomi*\n\n` +
      `📋 Negocio: ${DB.config.nombre || negocioId}\n` +
      `👤 Contacto: ${nombre}\n` +
      `📞 Teléfono: ${tel || 'No indicado'}\n` +
      `🧾 Comprobante: ${comprobante}\n\n` +
      `Por favor verificar y activar Plan Pro.`
    );

    closeModal('upgrade-overlay');
    showToast('✅ Solicitud enviada. Te contactaremos pronto.');

    // Limpiar campos
    document.getElementById('upg-nombre').value      = '';
    document.getElementById('upg-comprobante').value = '';
    document.getElementById('upg-tel').value         = '';

    // Abrir WhatsApp después de un momento
    setTimeout(() => {
      window.open(`https://wa.me/${tuNumero}?text=${msg}`, '_blank');
    }, 800);

  } catch (err) {
    console.error('Error enviando solicitud:', err);
    errEl.textContent   = '❌ Error al enviar. Intentá de nuevo.';
    errEl.style.display = 'block';
    btn.disabled        = false;
    btn.textContent     = '📨 Enviar solicitud';
  }
}

// ══════════════════════════════════════════════════════
// ▲▲▲ FIN ETAPA 4 — MÓDULO C ▲▲▲
// ══════════════════════════════════════════════════════

async function doLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  await sb.auth.signOut();
  // onAuthStateChange se encarga de mostrar el login
}

// ══════════════════════════════════════════════════════
// ▲▲▲ FIN: SISTEMA DE LOGIN ▲▲▲
// ══════════════════════════════════════════════════════

// ═══ DATA (ahora es caché local, se llena desde Supabase) ═══
let DB={
  productos:[], clientes:[], ventas:[], gastos:[],
  tareas:[], historial:[],
  // ── AGREGADO: caché de cuentas corrientes ──
  cuentasCorrientes:[],
  config:{nombre:'Mi Negocio',tipo:'Imprenta / Diseño',tel:'',ruc:'',dir:'',slogan:'',
          ticketMsg:'¡Gracias por su compra! Vuelva pronto 😊',
          impresora:'termica',copias:1,autoprint:'preguntar',logoDataUrl:''},
};
// ── MODIFICADO: se agrega cartDescuento para manejar descuentos en el carrito ──
let cart=[],currentProdTab='productos',currentCalcTab='tarjetas',prodModalType='producto',currentPeriod='hoy',lastVenta=null,printerSelected='termica',turnoActual=null;
let cartDescuento = { tipo: 'pct', valor: 0, monto: 0 };
// ── AGREGADO ETAPA 2: ID del negocio activo, se llena al iniciar sesión ──
let negocioId = null;
// ── AGREGADO ETAPA 4: plan activo del negocio ──
let planActual = { plan_id: 'gratis', features: [] };
// ── FIN AGREGADO ETAPA 4 ──

// Esta función reemplaza los datos hardcodeados.
// Muestra un spinner, carga todo en paralelo, luego renderiza.
async function initApp(){
  // Mostrar pantalla de carga
  document.getElementById('loading-screen').style.display='flex';

  try {
    // getSession() lee el token del localStorage sin llamada de red (no se cuelga)
    const { data: { session }, error: sessionErr } = await sb.auth.getSession();
    if (sessionErr) throw new Error('getSession falló: ' + sessionErr.message);
    if (!session?.user) throw new Error('Sin sesión activa');
    const user = session.user;

    const { data: unData, error: unError } = await sb
      .from('usuarios_negocios')
      .select('negocio_id')
      .eq('user_id', user.id)
      .single();

    if (unError) throw new Error('usuarios_negocios: ' + unError.message);
    if (!unData) throw new Error('Este usuario no tiene negocio asignado');
    negocioId = unData.negocio_id;

    // ── AGREGADO ETAPA 4: cargar plan y features del negocio ──
    const { data: susData } = await sb
      .from('suscripciones')
      .select('plan_id, estado, planes(features)')
      .eq('negocio_id', negocioId)
      .single();

    if (susData) {
      // ── MODIFICADO ETAPA 4: lógica de trial ──
      let features = susData.planes?.features || [];
      let estaEnTrial = false;
      let trialExpirado = false;

      if (susData.plan_id === 'gratis' && susData.es_trial && susData.trial_expira) {
        const hoy     = new Date();
        const expira  = new Date(susData.trial_expira);
        hoy.setHours(0,0,0,0);
        expira.setHours(0,0,0,0);

        if (hoy <= expira) {
          estaEnTrial = true; // trial vigente: features completas
        } else {
          trialExpirado = true;
          // Trial vencido: solo features básicas
          features = ['pos','productos_50','clientes_20','reportes_basicos'];
        }
      }

      planActual = {
        plan_id:       susData.plan_id,
        estado:        susData.estado,
        features,
        estaEnTrial,
        trialExpirado,
        trial_expira:  susData.trial_expira,
      };
      // ── FIN MODIFICADO ETAPA 4 ──
    }
    // Aplicar restricciones visuales según el plan
    aplicarRestriccionesPlan();
    // ── FIN AGREGADO ETAPA 4 ──

    // Cargar todas las tablas en paralelo (más rápido que una por una)
const [
      {data: productos},
      {data: clientes},
      {data: ventas},
      {data: ventaItems},
      {data: gastos},
      {data: tareas},
      {data: config},
      // ── AGREGADO: cargar cuentas corrientes ──
      {data: cuentasCorrientes}
    ] = await Promise.all([
      // ── MODIFICADO ETAPA 2: todos los SELECT filtran por negocio_id ──
      sb.from('productos').select('*').eq('negocio_id', negocioId).order('id'),
      sb.from('clientes').select('*').eq('negocio_id', negocioId).order('id'),
      sb.from('ventas').select('*').eq('negocio_id', negocioId).order('date', {ascending: false}),
      sb.from('venta_items').select('*').eq('negocio_id', negocioId),
      sb.from('gastos').select('*').eq('negocio_id', negocioId).order('date', {ascending: false}),
      sb.from('tareas').select('*').eq('negocio_id', negocioId).order('date'),
      sb.from('config').select('*').eq('negocio_id', negocioId).single(),
      // ── MODIFICADO ETAPA 2 ──
      sb.from('cuentas_corrientes').select('*').eq('negocio_id', negocioId).order('fecha', {ascending: false})
      // ── FIN MODIFICADO ETAPA 2 ──
    ]);

// Poblar caché local
    DB.productos          = productos          || [];
    DB.clientes           = clientes           || [];
    DB.gastos             = gastos             || [];
    // ── AGREGADO ──
    DB.cuentasCorrientes  = cuentasCorrientes  || [];

    // Reconstruir ventas con sus items anidados
    // (igual que el formato original: venta.items = [...])
    DB.ventas = (ventas || []).map(v => ({
      ...v,
      // Mapear columnas de BD al formato que usa el código
      clienteId:      v.cliente_id,
      clienteNombre:  v.cliente_nombre,
      num:            v.num || v.id,
      items: (ventaItems || [])
        .filter(i => i.venta_id === v.id)
        .map(i => ({
          id:     i.producto_id,
          nombre: i.nombre,
          precio: i.precio,
          qty:    i.qty,
          emoji:  i.emoji || '📦'
        }))
    }));

    // Separar tareas pendientes e historial
    DB.tareas    = (tareas || []).filter(t => !t.completada).map(mapTarea);
    DB.historial = (tareas || []).filter(t =>  t.completada).map(mapTarea)
                    .sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt));

    // Cargar config del negocio
    if(config){
      DB.config = {
        nombre:      config.nombre      || 'Mi Negocio',
        tipo:        config.tipo        || 'Imprenta / Diseño',
        tel:         config.tel         || '',
        ruc:         config.ruc         || '',
        dir:         config.dir         || '',
        slogan:      config.slogan      || '',
        ticketMsg:   config.ticket_msg  || '¡Gracias por su compra!',
        impresora:   config.impresora   || 'termica',
        copias:      config.copias      || 1,
        autoprint:   config.autoprint   || 'preguntar',
        logoDataUrl: config.logo_url    || '',
        // ── LÍNEAS AGREGADAS FASE 1 ──
        moneda_principal:    config.moneda_principal    || 'PYG',
        // ── BUG FIX: si la columna no existe o es null, usar array vacío (no default con monedas) ──
        // El default ['USD','ARS','BRL'] sobreescribía lo que el usuario guardaba cuando
        // la columna venía como null desde Supabase. Ahora se normaliza correctamente.
        monedas_habilitadas: Array.isArray(config.monedas_habilitadas)
                               ? config.monedas_habilitadas
                               : (config.monedas_habilitadas ? [config.monedas_habilitadas] : []),
        tipos_cambio:        config.tipos_cambio        || {},
        // ── NUEVO: zona horaria ──
        zona_horaria:        config.zona_horaria        || 'America/Asuncion'
        // ── FIN NUEVO ──
        // ── FIN LÍNEAS AGREGADAS ──
      };
    }

  } catch(err) {
    console.error('Error cargando datos:', err);
    // ── MODIFICADO: mostrar el loading (puede estar oculto) y luego el error ──
    const lsErr = document.getElementById('loading-screen');
    if (lsErr) {
      lsErr.style.display = 'flex';
      lsErr.innerHTML = `
        <div style="text-align:center;padding:30px;max-width:480px;">
          <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
          <div style="font-weight:800;font-size:1.1rem;margin-bottom:10px;">Error al cargar</div>
          <div style="font-size:.85rem;color:#333;line-height:1.7;background:#f5f5f5;padding:14px;border-radius:10px;text-align:left;word-break:break-all;max-height:200px;overflow:auto;">
            <strong>Error:</strong> ${err?.message || String(err)}<br>
            <strong>Código:</strong> ${err?.code || err?.status || '—'}<br>
            <strong>Detalle:</strong> ${err?.details || err?.hint || '—'}
          </div>
          <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#18181B;color:white;border:none;border-radius:100px;font-weight:700;cursor:pointer;">🔄 Reintentar</button>
        </div>`;
    }
    // ── IMPORTANTE: re-lanzar el error para que el finally del IIFE
    //    sepa que hubo falla y no llame irAlLogin() borrando los tokens ──
    throw err;
  }

// Ocultar pantalla de carga y arrancar la app
  document.getElementById('loading-screen').style.display='none';

  // ── AGREGADO: actualizar nombre y logo en el sidebar al arrancar ──
  const cfg = DB.config;
  document.getElementById('sb-biz-name').textContent = cfg.nombre || 'Mi Negocio';
  document.getElementById('sb-biz-type').textContent = cfg.tipo   || 'Negocio';
  const sbImg = document.getElementById('sb-logo-img');
  const sbIni = document.getElementById('sb-logo-inicial');
  if (cfg.logoDataUrl) {
    sbImg.src          = cfg.logoDataUrl;
    sbImg.style.display = 'block';
    sbIni.style.display = 'none';
  } else {
    sbImg.style.display = 'none';
    sbIni.style.display = '';
    sbIni.textContent   = (cfg.nombre || 'N').charAt(0).toUpperCase();
  }
  // ── FIN AGREGADO ──

  // ── MODIFICADO: arranca en 'pos' (Vender), no en 'inicio' ──
  renderPosGrid();
  populateClientes();
  renderPosTCBar();
  updateBadge();

  // ── NUEVO: verificar si ya hay una caja abierta hoy ──
  await verificarCajaHoy();

  // ── AGREGADO: mostrar FAB del carrito si estamos en móvil ──
  updateCartFab();
}

// ══════════════════════════════════════════════════════════
// APERTURA DE CAJA — NUEVO BLOQUE COMPLETO
// ══════════════════════════════════════════════════════════

async function verificarCajaHoy(){
  // ── CORREGIDO: usar fecha local Paraguay, no UTC ──
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
  try {
    // ── MODIFICADO ETAPA 3C: filtrar por negocio_id ──
    const {data, error} = await sb
      .from('turnos_caja')
      .select('*')
      .eq('fecha', hoy)
      .eq('estado', 'abierta')
      .eq('negocio_id', negocioId)
      .maybeSingle();
    // ── FIN MODIFICADO 3C ──

    if(error) throw error;

    if(data){
      turnoActual = data;
      actualizarIndicadorCaja();
    } else {
      document.getElementById('caja-apertura-overlay').classList.add('open');
      setTimeout(()=>document.getElementById('caja-monto-inicial').focus(), 200);
    }
  } catch(e){
    console.error('Error verificando caja:', e);
    document.getElementById('caja-apertura-overlay').classList.add('open');
  }
}

async function confirmarAperturaCaja(){
  const monto = +document.getElementById('caja-monto-inicial').value || 0;
  const notas = document.getElementById('caja-notas-apertura').value.trim();
  // ── CORREGIDO: usar fecha local Paraguay, no UTC ──
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;

  try {
    // ── MODIFICADO ETAPA 3C: se agrega negocio_id al INSERT ──
    const {data, error} = await sb.from('turnos_caja').insert({
      fecha:          hoy,
      monto_inicial:  monto,
      notas_apertura: notas || null,
      estado:         'abierta',
      negocio_id:     negocioId
    }).select().single();
    // ── FIN MODIFICADO 3C ──

    if(error) throw error;

    turnoActual = data;
    document.getElementById('caja-apertura-overlay').classList.remove('open');
    actualizarIndicadorCaja();
    showToast(`✅ Caja abierta con ${fmtGs(monto)}`);

  } catch(e){
    console.error('Error abriendo caja:', e);
    showToast('⚠️ Error al abrir la caja. Verificá la conexión.');
  }
}

function saltarAperturaCaja(){
  turnoActual = null;
  document.getElementById('caja-apertura-overlay').classList.remove('open');
  showToast('⚠️ Caja no abierta. Las ventas están bloqueadas.');
  actualizarIndicadorCaja();
}

// ══════════════════════════════════════════════════════════
// FASE 2: actualizarIndicadorCaja — badge movido a Balance
//         + renderiza widget TC en POS
// ══════════════════════════════════════════════════════════
function actualizarIndicadorCaja(){
  // ── Badge en pantalla Caja/Balance (FASE 2: reemplaza el del POS) ──
  const badge = document.getElementById('caja-status-badge-balance');
  if(badge){
    if(turnoActual){
      badge.textContent  = `🟢 Caja abierta · ${fmtMoneda(turnoActual.monto_inicial, monedaPrincipal())}`;
      badge.style.background = 'var(--green-l)';
      badge.style.color      = 'var(--green)';
    } else {
      badge.textContent  = '🔴 Caja cerrada';
      badge.style.background = 'var(--red-l,#fee2e2)';
      badge.style.color      = 'var(--red)';
    }
  }

  // ── Botones abrir/cerrar caja en Balance ──
  const btnAbrir  = document.getElementById('btn-abrir-caja');
  const btnCerrar = document.getElementById('btn-cerrar-caja');
  if(btnAbrir)  btnAbrir.style.display  = turnoActual ? 'none' : '';
  if(btnCerrar) btnCerrar.style.display = turnoActual ? ''     : 'none';

  // ── FASE 2: renderizar widget de TC en el POS ──
  renderPosTCBar();
}

// ── Renderiza la barra de tipos de cambio editables en el POS ──
function renderPosTCBar(){
  const bar   = document.getElementById('pos-tc-bar');
  const pills = document.getElementById('pos-tc-pills');
  if(!bar || !pills) return;

  const principal   = monedaPrincipal();
  const habilitadas = monedasHabilitadas().filter(c => c !== principal);

  // Si no hay monedas secundarias habilitadas, ocultar la barra
  if(!habilitadas.length){
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  const mPrincipal  = getMoneda(principal);
  const tc          = DB.config?.tipos_cambio || {};

  // ── MODIFICADO: máximo 4 monedas visibles en grilla 2x2 del topbar ──
  const visibles = habilitadas.slice(0, 4);
  pills.innerHTML = visibles.map(code => {
    const m   = getMoneda(code);
    const val = tc[code] || 0;
    return `
      <div style="display:inline-flex;align-items:center;gap:5px;
        background:var(--surface2);border:1.5px solid var(--border);
        border-radius:100px;padding:3px 6px 3px 10px;
        font-size:.8rem;white-space:nowrap;">
        ${bandera(m, '1rem')}
        <span style="font-weight:700;">${m.code}</span>
        <span style="color:var(--ink3);font-size:.72rem;">1 =</span>
        <input
          type="number" min="0" step="any"
          value="${val || ''}"
          placeholder="TC"
          title="Tipo de cambio: 1 ${m.code} en ${mPrincipal.simbolo}"
          id="pos-tc-input-${code}"
          onchange="actualizarTCdesdePOS('${code}', this.value)"
          style="width:72px;border:none;background:transparent;
            font-family:var(--font);font-size:.82rem;font-weight:800;
            color:var(--ink1);outline:none;text-align:right;
            padding:2px 4px;"
        >
        <span style="color:var(--ink3);font-size:.72rem;">${mPrincipal.simbolo}</span>
        <span style="font-size:.7rem;cursor:pointer;opacity:.5;padding:0 2px;"
          onclick="focusTCInput('${code}')" title="Editar">✏️</span>
      </div>`;
  }).join('');
}

// ── Actualiza el TC desde el POS y guarda en Supabase ──
async function actualizarTCdesdePOS(code, val){
  const nuevo = parseFloat(val);
  if(!nuevo || nuevo <= 0){ showToast('⚠️ Ingresá un valor mayor a 0'); return; }

  if(!DB.config.tipos_cambio) DB.config.tipos_cambio = {};
  DB.config.tipos_cambio[code] = nuevo;

  const m = getMoneda(code);
  showToast(`💱 ${m.pais} ${m.code}: 1 = ${fmtMoneda(nuevo, monedaPrincipal())}`);

  // Guardar en Supabase en segundo plano (no bloquea el POS)
  try {
    await sb.from('config').update({
      tipos_cambio: DB.config.tipos_cambio
    }).eq('negocio_id', negocioId);
  } catch(e){
    console.error('Error guardando TC:', e);
    showToast('⚠️ TC actualizado localmente pero no se guardó en la nube.');
  }
}

// ── Foco en el input de TC (ayuda en móvil) ──
function focusTCInput(code){
  const input = document.getElementById(`pos-tc-input-${code}`);
  if(input){ input.focus(); input.select(); }
}
// ══════════════════════════════════════════════════════════
// FIN FASE 2
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// FASE 3: Lógica de cobro multi-moneda
// ══════════════════════════════════════════════════════════

// Moneda seleccionada para cobrar (por defecto la principal)
let monedaCobro = null; // null = moneda principal

// ── Renderiza los pills de selección de moneda en el carrito ──
function renderCobroMonedaPills(){
  const wrap  = document.getElementById('cobro-moneda-wrap');
  const pills = document.getElementById('cobro-moneda-pills');
  if(!wrap || !pills) return;

  const principal   = monedaPrincipal();
  const habilitadas = monedasHabilitadas();

  // Si solo hay moneda principal, ocultar el selector
  if(habilitadas.length <= 1){
    wrap.style.display = 'none';
    monedaCobro = null;
    return;
  }

  wrap.style.display = 'block';

  // Si monedaCobro no está seteada o no es válida, usar principal
  if(!monedaCobro || !habilitadas.includes(monedaCobro)){
    monedaCobro = principal;
  }

  pills.innerHTML = habilitadas.map(code => {
    const m       = getMoneda(code);
    const activo  = code === monedaCobro;
    return `
      <button onclick="seleccionarMonedaCobro('${code}')"
        style="display:inline-flex;align-items:center;gap:5px;
          padding:5px 12px;border-radius:100px;font-size:.8rem;font-weight:700;
          cursor:pointer;transition:all .15s;font-family:var(--font);
          border:2px solid ${activo ? 'var(--green)' : 'var(--border)'};
          background:${activo ? 'var(--green-l)' : 'var(--surface)'};
          color:${activo ? 'var(--green)' : 'var(--ink2)'};">
        ${bandera(m)}
        ${activo ? '✓' : ''}
      </button>`;
  }).join('');

  actualizarEquivalente();
}

// ── Selecciona la moneda de cobro y actualiza el equivalente ──
function seleccionarMonedaCobro(code){
  monedaCobro = code;
  renderCobroMonedaPills();
}

// ── Muestra el equivalente en moneda secundaria bajo el total ──
function actualizarEquivalente(){
  const el = document.getElementById('cobro-equivalente');
  if(!el) return;

  const principal = monedaPrincipal();
  if(!monedaCobro || monedaCobro === principal){
    el.style.display = 'none';
    return;
  }

  const subtotal = cart.reduce((s,c) => s + c.precio * c.qty, 0);
  const total    = subtotal - (cartDescuento?.monto || 0);
  const tc       = getTipoCambio(monedaCobro);

  if(!tc || tc <= 0){
    el.style.display = 'block';
    el.innerHTML = `<span style="color:var(--amber);font-weight:700;">
      ⚠️ Configurá el tipo de cambio para ${monedaCobro} en el POS o en Configuración.
    </span>`;
    return;
  }

  const enMonedaSecundaria = convertirDesdeMonedaPrincipal(total, monedaCobro);
  const m  = getMoneda(monedaCobro);
  const mp = getMoneda(principal);

  el.style.display = 'block';
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
      <div>
        <span style="color:var(--ink3);font-size:.75rem;">El cliente paga:</span>
        <span style="font-weight:800;font-size:1.1rem;color:var(--green);margin-left:6px;">
          ${fmtMoneda(enMonedaSecundaria, monedaCobro)}
        </span>
      </div>
      <div style="font-size:.72rem;color:var(--ink3);">
        TC: 1 ${m.code} = ${fmtMoneda(tc, principal)}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// FIN FASE 3 lógica de cobro
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// FASE 4: Moneda en modal de producto
// ══════════════════════════════════════════════════════════

// ── Rellena el selector de moneda en el modal de producto ──
function renderSelectorMonedaProducto(){
  const sel = document.getElementById('prod-moneda-precio');
  if(!sel) return;
  const habilitadas = monedasHabilitadas();
  const principal   = monedaPrincipal();
  // Valor actual (si ya tenía algo seleccionado, mantenerlo)
  const actual = sel.value || principal;
  sel.innerHTML = habilitadas.map(code => {
    const m = getMoneda(code);
    return `<option value="${code}" ${code === actual ? 'selected' : ''}>${m.pais} ${m.code}</option>`;
  }).join('');
  // Mostrar/ocultar checkbox "precio fijo" según si es moneda secundaria
  onProdMonedaChange(sel.value || principal);
}

// ── Actualiza el placeholder del precio al cambiar la moneda ──
function onProdMonedaChange(code){
  const m     = getMoneda(code);
  const input = document.getElementById('prod-price');
  if(input) input.placeholder = `0 ${m.simbolo}`;
}

// ══════════════════════════════════════════════════════════
// FIN FASE 4 lógica modal producto
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// FIN APERTURA DE CAJA
// ══════════════════════════════════════════════════════════

// Convierte una fila de la tabla "tareas" al formato interno
function mapTarea(t){
  return {
    id:          t.id,
    name:        t.name,
    desc:        t.descripcion || '',
    date:        t.date        || '',
    amount:      t.amount      || 0,
    completedAt: t.completed_at|| null,
    created:     t.created_at  || null
  };
}

// ═══ NAV ═════════════════════════════════
// ── MODIFICADO: se agrega guardia de carrito con ítems ──
function navTo(s){
  // ── LÍNEAS AGREGADAS: confirmación si hay ítems en el carrito ──
  if(s !== 'pos' && cart.length > 0){
    const totalItems = cart.reduce((acc, i) => acc + i.qty, 0);
    const ok = confirm(
      `⚠️ Tenés ${totalItems} ítem${totalItems !== 1 ? 's' : ''} en el carrito.\n\n` +
      `Si salís ahora, se perderán.\n\n¿Querés salir igualmente?`
    );
    if(!ok) return; // El usuario canceló — no navegamos
    // El usuario confirmó — limpiamos el carrito antes de salir
    cart = [];
    cartDescuento = { tipo: 'pct', valor: 0, monto: 0 };
    renderCart();
  }
  // ── FIN LÍNEAS AGREGADAS ──

  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
  const sc=document.getElementById('screen-'+s); if(sc) sc.classList.add('active');
  const ni=document.getElementById('nav-'+s); if(ni) ni.classList.add('active');
if(s==='inicio') renderInicio();
  // ── FASE 2: al entrar al POS también renderiza la barra de TC ──
  if(s==='pos'){renderPosGrid();populateClientes();renderPosTCBar();}
  if(s==='tareas') renderTareas();
  if(s==='historial') renderHistorial();
  if(s==='productos') renderProductos();
  if(s==='clientes') renderClientes();
  if(s==='gastos') renderGastos();
  if(s==='balance') renderBalance();
  if(s==='reportes') renderReportes();
  if(s==='calc') initCalc();
  if(s==='config') loadConfig();
  // ── AGREGADO ──
  if(s==='fiado') renderFiado();
  // ── AGREGADO ETAPA 4: pantalla Mi Plan ──
  if(s==='plan') { if(negocioId) renderPantallaPlan(); else showToast('Cargando datos…'); }
  // ── MODIFICADO: pantalla Movimientos llama a renderMovimientosCaja ──
  if(s==='movimientos') renderMovimientosCaja();
}

// ══════════════════════════════════════════════════════════
// PANTALLA MOVIMIENTOS — REDISEÑADA
// Muestra ventas + gastos (igual que balance-list) con filtros
// ══════════════════════════════════════════════════════════
function renderMovimientosCaja() {
  // Construir la lista combinada: ventas (ingresos) + gastos (egresos)
  const principal = monedaPrincipal();
  const q    = (document.getElementById('mov-search')?.value    || '').trim().toLowerCase();
  const tipo = (document.getElementById('mov-filtro-tipo')?.value || '');

  let all = [
    ...DB.ventas.map(v => ({
      ...v,
      _t:  'i',
      _d:  v.clienteNombre || 'Venta rápida',
      _ic: '🛒',
      _c:  'var(--green)'
    })),
    ...DB.gastos.map(g => ({
      ...g,
      _t:  'e',
      _d:  g.desc,
      _ic: '💸',
      _c:  'var(--red)'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Aplicar filtro de tipo
  if (tipo) all = all.filter(m => m._t === tipo);

  // Aplicar búsqueda de texto
  if (q) all = all.filter(m => (m._d || '').toLowerCase().includes(q));

  // Actualizar sub
  const sub = document.getElementById('movimientos-sub');
  if (sub) sub.textContent = `${all.length} movimiento${all.length !== 1 ? 's' : ''}`;

  const list = document.getElementById('balance-list');
  if (!list) return;

  if (!all.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">💰</div>
      <div class="empty-text">Sin movimientos${q ? ' para "' + q + '"' : ''} aún.</div>
    </div>`;
    return;
  }

  list.innerHTML = all.map(m => {
    const monedaBadge = (m._t === 'i' && m.moneda_cobro && m.moneda_cobro !== principal)
      ? (() => {
          const mc = getMoneda(m.moneda_cobro);
          return `<span style="
            display:inline-flex;align-items:center;gap:3px;
            margin-left:6px;padding:1px 6px;
            background:#fef9c3;color:#854d0e;
            border:1px solid #fde047;border-radius:100px;
            font-size:.65rem;font-weight:700;vertical-align:middle;">
            ${mc.pais} ${mc.code} ${fmtMonedaConCodigo(m.monto_original, m.moneda_cobro)}
          </span>`;
        })()
      : '';

    return `<div class="list-row"
        onclick="${m._t === 'i' ? `openVentaDetail(${m.id})` : `openEditGasto(${m.id})`}"
        title="${m._t === 'i' ? 'Ver detalle / eliminar venta' : 'Editar / eliminar gasto'}">
        <div class="row-icon" style="background:${m._t === 'i' ? 'var(--green-l)' : 'var(--red-l)'};">${m._ic}</div>
        <div class="row-body">
          <div class="row-name">${m._d}</div>
          <div class="row-sub">
            ${m._t === 'i' ? 'Venta' : 'Gasto'} · ${fmtDate(m.date)}${monedaBadge}
          </div>
        </div>
        <div class="row-right">
          <div class="row-amount" style="color:${m._c}">${m._t === 'i' ? '+' : '−'}${fmtMoneda(m._t === 'i' ? m.total : m.amount, principal)}</div>
          <div style="font-size:.68rem;color:var(--ink3);margin-top:3px;">
            ${m._t === 'i' ? '🔍 Ver detalle' : '✏️ Editar'}
          </div>
        </div>
      </div>`;
  }).join('');
}
  

// ══════════════════════════════════════════════════════════
// MODAL HISTORIAL TAREAS — NUEVA FUNCIÓN
// Abre el modal con todas las tareas completadas y buscador
// ══════════════════════════════════════════════════════════
function openHistorialTareasModal() {
  renderHistorialTareasModal();
  openModal('historial-tareas-overlay');
}

function renderHistorialTareasModal() {
  const lista = document.getElementById('historial-tareas-modal-list');
  const sub   = document.getElementById('historial-tareas-sub');
  if (!lista) return;

  const q = (document.getElementById('historial-tareas-search')?.value || '').trim().toLowerCase();
  const items = q
    ? DB.historial.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.desc  || '').toLowerCase().includes(q) ||
        (t.cliente || '').toLowerCase().includes(q)
      )
    : DB.historial;

  if (sub) sub.textContent = `${items.length} tarea${items.length !== 1 ? 's' : ''} completada${items.length !== 1 ? 's' : ''}`;

  if (!items.length) {
    lista.innerHTML = `<div class="empty-state" style="padding:30px 0;">
      <div class="empty-icon">✅</div>
      <div class="empty-text">${q ? 'Sin resultados para "' + q + '"' : 'No hay tareas completadas aún.'}</div>
    </div>`;
    return;
  }

  lista.innerHTML = items.map(t => {
    const fechaC = t.completedAt
      ? new Date(t.completedAt).toLocaleString('es-PY', {
          day:'2-digit', month:'2-digit', year:'2-digit',
          hour:'2-digit', minute:'2-digit', timeZone: getZonaHoraria()
        })
      : '—';
    const fechaV = t.date
      ? new Date(t.date + 'T12:00:00').toLocaleDateString('es-PY', {
          day:'2-digit', month:'2-digit', year:'numeric'
        })
      : '—';
    const cliente = t.cliente ? `<span style="font-size:.72rem;color:var(--ink3);">👤 ${t.cliente}</span>` : '';
    const monto   = t.monto   ? `<span style="font-size:.72rem;color:var(--green);font-weight:700;">💰 ${fmtGs(t.monto)}</span>` : '';
    const desc    = t.desc    ? `<div style="font-size:.78rem;color:var(--ink3);margin-top:3px;">${t.desc}</div>` : '';
    return `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:.88rem;font-weight:700;">✅ ${t.title}</div>
            ${desc}
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
              ${cliente}
              ${monto}
              ${t.date ? `<span style="font-size:.72rem;color:var(--ink3);">📅 Vencía: ${fechaV}</span>` : ''}
            </div>
          </div>
          <div style="font-size:.68rem;color:var(--ink3);white-space:nowrap;flex-shrink:0;text-align:right;">
            Completada<br>${fechaC}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ═══ MODALS ═══════════════════════════════
function closeOverlay(id,e){if(e&&e.target===document.getElementById(id))closeModal(id);}
function closeModal(id){
  const el=document.getElementById(id);
  el.classList.remove('open');
  el.style.display='none';
}
function openModal(id){
  const el=document.getElementById(id);
  el.classList.add('open');
  el.style.display='flex';
}

function openProductModal(id){
  document.getElementById('prod-edit-id').value=id||'';
  // ── AGREGADO: limpiar error de duplicado al abrir el modal ──
  clearProdError();
  // ── FASE 4: inicializar selector de moneda ──
  renderSelectorMonedaProducto();
  if(id){
    const p=DB.productos.find(x=>String(x.id)===String(id));
    document.getElementById('prod-modal-title').textContent='Editar';
    document.getElementById('prod-name').value=p.nombre;
    document.getElementById('prod-cat').value=p.cat;
    document.getElementById('prod-price').value=p.precio;
    document.getElementById('prod-stock').value=p.stock||'';
    document.getElementById('prod-costo').value=p.costo||'';
    document.getElementById('prod-codigo').value=p.codigo||'';
    // ── FASE 4: cargar moneda del producto ──
    const sel = document.getElementById('prod-moneda-precio');
    if(sel) sel.value = p.moneda_precio || monedaPrincipal();
    onProdMonedaChange(p.moneda_precio || monedaPrincipal());
    // ── FIN FASE 4 ──
    setProdType(p.tipo,document.getElementById(p.tipo==='servicio'?'pseg-serv':'pseg-prod'));
    document.getElementById('prod-stock-f').style.display='none';
  } else {
    document.getElementById('prod-modal-title').textContent='Nuevo Producto';
    ['prod-name','prod-cat','prod-price','prod-costo','prod-stock','prod-codigo'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('prod-stock-f').style.display='block';
    // ── FASE 4: resetear moneda a la principal ──
    const sel = document.getElementById('prod-moneda-precio');
    if(sel) sel.value = monedaPrincipal();
    onProdMonedaChange(monedaPrincipal());
    // ── FIN FASE 4 ──
    setProdType('producto',document.getElementById('pseg-prod'));
  }
  // ── AGREGADO: limpiar/cargar imagen en el modal ──
  const p2 = id ? DB.productos.find(x=>String(x.id)===String(id)) : null;
  cargarPreviewImagen(p2 ? (p2.imagen_url||'') : '');
  // ── FIN AGREGADO ──
  setTimeout(calcRentabilidadModal, 50);
  openModal('product-overlay');
}

// ══════════════════════════════════════════════════════════
// NUEVO: calcula rentabilidad en tiempo real dentro del modal
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// ── AGREGADO: manejo de imagen de producto ──
// ══════════════════════════════════════════════════════════
function cargarPreviewImagen(url) {
  const wrap = document.getElementById('prod-img-wrap');
  const hidden = document.getElementById('prod-imagen-url');
  if (!wrap || !hidden) return;
  hidden.value = url || '';
  if (url) {
    wrap.innerHTML = `
      <img src="${url}" style="width:100%;max-height:140px;object-fit:cover;border-radius:6px;display:block;">
      <button onclick="event.stopPropagation();quitarImagen()"
        style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.55);color:white;
               border:none;border-radius:100px;padding:3px 9px;font-size:.7rem;cursor:pointer;font-weight:700;">
        🗑 Quitar
      </button>`;
  } else {
    wrap.innerHTML = `
      <div id="prod-img-placeholder" style="text-align:center;color:var(--ink3);font-size:.8rem;padding:12px;">
        <div style="font-size:1.6rem;margin-bottom:4px;">📷</div>
        Tocá para agregar imagen
      </div>`;
  }
}

function quitarImagen() {
  document.getElementById('prod-img-input').value = '';
  cargarPreviewImagen('');
}

function handleProdImage(input) {
  const file = input.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 3 * 1024 * 1024) {
    showToast('⚠️ La imagen pesa más de 3MB. Elegí una más pequeña.');
    input.value = '';
    return;
  }
  const img = new Image();
  const reader = new FileReader();
  reader.onload = ev => {
    img.onload = () => {
      // Comprimir: máx 400×400px, calidad 0.75
      const canvas = document.createElement('canvas');
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
      else       { if (h > MAX) { w = w * MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.75);
      // Verificar tamaño final (~80KB máx)
      if (compressed.length > 120000) {
        showToast('⚠️ Imagen demasiado grande luego de comprimir. Usá una foto más simple.');
        input.value = '';
        return;
      }
      cargarPreviewImagen(compressed);
      showToast('✅ Imagen cargada y comprimida');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
// ── FIN AGREGADO imagen de producto ──
// ══════════════════════════════════════════════════════════

function calcRentabilidadModal() {
  const precio = +document.getElementById('prod-price').value || 0;
  const costo  = +document.getElementById('prod-costo').value || 0;
  const prev   = document.getElementById('prod-rentabilidad-preview');

  if (!precio || !costo) { prev.style.display = 'none'; return; }

  const ganancia = precio - costo;
  const pct      = ((ganancia / costo) * 100).toFixed(1);
  const margen   = ((ganancia / precio) * 100).toFixed(1);

  // Badge según margen
  let badge = '', badgeBg = '';
  if (margen >= 50)      { badge = '🔥 Excelente'; badgeBg = '#166534'; }
  else if (margen >= 30) { badge = '✅ Bueno';      badgeBg = '#1d4ed8'; }
  else if (margen >= 10) { badge = '⚠️ Ajustado';  badgeBg = '#92400e'; }
  else                   { badge = '🔴 Muy bajo';  badgeBg = '#991b1b'; }

  document.getElementById('prp-gan').textContent = fmtGs(ganancia);
  document.getElementById('prp-pct').textContent = `${pct}% sobre costo · ${margen}% de margen`;
  document.getElementById('prp-badge').textContent = badge;
  document.getElementById('prp-badge').style.background = badgeBg;
  prev.style.display = 'flex';
}
// ══════════════════════════════════════════════════════════
// FIN calcRentabilidadModal
// ══════════════════════════════════════════════════════════
function openTaskModal(){
  document.getElementById('task-edit-id').value='';
  ['task-name','task-desc','task-amount'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('task-date').value=new Date().toISOString().split('T')[0];
  openModal('task-overlay');
}
function openGastoModal(){
  ['gasto-desc','gasto-amount'].forEach(f=>document.getElementById(f).value='');
  openModal('gasto-overlay');
}
// ══════════════════════════════════════════════════════════
// openClientModal — MODIFICADO: ahora acepta id para editar
// LÍNEAS CAMBIADAS: se agregó parámetro id y carga de datos
// ══════════════════════════════════════════════════════════
function openClientModal(id) {
  // Limpiar siempre primero
  // ══ LÍNEA MODIFICADA: se agregó client-direccion al limpiar ══
  ['client-name','client-phone','client-doc','client-notes','client-direccion'].forEach(f=>document.getElementById(f).value='');
  // ══ FIN LÍNEA MODIFICADA ══
  document.getElementById('client-edit-id').value = '';

  // ── LÍNEAS AGREGADAS: si hay id, cargar datos del cliente ──
  if (id) {
    const c = DB.clientes.find(x => x.id === id);
    if (c) {
      document.getElementById('client-edit-id').value       = c.id;
      document.getElementById('client-name').value          = c.nombre     || '';
      document.getElementById('client-phone').value         = c.phone      || '';
      document.getElementById('client-doc').value           = c.doc        || '';
      document.getElementById('client-notes').value         = c.notes      || '';
      // ══ LÍNEA AGREGADA: cargar dirección al editar ══
      document.getElementById('client-direccion').value     = c.direccion  || '';
      // ══ FIN LÍNEA AGREGADA ══
      // Cambiar título del modal a "Editar Cliente"
      document.querySelector('#client-overlay .modal-title').textContent = 'Editar Cliente';
    }
  } else {
    document.querySelector('#client-overlay .modal-title').textContent = 'Nuevo Cliente';
  }
  // ── FIN LÍNEAS AGREGADAS ──

  openModal('client-overlay');
}
// ══════════════════════════════════════════════════════════
// FIN openClientModal MODIFICADO ▲▲▲
// ══════════════════════════════════════════════════════════

// ═══ SIDE PANEL ════════════════════════════
function openSidePanel(taskId){
  const t=DB.tareas.find(x=>x.id===taskId); if(!t) return;
  const ov=t.date&&new Date(t.date+'T23:59:59')<new Date();
  document.getElementById('side-content').innerHTML=`
    <div style="margin-bottom:16px;">
      <div style="font-size:1.2rem;font-weight:800;margin-bottom:10px;">${t.name}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span class="tag ${ov?'tag-red':'tag-blue'}">📅 ${fmtDate(t.date)}</span>
        ${t.amount?`<span class="tag tag-green">💰 ${fmtGs(t.amount)}</span>`:''}
        ${ov?'<span class="tag tag-red">⚠️ Vencida</span>':'<span class="tag tag-amber">⏳ Pendiente</span>'}
      </div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3);margin-bottom:8px;">Descripción</div>
      <div style="font-size:.88rem;line-height:1.7;color:var(--ink2);">${t.desc||'<em style="color:var(--ink3)">Sin descripción.</em>'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn btn-green" onclick="completeTask(${t.id});closeSidePanel()">✓ Marcar como completada</button>
      <button class="btn btn-ghost" onclick="editFromPanel(${t.id})">✏️ Editar</button>
      <button class="btn btn-danger" onclick="deleteTask(${t.id});closeSidePanel()">🗑 Eliminar</button>
    </div>`;
  document.getElementById('side-panel').classList.add('open');
  document.getElementById('side-overlay').classList.add('open');
}
function closeSidePanel(){
  document.getElementById('side-panel').classList.remove('open');
  document.getElementById('side-overlay').classList.remove('open');
}
function editFromPanel(id){
  closeSidePanel();
  const t=DB.tareas.find(x=>x.id===id); if(!t) return;
  document.getElementById('task-edit-id').value=id;
  document.getElementById('task-name').value=t.name;
  document.getElementById('task-desc').value=t.desc||'';
  document.getElementById('task-date').value=t.date;
  document.getElementById('task-amount').value=t.amount||'';
  openModal('task-overlay');
}

// ═══ SAVES ═════════════════════════════════
// ══ MODIFICADO: setProdType ya no muestra stock-f si estamos editando un producto existente ══
function setProdType(type,btn){
  prodModalType=type;
  document.querySelectorAll('#product-overlay .seg-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // Si estamos editando (hay un ID cargado), el campo de stock inicial NUNCA se muestra
  const editId = document.getElementById('prod-edit-id').value;
  if(editId){
    document.getElementById('prod-stock-f').style.display='none';
  } else {
    document.getElementById('prod-stock-f').style.display=type==='servicio'?'none':'block';
  }
}
// ══════════════════════════════════════════════════════════
// MODIFICADO: validación anti-duplicados por nombre y código
// ── LÍNEAS AGREGADAS: bloque de verificación duplicados ──
// ══════════════════════════════════════════════════════════
async function saveProduct(){
  const name=document.getElementById('prod-name').value.trim();
  if(!name){showToast('Ingresá un nombre');return;}
  const cat=document.getElementById('prod-cat').value.trim()||'General';
  const price=+document.getElementById('prod-price').value||0;
  const stock=prodModalType==='servicio'?null:(+document.getElementById('prod-stock').value||0);
  // ══ MODIFICADO: emoji eliminado de la UI, se guarda vacío ══
  const emoji = '';
  const costo=+document.getElementById('prod-costo').value||0;
  const codigo=document.getElementById('prod-codigo').value.trim()||null;
  // ── FASE 4: leer moneda del producto ──
  const monedaPrecio = document.getElementById('prod-moneda-precio')?.value || monedaPrincipal();
  // ── FIN FASE 4 ──
  const editId=+document.getElementById('prod-edit-id').value;

  // ══════════════════════════════════════════════════════
  // MODIFICADO: validación anti-duplicados con mensaje
  // visible dentro del modal (no solo toast efímero).
  // ── LÍNEAS MODIFICADAS: showToast → showProdError ──
  // ══════════════════════════════════════════════════════
  const nombreNorm = name.toLowerCase().trim();
  const codigoNorm = codigo ? codigo.toLowerCase().trim() : null;

  const otrosProductos = DB.productos.filter(p => p.id !== editId);

  const duplicadoNombre = otrosProductos.find(p =>
    p.nombre && p.nombre.toLowerCase().trim() === nombreNorm
  );
  const duplicadoCodigo = codigoNorm
    ? otrosProductos.find(p => p.codigo && p.codigo.toLowerCase().trim() === codigoNorm)
    : null;

  if(duplicadoNombre){
    // ── AGREGADO: mostrar error en modal ──
    showProdError(`⚠️ El nombre "${duplicadoNombre.nombre}" ya existe en el inventario. Usá un nombre diferente.`);
    return;
  }
  if(duplicadoCodigo){
    // ── AGREGADO: mostrar error en modal ──
    showProdError(`⚠️ El código "${codigo}" ya lo usa el producto "${duplicadoCodigo.nombre}". Usá otro código.`);
    return;
  }
  // ── AGREGADO: limpiar error si todo está bien ──
  clearProdError();
  // ── FIN MODIFICADO: validación anti-duplicados ──

  // ── AGREGADO: leer imagen del campo oculto ──
  const imagen_url = document.getElementById('prod-imagen-url').value || null;
  // ── FIN AGREGADO ──
  const row={nombre:name,cat,tipo:prodModalType,precio:price,stock,emoji,costo,codigo,
    moneda_precio: monedaPrecio,
    imagen_url                          // ── AGREGADO ──
  };
  try{
    if(editId){
      const {error}=await sb.from('productos').update(row).eq('id',editId);
      if(error) throw error;
      Object.assign(DB.productos.find(x=>x.id===editId),row);
    } else {
      // ── MODIFICADO ETAPA 3A: se agrega negocio_id al INSERT ──
      const {data,error}=await sb.from('productos').insert({...row, negocio_id: negocioId}).select().single();
      // ── FIN MODIFICADO 3A ──
      if(error) throw error;
      DB.productos.push(data);
    }
    closeModal('product-overlay');
    renderProductos(); renderPosGrid();
    showToast(editId?'Producto actualizado ✓':'Producto agregado ✓');
  } catch(e){console.error(e);showToast('⚠️ Error al guardar producto');}
}
// ══════════════════════════════════════════════════════════
// FIN MODIFICADO: validación anti-duplicados
// ══════════════════════════════════════════════════════════
async function saveTask(){
  const name=document.getElementById('task-name').value.trim();
  if(!name){showToast('Ingresá un título');return;}
  const descripcion=document.getElementById('task-desc').value.trim();
  const date=document.getElementById('task-date').value;
  const amount=+document.getElementById('task-amount').value||0;
  const editId=+document.getElementById('task-edit-id').value;
  const row={name,descripcion,date,amount};
  try{
    if(editId){
      const {error}=await sb.from('tareas').update(row).eq('id',editId);
      if(error) throw error;
      Object.assign(DB.tareas.find(x=>x.id===editId),{name,desc:descripcion,date,amount});
    } else {
      // ── MODIFICADO ETAPA 3C: se agrega negocio_id al INSERT ──
      const {data,error}=await sb.from('tareas').insert({...row,completada:false, negocio_id: negocioId}).select().single();
      // ── FIN MODIFICADO 3C ──
      if(error) throw error;
      DB.tareas.push(mapTarea(data));
    }
    closeModal('task-overlay');
    renderTareas(); updateBadge(); renderInicio();
    showToast(editId?'Tarea actualizada ✓':'Tarea guardada ✓');
  } catch(e){console.error(e);showToast('⚠️ Error al guardar tarea');}
}
async function saveGasto(){
  const descripcion=document.getElementById('gasto-desc').value.trim();
  const amount=+document.getElementById('gasto-amount').value||0;
  if(!descripcion||!amount){showToast('Completá los datos');return;}
  const cat=document.getElementById('gasto-cat').value;
  try{
    // ── MODIFICADO ETAPA 3B: se agrega negocio_id al INSERT ──
    const {data,error}=await sb.from('gastos').insert({descripcion,cat,amount, negocio_id: negocioId}).select().single();
    // ── FIN MODIFICADO 3B ──
    if(error) throw error;
    // Adaptar columna "descripcion" al campo "desc" que usa el resto del código
    DB.gastos.unshift({...data,desc:data.descripcion});
    closeModal('gasto-overlay');
    renderInicio(); renderBalance(); renderGastos();
    showToast('Gasto registrado');
  } catch(e){console.error(e);showToast('⚠️ Error al guardar gasto');}
}
// ══════════════════════════════════════════════════════════
// saveClient — MODIFICADO: soporta INSERT y UPDATE
// LÍNEAS CAMBIADAS: se agregó lógica de editId para UPDATE
// ══════════════════════════════════════════════════════════
async function saveClient(){
  const nombre=document.getElementById('client-name').value.trim();
  if(!nombre){showToast('Ingresá un nombre');return;}
  const cols=['#7C3AED','#16A34A','#2563EB','#D97706','#DC2626'];

  // ── LÍNEA AGREGADA: leer el id oculto ──
  const editId = +document.getElementById('client-edit-id').value || 0;
  // ── FIN LÍNEA AGREGADA ──

  const row={
    nombre,
    phone:     document.getElementById('client-phone').value.trim(),
    doc:       document.getElementById('client-doc').value.trim(),
    notes:     document.getElementById('client-notes').value.trim(),
    // ══ LÍNEA AGREGADA: guardar dirección ══
    direccion: document.getElementById('client-direccion').value.trim(),
    // ══ FIN LÍNEA AGREGADA ══
  };

  try{
    // ── LÍNEAS AGREGADAS: bifurcación INSERT vs UPDATE ──
    if (editId) {
      // Modo edición: UPDATE en Supabase
      const {error} = await sb.from('clientes').update(row).eq('id', editId);
      if(error) throw error;
      // Actualizar caché local
      Object.assign(DB.clientes.find(x => x.id === editId), row);
      closeModal('client-overlay');
      renderClientes(); populateClientes();
      showToast('Cliente actualizado ✓');
    } else {
      // Modo nuevo: INSERT en Supabase (conserva color aleatorio)
      row.color = cols[Math.floor(Math.random()*cols.length)];
      const {data,error}=await sb.from('clientes').insert({...row, negocio_id: negocioId}).select().single();
      if(error) throw error;
      DB.clientes.push(data);
      closeModal('client-overlay');
      renderClientes(); populateClientes();
      showToast('Cliente guardado ✓');
    }
    // ── FIN LÍNEAS AGREGADAS ──
  } catch(e){console.error(e);showToast('⚠️ Error al guardar cliente');}
}
// ══════════════════════════════════════════════════════════
// FIN saveClient MODIFICADO ▲▲▲
// ══════════════════════════════════════════════════════════

async function completeTask(id){
  const idx=DB.tareas.findIndex(t=>t.id===id); if(idx<0) return;
  const now=new Date().toISOString();
  try{
    const {error}=await sb.from('tareas').update({completada:true,completed_at:now}).eq('id',id);
    if(error) throw error;
    const t=DB.tareas.splice(idx,1)[0];
    t.completedAt=now;
    DB.historial.unshift(t);
    renderTareas(); renderHistorial(); renderInicio(); updateBadge();
    showToast('¡Tarea completada! 🎉');
  } catch(e){console.error(e);showToast('⚠️ Error al completar tarea');}
}
async function deleteTask(id){
  try{
    const {error}=await sb.from('tareas').delete().eq('id',id);
    if(error) throw error;
    DB.tareas=DB.tareas.filter(t=>t.id!==id);
    renderTareas(); updateBadge();
    showToast('Tarea eliminada');
  } catch(e){console.error(e);showToast('⚠️ Error al eliminar tarea');}
}
function updateBadge(){
  const b=document.getElementById('nb-tareas'),c=DB.tareas.length;
  b.textContent=c; b.style.display=c>0?'':'none';
}

// ══════════════════════════════════════════════════════════
// BÚSQUEDA POR CÓDIGO EN POS — BLOQUE NUEVO ▼▼▼
// ══════════════════════════════════════════════════════════

// ── AGREGADO: Enter en el buscador POS dispara búsqueda por código exacto ──
function posSearchKeydown(event) {
  if (event.key !== 'Enter') return;
  const q = (document.getElementById('pos-search').value || '').trim().toLowerCase();
  if (!q) return;

  // Buscar coincidencia exacta de código primero
  const porCodigo = DB.productos.find(p =>
    p.codigo && p.codigo.toLowerCase() === q
  );

  if (porCodigo) {
    const oos = porCodigo.tipo === 'producto' && porCodigo.stock === 0;
    if (oos) {
      showToast(`⚠️ "${porCodigo.nombre}" sin stock`);
    } else {
      addToCart(porCodigo.id);
      // ── AGREGADO: limpiar el campo después de agregar ──
      document.getElementById('pos-search').value = '';
      renderPosGrid();
      showToast(`✓ ${porCodigo.nombre} agregado`);
    }
    return;
  }

  // Si no hay código exacto, verificar si hay un solo resultado por nombre
  const resultados = DB.productos.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.codigo && p.codigo.toLowerCase().includes(q))
  );

  if (resultados.length === 1) {
    const p = resultados[0];
    const oos = p.tipo === 'producto' && p.stock === 0;
    if (oos) {
      showToast(`⚠️ "${p.nombre}" sin stock`);
    } else {
      addToCart(p.id);
      document.getElementById('pos-search').value = '';
      renderPosGrid();
      showToast(`✓ ${p.nombre} agregado`);
    }
  }
  // Si hay 0 o múltiples resultados, el grid ya los muestra — no hace nada extra
}

// ══════════════════════════════════════════════════════════
// FIN BÚSQUEDA POR CÓDIGO EN POS ▲▲▲
// ══════════════════════════════════════════════════════════

// ═══ POS ═══════════════════════════════════
function populateClientes(){
  const sel=document.getElementById('cart-cliente');
  sel.innerHTML='<option value="">Sin cliente</option>'+DB.clientes.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');
}
// ══════════════════════════════════════════════════════════
// MODIFICADO: renderPosGrid — ordena por más vendidos ▼▼▼
// ══════════════════════════════════════════════════════════
function renderPosGrid(){
  const q=(document.getElementById('pos-search').value||'').toLowerCase().trim();
  const cats=['Todo',...new Set(DB.productos.map(p=>p.cat))];
  const pillsEl=document.getElementById('pos-cat-pills');
  const ac=pillsEl.querySelector('.cat-pill.active')?.textContent||'Todo';
  pillsEl.innerHTML=cats.map(c=>`<div class="cat-pill${c===ac?' active':''}" onclick="filterCat('${c}',this)">${c}</div>`).join('');

  // ══ AGREGADO: mapa de popularidad — suma unidades vendidas por producto ══
  const popularity = {};
  DB.ventas.forEach(v => {
    (v.items || []).forEach(item => {
      popularity[item.id] = (popularity[item.id] || 0) + (item.qty || 1);
    });
  });

  // ══ Sin cambios: filtrar por categoría y búsqueda ══
  const filtered=DB.productos.filter(p=>{
    const matchCat = ac==='Todo' || p.cat===ac;
    if(!q) return matchCat;
    const matchNombre = p.nombre.toLowerCase().includes(q);
    const matchCat2   = (p.cat||'').toLowerCase().includes(q);
    const matchCodigo = p.codigo && p.codigo.toLowerCase().includes(q);
    return matchCat && (matchNombre || matchCat2 || matchCodigo);
  });

  // ══ AGREGADO: ordenar por más vendidos (solo cuando no hay búsqueda activa) ══
  if(!q){
    filtered.sort((a, b) => (popularity[b.id] || 0) - (popularity[a.id] || 0));
  }

  // ══ AGREGADO: calcular el máximo para el badge 🔥 TOP ══
  const maxPop = Object.values(popularity).length ? Math.max(...Object.values(popularity)) : 0;

  document.getElementById('pos-grid').innerHTML=filtered.length?filtered.map(p=>{
    const ic=cart.find(c=>c.id===p.id),oos=p.tipo==='producto'&&p.stock===0;
    const codigoBadge = p.codigo
      ? `<div class="pi-codigo">🏷️ ${p.codigo}</div>`
      : '';
    // ══ AGREGADO: badge naranja solo para el producto #1 más vendido ══
    const topBadge = (popularity[p.id] && popularity[p.id] === maxPop)
      ? `<div style="position:absolute;top:4px;right:4px;background:#f97316;color:white;font-size:.55rem;font-weight:800;padding:2px 5px;border-radius:4px;">🔥 TOP</div>`
      : '';
    // ── MODIFICADO: imagen del producto en POS, con fallback a emoji ──
    const posImg = p.imagen_url
      ? `<div style="width:100%;height:80px;border-radius:8px;overflow:hidden;margin-bottom:8px;flex-shrink:0;">
           <img src="${p.imagen_url}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">
         </div>`
      : `<span class="pi-icon">${p.tipo==='servicio'?'🛠️':'📦'}</span>`;
    // ── FIN MODIFICADO ──
    return `<div class="pos-item${p.tipo==='servicio'?' service':''}" onclick="${oos?'showToast(\'Sin stock\')':'addToCart('+p.id+')'}" style="${oos?'opacity:.5;cursor:not-allowed':''}position:relative;">
      ${topBadge}
      ${posImg}
      <div class="pi-name">${p.nombre}</div>
      ${codigoBadge}
      <div class="pi-price">${fmtPrecioProducto(p)}</div>
      ${p.tipo==='producto'?`<div class="pi-stock">${oos?'<span style="color:var(--red);font-weight:700;">Sin stock</span>':p.stock<=2?`<span style="font-weight:700;color:#991B1B;">⚠️ Stock: ${p.stock}</span>`:p.stock<=4?`<span style="font-weight:700;color:#92400E;">⚠️ Stock: ${p.stock}</span>`:`<span style="color:var(--ink3);">Stock: ${p.stock}</span>`}</div>`:`<div style="margin-top:4px;"><span class="tag tag-purple" style="font-size:.62rem;">Servicio</span></div>`}
      ${ic?`<div class="cart-badge">${ic.qty}</div>`:''}
    </div>`;
  }).join(''):`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-text">Sin resultados</div></div>`;
}
// ══════════════════════════════════════════════════════════
// FIN MODIFICADO renderPosGrid ▲▲▲
// ══════════════════════════════════════════════════════════
function filterCat(cat,el){
  document.querySelectorAll('.cat-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active'); renderPosGrid();
}
// ── FASE 4: formatea el precio del producto en su moneda propia ──
// Si tiene precio fijo en moneda secundaria, lo muestra en esa moneda
// Si NO es precio fijo, muestra la equivalencia en moneda principal también
function fmtPrecioProducto(p){
  const principal = monedaPrincipal();
  const mProd     = p.moneda_precio || principal;
  if(mProd === principal){
    return fmtMoneda(p.precio, principal);
  }
  // Precio en moneda secundaria — usar fmtMonedaConCodigo para evitar ambigüedad
  const m  = getMoneda(mProd);
  const tc = getTipoCambio(mProd);
  // Todos los precios se convierten al TC del día — precio_fijo eliminado
  const equiv = tc > 0 ? convertirAMonedaPrincipal(p.precio, mProd) : 0;
  return `<span style="font-weight:800;">${fmtMonedaConCodigo(p.precio, mProd)}</span>
    ${equiv > 0
      ? `<span style="font-size:.65rem;color:var(--ink3);display:block;">≈ ${fmtMoneda(equiv, principal)}</span>`
      : ''}`;
}

function addToCart(id){
  const p   = DB.productos.find(x=>x.id===id);
  const ex  = cart.find(c=>c.id===id);
  const principal = monedaPrincipal();
  const mProd     = p.moneda_precio || principal;
  const tc        = getTipoCambio(mProd);

  // ── FASE 4: calcular precio en moneda principal para el carrito ──
  // Si el precio está en moneda principal o es precio fijo en secundaria
  // que se cobra en esa misma moneda → se usa el precio tal cual
  // Si NO es precio fijo → convertir a moneda principal para que
  // el total del carrito siempre sume en moneda principal
  let precioCarrito;
  if(mProd === principal){
    precioCarrito = p.precio;
  } else {
    // Precio en moneda secundaria: convierte al TC actual
    precioCarrito = tc > 0 ? convertirAMonedaPrincipal(p.precio, mProd) : p.precio;
  }

  if(ex){
    ex.qty++;
  } else {
    cart.push({
      id,
      nombre:         p.nombre,
      precio:         precioCarrito,
      precioOriginal: p.precio,           // ← precio como fue cargado
      monedaPrecio:   mProd,              // ← moneda original del producto
      precioFijo:     p.precio_fijo||false,
      qty:            1,
      tipo:           p.tipo,
      emoji:          p.emoji||'📦'
    });
  }
  renderCart(); renderPosGrid();
}
// ── FIN FASE 4 addToCart ──
// ── MODIFICADO: renderCart ahora muestra subtotal, descuento y total final ──
function renderCart(){
  const subtotal=cart.reduce((s,c)=>s+c.precio*c.qty,0);
  const count=cart.reduce((s,c)=>s+c.qty,0);

  // Recalcular monto de descuento según tipo
  if(cartDescuento.valor>0){
    if(cartDescuento.tipo==='pct'){
      cartDescuento.monto=Math.round(subtotal*(cartDescuento.valor/100));
    } else {
      cartDescuento.monto=Math.min(cartDescuento.valor, subtotal); // no puede ser mayor al subtotal
    }
  } else {
    cartDescuento.monto=0;
  }

  const total=subtotal-cartDescuento.monto;

  document.getElementById('cart-count-lbl').textContent=count>0?`(${count} ítem${count!==1?'s':''})`:'' ;
  document.getElementById('cart-subtotal').textContent=fmtGs(subtotal);
  document.getElementById('cart-total').textContent=fmtGs(total);
  // ── AGREGADO: actualizar chip sticky del total en móvil ──
  const stickyVal = document.getElementById('cart-total-sticky-val');
  if(stickyVal) stickyVal.textContent = fmtGs(total);

  // ── AGREGADO: mostrar o esconder bloque de descuento ──
  const wrap=document.getElementById('cart-descuento-wrap');
  if(cartDescuento.monto>0){
    wrap.style.display='block';
    const label=cartDescuento.tipo==='pct'
      ? `Descuento ${cartDescuento.valor}%`
      : `Descuento fijo`;
    document.getElementById('cart-desc-label').textContent=label;
    document.getElementById('cart-desc-monto').textContent=`−${fmtGs(cartDescuento.monto)}`;
  } else {
    wrap.style.display='none';
  }

// ── FASE 3: actualizar pills de moneda y equivalente al re-renderizar carrito ──
  renderCobroMonedaPills();
  actualizarEquivalente();

  const el=document.getElementById('cart-items');
  if(!cart.length){el.innerHTML=`<div class="empty-state" style="padding:40px 0"><div class="empty-icon">🛒</div><div class="empty-text">Carrito vacío.</div></div>`;return;}
  // ── MODIFICADO: cada ítem del carrito tiene campo de precio editable por negociación ──
  el.innerHTML=cart.map(item=>`<div class="cart-item" style="flex-wrap:wrap;gap:4px;">
    <span style="font-size:1.1rem;">${item.emoji}</span>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:700;font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nombre}</div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:3px;">
        <span style="font-size:.68rem;color:var(--ink3);white-space:nowrap;">Precio:</span>
        <input
          type="number"
          value="${item.precio}"
          min="0"
          onchange="updateItemPrice(${item.id}, this.value)"
          onclick="this.select()"
          style="width:90px;padding:3px 6px;border:1.5px solid var(--border);border-radius:6px;font-family:var(--font);font-size:.8rem;font-weight:700;background:var(--bg);outline:none;color:var(--ink1);"
          title="Precio negociado"
        >
        ${item.precioOriginal && item.precio !== item.precioOriginal
          ? `<span style="font-size:.62rem;color:var(--red);text-decoration:line-through;white-space:nowrap;">${fmtGs(item.precioOriginal)}</span>`
          : ''}
      </div>
    </div>
    <div class="qty-ctrl"><div class="qty-btn" onclick="changeQty(${item.id},-1)">−</div><div class="qty-num">${item.qty}</div><div class="qty-btn" onclick="changeQty(${item.id},1)">+</div></div>
    <div style="font-weight:800;font-size:.88rem;margin-left:4px;min-width:70px;text-align:right;">${fmtGs(item.precio*item.qty)}</div>
  </div>`).join('');
  // ── FIN MODIFICADO ──
}

// ── AGREGADO: actualizar precio de un ítem del carrito por negociación ──
function updateItemPrice(id, newVal){
  const item = cart.find(c => c.id === id);
  if(!item) return;
  const nuevoPrecio = Math.max(0, parseInt(newVal) || 0);
  // Guardar el precio original la primera vez que se edita
  if(item.precioOriginal === undefined) item.precioOriginal = item.precio;
  // Si vuelven al precio original, limpiar la marca
  if(nuevoPrecio === item.precioOriginal) delete item.precioOriginal;
  item.precio = nuevoPrecio;
  renderCart();
  showToast(`✏️ Precio de "${item.nombre}" → ${fmtGs(nuevoPrecio)}`);
}
// ── FIN AGREGADO ──

// ── AGREGADO: preview en tiempo real mientras escribís el valor ──
function previewDescuento(){
  const tipo=document.getElementById('cart-desc-tipo').value;
  const val=parseFloat(document.getElementById('cart-desc-val').value)||0;
  // Validación suave: pct no puede superar 100
  if(tipo==='pct' && val>100) document.getElementById('cart-desc-val').value=100;
  cartDescuento={tipo, valor: Math.max(0, val), monto: 0};
  renderCart();
}

// ── AGREGADO: confirmar y aplicar el descuento ──
// ── AGREGADO: mostrar/ocultar panel de descuento ──
function toggleDescuentoPanel(){
  const wrap = document.getElementById('cart-descuento-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
}

function aplicarDescuento(){
  const tipo=document.getElementById('cart-desc-tipo').value;
  const val=parseFloat(document.getElementById('cart-desc-val').value)||0;
  if(!cart.length){showToast('Agregá productos primero');return;}
  if(val<=0){showToast('Ingresá un valor mayor a 0');return;}
  if(tipo==='pct' && val>100){showToast('El porcentaje no puede superar 100%');return;}
  const subtotal=cart.reduce((s,c)=>s+c.precio*c.qty,0);
  if(tipo==='fijo' && val>=subtotal){showToast('El descuento no puede ser mayor o igual al total');return;}
  cartDescuento={tipo, valor:val, monto:0};
  renderCart();
  const label=tipo==='pct'?`${val}% de descuento`:`Gs ${val.toLocaleString()} de descuento`;
  showToast(`🏷️ ${label} aplicado`);
}

// ── AGREGADO: quitar descuento ──
function quitarDescuento(){
  cartDescuento={tipo:'pct', valor:0, monto:0};
  document.getElementById('cart-desc-val').value='';
  document.getElementById('cart-descuento-wrap').style.display='none';
  renderCart();
  showToast('Descuento eliminado');
}
function changeQty(id,d){
  const i=cart.find(c=>c.id===id); if(!i) return;
  i.qty=Math.max(0,i.qty+d);
  if(i.qty===0) cart=cart.filter(c=>c.id!==id);
  renderCart(); renderPosGrid();
}
async function finalizarVenta(){
  // ── NUEVO: bloquear venta si no hay caja abierta ──
  if(!turnoActual){
    showToast('🔴 Abrí la caja antes de registrar ventas');
    document.getElementById('caja-apertura-overlay').classList.add('open');
    setTimeout(()=>document.getElementById('caja-monto-inicial').focus(),200);
    return;
  }
  if(!cart.length){showToast('Carrito vacío');return;}
  // ── MODIFICADO: el total ya descuenta el descuento aplicado ──
  const subtotal=cart.reduce((s,c)=>s+c.precio*c.qty,0);
  const total=subtotal-cartDescuento.monto;
  const clienteId=+document.getElementById('cart-cliente').value||null;
  const pago=document.getElementById('cart-pago').value;
  const cliente=clienteId?DB.clientes.find(c=>c.id===clienteId):null;
  // ── FASE 3: datos de moneda de cobro ──
  const principal       = monedaPrincipal();
  const codeCobro       = monedaCobro || principal;
  const tcUsado         = codeCobro === principal ? 1 : (getTipoCambio(codeCobro) || 1);
  const montoOriginal   = codeCobro === principal ? total : convertirDesdeMonedaPrincipal(total, codeCobro);
  // ── FIN FASE 3 ──
try{
    console.log('PASO 1: insertando venta...');
    // 1. Insertar cabecera de venta
    // ── MODIFICADO: se agrega descuento_monto y descuento_tipo a la venta ──
    // ── MODIFICADO: se agrega lectura y guardado del campo nota ──
    const notaVenta = document.getElementById('cart-nota').value.trim();
    const {data:venta,error:ve}=await sb.from('ventas').insert({
      total,
      subtotal,
      descuento_monto:  cartDescuento.monto||0,
      descuento_tipo:   cartDescuento.monto>0 ? cartDescuento.tipo : null,
      descuento_valor:  cartDescuento.monto>0 ? cartDescuento.valor: null,
      cliente_id:       clienteId||null,
      cliente_nombre:   cliente?.nombre||null,
      pago,
      num:              DB.ventas.length+1,
      nota:             notaVenta || null,
      negocio_id:       negocioId,
      // ── FASE 3: guardar moneda, TC y monto original ──
      moneda_cobro:     codeCobro,
      tc_usado:         tcUsado,
      monto_original:   montoOriginal
      // ── FIN FASE 3 ──
    }).select().single();
    // ── FIN MODIFICADO ──
    if(ve) throw ve;
    console.log('PASO 1 OK:', venta);

    console.log('PASO 2: insertando items...');
    // 2. Insertar items de la venta
    // ── MODIFICADO ETAPA 3B: se agrega negocio_id a cada ítem ──
    const items=cart.map(item=>({
      venta_id:   venta.id,
      producto_id:item.id,
      nombre:     item.nombre,
      precio:     item.precio,
      qty:        item.qty,
      emoji:      item.emoji||'📦',
      negocio_id: negocioId
    }));
    // ── FIN MODIFICADO 3B ──
    const {error:ie}=await sb.from('venta_items').insert(items);
    if(ie) throw ie;
    console.log('PASO 2 OK');

    console.log('PASO 3: descontando stock...');
    // 3. Descontar stock en Supabase
    for(const item of cart){
      const p=DB.productos.find(x=>x.id===item.id);
      if(p&&p.tipo==='producto'&&p.stock!==null){
        const nuevoStock=Math.max(0,p.stock-item.qty);
        await sb.from('productos').update({stock:nuevoStock}).eq('id',p.id);
        p.stock=nuevoStock;
      }
    }
    console.log('PASO 3 OK');

// 4. Si el pago es Cuenta corriente, registrar la deuda
    // ── AGREGADO: crear entrada en cuentas_corrientes ──
    if(pago === 'Cuenta corriente'){
      // ── AGREGADO: leer fecha de vencimiento del campo del carrito ──
      const fvInput = document.getElementById('cc-fecha-vencimiento-pos');
      const fechaVenc = fvInput && fvInput.value ? fvInput.value : null;
      // ── FIN AGREGADO ──

      // ── MODIFICADO ETAPA 3B: se agrega negocio_id a la cuenta corriente ──
      const {data:cc, error:cce} = await sb.from('cuentas_corrientes').insert({
        venta_id:          venta.id,
        cliente_id:        clienteId || null,
        cliente_nombre:    cliente?.nombre || 'Cliente sin nombre',
        monto_original:    total,
        monto_pagado:      0,
        estado:            'pendiente',
        fecha_vencimiento: fechaVenc,
        negocio_id:        negocioId
      }).select().single();
      // ── FIN MODIFICADO 3B ──
      if(cce) console.error('Error creando cuenta corriente:', cce);
      else DB.cuentasCorrientes.unshift(cc);
      // ── AGREGADO: limpiar el campo después de la venta ──
      if(fvInput) fvInput.value = '';
      updateBadgeFiado();
    }
    // ── FIN AGREGADO ──

    // 5. Actualizar caché local
    const ventaLocal={
      ...venta,
      clienteId, clienteNombre:cliente?.nombre||null,
      items:[...cart]
    };
    DB.ventas.unshift(ventaLocal);
    lastVenta=ventaLocal;
    // ── MODIFICADO: limpiar también el descuento al finalizar venta ──
// ── MODIFICADO: se agrega limpieza del campo nota ──
cart=[]; cartDescuento={tipo:'pct', valor:0, monto:0};
monedaCobro = null; // ── FASE 3: resetear moneda de cobro ──
document.getElementById('cart-desc-val').value='';
document.getElementById('cart-nota').value='';
renderCart(); renderPosGrid(); renderInicio();

const ap=DB.config.autoprint;
    console.log('autoprint:', ap); // LOG TEMPORAL
    if(ap==='si'){showToast('¡Venta registrada! Imprimiendo…');setTimeout(doPrint,400);}
    else if(ap==='preguntar'){
      document.getElementById('print-resumen').textContent=
        `${ventaLocal.items.length} ítem${ventaLocal.items.length!==1?'s':''} · Total: ${fmtGs(ventaLocal.total)} · ${ventaLocal.pago}`;
      openModal('print-overlay');
    } else showToast('¡Venta registrada! 💰');

  } catch(e){console.error(e);showToast('⚠️ Error al registrar la venta');}
}

// ═══ PRINTING ══════════════════════════════
function doPrint(){
  closeModal('print-overlay');
  if(!lastVenta){showToast('No hay venta para imprimir');return;}
  const cfg=DB.config,imp=cfg.impresora||'termica';
  const narrow=imp==='termica'||imp==='termica58';
  // ── MODIFICADO: multifunción/láser usan A5 (148mm) en vez de A4 ──
  const w=imp==='termica58'?'58mm':imp==='termica'?'80mm':'148mm';
  const copies=parseInt(cfg.copias)||1;
  const logoHtml=cfg.logoDataUrl?`<img src="${cfg.logoDataUrl}" style="max-width:${narrow?'55px':'70px'};max-height:${narrow?'55px':'70px'};display:block;margin:0 auto ${narrow?'6':'10'}px;" alt="">`:'';
  const ls=narrow?'border-top:1px dashed #000;margin:6px 0;':'border-top:1px solid #ccc;margin:10px 0;';
  const fs=narrow?'11px':'13px';

  let itemsRows='';
  lastVenta.items.forEach(item=>{
    if(narrow){
      itemsRows+=`<tr><td colspan="2" style="font-weight:bold;padding:3px 0;">${item.emoji} ${item.nombre}</td></tr>
        <tr><td style="color:#555;padding:0 0 4px;">  x${item.qty} × ${fmtGs(item.precio)}</td><td style="text-align:right;font-weight:bold;padding:0 0 4px;">${fmtGs(item.precio*item.qty)}</td></tr>`;
    } else {
      itemsRows+=`<tr><td style="padding:5px 4px;">${item.emoji} ${item.nombre}</td><td style="text-align:center;padding:5px 4px;">${item.qty}</td><td style="text-align:right;padding:5px 4px;">${fmtGs(item.precio)}</td><td style="text-align:right;font-weight:bold;padding:5px 4px;">${fmtGs(item.precio*item.qty)}</td></tr>`;
    }
  });

  let body='';
  for(let c=0;c<copies;c++){
    const pb=c>0?'page-break-before:always;':'';
    if(narrow){
      body+=`<div style="${pb}">
        <!-- ══ MODIFICADO: si hay logo se muestra solo el logo; si no, solo el nombre ══ -->
        ${logoHtml
          ? `<div style="text-align:center;">${logoHtml}</div>`
          : `<div style="text-align:center;font-weight:bold;font-size:14px;">${cfg.nombre||'Mi Negocio'}</div>`
        }
        <!-- ══ FIN MODIFICADO ══ -->
        ${cfg.dir?`<div style="text-align:center;color:#555;font-size:10px;">${cfg.dir}</div>`:''}
        ${cfg.tel?`<div style="text-align:center;color:#555;font-size:10px;">${cfg.tel}</div>`:''}
        ${cfg.ruc?`<div style="text-align:center;color:#555;font-size:10px;">RUC: ${cfg.ruc}</div>`:''}
        <div style="${ls}"></div>
        <div>Ticket: <b>#${String(lastVenta.num||lastVenta.id).padStart(4,'0')}</b></div>
        <div>Fecha: ${fmtDate(lastVenta.date)} ${new Date(lastVenta.date).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})}</div>
        ${lastVenta.clienteNombre?`<div>Cliente: <b>${lastVenta.clienteNombre}</b></div>`:''}
        <div>Pago: <b>${lastVenta.pago}</b></div>
        <div style="${ls}"></div>
        <table style="width:100%;border-collapse:collapse;">${itemsRows}</table>
        <div style="${ls}"></div>
        <table style="width:100%;">
          <tr>
            <td style="font-weight:bold;font-size:13px;">TOTAL</td>
            <td style="text-align:right;font-weight:800;font-size:15px;">
              ${fmtMoneda(lastVenta.total, monedaPrincipal())}
            </td>
          </tr>
          ${lastVenta.moneda_cobro && lastVenta.moneda_cobro !== monedaPrincipal() ? `
          <tr>
            <td style="font-size:10px;color:#555;">Cobrado en</td>
            <td style="text-align:right;font-weight:700;font-size:12px;color:#333;">
              ${fmtMoneda(lastVenta.monto_original, lastVenta.moneda_cobro)}
              <span style="font-size:9px;color:#777;">(TC: ${lastVenta.tc_usado})</span>
            </td>
          </tr>` : ''}
        </table>
        <!-- ══ LÍNEA AGREGADA: nota en ticket térmico ══ -->
        ${lastVenta.nota?`<div style="margin:4px 0;font-size:10px;font-style:italic;text-align:center;">📝 ${lastVenta.nota}</div>`:''}
        <!-- ══ FIN LÍNEA AGREGADA ══ -->
        <div style="${ls}"></div>
        <div style="text-align:center;color:#555;font-size:10px;margin-top:4px;">${cfg.ticketMsg||'¡Gracias! Vuelva pronto 😊'}</div>
        <div style="height:24px;"></div>
      </div>`;
    } else {
      // ── MODIFICADO: padding reducido para A5 ──
      body+=`<div style="${pb}padding:12mm 12mm;font-family:'Courier New',monospace;font-size:${fs};color:#000;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
          <div>
            <!-- ══ LÍNEA MODIFICADA: logo en bloque propio con separación del nombre ══ -->
            <!-- ══ MODIFICADO: si hay logo se muestra solo el logo; si no, solo el nombre ══ -->
            ${logoHtml
              ? `<div style="margin-bottom:8px;">${logoHtml}</div>`
              : `<div style="font-size:18px;font-weight:bold;">${cfg.nombre||'Mi Negocio'}</div>`
            }
            <!-- ══ FIN MODIFICADO ══ -->
            ${cfg.tipo?`<div style="font-size:11px;color:#555;">${cfg.tipo}</div>`:''}
            ${cfg.dir?`<div style="font-size:11px;color:#555;">📍 ${cfg.dir}</div>`:''}
            ${cfg.tel?`<div style="font-size:11px;color:#555;">📱 ${cfg.tel}</div>`:''}
            ${cfg.ruc?`<div style="font-size:11px;color:#555;">RUC: ${cfg.ruc}</div>`:''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:800;">TICKET</div>
            <div style="font-size:12px;color:#555;">#${String(lastVenta.num||lastVenta.id).padStart(4,'0')}</div>
            <div style="font-size:11px;color:#555;margin-top:4px;">${fmtDate(lastVenta.date)}</div>
            <div style="font-size:11px;color:#555;">${new Date(lastVenta.date).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'})}</div>
            ${lastVenta.clienteNombre?`<div style="font-size:11px;margin-top:4px;">Cliente: <b>${lastVenta.clienteNombre}</b></div>`:''}
            <div style="font-size:11px;">Pago: <b>${lastVenta.pago}</b></div>
          </div>
        </div>
        <div style="${ls}"></div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f5f5f5;">
            <th style="text-align:left;padding:5px 4px;font-size:11px;">Descripción</th>
            <th style="text-align:center;padding:5px 4px;font-size:11px;">Cant.</th>
            <th style="text-align:right;padding:5px 4px;font-size:11px;">P.Unit.</th>
            <th style="text-align:right;padding:5px 4px;font-size:11px;">Subtotal</th>
          </tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div style="${ls}"></div>
        <table style="width:100%;"><tr><td colspan="3" style="text-align:right;font-weight:bold;font-size:14px;">TOTAL:</td><td style="text-align:right;font-weight:800;font-size:16px;">${fmtGs(lastVenta.total)}</td></tr></table>
        <!-- ══ LÍNEA AGREGADA: nota en ticket A4 ══ -->
        ${lastVenta.nota?`<div style="${ls}"></div><div style="font-size:11px;font-style:italic;color:#555;text-align:center;">📝 ${lastVenta.nota}</div>`:''}
        <!-- ══ FIN LÍNEA AGREGADA ══ -->
        <div style="${ls}"></div>
        <div style="text-align:center;color:#555;font-size:11px;margin-top:10px;">${cfg.ticketMsg||'¡Gracias! Vuelva pronto 😊'}</div>
      </div>`;
    }
  }

  // ── MODIFICADO: @page usa A5 para impresoras no térmicas ──
  const fullHtml=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:white;width:${w};font-family:'Courier New',monospace;font-size:${fs};}@media print{@page{margin:0;size:${narrow?w+' auto':'A5'};}}</style></head><body>${body}</body></html>`;
  const win=window.open('','_blank','width=700,height=600,toolbar=0,menubar=0');
  if(win){win.document.write(fullHtml);win.document.close();win.focus();setTimeout(()=>{win.print();win.close();},600);}
  else showToast('⚠️ Permitir ventanas emergentes para imprimir');
}
function printLast(){
  if(!DB.ventas.length){showToast('No hay ventas para reimprimir');return;}
  lastVenta=DB.ventas[0]; doPrint();
}

// ═══ RENDERS ═══════════════════════════════
function renderInicio(){
  const today=new Date().toDateString();
  const vH=DB.ventas.filter(v=>new Date(v.date).toDateString()===today);
  const gH=DB.gastos.filter(g=>new Date(g.date).toDateString()===today);
  const ing=vH.reduce((s,v)=>s+v.total,0),gst=gH.reduce((s,g)=>s+g.amount,0);
  document.getElementById('h-caja').textContent=fmtGs(ing-gst);
  document.getElementById('h-caja-sub').textContent=`${vH.length} venta${vH.length!==1?'s':''} hoy`;
  document.getElementById('h-ing').textContent=fmtGs(ing);
  document.getElementById('h-gst').textContent=fmtGs(gst);
  document.getElementById('h-tasks').textContent=DB.tareas.length;
  const ov=DB.tareas.filter(t=>t.date&&new Date(t.date+'T23:59:59')<new Date()).length;
  document.getElementById('h-tasks-sub').textContent=ov>0?`${ov} vencida${ov!==1?'s':''} ⚠️`:'Al día ✓';
  const cfg=DB.config;
  document.getElementById('sb-biz-name').textContent=cfg.nombre||'Mi Negocio';
  document.getElementById('sb-biz-type').textContent=cfg.tipo||'Negocio';
  document.getElementById('home-sub').textContent=cfg.nombre||'Mi Negocio';
  // ══ AGREGADO: logo negocio en sidebar ══
  const sbImg = document.getElementById('sb-logo-img');
  const sbIni = document.getElementById('sb-logo-inicial');
  if(cfg.logoDataUrl){
    sbImg.src = cfg.logoDataUrl;
    sbImg.style.display = 'block';
    sbIni.style.display = 'none';
  } else {
    sbImg.style.display = 'none';
    sbIni.style.display = '';
    sbIni.textContent = (cfg.nombre||'N').charAt(0).toUpperCase();
  }
  // ══ FIN AGREGADO ══
  const h=new Date().getHours();
  document.getElementById('home-title').textContent=h<12?'Buenos días 👋':h<19?'Buenas tardes 👋':'Buenas noches 👋';

// ── AGREGADO: banner de stock crítico en inicio ──
  const _criticos = DB.productos.filter(p => p.tipo !== 'servicio' && p.stock !== null && p.stock <= 4).sort((a,b) => a.stock - b.stock);
  const _stockBanner = document.getElementById('home-stock-banner');
  if(_stockBanner){
    if(_criticos.length > 0){
      _stockBanner.style.display = 'block';
      _stockBanner.innerHTML = `
        <div style="font-weight:800;font-size:.88rem;color:#92400E;margin-bottom:8px;">⚠️ ${_criticos.length} producto${_criticos.length!==1?'s':''} con stock bajo</div>
        ${_criticos.map(p=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #FDE68A;">
            <span style="font-size:.85rem;">${p.emoji||'📦'} ${p.nombre}</span>
            <span style="font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:100px;background:${p.stock===0?'#FEE2E2':'#FEF3C7'};color:${p.stock===0?'#991B1B':'#92400E'};">${p.stock===0?'🔴 Sin stock':'⚠️ '+p.stock+' u.'}</span>
          </div>`).join('')}
        <button onclick="navTo('productos')" style="margin-top:10px;font-size:.78rem;font-weight:700;background:none;border:1.5px solid #F59E0B;color:#92400E;padding:5px 14px;border-radius:100px;cursor:pointer;">Ver inventario →</button>`;
    } else {
      _stockBanner.style.display = 'none';
    }
  }
// ── FIN AGREGADO ──

// ── MODIFICADO: filas de ventas ahora abren el modal de detalle al hacer clic ──
  const vl=document.getElementById('home-ventas-list');
  vl.innerHTML=!DB.ventas.length?`<div class="empty-state" style="padding:28px 0"><div class="empty-icon">🛒</div><div class="empty-text">Aún sin ventas.<br>¡Registrá la primera!</div></div>`:
    DB.ventas.slice(0,6).map(v=>`<div class="list-row" onclick="openVentaDetail(${v.id})" style="cursor:pointer;" title="Ver detalle / anular venta">
      <div class="row-icon" style="background:var(--green-l);">🛒</div>
      <div class="row-body">
        <div class="row-name">${v.clienteNombre||'Venta rápida'}</div>
        <div class="row-sub">${v.items.map(i=>i.nombre).join(', ').substring(0,50)} · ${v.pago}</div>
      </div>
      <div class="row-right">
        <div class="row-amount" style="color:var(--green)">+${fmtGs(v.total)}</div>
        <div class="row-date">${timeAgo(v.date)}</div>
        <!-- ── AGREGADO: indicador visual de acción disponible ── -->
        <div style="font-size:.68rem;color:var(--ink3);margin-top:3px;">🔍 Ver detalle</div>
      </div>
    </div>`).join('');

  const tl=document.getElementById('home-tareas-list');
  const sorted=[...DB.tareas].sort((a,b)=>new Date(a.date)-new Date(b.date));
  tl.innerHTML=!sorted.length?`<div class="empty-state" style="padding:28px 0"><div class="empty-icon">✅</div><div class="empty-text">Sin tareas pendientes.</div></div>`:
    sorted.slice(0,5).map(t=>{const o=t.date&&new Date(t.date+'T23:59:59')<new Date();return `<div class="list-row" onclick="navTo('tareas');setTimeout(()=>openSidePanel(${t.id}),80)">
      <div class="row-icon" style="background:${o?'var(--red-l)':'var(--blue-l)'};">${o?'⚠️':'📅'}</div>
      <div class="row-body"><div class="row-name">${t.name}</div><div class="row-sub">${fmtDate(t.date)}</div></div>
      <div class="row-right"><div class="row-amount" style="color:var(--green)">${t.amount?fmtGs(t.amount):''}</div></div>
    </div>`;}).join('');
}
function renderTareas(){
  const list=document.getElementById('tareas-list');
  document.getElementById('tareas-sub').textContent=DB.tareas.length?`${DB.tareas.length} tarea${DB.tareas.length!==1?'s':''} pendiente${DB.tareas.length!==1?'s':''}` : 'Sin tareas pendientes';
  if(!DB.tareas.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">¡Todo listo! Sin tareas pendientes.</div></div>`;return;}
  const sorted=[...DB.tareas].sort((a,b)=>new Date(a.date)-new Date(b.date));
  list.innerHTML=sorted.map(t=>{const ov=t.date&&new Date(t.date+'T23:59:59')<new Date();
    return `<div class="task-item${ov?' overdue':''}">
      <div class="task-check" onclick="event.stopPropagation();completeTask(${t.id})" title="Completar">✓</div>
      <div class="task-body" onclick="openSidePanel(${t.id})">
        <div class="task-name">${t.name}</div>
        ${t.desc?`<div class="task-desc">${t.desc}</div>`:''}
        <div class="task-footer">
          <span class="tag ${ov?'tag-red':'tag-blue'}">📅 ${fmtDate(t.date)}</span>
          ${t.amount?`<span class="tag tag-green">💰 ${fmtGs(t.amount)}</span>`:''}
          ${ov?'<span class="tag tag-red">Vencida</span>':''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openSidePanel(${t.id})" style="flex-shrink:0;width:36px;height:36px;padding:0;border-radius:9px;">→</button>
    </div>`;}).join('');
}
// ══════════════════════════════════════════════════════════
// renderHistorial — MODIFICADO: ahora llama también a
// renderVentasHistorial() que muestra ventas con filtros
// ══════════════════════════════════════════════════════════
function renderHistorial(){
  // ── AGREGADO: poblar el selector de clientes con los que tienen ventas ──
  const sel = document.getElementById('historial-cliente-select');
  if(sel){
    // Obtener clientes únicos que aparecen en ventas, ordenados por nombre
    const clientesConVentas = [...new Map(
      DB.ventas
        .filter(v => v.clienteNombre && v.clienteNombre.trim())
        .map(v => [v.clienteId || v.clienteNombre, { id: v.clienteId, nombre: v.clienteNombre }])
    ).values()].sort((a,b) => a.nombre.localeCompare(b.nombre));

    const valorActual = sel.value; // conservar selección previa
    console.log('DEBUG planId:', planId);
  console.log('DEBUG features:', features);
  console.log('DEBUG planNombre:', planNombre);
    sel.innerHTML = `<option value="">👥 Todos los clientes</option>` +
      clientesConVentas.map(c =>
        `<option value="${c.id || c.nombre}" ${(c.id||c.nombre)==valorActual?'selected':''}>
          ${c.nombre}
        </option>`
      ).join('');
  }

  // ── AGREGADO: renderizar la lista de ventas con filtros ──
  renderVentasHistorial();

  // ── SIN CAMBIOS: historial de tareas completadas ──
  const list = document.getElementById('historial-list');
  if(!DB.historial.length){
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">El historial está vacío.<br>Las tareas completadas aparecerán aquí.</div></div>`;
    return;
  }
  list.innerHTML = DB.historial.map(t=>`<div class="hist-item">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <div style="font-weight:700;font-size:.92rem;">${t.name}</div>
      ${t.amount?`<div style="font-weight:800;color:var(--green);flex-shrink:0;">${fmtGs(t.amount)}</div>`:''}
    </div>
    ${t.desc?`<p style="font-size:.8rem;color:var(--ink3);margin-top:6px;line-height:1.6;">${t.desc}</p>`:''}
    <div style="display:flex;gap:16px;margin-top:8px;">
      <div style="font-size:.72rem;color:var(--ink3);"><strong style="display:block;font-size:.72rem;font-weight:600;color:var(--ink2);">Entrega:</strong>${fmtDate(t.date)}</div>
      <div style="font-size:.72px;color:var(--ink3);"><strong style="display:block;font-size:.72rem;font-weight:600;color:var(--ink2);">Completado:</strong>${fmtDate(t.completedAt)}</div>
    </div>
  </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// AGREGADO: renderVentasHistorial — lista de ventas con
// filtro por cliente, texto libre y método de pago
// ══════════════════════════════════════════════════════════
function renderVentasHistorial(){
  const list    = document.getElementById('ventas-historial-list');
  if(!list) return;

  // ── Leer valores de los filtros ──
  const q       = (document.getElementById('historial-search')?.value || '').trim().toLowerCase();
  const cliVal  = document.getElementById('historial-cliente-select')?.value || '';
  const pagoVal = document.getElementById('historial-pago-select')?.value || '';

  // ── Aplicar filtros ──
  let ventas = [...DB.ventas];

  if(cliVal){
    // Filtrar por cliente (puede ser id numérico o nombre si no tiene id)
    ventas = ventas.filter(v =>
      String(v.clienteId) === String(cliVal) || v.clienteNombre === cliVal
    );
  }

  if(pagoVal){
    ventas = ventas.filter(v => (v.pago || '') === pagoVal);
  }

  if(q){
    ventas = ventas.filter(v =>
      (v.clienteNombre || '').toLowerCase().includes(q) ||
      String(v.num || v.id).includes(q) ||
      (v.items || []).some(i => i.nombre.toLowerCase().includes(q))
    );
  }

  // ── Mostrar/ocultar botón "✕ Todos" ──
  const btnLimpiar = document.getElementById('btn-limpiar-filtro-historial');
  const hayFiltro  = cliVal || pagoVal || q;
  if(btnLimpiar) btnLimpiar.style.display = hayFiltro ? '' : 'none';

  // ── Actualizar subtítulo ──
  const sub = document.getElementById('historial-sub');
  if(sub){
    if(cliVal){
      const nombre = document.querySelector(`#historial-cliente-select option[value="${cliVal}"]`)?.textContent?.trim() || cliVal;
      const total  = ventas.reduce((s,v) => s + v.total, 0);
      sub.textContent = `${ventas.length} venta${ventas.length!==1?'s':''} · ${fmtGs(total)} · ${nombre}`;
    } else {
      sub.textContent = hayFiltro
        ? `${ventas.length} resultado${ventas.length!==1?'s':''} encontrado${ventas.length!==1?'s':''}`
        : `${DB.ventas.length} venta${DB.ventas.length!==1?'s':''} registrada${DB.ventas.length!==1?'s':''}`;
    }
  }

  // ── Estado vacío ──
  if(!ventas.length){
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">
          ${hayFiltro ? 'Sin ventas con ese filtro.' : 'Sin ventas registradas aún.'}
        </div>
        ${hayFiltro ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="limpiarFiltroHistorial()">Ver todas las ventas</button>` : ''}
      </div>`;
    return;
  }

  // ── Renderizar filas ──
  list.innerHTML = `<div class="card" style="padding:0;overflow:hidden;">` +
    ventas.map(v => {
      const clienteLabel = v.clienteNombre || 'Venta rápida';
      const itemsLabel   = (v.items || []).length === 1
        ? v.items[0].nombre
        : `${(v.items || []).length} ítems`;
      return `
        <div class="list-row" onclick="openVentaDetail(${v.id})" style="cursor:pointer;">
          <div class="row-icon" style="background:var(--green-l)">🛒</div>
          <div class="row-body">
            <div class="row-name">${clienteLabel}</div>
            <div class="row-sub">#${v.num || v.id} · ${fmtDate(v.date)} · ${itemsLabel}</div>
          </div>
          <div class="row-right">
            <div class="row-amount" style="color:var(--green)">+${fmtGs(v.total)}</div>
            <div class="row-date">${v.pago || '—'} · 🔍 Ver</div>
          </div>
        </div>`;
    }).join('') +
  `</div>`;
}

// ── AGREGADO: limpia todos los filtros del historial ──
function limpiarFiltroHistorial(){
  const searchEl = document.getElementById('historial-search');
  const cliEl    = document.getElementById('historial-cliente-select');
  const pagoEl   = document.getElementById('historial-pago-select');
  if(searchEl) searchEl.value = '';
  if(cliEl)    cliEl.value    = '';
  if(pagoEl)   pagoEl.value   = '';
  renderVentasHistorial();
  // Ocultar botón limpiar
  const btnLimpiar = document.getElementById('btn-limpiar-filtro-historial');
  if(btnLimpiar) btnLimpiar.style.display = 'none';
  const sub = document.getElementById('historial-sub');
  if(sub) sub.textContent = `${DB.ventas.length} venta${DB.ventas.length!==1?'s':''} registrada${DB.ventas.length!==1?'s':''}`;
}
// ══════════════════════════════════════════════════════════
// FIN renderVentasHistorial ▲▲▲
// ══════════════════════════════════════════════════════════
// ── MODIFICADO: _pt ahora puede ser 'productos', 'servicios' o 'historial' ──
let _pt='productos';
function setProdTab(tab,el){
  _pt=tab;
  document.querySelectorAll('#screen-productos .seg-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  // ── AGREGADO: mostrar/ocultar contenedores según tab activo ──
  const listaProd = document.getElementById('productos-list');
  const listaMov  = document.getElementById('stock-movimientos-list');
  if(tab === 'historial'){
    listaProd.style.display = 'none';
    listaMov.style.display  = '';
    renderHistorialMovimientos();
  } else {
    listaProd.style.display = '';
    listaMov.style.display  = 'none';
    renderProductos();
  }
}
// ── FIN MODIFICADO setProdTab ──

// ══════════════════════════════════════════════════════════
// ── AGREGADO: helper para badge visual de stock mínimo ──
// Devuelve un <span> con color según nivel de stock
// ══════════════════════════════════════════════════════════
function stockBadge(stock) {
  if (stock === null || stock === undefined) return '';
  if (stock === 0)  return `<span style="display:inline-block;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:100px;background:#FEE2E2;color:#991B1B;vertical-align:middle;">🔴 Sin stock</span>`;
  if (stock <= 2)   return `<span style="display:inline-block;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:100px;background:#FEE2E2;color:#991B1B;vertical-align:middle;">⚠️ Crítico</span>`;
  if (stock <= 4)   return `<span style="display:inline-block;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:100px;background:#FEF3C7;color:#92400E;vertical-align:middle;">⚠️ Stock bajo</span>`;
  return '';  // stock >= 5: no muestra nada, está bien
}
// ── FIN AGREGADO ──

// ── MODIFICADO: se agregó botón 📦 Stock en cada fila de producto ──
function renderProductos(){
  const f=DB.productos.filter(p=>p.tipo===(_pt==='servicios'?'servicio':'producto'));
  const list=document.getElementById('productos-list');
  if(!f.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">${_pt==='servicios'?'🛠️':'📦'}</div><div class="empty-text">No hay ${_pt}. Clic en + Agregar.</div></div>`;return;}
// ── MODIFICADO: se reemplaza el guard "if closest button return" por onclick directo
// en cada zona clicable. Así los botones Stock y Eliminar funcionan correctamente. ──
list.innerHTML=`<div class="card" style="padding:0;overflow:hidden;">${f.map(p=>`<div class="list-row" style="padding:14px 18px;">
    <div class="row-icon" style="background:${p.tipo==='servicio'?'var(--purple-l)':'var(--blue-l)'};overflow:hidden;padding:0;" onclick="openProductModal(${p.id})">${p.imagen_url ? `<img src="${p.imagen_url}" style="width:40px;height:40px;object-fit:cover;border-radius:10px;" loading="lazy">` : `<span style="font-size:1.1rem;">${p.tipo==='servicio'?'🛠️':'📦'}</span>`}</div>
    <div class="row-body" style="cursor:pointer;" onclick="openProductModal(${p.id})"><div class="row-name">${p.nombre}</div><div class="row-sub">${p.cat}${p.tipo==='producto'?` · Stock: <strong>${p.stock}</strong> ${stockBadge(p.stock)}`:' · Servicio'}</div></div>
<div class="row-right" style="display:flex;align-items:center;gap:6px;">
      <div style="text-align:right;margin-right:4px;" onclick="openProductModal(${p.id})">
        <div class="row-amount">${fmtPrecioProducto(p)}</div>
        ${p.costo > 0
          ? `<div class="row-date" style="color:${((p.precio-p.costo)/p.precio*100)>=30?'#16a34a':'#d97706'};">
              💰 ${fmtMoneda(p.precio-p.costo, p.moneda_precio||monedaPrincipal())} · ${((p.precio-p.costo)/p.precio*100).toFixed(0)}% margen
            </div>`
          : `<div class="row-date">Clic para editar</div>`
        }
      </div>
      ${p.tipo==='producto'?`<button class="btn btn-ghost btn-sm" style="padding:5px 10px;font-size:.75rem;white-space:nowrap;" onclick="openStockModal(${p.id})">📦 Stock</button>`:''}
      <button class="btn btn-danger btn-sm" style="padding:5px 10px;font-size:.75rem;white-space:nowrap;" onclick="deleteProducto(${p.id})">🗑</button>
    </div>
  </div>`).join('')}</div>`;
// ── FIN MODIFICADO ──
}
// ══════════════════════════════════════════════════════════
// renderClientes — MODIFICADO: muestra deuda de fiado en cada fila
// LÍNEAS NUEVAS: cálculo de deudaPendiente + badge de deuda
// ══════════════════════════════════════════════════════════
function renderClientes(){
  const list = document.getElementById('clientes-list');

  if(!DB.clientes.length){
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No hay clientes. Clic en + Agregar.</div></div>`;
    return;
  }

  list.innerHTML = `<div class="card" style="padding:0;overflow:hidden;">${DB.clientes.map(c => {

    // — Compras del cliente —
    const cv  = DB.ventas.filter(v => v.clienteId === c.id);
    const tot = cv.reduce((s, v) => s + v.total, 0);

    // ── NUEVO: calcular deuda pendiente en fiado para este cliente ──
    const cuentasPendientes = (DB.cuentasCorrientes || []).filter(cc =>
      cc.estado === 'pendiente' &&
      (cc.cliente_id === c.id || cc.cliente_nombre === c.nombre)
    );
    const deudaPendiente = cuentasPendientes.reduce((s, cc) =>
      s + (cc.monto_original - cc.monto_pagado), 0
    );
    const cantDeudas = cuentasPendientes.length;

    // ── NUEVO: badge visual según estado de deuda ──
    const deudaBadge = deudaPendiente > 0
      ? `<div style="
            display:inline-flex;align-items:center;gap:4px;
            background:#FEF2F2;color:#DC2626;
            border:1px solid #FECACA;
            border-radius:20px;padding:3px 8px;
            font-size:.68rem;font-weight:700;
            white-space:nowrap;margin-top:4px;cursor:pointer;"
          onclick="event.stopPropagation();navTo('fiado')"
          title="Ver deudas en Fiado">
          💳 Debe ${fmtGs(deudaPendiente)}
          ${cantDeudas > 1 ? `<span style="background:#DC2626;color:#fff;border-radius:10px;padding:0 5px;font-size:.6rem;">${cantDeudas}</span>` : ''}
        </div>`
      : `<div style="
            display:inline-flex;align-items:center;gap:3px;
            background:#F0FDF4;color:#16A34A;
            border:1px solid #BBF7D0;
            border-radius:20px;padding:3px 8px;
            font-size:.68rem;font-weight:700;
            white-space:nowrap;margin-top:4px;">
          ✅ Al día
        </div>`;
    // ── FIN NUEVO ──

    // ── MODIFICADO: clic en la fila abre la ficha; botones siguen con stopPropagation ──
    return `<div class="list-row" style="padding:14px 18px;cursor:pointer;"
      onclick="openFichaCliente(${c.id})">
      <div style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;
        justify-content:center;font-weight:800;font-size:1rem;flex-shrink:0;
        background:${c.color}22;color:${c.color};">
        ${c.nombre.charAt(0)}
      </div>

      <div class="row-body" style="flex:1;min-width:0;">
        <div class="row-name">${c.nombre}</div>
        <div class="row-sub">${c.phone || 'Sin teléfono'}${c.doc ? ' · ' + c.doc : ''}${c.notes ? ' · ' + c.notes : ''}</div>
        <!-- ── badge de deuda sin cambios ── -->
        ${deudaBadge}
      </div>

      <div class="row-right" style="display:flex;align-items:center;gap:8px;">
        <div style="text-align:right;">
          <div class="row-amount" style="color:var(--green)">${fmtGs(tot)}</div>
          <div class="row-date">${cv.length} compra${cv.length !== 1 ? 's' : ''}</div>
        </div>
        <!-- ── MODIFICADO: icono de ficha (👁) + botones editar/eliminar con stopPropagation ── -->
        <span style="font-size:.75rem;color:var(--ink3);padding:5px 4px;">👁</span>
        <button class="btn btn-ghost btn-sm"
          style="padding:5px 10px;font-size:.75rem;"
          onclick="event.stopPropagation();openClientModal(${c.id})">✏️</button>
        <button class="btn btn-danger btn-sm"
          style="padding:5px 10px;font-size:.75rem;"
          onclick="event.stopPropagation();deleteCliente(${c.id})">🗑</button>
        <!-- ── FIN MODIFICADO ── -->
      </div>
    </div>`;
    // ── FIN MODIFICADO ──

  }).join('')}</div>`;
}
// ══════════════════════════════════════════════════════════
// FIN renderClientes MODIFICADO ▲▲▲
// ══════════════════════════════════════════════════════════
// ── MODIFICADO: se agregaron botones ✏️ Editar y 🗑 Eliminar en cada fila ──
function renderGastos(){
  const list=document.getElementById('gastos-list');
  if(!DB.gastos.length){
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">💸</div><div class="empty-text">Sin gastos registrados.</div></div>`;
    return;
  }
  list.innerHTML=`<div class="card" style="padding:0;overflow:hidden;">${
    [...DB.gastos].sort((a,b)=>new Date(b.date||b.created_at)-new Date(a.date||a.created_at)).map(g=>`
      <div class="list-row" style="padding:14px 18px;cursor:default;">
        <div class="row-icon" style="background:var(--red-l);flex-shrink:0;">💸</div>
        <div class="row-body">
          <div class="row-name">${g.desc || g.descripcion || '—'}</div>
          <div class="row-sub">${g.cat || 'Otros'} · ${fmtDate(g.date || g.created_at)}</div>
        </div>
        <div class="row-right" style="display:flex;align-items:center;gap:6px;">
          <div style="text-align:right;margin-right:6px;">
            <div class="row-amount" style="color:var(--red)">−${fmtGs(g.amount)}</div>
          </div>
          <!-- ── AGREGADO: botones de acción ── -->
          <button class="btn btn-ghost btn-sm"
            style="padding:5px 10px;font-size:.75rem;"
            onclick="event.stopPropagation();openEditGasto(${g.id})">✏️</button>
          <button class="btn btn-danger btn-sm"
            style="padding:5px 10px;font-size:.75rem;"
            onclick="event.stopPropagation();deleteGasto(${g.id})">🗑</button>
        </div>
      </div>`).join('')
  }</div>`;
}
// ══════════════════════════════════════════════════════════
// renderBalance — MODIFICADO: agrega turno activo e historial
// ══════════════════════════════════════════════════════════
// ── MODIFICADO: renderBalance ahora es async para incluir conversiones en el total ──
async function renderBalance(){
  const principal = monedaPrincipal();
  const ing = DB.ventas.reduce((s,v) => s + v.total, 0);
  const egr = DB.gastos.reduce((s,g) => s + g.amount, 0);

  // ── AGREGADO: sumar diferencia neta de conversiones al saldo ──
  // Una conversión no es ingreso ni egreso, es un cambio de forma del dinero.
  // Su efecto en el saldo en moneda principal es: monto_gs recibido − valor original al TC registrado.
  let difConversiones = 0;
  try {
    const { data: convs } = await sb
      .from('conversiones')
      .select('diferencia_gs')
      .eq('negocio_id', negocioId);
    difConversiones = (convs || []).reduce((s, c) => s + (c.diferencia_gs || 0), 0);
  } catch(e){ console.error('Error leyendo diferencia conversiones:', e); }
  // ── FIN AGREGADO ──

  document.getElementById('bal-total').textContent = fmtGs(ing - egr + difConversiones);
  document.getElementById('bal-ing').textContent   = fmtGs(ing);
  document.getElementById('bal-egr').textContent   = fmtGs(egr);

  const all=[...DB.ventas.map(v=>({...v,_t:'i',_d:v.clienteNombre||'Venta rápida',_ic:'🛒',_c:'var(--green)'})),...DB.gastos.map(g=>({...g,_t:'e',_d:g.desc,_ic:'💸',_c:'var(--red)'}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
  // ── AGREGADO: actualiza el badge de resumen del acordeón ──
  const balResumen = document.getElementById('bal-resumen');
  if (balResumen) {
    balResumen.textContent = all.length ? `${all.length} registros` : '';
  }
  // ── FIN AGREGADO ──
  const list=document.getElementById('balance-list');
  list.innerHTML=!all.length?`<div class="empty-state"><div class="empty-icon">💰</div><div class="empty-text">Sin movimientos aún.</div></div>`:
// ── MODIFICADO: las filas del balance ahora abren detalle de venta o edición de gasto ──
all.map(m=>{
  const principal = monedaPrincipal();
  // ── Badge de moneda: solo para ventas cobradas en moneda secundaria ──
  const monedaBadge = (m._t==='i' && m.moneda_cobro && m.moneda_cobro !== principal)
    ? (() => {
        const mc = getMoneda(m.moneda_cobro);
        return `<span style="
          display:inline-flex;align-items:center;gap:3px;
          margin-left:6px;padding:1px 6px;
          background:#fef9c3;color:#854d0e;
          border:1px solid #fde047;border-radius:100px;
          font-size:.65rem;font-weight:700;vertical-align:middle;">
          ${mc.pais} ${mc.code} ${fmtMonedaConCodigo(m.monto_original, m.moneda_cobro)}
        </span>`;
      })()
    : '';

  return `<div class="list-row"
      onclick="${m._t==='i' ? `openVentaDetail(${m.id})` : `openEditGasto(${m.id})`}"
      title="${m._t==='i' ? 'Ver detalle / eliminar venta' : 'Editar / eliminar gasto'}">
      <div class="row-icon" style="background:${m._t==='i'?'var(--green-l)':'var(--red-l)'};">${m._ic}</div>
      <div class="row-body">
        <div class="row-name">${m._d}</div>
        <div class="row-sub">
          ${m._t==='i'?'Venta':'Gasto'} · ${fmtDate(m.date)}${monedaBadge}
        </div>
      </div>
      <div class="row-right">
        <div class="row-amount" style="color:${m._c}">${m._t==='i'?'+':'−'}${fmtMoneda(m._t==='i'?m.total:m.amount, principal)}</div>
        <div style="font-size:.68rem;color:var(--ink3);margin-top:3px;">
          ${m._t==='i' ? '🔍 Ver detalle' : '✏️ Editar'}
        </div>
      </div>
    </div>`;
}).join('');

// ── MODIFICADO: se agregó btnAbrir ──
  const btnCerrar = document.getElementById('btn-cerrar-caja');
  const btnAbrir  = document.getElementById('btn-abrir-caja');
  const turnoWrap = document.getElementById('caja-turno-activo');
  if(turnoActual){
    const hoy = new Date().toDateString();
    const vHoy = DB.ventas.filter(v=>new Date(v.date).toDateString()===hoy);
    const gHoy = DB.gastos.filter(g=>new Date(g.date).toDateString()===hoy);
    const ingHoy = vHoy.reduce((s,v)=>s+v.total,0);
    const gstHoy = gHoy.reduce((s,g)=>s+g.amount,0);
    document.getElementById('caja-turno-titulo').textContent =
      `Turno del ${fmtDate(turnoActual.fecha)}${turnoActual.notas_apertura?' · '+turnoActual.notas_apertura:''}`;
    document.getElementById('caja-turno-sub').textContent =
      `Monto inicial: ${fmtGs(turnoActual.monto_inicial)}`;
    document.getElementById('caja-ventas-hoy').textContent = vHoy.length;
    document.getElementById('caja-ing-hoy').textContent = fmtGs(ingHoy);
    document.getElementById('caja-gst-hoy').textContent = fmtGs(gstHoy);
    turnoWrap.style.display = 'block';
    btnCerrar.style.display = '';
    btnAbrir.style.display  = 'none';
  } else {
    turnoWrap.style.display = 'none';
    btnCerrar.style.display = 'none';
    btnAbrir.style.display  = '';
  }

  // ── NUEVO: historial de turnos ──
  renderTurnosHistorial();

  // ── FASE 5 → BALANCE: saldos por moneda + diferencia de cambio ──
  renderBalanceMonedas();
  renderDifCambioBalance();
}

// ── Muestra los saldos estimados por moneda en Caja/Balance ──
// ── MODIFICADO: renderBalanceMonedas ahora descuenta conversiones del saldo ──
async function renderBalanceMonedas(){
  const wrap = document.getElementById('bal-monedas-wrap');
  const grid = document.getElementById('bal-monedas-grid');
  if(!wrap || !grid) return;

  const principal   = monedaPrincipal();
  const habilitadas = monedasHabilitadas();

  if(habilitadas.length <= 1){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  // Paso 1: sumar ventas cobradas en cada moneda secundaria
  const acumulado = {};
  habilitadas.forEach(c => { acumulado[c] = 0; });
  DB.ventas.forEach(v => {
    const code = v.moneda_cobro || principal;
    if(acumulado[code] !== undefined && code !== principal){
      acumulado[code] += v.monto_original || 0;
    }
  });

  // ── MODIFICADO: usar columnas moneda_destino y monto_destino para balance exacto ──
  try {
    const { data: convs } = await sb
      .from('conversiones')
      .select('moneda_origen, monto_origen, moneda_destino, monto_destino')
      .eq('negocio_id', negocioId);

    (convs || []).forEach(c => {
      // Restar el monto que salió de la moneda origen
      if(c.moneda_origen !== principal && acumulado[c.moneda_origen] !== undefined){
        acumulado[c.moneda_origen] -= c.monto_origen || 0;
      }
      // Sumar el monto que llegó a la moneda destino (si es secundaria)
      if(c.moneda_destino && c.moneda_destino !== principal && acumulado[c.moneda_destino] !== undefined){
        acumulado[c.moneda_destino] += c.monto_destino || 0;
      }
    });
  } catch(e){ console.error('Error cargando conversiones para balance:', e); }
  // ── FIN MODIFICADO ──

  grid.innerHTML = habilitadas
    .filter(c => c !== principal)
    .map(code => {
      const m     = getMoneda(code);
      const sald  = Math.max(0, acumulado[code] || 0); // nunca negativo en UI
      const tc    = getTipoCambio(code);
      const equiv = sald * tc;
      return `
        <div style="background:var(--surface2);border-radius:var(--r-sm);
          padding:12px 14px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:1.1rem;">${m.pais}</span>
            <span style="font-weight:700;font-size:.85rem;">${m.code}</span>
          </div>
          <div style="font-weight:800;font-size:1.1rem;">
            ${fmtMoneda(sald, code)}
          </div>
          <div style="font-size:.72rem;color:var(--ink3);margin-top:2px;">
            ≈ ${fmtMoneda(equiv, principal)} al TC actual
          </div>
        </div>`;
    }).join('');
}
// ── FIN MODIFICADO renderBalanceMonedas ──

// ══════════════════════════════════════════════════════════
// NUEVO: abre modal con historial completo de conversiones
// ══════════════════════════════════════════════════════════
async function openVerConversiones(){
  document.getElementById('ver-conversiones-overlay').classList.add('open');
  const lista = document.getElementById('ver-conv-lista');
  const total = document.getElementById('ver-conv-total');
  lista.innerHTML = `<div style="padding:16px;color:var(--ink3);font-size:.83rem;text-align:center;">Cargando…</div>`;

  try {
    const hace30 = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const { data } = await sb
      .from('conversiones')
      .select('*')
      .eq('negocio_id', negocioId)
      .gte('fecha', hace30)
      .order('fecha', { ascending: false });

    const conversiones = data || [];
    const principal = monedaPrincipal();

    if(!conversiones.length){
      lista.innerHTML = `<div style="padding:24px;text-align:center;color:var(--ink3);">Sin conversiones en los últimos 30 días.</div>`;
      total.innerHTML = '';
      return;
    }

    const difNeta  = conversiones.reduce((s, c) => s + (c.diferencia_gs || 0), 0);
    const colorDif = difNeta >= 0 ? 'var(--green)' : 'var(--red)';
    const signoDif = difNeta >= 0 ? '+' : '';
    total.innerHTML = `<span style="color:${colorDif};">${signoDif}${fmtMoneda(difNeta, principal)}</span>`;

    lista.innerHTML = conversiones.map(c => {
      const m     = getMoneda(c.moneda_origen);
      const dif   = c.diferencia_gs || 0;
      const color = dif >= 0 ? 'var(--green)' : 'var(--red)';
      const signo = dif >= 0 ? '+' : '';
      const matchDestino = (c.nota || '').match(/\[(\w+)→(\w+)\]/);
      const destinoLabel = matchDestino
        ? `→ ${getMoneda(matchDestino[2]).pais} ${matchDestino[2]}`
        : `→ ${getMoneda(principal).simbolo}`;
      const notaLimpia = (c.nota || '').replace(/\[\w+→\w+\]\s*/, '');
      return `
        <div style="display:flex;align-items:center;gap:8px;
          padding:10px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:1.1rem;">${m.pais}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:.84rem;">
              ${fmtMoneda(c.monto_origen, c.moneda_origen)} ${destinoLabel}
            </div>
            <!-- ── MODIFICADO: fecha + hora con zona horaria ── -->
          <div style="font-size:.72rem;color:var(--ink3);">
              ${c.fecha}${c.created_at
                ? ' · ' + new Date(c.created_at).toLocaleTimeString('es-PY', {
                    hour:'2-digit', minute:'2-digit', timeZone: getZonaHoraria()
                  })
                : ''}${notaLimpia ? ' · ' + notaLimpia : ''}
            </div>
          </div>
          <div style="font-weight:800;font-size:.9rem;color:${color};white-space:nowrap;margin-right:4px;">
            ${signo}${fmtMoneda(dif, principal)}
          </div>
          <button onclick="editarConversion(${c.id})"
            title="Editar"
            style="background:none;border:none;cursor:pointer;font-size:.95rem;
              padding:4px 6px;color:var(--blue);opacity:.8;flex-shrink:0;">✏️</button>
          <button onclick="confirmarEliminarConversion(${c.id})"
            title="Eliminar"
            style="background:none;border:none;cursor:pointer;font-size:.95rem;
              padding:4px 6px;color:var(--red);opacity:.8;flex-shrink:0;">🗑️</button>
        </div>`;
    }).join('');

  } catch(e) {
    console.error('Error cargando conversiones:', e);
    lista.innerHTML = `<div style="color:var(--red);font-size:.8rem;padding:12px;">Error al cargar conversiones.</div>`;
  }
}
// ══════════════════════════════════════════════════════════
// FIN openVerConversiones
// ══════════════════════════════════════════════════════════

// ── Muestra las últimas conversiones en Caja/Balance ──
async function renderDifCambioBalance(){
  const wrap  = document.getElementById('bal-dif-cambio-wrap');
  const total = document.getElementById('bal-dif-total');
  if(!wrap || !total) return;

  const principal   = monedaPrincipal();
  const habilitadas = monedasHabilitadas();
  if(habilitadas.length <= 1){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  try {
    const hace30 = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const { data } = await sb
      .from('conversiones')
      .select('*')
      .eq('negocio_id', negocioId)
      .gte('fecha', hace30)
      .order('fecha', { ascending: false })
      .limit(10);

    const conversiones = data || [];

    if(!conversiones.length){
      total.innerHTML = '';
      return;
    }

    const difNeta  = conversiones.reduce((s, c) => s + (c.diferencia_gs || 0), 0);
    const colorDif = difNeta >= 0 ? 'var(--green)' : 'var(--red)';
    const signoDif = difNeta >= 0 ? '+' : '';
    total.innerHTML = `<span style="color:${colorDif};">
      ${signoDif}${fmtMoneda(difNeta, principal)}
    </span>`;

} catch(e){
    console.error('Error cargando conversiones en balance:', e);
  }
}
// ══════════════════════════════════════════════════════════
// FIN FASE 5 → BALANCE: renderBalanceMonedas + renderDifCambioBalance
// ══════════════════════════════════════════════════════════

// Carga y muestra los turnos cerrados desde Supabase
async function renderTurnosHistorial(){
  const listEl = document.getElementById('turnos-historial-list');
  listEl.innerHTML = `<div style="padding:16px;color:var(--ink3);font-size:.83rem;">Cargando historial…</div>`;
  try {
    // ── MODIFICADO ETAPA 3C: filtrar historial por negocio_id ──
    const {data, error} = await sb
      .from('turnos_caja')
      .select('*')
      .eq('negocio_id', negocioId)
      .order('created_at', {ascending: false})
      .limit(20);
    // ── FIN MODIFICADO 3C ──
    if(error) throw error;
    if(!data||!data.length){
      listEl.innerHTML=`<div class="empty-state"><div class="empty-icon">🕐</div><div class="empty-text">Sin turnos registrados aún.</div></div>`;
      return;
    }
    // ── AGREGADO: badge de resumen en el acordeón ──
    const turnosResumen = document.getElementById('turnos-resumen');
    if (turnosResumen) turnosResumen.textContent = `${data.length} turno${data.length !== 1 ? 's' : ''}`;
    // ── FIN AGREGADO ──
    listEl.innerHTML = data.map(t=>{
      const abierta = t.estado==='abierta';
      const diferencia = t.monto_cierre!=null
        ? (t.monto_cierre-(t.monto_inicial+(t.ventas_efectivo||0)-(t.gastos_dia||0)))
        : null;
      const difColor = diferencia==null?'var(--ink3)':diferencia>=0?'var(--green)':'var(--red)';
      const difTxt = diferencia==null?'—':(diferencia>=0?'+':'')+fmtGs(diferencia);
      // ── NUEVO: hora de apertura y cierre con zona horaria ──
      const tz = getZonaHoraria();
      const horaApertura = t.created_at
        ? new Date(t.created_at).toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit', timeZone: tz })
        : null;
      const horaCierre = t.closed_at
        ? new Date(t.closed_at).toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit', timeZone: tz })
        : null;
      // ── FIN NUEVO ──
      return `<div class="list-row">
        <div class="row-icon" style="background:${abierta?'var(--green-l)':'var(--surface2)'};">
          ${abierta?'🟢':'🔒'}
        </div>
        <div class="row-body">
          <div class="row-name">${fmtDate(t.fecha)} ${t.notas_apertura?'· '+t.notas_apertura:''}</div>
          <div class="row-sub">
            Inicial: ${fmtGs(t.monto_inicial)}
            ${t.monto_cierre!=null?' · Cierre: '+fmtGs(t.monto_cierre):''}
            ${t.notas_cierre?' · '+t.notas_cierre:''}
          </div>
        </div>
        <div class="row-right">
          <div class="row-amount" style="color:${abierta?'var(--green)':difColor}">
            ${abierta?'Abierta':difTxt}
          </div>
          <!-- ── MODIFICADO: fecha + hora con zona horaria ── -->
          <div class="row-date">
            ${abierta
              ? `En curso${horaApertura ? ' · desde ' + horaApertura : ''}`
              : t.closed_at
                ? `${fmtDate(t.closed_at)} ${horaCierre}`
                : 'Cerrada'}
          </div>
        </div>
      </div>`;
    }).join('');
  } catch(e){
    console.error('Error cargando historial de turnos:', e);
    listEl.innerHTML=`<div style="padding:16px;color:var(--red);font-size:.83rem;">⚠️ Error al cargar historial.</div>`;
  }
}
// ══════════════════════════════════════════════════════════
// FIN renderBalance MODIFICADO
// ══════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════
// CIERRE DE CAJA — NUEVO BLOQUE COMPLETO
// ══════════════════════════════════════════════════════════

// Abre el modal de cierre y pre-calcula el resumen del turno
function openCierreCaja(){
  if(!turnoActual){showToast('No hay caja abierta');return;}
  const hoy = new Date().toDateString();
  const vHoy = DB.ventas.filter(v=>new Date(v.date).toDateString()===hoy);
  const gHoy = DB.gastos.filter(g=>new Date(g.date).toDateString()===hoy);

  const totalVentas   = vHoy.reduce((s,v)=>s+v.total,0);
  const ventasEfectivo= vHoy.filter(v=>v.pago==='Efectivo').reduce((s,v)=>s+v.total,0);
  const ventasOtros   = totalVentas - ventasEfectivo;
  const totalGastos   = gHoy.reduce((s,g)=>s+g.amount,0);
  const esperado      = turnoActual.monto_inicial + ventasEfectivo - totalGastos;

  // Guardar en variables para usarlas al confirmar
  window._cierreDatos = {
    totalVentas, ventasEfectivo, ventasOtros, totalGastos, esperado,
    cantVentas: vHoy.length
  };

  document.getElementById('cierre-monto-inicial').textContent = fmtGs(turnoActual.monto_inicial);
  document.getElementById('cierre-total-ventas').textContent  = fmtGs(totalVentas);
  document.getElementById('cierre-efectivo').textContent      = fmtGs(ventasEfectivo);
  document.getElementById('cierre-otros').textContent         = fmtGs(ventasOtros);
  document.getElementById('cierre-gastos').textContent        = fmtGs(totalGastos);
  document.getElementById('cierre-esperado').textContent      = fmtGs(esperado);
  document.getElementById('cierre-monto-real').value          = '';
  document.getElementById('cierre-notas').value               = '';
  document.getElementById('cierre-diferencia-wrap').style.display = 'none';

  openModal('caja-cierre-overlay');
  setTimeout(()=>document.getElementById('cierre-monto-real').focus(),200);
}

// Muestra en tiempo real si hay diferencia entre lo esperado y lo contado
function calcularDiferenciaCierre(){
  const real     = +document.getElementById('cierre-monto-real').value;
  const esperado = window._cierreDatos?.esperado || 0;
  const wrap     = document.getElementById('cierre-diferencia-wrap');
  if(!document.getElementById('cierre-monto-real').value){
    wrap.style.display='none'; return;
  }
  const diff = real - esperado;
  wrap.style.display = 'block';
  if(diff===0){
    wrap.style.background='var(--green-l)';wrap.style.color='var(--green)';
    wrap.textContent='✅ ¡Perfecto! El efectivo cuadra exactamente.';
  } else if(diff>0){
    wrap.style.background='var(--amber-l)';wrap.style.color='var(--amber)';
    wrap.textContent=`⚠️ Sobrante: ${fmtGs(diff)} más de lo esperado.`;
  } else {
    wrap.style.background='var(--red-l)';wrap.style.color='var(--red)';
    wrap.textContent=`❌ Faltante: ${fmtGs(Math.abs(diff))} menos de lo esperado.`;
  }
}

// Guarda el cierre en Supabase y resetea el turno activo
async function confirmarCierreCaja(){
  if(!turnoActual){showToast('No hay caja abierta');return;}
  const montoReal = +document.getElementById('cierre-monto-real').value||0;
  const notas     = document.getElementById('cierre-notas').value.trim();
  const d         = window._cierreDatos || {};

  try {
    const {error} = await sb.from('turnos_caja').update({
      estado:           'cerrada',
      monto_cierre:     montoReal,
      notas_cierre:     notas||null,
      closed_at:        new Date().toISOString(),
      ventas_efectivo:  d.ventasEfectivo || 0,
      gastos_dia:       d.totalGastos    || 0
    }).eq('id', turnoActual.id);

    if(error) throw error;

    turnoActual = null;
    window._cierreDatos = null;
    closeModal('caja-cierre-overlay');
    actualizarIndicadorCaja();
    renderBalance();
    showToast('🔒 Caja cerrada correctamente');

  } catch(e){
    console.error('Error cerrando caja:', e);
    showToast('⚠️ Error al cerrar la caja.');
  }
}
// ── NUEVO: función de reapertura manual ──
function reabrirCaja(){
  document.getElementById('caja-monto-inicial').value = '';
  document.getElementById('caja-notas-apertura').value = '';
  document.getElementById('caja-apertura-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('caja-monto-inicial').focus(), 200);
}
// ══════════════════════════════════════════════════════════
// FIN CIERRE DE CAJA
// ══════════════════════════════════════════════════════════
// ══ MODIFICADO: setPeriod queda como alias de compatibilidad ══
// ══ AGREGADO: lógica de rango de fechas Desde–Hasta          ══

// Devuelve la fecha de hoy en formato YYYY-MM-DD (hora local)
function hoyLocal(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Inicializa los inputs de fecha con un rango y llama a renderReportes
function setRangoRapido(tipo){
  const hoy = hoyLocal();
  let desde = hoy;
  if(tipo === 'semana'){
    const d7 = new Date(new Date().getTime() - 6 * 86400000);
    desde = `${d7.getFullYear()}-${String(d7.getMonth()+1).padStart(2,'0')}-${String(d7.getDate()).padStart(2,'0')}`;
  } else if(tipo === 'mes'){
    const d = new Date();
    desde = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  }
  const inputDesde = document.getElementById('rep-fecha-desde');
  const inputHasta = document.getElementById('rep-fecha-hasta');
  if(inputDesde) inputDesde.value = desde;
  if(inputHasta) inputHasta.value = hoy;
  renderReportes();
}

// Llamado por los inputs onchange
function setPeriodRango(){
  renderReportes();
}

// Compatibilidad: si algún código viejo llama setPeriod('hoy'/'semana'/'mes', el)
function setPeriod(p, el){
  setRangoRapido(p);
}

// ══════════════════════════════════════════════════════════
// EXPORTACIÓN DE REPORTES — NUEVO BLOQUE COMPLETO
// Genera los datos del período actual y los exporta a
// Excel (.xlsx) o PDF usando librerías CDN (lazy load).
// ══════════════════════════════════════════════════════════

// ══ MODIFICADO: getDatosReporte ahora lee los inputs de fecha Desde–Hasta ══
function getDatosReporte(){
  const inputDesde = document.getElementById('rep-fecha-desde');
  const inputHasta = document.getElementById('rep-fecha-hasta');
  const hoy = hoyLocal();

  // Si los inputs existen y tienen valor, usarlos; si no, fallback a hoy
  const desdeStr = (inputDesde && inputDesde.value) ? inputDesde.value : hoy;
  const hastaStr = (inputHasta && inputHasta.value) ? inputHasta.value : hoy;

  // Desde = inicio del día seleccionado
  const desde = new Date(desdeStr + 'T00:00:00');
  // Hasta = fin del día seleccionado (23:59:59)
  const hasta = new Date(hastaStr + 'T23:59:59');

  const ventas = DB.ventas.filter(v => {
    const f = new Date(v.date);
    return f >= desde && f <= hasta;
  });
  const gastos = DB.gastos.filter(g => {
    const f = new Date(g.date);
    return f >= desde && f <= hasta;
  });

  const ing = ventas.reduce((s, v) => s + v.total, 0);
  const gst = gastos.reduce((s, g) => s + g.amount, 0);

  // Etiqueta legible del período para PDF/Excel
  let periodoLabel;
  if(desdeStr === hastaStr){
    periodoLabel = desdeStr === hoy ? 'Hoy' : desdeStr;
  } else {
    periodoLabel = `${desdeStr} al ${hastaStr}`;
  }

  return { ventas, gastos, ing, gst, periodoLabel, desdeStr, hastaStr };
}

// ── NUEVO: carga una librería CDN dinámicamente (solo si no está ya cargada) ──
function loadScript(url){
  return new Promise((resolve, reject) => {
    if(document.querySelector(`script[src="${url}"]`)){
      resolve(); return;
    }
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── NUEVO: exportar a Excel ──
async function exportReporteExcel(){
  showToast('⏳ Preparando Excel…');
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const { ventas, gastos, ing, gst, periodoLabel } = getDatosReporte();
    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Resumen ──
    const resumen = [
      ['Reporte Nomi — ' + periodoLabel],
      ['Generado', new Date().toLocaleString('es-PY')],
      [],
      ['RESUMEN', ''],
      ['Total ventas (cantidad)', ventas.length],
      ['Ingresos (Gs)', ing],
      ['Gastos (Gs)', gst],
      ['Ganancia neta (Gs)', ing - gst],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // ── Hoja 2: Ventas del período ──
    const ventasData = [
      ['#', 'Fecha', 'Cliente', 'Productos', 'Total (Gs)', 'Método pago']
    ];
    ventas.forEach(v => {
      const productos = v.items.map(i => `${i.nombre} x${i.qty}`).join(', ');
      ventasData.push([
        v.num || v.id,
        fmtDate(v.date),
        v.clienteNombre || 'Venta rápida',
        productos,
        v.total,
        v.metodoPago || v.metodo_pago || '—'
      ]);
    });
    const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');

    // ── Hoja 3: Gastos del período ──
    const gastosData = [
      ['#', 'Fecha', 'Descripción', 'Categoría', 'Monto (Gs)']
    ];
    gastos.forEach((g, i) => {
      gastosData.push([
        i + 1,
        fmtDate(g.date || g.created_at),
        g.desc || g.descripcion || '—',
        g.cat || 'Otros',
        g.amount
      ]);
    });
    const wsGastos = XLSX.utils.aoa_to_sheet(gastosData);
    XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos');

    // ── Hoja 4: Inventario actual ──
    const invData = [
      ['#', 'Producto / Servicio', 'Tipo', 'Categoría', 'Precio (Gs)', 'Stock']
    ];
    DB.productos.forEach((p, i) => {
      invData.push([
        i + 1,
        p.nombre,
        p.tipo || 'producto',
        p.cat || '—',
        p.precio,
        p.stock != null ? p.stock : '—'
      ]);
    });
    const wsInv = XLSX.utils.aoa_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario');

    // ── Descargar ──
    const nombreArchivo = `reporte-nomi-${currentPeriod}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    showToast('✅ Excel descargado correctamente');
  } catch(e){
    console.error('Error exportando Excel:', e);
    showToast('⚠️ Error al generar el Excel. Revisá la consola.');
  }
}

// ── NUEVO: exportar a PDF ──
async function exportReportePDF(){
  showToast('⏳ Preparando PDF…');
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    const { ventas, gastos, ing, gst, periodoLabel } = getDatosReporte();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const negocio = DB.config.nombre || 'Mi Negocio';
    const fechaGen = new Date().toLocaleString('es-PY');
    let y = 15;

    // ── Encabezado ──
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(negocio, 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Reporte: ${periodoLabel}  |  Generado: ${fechaGen}`, 14, y);
    doc.setTextColor(0);
    y += 8;

    // ── Tarjetas de resumen ──
    const cards = [
      { label: 'Ventas', val: ventas.length + ' transacciones', color: [59,130,246] },
      { label: 'Ingresos', val: fmtGs(ing), color: [34,197,94] },
      { label: 'Gastos', val: fmtGs(gst), color: [239,68,68] },
      { label: 'Ganancia neta', val: fmtGs(ing - gst), color: ing >= gst ? [34,197,94] : [239,68,68] },
    ];
    const cardW = 45, cardH = 18, gap = 3;
    cards.forEach((c, i) => {
      const x = 14 + i * (cardW + gap);
      doc.setFillColor(...c.color);
      doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F');
      doc.setTextColor(255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(c.label.toUpperCase(), x + 3, y + 5);
      doc.setFontSize(10);
      doc.text(c.val, x + 3, y + 13);
    });
    doc.setTextColor(0);
    y += cardH + 10;

    // ── Tabla de ventas ──
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ventas del período', 14, y);
    y += 4;
    const ventasRows = ventas.map(v => [
      String(v.num || v.id),
      fmtDate(v.date),
      v.clienteNombre || 'Rápida',
      v.items.map(i => `${i.nombre} ×${i.qty}`).join(', ').substring(0, 45),
      fmtGs(v.total)
    ]);
    doc.autoTable({
      startY: y,
      head: [['#', 'Fecha', 'Cliente', 'Productos', 'Total']],
      body: ventasRows.length ? ventasRows : [['', 'Sin ventas en este período', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── Tabla de gastos ──
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gastos del período', 14, y);
    y += 4;
    const gastosRows = gastos.map(g => [
      fmtDate(g.date || g.created_at),
      g.desc || g.descripcion || '—',
      g.cat || 'Otros',
      fmtGs(g.amount)
    ]);
    doc.autoTable({
      startY: y,
      head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
      body: gastosRows.length ? gastosRows : [['', 'Sin gastos en este período', '', '']],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── Tabla de inventario (nueva página si no hay espacio) ──
    if(y > 220) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Inventario actual', 14, y);
    y += 4;
    const invRows = DB.productos.map(p => [
      p.nombre,
      p.tipo || 'producto',
      p.cat || '—',
      fmtGs(p.precio),
      p.stock != null ? String(p.stock) : '—'
    ]);
    doc.autoTable({
      startY: y,
      head: [['Producto', 'Tipo', 'Categoría', 'Precio', 'Stock']],
      body: invRows.length ? invRows : [['Sin productos cargados', '', '', '', '']],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    });

    // ── Pie de página ──
    const totalPages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++){
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`${negocio} · Generado con Nomi · Pág. ${i}/${totalPages}`, 14, 290);
    }

    const nombreArchivo = `reporte-nomi-${currentPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);
    showToast('✅ PDF descargado correctamente');
  } catch(e){
    console.error('Error exportando PDF:', e);
    showToast('⚠️ Error al generar el PDF. Revisá la consola.');
  }
}

// ══════════════════════════════════════════════════════════
// FIN EXPORTACIÓN DE REPORTES
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// REPORTES CON GRÁFICOS — MODIFICADO COMPLETO
// Se agregó renderGraficosReportes() que dibuja 3 charts
// usando Chart.js (carga dinámica CDN, igual que xlsx/jsPDF)
// ══════════════════════════════════════════════════════════

// ── AGREGADO: instancias de Chart para destruirlas al re-renderizar ──
let _chartDia = null, _chartMetodos = null, _chartTopProd = null;

// ── AGREGADO: carga Chart.js dinámicamente si no está ya presente ──
async function ensureChartJs(){
  if(window.Chart) return;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js');
}

// ══ MODIFICADO: renderReportes usa rango de fechas Desde–Hasta ══
async function renderReportes(){
  // Inicializar los inputs si todavía están vacíos (primera vez que se entra)
  const inputDesde = document.getElementById('rep-fecha-desde');
  const inputHasta = document.getElementById('rep-fecha-hasta');
  if(inputDesde && !inputDesde.value){
    const hoy = hoyLocal();
    inputDesde.value = hoy;
    inputHasta.value = hoy;
  }

  // Obtener el rango activo
  const { ventas, gastos, ing, gst } = getDatosReporte();

  // ══════════════════════════════════════════════════════════
  // FASE 5: KPIs normalizados a moneda principal
  // v.total siempre está en moneda principal (TC congelado al vender)
  // ══════════════════════════════════════════════════════════
  const principal = monedaPrincipal();
  const mp        = getMoneda(principal);

  document.getElementById('rep-v').textContent   = ventas.length;
  document.getElementById('rep-i').textContent   = fmtMoneda(ing, principal);
  document.getElementById('rep-g').textContent   = fmtMoneda(gst, principal);
  document.getElementById('rep-gan').textContent = fmtMoneda(ing - gst, principal);

  // ── Actualizar label de moneda principal en desglose y modal conversión ──
  document.querySelectorAll('#rep-moneda-principal-label, .conv-mp-label')
    .forEach(el => { el.textContent = mp.simbolo + ' ' + principal; });

  // ── Desglose por moneda ──
  const porMoneda = {};
  ventas.forEach(v => {
    const code = v.moneda_cobro || principal;
    if(!porMoneda[code]) porMoneda[code] = { totalPrincipal: 0, totalOriginal: 0, cantidad: 0 };
    porMoneda[code].totalPrincipal += v.total || 0;
    porMoneda[code].totalOriginal  += v.monto_original || v.total || 0;
    porMoneda[code].cantidad++;
  });

  const codesSecundarias = Object.keys(porMoneda).filter(c => c !== principal);
  const desgloseWrap = document.getElementById('rep-desglose-monedas');
  const desgloseList = document.getElementById('rep-desglose-lista');

  if(desgloseWrap && desgloseList){
    if(codesSecundarias.length > 0){
      desgloseWrap.style.display = 'block';
      desgloseList.innerHTML = Object.entries(porMoneda).map(([code, data]) => {
        const m      = getMoneda(code);
        const esPpal = code === principal;
        const pct    = ing > 0 ? ((data.totalPrincipal / ing) * 100).toFixed(1) : 0;
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;
            border-bottom:1px solid var(--border);">
            <span style="font-size:1.1rem;">${m.pais}</span>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:.85rem;">
                ${m.code} — ${data.cantidad} venta${data.cantidad !== 1 ? 's' : ''}
              </div>
              ${!esPpal ? `<div style="font-size:.72rem;color:var(--ink3);">
                ${fmtMoneda(data.totalOriginal, code)} cobrado originalmente
              </div>` : ''}
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800;color:var(--green);font-size:.9rem;">
                ${fmtMoneda(data.totalPrincipal, principal)}
              </div>
              <div style="font-size:.7rem;color:var(--ink3);">${pct}% del total</div>
            </div>
            <div style="width:48px;height:6px;background:var(--border);
              border-radius:3px;overflow:hidden;flex-shrink:0;">
              <div style="height:100%;width:${pct}%;background:var(--green);
                border-radius:3px;"></div>
            </div>
          </div>`;
      }).join('');
    } else {
      desgloseWrap.style.display = 'none';
    }
  }

  // ── Sección diferencia de cambio ──
  await renderDifCambioReportes(ventas);
  // ══════════════════════════════════════════════════════════
  // FIN FASE 5 normalización KPIs
  // ══════════════════════════════════════════════════════════

  // ── Top Productos lista (sin cambios) ──
  const cnt = {};
  ventas.forEach(v => v.items.forEach(i => { cnt[i.nombre] = (cnt[i.nombre] || 0) + i.qty; }));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('rep-top').innerHTML = top.length
    ? top.map(([n, q], i) => `<div class="list-row"><div class="row-icon" style="background:var(--surface2);font-weight:800;font-size:.8rem;color:var(--ink3);">#${i + 1}</div><div class="row-body"><div class="row-name">${n}</div></div><div class="row-right"><div class="row-amount">${q} ud.</div></div></div>`).join('')
    : `<div class="empty-state" style="padding:28px 0"><div class="empty-icon">📊</div><div class="empty-text">Sin datos.</div></div>`;

  // ── Top Clientes lista (sin cambios) ──
  const ct = {};
  ventas.forEach(v => { if(v.clienteId) ct[v.clienteId] = (ct[v.clienteId] || 0) + v.total; });
  const topCli = Object.entries(ct).sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('rep-cli').innerHTML = topCli.length
    ? topCli.map(([id, total], i) => {
        const cl = DB.clientes.find(c => String(c.id) === String(id));
        return `<div class="list-row"><div class="row-icon" style="background:var(--surface2);font-weight:800;font-size:.8rem;color:var(--ink3);">#${i + 1}</div><div class="row-body"><div class="row-name">${cl ? cl.nombre : 'Cliente'}</div></div><div class="row-right"><div class="row-amount">${fmtGs(total)}</div></div></div>`;
      }).join('')
    : `<div class="empty-state" style="padding:28px 0"><div class="empty-icon">👥</div><div class="empty-text">Sin datos.</div></div>`;

  // ── FASE 5 + gráficos existentes ──
  await renderGraficosReportes(ventas, top);

  // ══════════════════════════════════════════════════════════
  // AGREGADO: ranking de productos más rentables
  // ══════════════════════════════════════════════════════════
  const conCosto = DB.productos.filter(p => p.costo > 0 && p.precio > 0);
  const repRent  = document.getElementById('rep-rentabilidad');
  if (repRent) {
    if (!conCosto.length) {
      repRent.innerHTML = `<div style="color:var(--ink3);font-size:.83rem;padding:12px 0;">
        Cargá el costo en tus productos para ver el ranking de rentabilidad 💡
      </div>`;
    } else {
      const sorted = [...conCosto].sort((a,b) => {
        const ma = (a.precio - a.costo) / a.precio;
        const mb = (b.precio - b.costo) / b.precio;
        return mb - ma;
      });
      // ── MODIFICADO: layout 2 filas para evitar encimamiento en móvil ──
      repRent.innerHTML = sorted.map((p, i) => {
        const gan      = p.precio - p.costo;
        const margen   = ((gan / p.precio) * 100).toFixed(1);
        const pctCosto = ((gan / p.costo) * 100).toFixed(0);
        const color    = margen >= 50 ? '#16a34a' : margen >= 30 ? '#2563eb' : margen >= 10 ? '#d97706' : '#dc2626';
        const medal    = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
          <!-- LÍNEA 1: medalla + emoji + nombre del producto -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="font-size:1.1rem;min-width:26px;flex-shrink:0;">${medal}</span>
            <span style="font-size:1.1rem;flex-shrink:0;">${p.emoji||'📦'}</span>
            <div style="font-weight:700;font-size:.88rem;word-break:break-word;line-height:1.3;">${p.nombre}</div>
          </div>
          <!-- LÍNEA 2: costo/precio a la izquierda, ganancia/margen a la derecha -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding-left:34px;">
            <div style="font-size:.72rem;color:var(--ink3);white-space:nowrap;">
              Costo ${fmtGs(p.costo)} → ${fmtGs(p.precio)}
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-weight:800;font-size:.88rem;color:${color};white-space:nowrap;">+${fmtGs(gan)}</div>
              <div style="font-size:.68rem;color:${color};font-weight:600;white-space:nowrap;">${margen}% · ${pctCosto}% s/costo</div>
            </div>
          </div>
        </div>`;
      }).join('');
      // ── FIN MODIFICADO ──
    }
  }
  // ══════════════════════════════════════════════════════════
  // FIN ranking rentabilidad
  // ══════════════════════════════════════════════════════════
}

// ══════════════════════════════════════════════════════════
// FASE 5: Diferencia de cambio + Registro de conversiones
// ══════════════════════════════════════════════════════════

async function renderDifCambioReportes(ventas){
  const wrap  = document.getElementById('rep-dif-cambio-wrap');
  const lista = document.getElementById('rep-dif-cambio-lista');
  const total = document.getElementById('rep-dif-cambio-total');
  if(!wrap || !lista || !total) return;

  const principal   = monedaPrincipal();
  const codesSecund = [...new Set(ventas
    .map(v => v.moneda_cobro)
    .filter(c => c && c !== principal))];

  if(!codesSecund.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  let conversiones = [];
  try {
    const hace30 = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const { data } = await sb
      .from('conversiones')
      .select('*')
      .eq('negocio_id', negocioId)
      .gte('fecha', hace30)
      .order('fecha', { ascending: false });
    conversiones = data || [];
  } catch(e){ console.error('Error cargando conversiones:', e); }

  if(!conversiones.length){
    lista.innerHTML = `<div style="color:var(--ink3);font-size:.8rem;padding:4px 0;">
      Aún no registraste conversiones en este período.
      Cuando cambies moneda extranjera, registralo con el botón de abajo.
    </div>`;
    total.innerHTML = '';
    return;
  }

  const difNeta  = conversiones.reduce((s, c) => s + (c.diferencia_gs || 0), 0);
  const colorDif = difNeta >= 0 ? 'var(--green)' : 'var(--red)';
  const signoDif = difNeta >= 0 ? '+' : '';

  total.innerHTML = `<span style="color:${colorDif};">
    ${signoDif}${fmtMoneda(difNeta, principal)}
  </span>`;

  lista.innerHTML = conversiones.map(c => {
    const m     = getMoneda(c.moneda_origen);
    const dif   = c.diferencia_gs || 0;
    const color = dif >= 0 ? 'var(--green)' : 'var(--red)';
    const signo = dif >= 0 ? '+' : '';
    return `
      <div style="display:flex;align-items:center;gap:10px;
        padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1rem;">${m.pais}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:.82rem;">
            ${fmtMoneda(c.monto_origen, c.moneda_origen)} → ${fmtMoneda(c.monto_gs, principal)}
          </div>
          <div style="font-size:.7rem;color:var(--ink3);">
            ${c.fecha} · TC real: ${Number(c.tc_real).toLocaleString('es-PY')} · TC sistema: ${Number(c.tc_registrado).toLocaleString('es-PY')}
            ${c.nota ? ' · ' + c.nota : ''}
          </div>
        </div>
        <div style="font-weight:800;font-size:.88rem;color:${color};white-space:nowrap;">
          ${signo}${fmtMoneda(dif, principal)}
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// FASE 5 → BALANCE: Conversiones cruzadas + panel Balance
// Soporta: secundaria→principal Y secundaria→secundaria
// ══════════════════════════════════════════════════════════

function openRegistrarConversion(){
  const principal   = monedaPrincipal();
  const habilitadas = monedasHabilitadas();
  const secundarias = habilitadas.filter(c => c !== principal);

  if(!secundarias.length){
    showToast('Habilitá monedas secundarias en Configuración primero');
    return;
  }

  // ── MODIFICADO: selectores sin preselección — opción vacía al inicio ──
  const opcionVacia = `<option value="">— Seleccioná —</option>`;

  const selOrigen = document.getElementById('conv-moneda');
  selOrigen.innerHTML = opcionVacia + habilitadas.map(code => {
    const m = getMoneda(code);
    return `<option value="${code}">${m.pais} ${m.nombre}</option>`;
  }).join('');

  const selDestino = document.getElementById('conv-moneda-destino');
  selDestino.innerHTML = opcionVacia + habilitadas.map(code => {
    const m = getMoneda(code);
    return `<option value="${code}">${m.pais} ${m.code} — ${m.nombre}</option>`;
  }).join('');
  // ── FIN MODIFICADO ──

  // Actualizar nombre moneda principal en la descripción
  const mpNombre = document.getElementById('conv-mp-nombre');
  if(mpNombre) mpNombre.textContent = getMoneda(principal).nombre;

  // Limpiar campos
  ['conv-monto-origen','conv-monto-gs','conv-nota'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  document.getElementById('conv-preview').style.display = 'none';

  onConvMonedaChange();
  openModal('conversion-overlay');
}

// ── Actualiza los TC informativos y labels al cambiar moneda ──
function onConvMonedaChange(){
  const codeOrigen  = document.getElementById('conv-moneda')?.value;
  const codeDestino = document.getElementById('conv-moneda-destino')?.value;
  const principal   = monedaPrincipal();

  if(!codeOrigen || !codeDestino) return;

  // ── AGREGADO: aviso y bloqueo total si origen y destino son la misma moneda ──
  const preview    = document.getElementById('conv-preview');
  const btnGuardar = document.querySelector('#conversion-overlay .btn-primary');
  const inputOrigen  = document.getElementById('conv-monto-origen');
  const inputDestino = document.getElementById('conv-monto-gs');
  const inputNota    = document.getElementById('conv-nota');

  const mismaMoneda = codeOrigen && codeDestino && codeOrigen === codeDestino;

  if(mismaMoneda){
    // Mostrar aviso rojo
    if(preview){
      preview.style.display  = 'block';
      preview.style.background = '#fef2f2';
      preview.style.border   = '1px solid #fecaca';
      preview.style.color    = '#991b1b';
      preview.innerHTML = `🚫 La moneda de origen y destino son la misma — seleccioná monedas diferentes`;
    }
    // Bloquear todos los inputs y el botón
    if(inputOrigen)  { inputOrigen.disabled  = true; inputOrigen.value  = ''; }
    if(inputDestino) { inputDestino.disabled = true; inputDestino.value = ''; }
    if(inputNota)    inputNota.disabled = true;
    if(btnGuardar)   btnGuardar.disabled = true;
    return;
  } else {
    // Limpiar aviso y desbloquear
    if(preview && preview.innerHTML.includes('🚫 La moneda de origen')){
      preview.style.display = 'none';
      preview.innerHTML = '';
    }
    if(inputOrigen)  inputOrigen.disabled  = false;
    if(inputDestino) inputDestino.disabled = false;
    if(inputNota)    inputNota.disabled    = false;
    if(btnGuardar)   btnGuardar.disabled   = false;
  }
  // ── FIN AGREGADO ──

  const mOrigen  = getMoneda(codeOrigen);
  const mDestino = getMoneda(codeDestino);
  const tcOrigen  = getTipoCambio(codeOrigen);
  const tcDestino = getTipoCambio(codeDestino);
  const mp        = getMoneda(principal);

  // Actualizar labels de los campos de monto
  const labelOrigen  = document.getElementById('conv-label-origen');
  const labelDestino = document.getElementById('conv-label-destino');
  if(labelOrigen)  labelOrigen.textContent  = `Monto en ${mOrigen.code}`;
  if(labelDestino) labelDestino.textContent = `${mDestino.code} recibidos (real)`;

  // Actualizar TCs informativos
  const tcOrigenVal  = document.getElementById('conv-tc-origen-val');
  const tcDestinoVal = document.getElementById('conv-tc-destino-val');
  const tcDestinoWrap = document.getElementById('conv-tc-destino-wrap');
  if(tcOrigenVal) tcOrigenVal.textContent =
    `1 ${mOrigen.code} = ${fmtMoneda(tcOrigen, principal)}`;

  // Si destino es principal, ocultar el segundo TC (no hace falta)
  if(codeDestino === principal){
    if(tcDestinoWrap) tcDestinoWrap.style.display = 'none';
  } else {
    if(tcDestinoWrap) tcDestinoWrap.style.display = '';
    if(tcDestinoVal) tcDestinoVal.textContent =
      `1 ${mDestino.code} = ${fmtMoneda(tcDestino, principal)}`;
  }

  calcConversionPreview();
}

// ── Preview en tiempo real — soporta conversión cruzada ──
function calcConversionPreview(){
  const codeOrigen  = document.getElementById('conv-moneda')?.value;
  const codeDestino = document.getElementById('conv-moneda-destino')?.value;
  const origen      = parseFloat(document.getElementById('conv-monto-origen')?.value) || 0;
  const destinoReal = parseFloat(document.getElementById('conv-monto-gs')?.value)     || 0;
  const preview     = document.getElementById('conv-preview');
  if(!preview || !codeOrigen || !codeDestino) return;
  // ── AGREGADO: no tocar el preview si hay aviso de moneda igual activo ──
  if(codeOrigen === codeDestino) return;
  // ── FIN AGREGADO ──
  if(!origen || !destinoReal){ preview.style.display = 'none'; return; }

  const principal   = monedaPrincipal();
  const tcOrigen    = getTipoCambio(codeOrigen);   // 1 USD = X Gs
  const tcDestino   = getTipoCambio(codeDestino);  // 1 ARS = X Gs (o 1 si es principal)

  // Convertir todo a moneda principal como paso intermedio
  const enPpalEsperado = origen * tcOrigen;          // lo que valía en Gs según TC sistema
  const enPpalRecibido = destinoReal * tcDestino;    // lo que recibiste, valorado en Gs

  const diferencia = enPpalRecibido - enPpalEsperado;
  const positivo   = diferencia >= 0;
  const signo      = positivo ? '+' : '';
  const color      = positivo ? '#166534' : '#991b1b';
  const bgColor    = positivo ? '#dcfce7'  : '#fee2e2';
  const mOrigen    = getMoneda(codeOrigen);
  const mDestino   = getMoneda(codeDestino);
  const mp         = getMoneda(principal);

  // Para conversión cruzada, mostrar también el TC implícito
  const tcImplicito = origen > 0 ? (destinoReal / origen).toFixed(4) : 0;

  preview.style.display    = 'block';
  preview.style.background = bgColor;
  preview.style.color      = color;
  preview.style.border     = `1.5px solid ${positivo ? '#bbf7d0' : '#fecaca'}`;
  preview.innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:.7rem;opacity:.7;margin-bottom:2px;">
          Valor sistema (${origen} ${mOrigen.code} × ${tcOrigen})
        </div>
        <div>${fmtMoneda(enPpalEsperado, principal)}</div>
      </div>
      <div>
        <div style="font-size:.7rem;opacity:.7;margin-bottom:2px;">
          Valor recibido (${destinoReal} ${mDestino.code} × ${tcDestino})
        </div>
        <div>${fmtMoneda(enPpalRecibido, principal)}</div>
      </div>
      <div>
        <div style="font-size:.7rem;opacity:.7;margin-bottom:2px;">Diferencia de cambio</div>
        <div style="font-size:1.05rem;">
          ${signo}${fmtMoneda(diferencia, principal)} ${positivo ? '🎉' : '📉'}
        </div>
      </div>
    </div>
    ${codeDestino !== principal ? `
    <div style="margin-top:8px;font-size:.72rem;opacity:.7;border-top:1px solid rgba(0,0,0,.08);padding-top:6px;">
      TC implícito: 1 ${mOrigen.code} = ${tcImplicito} ${mDestino.code}
    </div>` : ''}`;
}

// ── Guarda la conversión — soporta moneda destino variable ──
async function guardarConversion(){
  const codeOrigen  = document.getElementById('conv-moneda')?.value;
  const codeDestino = document.getElementById('conv-moneda-destino')?.value;
  const origen      = parseFloat(document.getElementById('conv-monto-origen')?.value) || 0;
  const destinoReal = parseFloat(document.getElementById('conv-monto-gs')?.value)     || 0;
  const nota        = document.getElementById('conv-nota')?.value.trim() || null;

  if(!codeOrigen || !codeDestino || !origen || !destinoReal){
    showToast('⚠️ Completá todos los campos obligatorios');
    return;
  }

  const principal = monedaPrincipal();
  const tcOrigen  = getTipoCambio(codeOrigen);
  const tcDestino = getTipoCambio(codeDestino);

  // ── AGREGADO: bloquear si origen y destino son la misma moneda ──
  if(codeOrigen === codeDestino){
    showToast('⚠️ La moneda de origen y destino no pueden ser la misma');
    return;
  }
  // ── FIN AGREGADO ──

  // ── AGREGADO: validar saldo disponible en la moneda origen ──
  if(codeOrigen !== principal){
    const ventasEnMoneda = DB.ventas
      .filter(v => (v.moneda_cobro || principal) === codeOrigen)
      .reduce((s, v) => s + (v.monto_original || 0), 0);

    let yaConvertido = 0;
    try {
      const { data: convsPrev } = await sb
        .from('conversiones')
        .select('monto_origen')
        .eq('negocio_id', negocioId)
        .eq('moneda_origen', codeOrigen);
      yaConvertido = (convsPrev || []).reduce((s, c) => s + (c.monto_origen || 0), 0);

      const { data: convsRecibidas } = await sb
        .from('conversiones')
        .select('monto_destino')
        .eq('negocio_id', negocioId)
        .eq('moneda_destino', codeOrigen);
      const recibido = (convsRecibidas || []).reduce((s, c) => s + (c.monto_destino || 0), 0);
      yaConvertido -= recibido;
    } catch(e){ console.error('Error validando saldo:', e); }

    const saldoDisponible = ventasEnMoneda - yaConvertido;

    if(origen > saldoDisponible + 0.001){
      const mOrig = getMoneda(codeOrigen);
      const saldoFmt = fmtMoneda(Math.max(0, saldoDisponible), codeOrigen);
      // Mostrar aviso detallado en el preview del modal en lugar de solo toast
      const preview = document.getElementById('conv-preview');
      if(preview){
        preview.style.display = 'block';
        preview.style.background = '#fef2f2';
        preview.style.border = '1px solid #fecaca';
        preview.style.color = '#991b1b';
        preview.innerHTML = `🚫 Saldo insuficiente en ${mOrig.pais} ${codeOrigen}<br>
          <span style="font-size:.8rem;font-weight:400;">
            Disponible en caja: <strong>${saldoFmt}</strong> · 
            Intentás convertir: <strong>${fmtMoneda(origen, codeOrigen)}</strong>
          </span>`;
      }
      showToast(`🚫 Saldo insuficiente — disponible: ${saldoFmt}`);
      return;
    }
  }
  // ── FIN AGREGADO validación saldo ──

  // Siempre guardamos en términos de moneda principal para uniformidad
  const montoEnPpal     = destinoReal * tcDestino;
  const tcRealImplicito = origen > 0 ? montoEnPpal / origen : tcOrigen;

    const ahora = new Date();
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;

  try {
    const payload = {
      negocio_id:     negocioId,
      fecha,
      moneda_origen:  codeOrigen,
      monto_origen:   origen,
      monto_gs:       montoEnPpal,
      tc_real:        tcRealImplicito,
      tc_registrado:  tcOrigen,
      // ── AGREGADO: guardar destino como columnas propias ──
      moneda_destino: codeDestino,
      monto_destino:  destinoReal,
      // ── FIN AGREGADO ──
      nota: nota
        ? `[${codeOrigen}→${codeDestino}] ${nota}`
        : `[${codeOrigen}→${codeDestino}]`
    };
    const { data: insertData, error } = await sb.from('conversiones').insert(payload).select();
    if(error) throw error;

    const mO = getMoneda(codeOrigen);
    const mD = getMoneda(codeDestino);
    closeModal('conversion-overlay');
    showToast(`✅ ${mO.pais} ${origen} ${codeOrigen} → ${mD.pais} ${destinoReal} ${codeDestino}`);

    // ── MODIFICADO: forzar apertura del acordeón de conversiones y refrescar ──
    // Abrir el acordeón de diferencia de cambio en Balance si está cerrado
    const difList = document.getElementById('bal-dif-lista');
    if(difList) difList.style.display = 'block';
    const difWrap = document.getElementById('bal-dif-cambio-wrap');
    if(difWrap) difWrap.style.display = 'block';

    // Refrescar Balance y la sección de conversiones directamente
    await renderBalance();
    await renderDifCambioBalance();

    const screenRep = document.getElementById('screen-reportes');
    if(screenRep?.classList.contains('active')) renderReportes();
    // ── FIN MODIFICADO ──

  } catch(e){
    console.error('Error guardando conversión:', e);
    showToast('⚠️ Error al registrar la conversión');
  }
}

// ── AGREGADO: eliminar conversión por ID ──
async function eliminarConversion(id){
  try {
    const { error } = await sb.from('conversiones').delete().eq('id', id).eq('negocio_id', negocioId);
    if(error) throw error;
    showToast('Conversión eliminada ✓');
    await renderBalance();
    await renderDifCambioBalance();
    await openVerConversiones(); // refresca la lista del modal
  } catch(e){
    console.error('Error eliminando conversión:', e);
    showToast('⚠️ Error al eliminar');
  }
}

// ══════════════════════════════════════════════════════════
// NUEVO: eliminar con confirmación inline (sin confirm())
// ══════════════════════════════════════════════════════════
function confirmarEliminarConversion(id){
  const lista = document.getElementById('ver-conv-lista');
  // Busca el botón por el onclick y reemplaza la fila con confirmación
  const botones = lista.querySelectorAll('button');
  botones.forEach(btn => {
    if(btn.getAttribute('onclick') === `confirmarEliminarConversion(${id})`){
      const fila = btn.closest('div[style*="border-bottom"]');
      if(!fila) return;
      // Insertar banner de confirmación debajo del contenido de la fila
      const yaConfirm = fila.querySelector('.confirm-bar');
      if(yaConfirm){ yaConfirm.remove(); return; }
      const bar = document.createElement('div');
      bar.className = 'confirm-bar';
      bar.style.cssText = `display:flex;align-items:center;justify-content:flex-end;
        gap:8px;padding:6px 0 2px;font-size:.78rem;`;
      bar.innerHTML = `
        <span style="color:var(--ink3);">¿Confirmar eliminación?</span>
        <button onclick="eliminarConversion(${id})"
          style="background:var(--red-l);color:var(--red);border:none;
            border-radius:6px;padding:4px 10px;cursor:pointer;font-weight:700;font-size:.78rem;">
          Sí, eliminar
        </button>
        <button onclick="this.closest('.confirm-bar').remove()"
          style="background:var(--surface2);color:var(--ink);border:none;
            border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.78rem;">
          Cancelar
        </button>`;
      fila.appendChild(bar);
    }
  });
}

// ══════════════════════════════════════════════════════════
// NUEVO: editar conversión — precarga el modal de registro
// ══════════════════════════════════════════════════════════
async function editarConversion(id){
  // 1. Cargar datos de la conversión desde Supabase
  let conv;
  try {
    const { data, error } = await sb
      .from('conversiones')
      .select('*')
      .eq('id', id)
      .eq('negocio_id', negocioId)
      .single();
    if(error) throw error;
    conv = data;
  } catch(e){
    showToast('⚠️ Error al cargar la conversión');
    return;
  }

  // 2. Cerrar modal de lista y abrir modal de registro
  closeModal('ver-conversiones-overlay');
  openRegistrarConversion();

  // 3. Precargar los valores en el formulario
  await new Promise(r => setTimeout(r, 80)); // esperar que el modal renderice

  const selOrigen  = document.getElementById('conv-moneda');
  const selDestino = document.getElementById('conv-moneda-destino');
  if(selOrigen)  selOrigen.value  = conv.moneda_origen  || '';
  if(selDestino) selDestino.value = conv.moneda_destino || '';
  onConvMonedaChange();

  const inputOrigen  = document.getElementById('conv-monto-origen');
  const inputDestino = document.getElementById('conv-monto-gs');
  const inputNota    = document.getElementById('conv-nota');
  if(inputOrigen)  inputOrigen.value  = conv.monto_origen  || '';
  if(inputDestino) inputDestino.value = conv.monto_destino || '';

  // Limpiar nota del prefijo [ORIG→DEST]
  const notaLimpia = (conv.nota || '').replace(/\[\w+→\w+\]\s*/, '');
  if(inputNota) inputNota.value = notaLimpia;

  calcConversionPreview();

  // 4. Cambiar el botón de "Registrar" por "Guardar cambios" y eliminar el original al guardar
  const btnGuardar = document.querySelector('#conversion-overlay .btn-primary');
  if(btnGuardar){
    btnGuardar.textContent = '💾 Guardar cambios';
    btnGuardar.onclick = async () => {
      await eliminarConversion(id); // elimina el registro viejo silenciosamente
      btnGuardar.textContent = '✅ Registrar conversión';
      btnGuardar.onclick = guardarConversion;
      await guardarConversion(); // inserta el nuevo
    };
  }
}
// ══════════════════════════════════════════════════════════
// FIN editar / eliminar conversión
// ══════════════════════════════════════════════════════════

// ── FIN AGREGADO eliminarConversion ──

// ══════════════════════════════════════════════════════════
// FIN FASE 5 → BALANCE: Conversiones cruzadas
// ══════════════════════════════════════════════════════════

// ── AGREGADO: dibuja los 3 gráficos con Chart.js ──
async function renderGraficosReportes(ventas, topProductos){
  await ensureChartJs();

  // Paleta de colores usando CSS vars del sistema
  const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
  const isDark  = document.documentElement.classList.contains('dark');
  const gridColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  // ── Helpers para destruir charts anteriores ──
  if(_chartDia)      { _chartDia.destroy();      _chartDia      = null; }
  if(_chartMetodos)  { _chartMetodos.destroy();  _chartMetodos  = null; }
  if(_chartTopProd)  { _chartTopProd.destroy();  _chartTopProd  = null; }

  // ════════════════════════════════════════════════
  // GRÁFICO 1 — Barras: Ingresos por día
  // Agrupa las ventas por fecha y suma los totales
  // ════════════════════════════════════════════════
  const diasMap = {};
  ventas.forEach(v => {
    const d = new Date(v.date);
    // Formato corto: "lun 12", "mar 13", etc.
    const key = d.toLocaleDateString('es-PY', { weekday:'short', day:'numeric' });
    diasMap[key] = (diasMap[key] || 0) + v.total;
  });
  // Ordenar por fecha real
  const ventasPorFecha = {};
  ventas.forEach(v => {
    const d = new Date(v.date);
    const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if(!ventasPorFecha[ts]) ventasPorFecha[ts] = { label: d.toLocaleDateString('es-PY',{weekday:'short',day:'numeric'}), total: 0 };
    ventasPorFecha[ts].total += v.total;
  });
  const diasOrdenados = Object.keys(ventasPorFecha).sort((a,b)=>+a-+b).map(k=>ventasPorFecha[k]);

  const ctxDia = document.getElementById('chart-ventas-dia');
  if(ctxDia){
    _chartDia = new Chart(ctxDia, {
      type: 'bar',
      data: {
        labels: diasOrdenados.length ? diasOrdenados.map(d => d.label) : ['Sin ventas'],
        datasets: [{
          label: 'Ingresos (Gs)',
          data:   diasOrdenados.length ? diasOrdenados.map(d => d.total) : [0],
          backgroundColor: '#3b82f6cc',
          borderColor:     '#3b82f6',
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + fmtGs(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: labelColor, font:{ size:11 } } },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: labelColor, font:{ size:11 },
              callback: v => {
                if(v >= 1000000) return (v/1000000).toFixed(1)+'M';
                if(v >= 1000)    return (v/1000).toFixed(0)+'K';
                return v;
              }
            }
          }
        }
      }
    });
  }

  // ════════════════════════════════════════════════
  // GRÁFICO 2 — Dona: Métodos de pago
  // Cuenta cuántas ventas hubo por cada método
  // ════════════════════════════════════════════════
  const metodosMap = {};
  ventas.forEach(v => {
    const m = v.metodoPago || v.metodo_pago || 'Efectivo';
    metodosMap[m] = (metodosMap[m] || 0) + v.total;
  });
  const metodosLabels = Object.keys(metodosMap);
  const metodosData   = metodosLabels.map(k => metodosMap[k]);

  const ctxMet = document.getElementById('chart-metodos');
  if(ctxMet){
    _chartMetodos = new Chart(ctxMet, {
      type: 'doughnut',
      data: {
        labels: metodosLabels.length ? metodosLabels : ['Sin ventas'],
        datasets: [{
          data:            metodosLabels.length ? metodosData : [1],
          backgroundColor: COLORS.slice(0, Math.max(metodosLabels.length, 1)),
          borderWidth: 2,
          borderColor: isDark ? '#1e293b' : '#ffffff',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: labelColor, font:{ size:11 }, padding: 10, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${fmtGs(ctx.parsed)}`
            }
          }
        }
      }
    });
  }

  // ════════════════════════════════════════════════
  // GRÁFICO 3 — Barras horizontales: Top 5 productos
  // Usa los mismos datos que la lista de texto
  // ════════════════════════════════════════════════
  const ctxTop = document.getElementById('chart-top-prod');
  if(ctxTop){
    const topLabels = topProductos.length ? topProductos.map(([n]) => n.length > 18 ? n.slice(0,16)+'…' : n) : ['Sin ventas'];
    const topVals   = topProductos.length ? topProductos.map(([,q]) => q)                                     : [0];

    _chartTopProd = new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: topLabels,
        datasets: [{
          label: 'Unidades vendidas',
          data:   topVals,
          backgroundColor: COLORS.slice(0, topLabels.length).map(c => c + 'cc'),
          borderColor:     COLORS.slice(0, topLabels.length),
          borderWidth: 1.5,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',   // ← hace las barras horizontales
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.parsed.x} unidades` }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: labelColor, font:{ size:11 } } },
          y: { grid: { display: false },   ticks: { color: labelColor, font:{ size:11 } } }
        }
      }
    });
  }
}
// ══════════════════════════════════════════════════════════
// FIN REPORTES CON GRÁFICOS
// ══════════════════════════════════════════════════════════

// ═══ CALC ═════════════════════════════════
function setCalcTab(tab,el){
  currentCalcTab=tab;
  document.querySelectorAll('#calc-tabs button').forEach(b=>b.className='btn btn-ghost btn-sm');
  el.className='btn btn-primary btn-sm'; initCalc();
}
function initCalc(){
  const D={
    tarjetas:{t:'🪪 Tarjetas',f:[{id:'t_p',l:'Paquetes pedidos',h:'1 paquete = 100 tarjetas',v:5},{id:'t_papel',l:'Papel/cartulina por paquete (Gs)',v:12000},{id:'t_tinta',l:'Tinta/tóner por paquete (Gs)',v:4000},{id:'t_ext',l:'Plastificado/terminación (Gs)',v:3000},{id:'t_min',l:'Minutos de producción',v:120}]},
    talonarios:{t:'📋 Talonarios',f:[{id:'ta_c',l:'Cantidad de talonarios',v:10},{id:'ta_h',l:'Hojas por talonario',v:50},{id:'ta_papel',l:'Costo papel por hoja (Gs)',v:350},{id:'ta_tinta',l:'Tinta por hoja (Gs)',v:100},{id:'ta_enc',l:'Encuadernado por talonario (Gs)',v:2000},{id:'ta_min',l:'Minutos de producción',v:180}]},
    volantes:{t:'📄 Volantes',f:[{id:'v_c',l:'Cantidad de volantes',v:500},{id:'v_papel',l:'Papel por unidad (Gs)',v:250},{id:'v_tinta',l:'Tinta por unidad (Gs)',v:150},{id:'v_min',l:'Minutos de producción',v:120}]},
    etiquetas:{t:'🏷️ Etiquetas',f:[{id:'e_pl',l:'Planchas pedidas',v:20},{id:'e_pp',l:'Etiquetas por plancha',v:24},{id:'e_papel',l:'Papel/insumo por plancha (Gs)',v:3500},{id:'e_tinta',l:'Tinta por plancha (Gs)',v:1500},{id:'e_corte',l:'Corte/terminación por plancha (Gs)',v:500},{id:'e_min',l:'Minutos de producción',v:90}]}
  };
  const d=D[currentCalcTab];
  document.getElementById('calc-body').innerHTML=`
    <div class="card"><div class="card-title">🏢 Gastos del Local</div>
      <div class="field"><label>Alquiler / Local (Gs)</label><input type="number" id="ca_alq" value="1500000" oninput="calcP()"></div>
      <div class="field"><label>Electricidad + Internet (Gs)</label><input type="number" id="ca_ser" value="350000" oninput="calcP()"></div>
      <div class="field"><label>Sueldos / Personal (Gs)</label><input type="number" id="ca_sue" value="2500000" oninput="calcP()"></div>
      <div class="field"><label>Horas laborales al mes</label><input type="number" id="ca_hs" value="160" oninput="calcP()"></div>
    </div>
    <div class="card"><div class="card-title">${d.t}</div>
      ${d.f.map(f=>`<div class="field"><label>${f.l}${f.h?`<span class="hint">${f.h}</span>`:''}</label><input type="number" id="${f.id}" value="${f.v}" oninput="calcP()"></div>`).join('')}
    </div>
    <div class="card"><div class="card-title">💰 Precio y Margen</div>
      <div class="field"><label>Empaque / envío (Gs)</label><input type="number" id="ca_emp" value="5000" oninput="calcP()"></div>
      <div class="field"><label>% Margen de ganancia</label><input type="number" id="ca_mar" value="50" oninput="calcP()"></div>
      <div class="field"><label>% IVA u otros impuestos</label><input type="number" id="ca_iva" value="10" oninput="calcP()"></div>
    </div>`;
  calcP();
}
function g(id){return +document.getElementById(id)?.value||0;}
function calcP(){
  const cph=(g('ca_alq')+g('ca_ser')+g('ca_sue'))/(g('ca_hs')||1);
  let mat=0,mins=0,u=1,lu='u';
  if(currentCalcTab==='tarjetas'){const p=g('t_p')||1;mat=(g('t_papel')+g('t_tinta')+g('t_ext'))*p;mins=g('t_min');u=p;lu='paquete';}
  else if(currentCalcTab==='talonarios'){const c=g('ta_c')||1,h=g('ta_h')||1;mat=(g('ta_papel')+g('ta_tinta'))*h*c+g('ta_enc')*c;mins=g('ta_min');u=c;lu='talonario';}
  else if(currentCalcTab==='volantes'){const c=g('v_c')||1;mat=(g('v_papel')+g('v_tinta'))*c;mins=g('v_min');u=c;lu='volante';}
  else{const p=g('e_pl')||1;mat=(g('e_papel')+g('e_tinta')+g('e_corte'))*p;mins=g('e_min');u=p;lu='plancha';}
  const costo=mat+cph*(mins/60)+g('ca_emp'),psi=costo*(1+g('ca_mar')/100),imp=psi*(g('ca_iva')/100),pf=psi+imp,gan=psi-costo;
  const cu=v=>u>0?fmtGs(v/u)+'/'+lu:'—';
  document.getElementById('c-costo').textContent=fmtGs(costo);document.getElementById('c-cu').textContent=cu(costo);
  document.getElementById('c-precio').textContent=fmtGs(psi);document.getElementById('c-pu').textContent=cu(psi);
  document.getElementById('c-total').textContent=fmtGs(pf);document.getElementById('c-tu').textContent=cu(pf);
  document.getElementById('c-gan').textContent=fmtGs(gan);
  document.getElementById('c-gpct').textContent=costo>0?`${((gan/costo)*100).toFixed(1)}% sobre costo`:'—';
}

// ═══ CONFIG ════════════════════════════════
// ═══ CONFIG ════════════════════════════════
// ── MODIFICADO: se agrega validación del select cfg-tipo y botón borrar logo ──
function loadConfig(){
  const c=DB.config;
  document.getElementById('cfg-nombre').value=c.nombre||'';

  // ── CORREGIDO: forzar selección correcta en el <select> ──
  // Si el valor de la DB no coincide con ninguna opción, queda en 'Otro'
  const tipoEl=document.getElementById('cfg-tipo');
  const tipoOpts=[...tipoEl.options].map(o=>o.value);
  tipoEl.value=tipoOpts.includes(c.tipo)?c.tipo:'Otro';

  document.getElementById('cfg-tel').value=c.tel||'';
  document.getElementById('cfg-ruc').value=c.ruc||'';
  document.getElementById('cfg-dir').value=c.dir||'';
  document.getElementById('cfg-slogan').value=c.slogan||'';
  document.getElementById('cfg-msg').value=c.ticketMsg||'';
  document.getElementById('cfg-copias').value=c.copias||1;
  document.getElementById('cfg-autoprint').value=c.autoprint||'preguntar';
  const po=document.querySelector(`[data-p="${c.impresora||'termica'}"]`);
  if(po) selectPrinter(c.impresora||'termica',po);
  // ── LÍNEAS AGREGADAS FASE 1: cargar panel de monedas ──
  loadConfigMonedas();
  // ── FIN LÍNEAS AGREGADAS ──
  // ── NUEVO: cargar zona horaria en el selector ──
  const zonaEl = document.getElementById('cfg-zona-horaria');
  if (zonaEl) zonaEl.value = DB.config.zona_horaria || 'America/Asuncion';
  // ── FIN NUEVO ──

  // ── CORREGIDO: mostrar logo con botón para eliminarlo ──
  const wrap=document.getElementById('logo-preview-wrap');
  if(c.logoDataUrl){
    wrap.innerHTML=`
      <img src="${c.logoDataUrl}" class="logo-preview">
      <div style="font-size:.75rem;color:var(--ink3);margin-top:6px;">Clic para cambiar</div>
      <button onclick="event.stopPropagation();removeLogo()"
        style="margin-top:8px;padding:5px 12px;background:var(--red-l);color:var(--red);border:none;border-radius:100px;font-size:.72rem;font-weight:700;cursor:pointer;">
        🗑 Quitar logo
      </button>`;
  } else {
    wrap.innerHTML=`
      <div style="font-size:2.5rem;margin-bottom:8px;">🖼️</div>
      <div style="font-weight:600;font-size:.85rem;color:var(--ink2);">Subir logo</div>
      <div style="font-size:.75rem;color:var(--ink3);margin-top:4px;">Arrastrá o clic — PNG, JPG, SVG · Máx 500KB</div>`;
  }
}

// ── AGREGADO: elimina el logo del caché y de Supabase ──
async function removeLogo(){
  if(!confirm('¿Quitar el logo del negocio?')) return;
  try{
    // ── MODIFICADO ETAPA 3A: filtrar por negocio_id ──
    const {error}=await sb.from('config').update({logo_url:''}).eq('negocio_id', negocioId);
    // ── FIN MODIFICADO 3A ──
    if(error) throw error;
    DB.config.logoDataUrl='';
    loadConfig(); // Refresca la vista del logo
    showToast('Logo eliminado ✓');
  }catch(e){console.error(e);showToast('⚠️ Error al quitar el logo');}
}

// ══════════════════════════════════════════════════════════
// FASE 1 MULTI-MONEDA: Catálogo de monedas + lógica config
// ══════════════════════════════════════════════════════════

// ── Catálogo completo de monedas de América ──
// ══ MODIFICADO: agregado campo iso2 para flag-icons ══
const MONEDAS_CONO_SUR = [
  { code:'PYG', simbolo:'Gs',  nombre:'Guaraní paraguayo',    pais:'🇵🇾', iso2:'py' },
  { code:'USD', simbolo:'$',   nombre:'Dólar estadounidense', pais:'🇺🇸', iso2:'us' },
  { code:'ARS', simbolo:'$',   nombre:'Peso argentino',       pais:'🇦🇷', iso2:'ar' },
  { code:'BRL', simbolo:'R$',  nombre:'Real brasileño',       pais:'🇧🇷', iso2:'br' },
  { code:'UYU', simbolo:'$U',  nombre:'Peso uruguayo',        pais:'🇺🇾', iso2:'uy' },
  { code:'CLP', simbolo:'$',   nombre:'Peso chileno',         pais:'🇨🇱', iso2:'cl' },
  { code:'BOB', simbolo:'Bs',  nombre:'Boliviano',            pais:'🇧🇴', iso2:'bo' },
  { code:'PEN', simbolo:'S/',  nombre:'Sol peruano',          pais:'🇵🇪', iso2:'pe' },
  { code:'COP', simbolo:'$',   nombre:'Peso colombiano',      pais:'🇨🇴', iso2:'co' },
  { code:'VES', simbolo:'Bs.', nombre:'Bolívar venezolano',   pais:'🇻🇪', iso2:'ve' },
];

const MONEDAS_EXTRA = [
  { code:'MXN', simbolo:'$',   nombre:'Peso mexicano',        pais:'🇲🇽', iso2:'mx' },
  { code:'GTQ', simbolo:'Q',   nombre:'Quetzal guatemalteco', pais:'🇬🇹', iso2:'gt' },
  { code:'HNL', simbolo:'L',   nombre:'Lempira hondureño',    pais:'🇭🇳', iso2:'hn' },
  { code:'NIO', simbolo:'C$',  nombre:'Córdoba nicaragüense', pais:'🇳🇮', iso2:'ni' },
  { code:'CRC', simbolo:'₡',   nombre:'Colón costarricense',  pais:'🇨🇷', iso2:'cr' },
  { code:'PAB', simbolo:'B/',  nombre:'Balboa panameño',      pais:'🇵🇦', iso2:'pa' },
  { code:'CUP', simbolo:'$',   nombre:'Peso cubano',          pais:'🇨🇺', iso2:'cu' },
  { code:'DOP', simbolo:'$',   nombre:'Peso dominicano',      pais:'🇩🇴', iso2:'do' },
  { code:'HTG', simbolo:'G',   nombre:'Gourde haitiano',      pais:'🇭🇹', iso2:'ht' },
  { code:'JMD', simbolo:'$',   nombre:'Dólar jamaicano',      pais:'🇯🇲', iso2:'jm' },
  { code:'TTD', simbolo:'$',   nombre:'Dólar de Trinidad',    pais:'🇹🇹', iso2:'tt' },
  { code:'BBD', simbolo:'$',   nombre:'Dólar de Barbados',    pais:'🇧🇧', iso2:'bb' },
  { code:'GYD', simbolo:'$',   nombre:'Dólar guyanés',        pais:'🇬🇾', iso2:'gy' },
  { code:'SRD', simbolo:'$',   nombre:'Dólar surinamés',      pais:'🇸🇷', iso2:'sr' },
  { code:'CAD', simbolo:'$',   nombre:'Dólar canadiense',     pais:'🇨🇦', iso2:'ca' },
];
// ══ FIN MODIFICADO ══

// ══ AGREGADO: helper que devuelve el HTML de la bandera como imagen real ══
// Uso: bandera(m)  →  <span class="fi fi-py"></span>
// Tamaño se controla con fontSize del contenedor padre, o pasa un size opcional
function bandera(m, size = '1.2rem') {
  if (!m?.iso2) return m?.pais || '🌐'; // fallback a emoji si no hay iso2
  return `<span class="fi fi-${m.iso2}" style="font-size:${size};border-radius:2px;flex-shrink:0;"></span>`;
}
// ══ FIN AGREGADO ══

// ── Helpers de moneda ──

// Devuelve el objeto moneda por código
function getMoneda(code) {
  return [...MONEDAS_CONO_SUR, ...MONEDAS_EXTRA].find(m => m.code === code)
    || { code, simbolo: code, nombre: code, pais: '🌐' };
}

// Formatea un número en la moneda indicada
function fmtMoneda(n, code) {
  const m = getMoneda(code || monedaPrincipal());
  const decimales = ['PYG','CLP'].includes(m.code) ? 0 : 2;
  return `${m.simbolo} ${Number(n).toLocaleString('es-PY', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  })}`;
}

// ── Versión con bandera + código ISO para contextos donde el símbolo es ambiguo ──
// Ej: en lugar de "$ 10.00" muestra "🇺🇸 USD 10.00"
// Si es la moneda principal, usa el formato normal (más limpio para lectura cotidiana)
function fmtMonedaConCodigo(n, code) {
  const principal = monedaPrincipal();
  const m         = getMoneda(code || principal);
  const decimales = ['PYG','CLP'].includes(m.code) ? 0 : 2;
  const numero    = Number(n).toLocaleString('es-PY', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
  // Si es la moneda principal, símbolo es suficiente (no ambiguo en ese contexto)
  if(m.code === principal){
    return `${m.simbolo} ${numero}`;
  }
  // Para monedas secundarias: bandera + código ISO + número
  return `${m.pais} ${m.code} ${numero}`;
}

// Devuelve la moneda principal configurada
function monedaPrincipal() {
  return DB.config?.moneda_principal || 'PYG';
}

// Devuelve array de códigos de monedas habilitadas (incluye principal)
function monedasHabilitadas() {
  const hab = DB.config?.monedas_habilitadas || [];
  const principal = monedaPrincipal();
  // Asegurar que la principal siempre esté
  if (!hab.includes(principal)) return [principal, ...hab];
  return hab;
}

// Devuelve el TC de una moneda secundaria → moneda principal
// 1 USD = X PYG  (cuántas unidades de moneda principal vale 1 unidad de la moneda)
function getTipoCambio(code) {
  if (code === monedaPrincipal()) return 1;
  const tc = DB.config?.tipos_cambio || {};
  return tc[code] || 1;
}

// Convierte un monto en moneda secundaria a moneda principal
function convertirAMonedaPrincipal(monto, code) {
  return monto * getTipoCambio(code);
}

// Convierte un monto en moneda principal a moneda secundaria
function convertirDesdeMonedaPrincipal(monto, code) {
  const tc = getTipoCambio(code);
  return tc > 0 ? monto / tc : 0;
}

// ── Renderizar selector de moneda principal en Config ──
function renderSelectorMonedaPrincipal() {
  const sel = document.getElementById('cfg-moneda-principal');
  if (!sel) return;
  const actual = monedaPrincipal();
  sel.innerHTML = [...MONEDAS_CONO_SUR, ...MONEDAS_EXTRA].map(m =>
    `<option value="${m.code}" ${m.code === actual ? 'selected' : ''}>
      ${m.pais} ${m.nombre}
    </option>`
  ).join('');
}

// ── Renderizar checkboxes de monedas secundarias ──
function renderMonedaCheckboxes() {
  const principal    = monedaPrincipal();
  const habilitadas  = monedasHabilitadas();
  const contenedor   = document.getElementById('cfg-monedas-secundarias');
  const extraContenedor = document.getElementById('cfg-monedas-extra');
  if (!contenedor) return;

  // Cono Sur (sin la principal)
  contenedor.innerHTML = MONEDAS_CONO_SUR
    .filter(m => m.code !== principal)
    .map(m => _checkboxMoneda(m, habilitadas.includes(m.code)))
    .join('');

  // Extra
  if (extraContenedor) {
    extraContenedor.innerHTML = MONEDAS_EXTRA
      .map(m => _checkboxMoneda(m, habilitadas.includes(m.code)))
      .join('');
  }
}

// ── CORREGIDO: cambiado <label>+<input> por <div> para evitar el doble disparo
//    del click que el navegador genera cuando un label activa su checkbox interno ──
function _checkboxMoneda(m, checked) {
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
      border:1.5px solid ${checked ? 'var(--green)' : 'var(--border)'};
      border-radius:var(--r-sm);cursor:pointer;font-size:.83rem;font-weight:600;
      background:${checked ? 'var(--green-l)' : 'var(--surface)'};
      transition:all .15s;user-select:none;"
      onclick="toggleMonedaHabilitada('${m.code}')">
      ${bandera(m, '1.4rem')}
      <span style="font-size:.75rem;font-weight:600;color:var(--ink2);">${m.code}</span>
      <span style="font-size:.8rem;">${checked ? '✅' : '⬜'}</span>
    </div>`;
}

// ── Toggle de moneda habilitada ──
// ── CORREGIDO: en lugar de manipular estilos manualmente (que fallaba cuando
//    el click venía de un <span> hijo), ahora simplemente rerenderiza todo. ──
function toggleMonedaHabilitada(code) {
  const principal = monedaPrincipal();
  if (code === principal) { showToast('La moneda principal siempre está habilitada'); return; }
  if (!DB.config.monedas_habilitadas) DB.config.monedas_habilitadas = [];
  const idx = DB.config.monedas_habilitadas.indexOf(code);
  if (idx >= 0) {
    DB.config.monedas_habilitadas.splice(idx, 1);
  } else {
    DB.config.monedas_habilitadas.push(code);
  }
  // Rerenderizar checkboxes y grilla de TC para reflejar el cambio
  renderMonedaCheckboxes();
  renderTiposCambioConfig();
}

// ── Cuando cambia la moneda principal ──
function onMonedaPrincipalChange(code) {
  DB.config.moneda_principal = code;
  renderMonedaCheckboxes();
  renderTiposCambioConfig();
  showToast(`Moneda principal: ${code}`);
}

// ── Mostrar/ocultar panel de más monedas ──
function toggleMasMonedas() {
  const panel = document.getElementById('cfg-monedas-mas');
  const btn   = document.getElementById('btn-mas-monedas');
  if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  btn.textContent = visible ? '➕ Más monedas de América' : '➖ Ocultar otras monedas';
}

// ── Renderizar campos de tipo de cambio en Config ──
function renderTiposCambioConfig() {
  const grid = document.getElementById('cfg-tipos-cambio-grid');
  if (!grid) return;
  const principal   = monedaPrincipal();
  const habilitadas = monedasHabilitadas().filter(c => c !== principal);
  const tc          = DB.config?.tipos_cambio || {};
  const mPrincipal  = getMoneda(principal);

  if (!habilitadas.length) {
    grid.innerHTML = `<div style="color:var(--ink3);font-size:.82rem;">
      Habilitá al menos una moneda secundaria para configurar tipos de cambio.
    </div>`;
    return;
  }

  grid.innerHTML = habilitadas.map(code => {
    const m = getMoneda(code);
    return `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:.78rem;font-weight:600;color:var(--ink2);display:flex;align-items:center;gap:5px;">
          ${bandera(m, '1rem')} 1 ${m.code} =
        </label>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="number" id="tc-${code}"
            value="${tc[code] || ''}"
            placeholder="0"
            min="0" step="any"
            style="width:100%;padding:8px 10px;border:1.5px solid var(--border);
              border-radius:var(--r-sm);font-family:var(--font);font-size:.88rem;
              background:var(--bg);outline:none;font-weight:700;"
            oninput="onTCInput('${code}', this.value)">
          <span style="font-size:.8rem;font-weight:700;color:var(--ink2);white-space:nowrap;">
            ${mPrincipal.simbolo}
          </span>
        </div>
      </div>`;
  }).join('');
}

// ── Actualizar TC en el caché al escribir ──
function onTCInput(code, val) {
  if (!DB.config.tipos_cambio) DB.config.tipos_cambio = {};
  DB.config.tipos_cambio[code] = parseFloat(val) || 0;
}

// ── Cargar valores de moneda en el panel Config ──
function loadConfigMonedas() {
  renderSelectorMonedaPrincipal();
  renderMonedaCheckboxes();
  renderTiposCambioConfig();
}

// ══════════════════════════════════════════════════════════
// FIN FASE 1 MULTI-MONEDA
// ══════════════════════════════════════════════════════════

async function saveConfig(){
  const nombre=document.getElementById('cfg-nombre').value.trim()||'Mi Negocio';
  // ── FASE 1 MULTI-MONEDA: leer valores de moneda antes de guardar ──
  const tcGuardar = DB.config.tipos_cambio || {};
  document.querySelectorAll('[id^="tc-"]').forEach(input => {
    const code = input.id.replace('tc-', '');
    const val  = parseFloat(input.value);
    if (val > 0) tcGuardar[code] = val;
  });

  // ── NUEVO: leer zona horaria seleccionada ──
  const zonaHorariaEl = document.getElementById('cfg-zona-horaria');
  const zonaHoraria   = zonaHorariaEl ? zonaHorariaEl.value : 'America/Asuncion';
  // ── FIN NUEVO ──

  const row={
    nombre,
    tipo:                document.getElementById('cfg-tipo').value,
    tel:                 document.getElementById('cfg-tel').value.trim(),
    ruc:                 document.getElementById('cfg-ruc').value.trim(),
    dir:                 document.getElementById('cfg-dir').value.trim(),
    slogan:              document.getElementById('cfg-slogan').value.trim(),
    ticket_msg:          document.getElementById('cfg-msg').value.trim(),
    copias:              +document.getElementById('cfg-copias').value||1,
    autoprint:           document.getElementById('cfg-autoprint').value,
    impresora:           printerSelected,
    logo_url:            DB.config.logoDataUrl||'',
    // ── LÍNEAS AGREGADAS FASE 1 ──
    moneda_principal:    DB.config.moneda_principal    || 'PYG',
    monedas_habilitadas: DB.config.monedas_habilitadas || [],
    tipos_cambio:        tcGuardar,
    // ── FIN LÍNEAS AGREGADAS ──
    // ── NUEVO: guardar zona horaria ──
    zona_horaria:        zonaHoraria
    // ── FIN NUEVO ──
  };
  try{
    // ── MODIFICADO ETAPA 3A: filtrar por negocio_id en lugar de id fijo ──
    const {error}=await sb.from('config').update(row).eq('negocio_id', negocioId);
    // ── FIN MODIFICADO 3A ──
    if(error) throw error;
    // ── MODIFICADO: también actualizamos ticketMsg en el caché ──
    Object.assign(DB.config,{...row,ticketMsg:row.ticket_msg,logoDataUrl:row.logo_url});
    document.getElementById('sb-biz-name').textContent=nombre;
    document.getElementById('sb-biz-type').textContent=row.tipo;
    // ══ MODIFICADO: logo negocio en sidebar ══
    const sbImg2 = document.getElementById('sb-logo-img');
    const sbIni2 = document.getElementById('sb-logo-inicial');
    if(DB.config.logoDataUrl){
      sbImg2.src = DB.config.logoDataUrl;
      sbImg2.style.display = 'block';
      sbIni2.style.display = 'none';
    } else {
      sbImg2.style.display = 'none';
      sbIni2.style.display = '';
      sbIni2.textContent = nombre.charAt(0).toUpperCase();
    }
    // ══ FIN MODIFICADO ══
    // ── NUEVO: banner de confirmación visible en la pantalla de config ──
    showSaveConfirmation();
    // ── FIN NUEVO ──
  } catch(e){
    console.error(e);
    // ── MEJORADO: mensaje de error más informativo ──
    const msg=e?.message||'';
    if(msg.includes('ticket_msg')||msg.includes('column')){
      showToast('⚠️ Falta la columna ticket_msg en Supabase. Añadila como TEXT.');
    } else if(msg.includes('zona_horaria')||msg.includes('column')){
      // Si la columna zona_horaria aún no existe en Supabase, guardar sin ella
      delete row.zona_horaria;
      await sb.from('config').update(row).eq('negocio_id', negocioId);
      DB.config.zona_horaria = zonaHoraria; // guardar solo en caché local
      showSaveConfirmation();
    } else {
      showToast('⚠️ Error al guardar: '+msg.substring(0,60));
    }
  }
}

// ── NUEVO: muestra banner verde "Cambios guardados" en pantalla config ──
// ══ MODIFICADO: se eliminó el showToast duplicado, solo queda el banner verde central ══
function showSaveConfirmation() {
  // Banner flotante en el topbar de config
  let banner = document.getElementById('cfg-save-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cfg-save-banner';
    // ── MODIFICADO: solo estilos de posición/layout aquí; color en CSS ──
    banner.style.cssText = `
      position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-10px);
      padding:10px 24px;border-radius:100px;
      font-size:.85rem;font-weight:700;z-index:9999;
      box-shadow:0 4px 16px rgba(0,0,0,.18);
      transition:all .3s cubic-bezier(.34,1.56,.64,1);
      opacity:0;pointer-events:none;white-space:nowrap;`;
    document.body.appendChild(banner);
  }
  banner.innerHTML = '✅ ¡Cambios guardados!';
  // Animación: aparece y desaparece
  requestAnimationFrame(() => {
    banner.style.opacity = '1';
    banner.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 2800);
}
// ══ FIN MODIFICADO ══
// ── FIN NUEVO showSaveConfirmation ──

function selectPrinter(type,el){
  printerSelected=type;
  document.querySelectorAll('.printer-option').forEach(o=>{o.classList.remove('selected');o.querySelector('.po-check').textContent='';});
  if(el){el.classList.add('selected');el.querySelector('.po-check').textContent='✓';}
}

// ── MODIFICADO: valida tamaño del logo antes de guardar (máx 500KB) ──
function handleLogoUpload(e){
  const file=e.target.files[0];if(!file)return;
  // ── AGREGADO: validación de tamaño ──
  if(file.size>500*1024){
    showToast('⚠️ El logo pesa más de 500KB. Usá una imagen más pequeña.');
    e.target.value='';
    return;
  }
  const r=new FileReader();
  r.onload=async ev=>{
    DB.config.logoDataUrl=ev.target.result;
    const wrap=document.getElementById('logo-preview-wrap');
    wrap.innerHTML=`
      <img src="${ev.target.result}" class="logo-preview">
      <div style="font-size:.75rem;color:var(--ink3);margin-top:6px;">Clic para cambiar</div>
      <button onclick="event.stopPropagation();removeLogo()"
        style="margin-top:8px;padding:5px 12px;background:var(--red-l);color:var(--red);border:none;border-radius:100px;font-size:.72rem;font-weight:700;cursor:pointer;">
        🗑 Quitar logo
      </button>`;
    // Guardar en Supabase
    const {error}=await sb.from('config').update({logo_url:ev.target.result}).eq('id',1);
    if(error){showToast('⚠️ Error al guardar logo: '+error.message.substring(0,50));return;}
    showToast('Logo cargado ✓');
  };
  r.readAsDataURL(file);
}

// ── MODIFICADO: misma validación para drag & drop ──
function handleLogoDrop(e){
  e.preventDefault();
  const file=e.dataTransfer.files[0];
  if(!file||!file.type.startsWith('image/'))return;
  // ── AGREGADO: validación de tamaño ──
  if(file.size>500*1024){
    showToast('⚠️ El logo pesa más de 500KB. Usá una imagen más pequeña.');
    return;
  }
  const r=new FileReader();
  r.onload=async ev=>{
    DB.config.logoDataUrl=ev.target.result;
    const wrap=document.getElementById('logo-preview-wrap');
    wrap.innerHTML=`
      <img src="${ev.target.result}" class="logo-preview">
      <div style="font-size:.75rem;color:var(--ink3);margin-top:6px;">Clic para cambiar</div>
      <button onclick="event.stopPropagation();removeLogo()"
        style="margin-top:8px;padding:5px 12px;background:var(--red-l);color:var(--red);border:none;border-radius:100px;font-size:.72rem;font-weight:700;cursor:pointer;">
        🗑 Quitar logo
      </button>`;
    const {error}=await sb.from('config').update({logo_url:ev.target.result}).eq('id',1);
    if(error){showToast('⚠️ Error al guardar logo: '+error.message.substring(0,50));return;}
    showToast('Logo cargado ✓');
  };
  r.readAsDataURL(file);
}
// ═══ UTILS ═════════════════════════════════
function fmtGs(n){return 'Gs '+Math.round(n).toLocaleString('es-PY');}

// ── NUEVO: helper para obtener la zona horaria activa ──
function getZonaHoraria() {
  return DB.config?.zona_horaria || 'America/Asuncion';
}
// ── FIN NUEVO ──

// ── MODIFICADO: fmtDate ahora respeta la zona horaria configurada ──
function fmtDate(d){
  if(!d)return '—';
  // Si es una fecha "solo día" (YYYY-MM-DD), usar mediodía para evitar desfase UTC
  const dt=typeof d==='string'&&d.length===10?new Date(d+'T12:00:00'):new Date(d);
  // ── NUEVO: usar timeZone de la configuración ──
  return dt.toLocaleDateString('es-PY',{
    day:'numeric', month:'short', year:'numeric',
    timeZone: getZonaHoraria()
  });
}
// ── NUEVO: formateo de fecha+hora con zona horaria ──
function fmtDateTime(d){
  if(!d)return '—';
  const dt = new Date(d);
  return dt.toLocaleString('es-PY',{
    day:'2-digit', month:'2-digit', year:'2-digit',
    hour:'2-digit', minute:'2-digit',
    timeZone: getZonaHoraria()
  });
}
// ── FIN NUEVO fmtDateTime ──
function timeAgo(d){
  const diff=(Date.now()-new Date(d))/1000;
  if(diff<60)return 'Ahora';if(diff<3600)return `${Math.floor(diff/60)} min`;if(diff<86400)return `${Math.floor(diff/3600)} hs`;return fmtDate(d);
}
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);
}
document.addEventListener('wheel',()=>{if(document.activeElement?.type==='number')document.activeElement.blur();},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSidePanel();});

// ══════════════════════════════════════════════════════════
// GESTIÓN DE GASTOS: EDITAR Y ELIMINAR
// ▼▼▼ BLOQUE NUEVO COMPLETO ▼▼▼
// ══════════════════════════════════════════════════════════

// Abre el modal de edición con los datos del gasto precargados
function openEditGasto(id) {
  const g = DB.gastos.find(x => x.id === id);
  if (!g) return;
  document.getElementById('gasto-edit-id').value    = id;
  document.getElementById('gasto-edit-desc').value  = g.desc || g.descripcion || '';
  document.getElementById('gasto-edit-amount').value = g.amount;
  document.getElementById('gasto-edit-cat').value   = g.cat || 'Otros';
  openModal('gasto-edit-overlay');
  setTimeout(() => document.getElementById('gasto-edit-desc').focus(), 200);
}

// Guarda los cambios del gasto en Supabase y actualiza la vista
async function saveEditGasto() {
  const id     = +document.getElementById('gasto-edit-id').value;
  const desc   = document.getElementById('gasto-edit-desc').value.trim();
  const amount = +document.getElementById('gasto-edit-amount').value || 0;
  const cat    = document.getElementById('gasto-edit-cat').value;
  if (!desc || !amount) { showToast('Completá todos los campos'); return; }
  try {
    const { error } = await sb.from('gastos').update({ descripcion: desc, amount, cat }).eq('id', id);
    if (error) throw error;
    // Actualizar caché local
    const idx = DB.gastos.findIndex(x => x.id === id);
    if (idx >= 0) Object.assign(DB.gastos[idx], { desc, descripcion: desc, amount, cat });
    closeModal('gasto-edit-overlay');
    renderGastos(); renderBalance(); renderInicio();
    showToast('Gasto actualizado ✓');
  } catch(e) { console.error(e); showToast('⚠️ Error al actualizar gasto'); }
}

// Elimina un gasto de Supabase con confirmación visual
async function deleteGasto(id) {
  const g = DB.gastos.find(x => x.id === id);
  if (!g) return;
  if (!confirm(`¿Eliminar el gasto "${g.desc || g.descripcion}"?\nEsta acción no se puede deshacer.`)) return;
  try {
    const { error } = await sb.from('gastos').delete().eq('id', id);
    if (error) throw error;
    DB.gastos = DB.gastos.filter(x => x.id !== id);
    renderGastos(); renderBalance(); renderInicio();
    showToast('Gasto eliminado');
  } catch(e) { console.error(e); showToast('⚠️ Error al eliminar gasto'); }
}

// ══════════════════════════════════════════════════════════
// GESTIÓN DE VENTAS: VER DETALLE Y ELIMINAR
// ▼▼▼ BLOQUE NUEVO COMPLETO ▼▼▼
// ══════════════════════════════════════════════════════════

// Variable temporal para la venta que se está viendo en el modal
let _ventaDetail = null;

// Abre el modal con el detalle completo de una venta
function openVentaDetail(id) {
  const v = DB.ventas.find(x => x.id === id);
  if (!v) return;
  _ventaDetail = v;

  const items = v.items || [];
  const itemsHtml = items.length
    ? items.map(i => `
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:.85rem;">
          <span>${i.emoji || '📦'} ${i.nombre} × ${i.qty}</span>
          <span style="font-weight:700;">${fmtGs(i.precio * i.qty)}</span>
        </div>`).join('')
    : `<div style="font-size:.83rem;color:var(--ink3);padding:8px 0;">Sin ítems registrados.</div>`;

  // ── FASE 5 FIX: calcular datos de moneda para el detalle ──
  const principal      = monedaPrincipal();
  const codeCobro      = v.moneda_cobro || principal;
  const tieneSecundaria = codeCobro !== principal && v.monto_original;
  const mCobro         = getMoneda(codeCobro);

  document.getElementById('venta-detail-body').innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
      <span class="tag tag-green">💰 ${fmtMoneda(v.total, principal)}</span>
      ${tieneSecundaria ? `
        <span class="tag" style="background:#fef9c3;color:#854d0e;border:1px solid #fde047;">
          ${mCobro.pais} ${fmtMoneda(v.monto_original, codeCobro)}
          <span style="font-size:.68rem;opacity:.7;margin-left:3px;">TC ${v.tc_usado}</span>
        </span>` : ''}
      <span class="tag tag-blue">💳 ${v.pago || 'Efectivo'}</span>
      ${v.clienteNombre ? `<span class="tag tag-purple">👤 ${v.clienteNombre}</span>` : ''}
      <span class="tag" style="background:var(--surface2);color:var(--ink3);">📅 ${fmtDate(v.date)} · ${new Date(v.date).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit',timeZone:getZonaHoraria()})}</span>
    </div>
    <div style="background:var(--surface2);border-radius:var(--r-sm);padding:14px 16px;">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3);margin-bottom:8px;">Ítems</div>
      ${itemsHtml}
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-weight:800;font-size:.92rem;">
        <span>Total</span>
        <span style="color:var(--green);">${fmtMoneda(v.total, principal)}</span>
      </div>
      ${tieneSecundaria ? `
        <div style="display:flex;justify-content:space-between;padding:4px 0 0;
          font-size:.8rem;color:var(--ink3);">
          <span>Cobrado en ${mCobro.code}</span>
          <span style="font-weight:700;color:#854d0e;">
            ${fmtMoneda(v.monto_original, codeCobro)}
          </span>
        </div>` : ''}
    </div>
    <!-- ══ LÍNEA AGREGADA: mostrar nota en detalle de venta ══ -->
    ${v.nota ? `<div style="margin-top:12px;padding:10px 14px;background:var(--surface2);
      border-radius:var(--r-sm);border-left:3px solid var(--yellow,#f59e0b);">
      <span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ink3);">📝 Nota</span>
      <div style="font-size:.88rem;margin-top:4px;">${v.nota}</div>
    </div>` : ''}
    <!-- ══ FIN LÍNEA AGREGADA ══ -->`;

  openModal('venta-detail-overlay');
}

// Reimprime el ticket de la venta que está en el modal
function reimprVentaDetail() {
  if (!_ventaDetail) return;
  lastVenta = _ventaDetail;
  doPrint();
}

// Pide confirmación y elimina la venta de Supabase
// ── MODIFICADO: se agregó restauración automática de stock al eliminar venta ──
async function confirmarDeleteVenta() {
  if (!_ventaDetail) return;
  const v = _ventaDetail;
  if (!confirm(`¿Eliminar la venta #${v.num || v.id} por ${fmtGs(v.total)}?\nEl stock de los productos se restaurará automáticamente.\nEsta acción no se puede deshacer.`)) return;
  try {
    const items = v.items || [];

    // ── AGREGADO: restaurar stock por cada ítem de la venta ──
    for (const item of items) {
      const p = DB.productos.find(x => x.id === item.producto_id);
      // Solo restaura si es un producto (no servicio) y tiene stock registrado
      if (p && p.tipo === 'producto' && p.stock !== null) {
        const nuevoStock = p.stock + item.qty;
        const { error: stockErr } = await sb
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', p.id);
        if (stockErr) throw stockErr;
        // Actualizar caché local también
        p.stock = nuevoStock;
      }
    }
    // ── FIN restauración de stock ──

    // 1. Eliminar ítems relacionados
    await sb.from('venta_items').delete().eq('venta_id', v.id);
    // 2. Eliminar la venta
    const { error } = await sb.from('ventas').delete().eq('id', v.id);
    if (error) throw error;

    DB.ventas = DB.ventas.filter(x => x.id !== v.id);
    _ventaDetail = null;
    closeModal('venta-detail-overlay');
    renderBalance(); renderInicio(); renderProductos(); renderPosGrid();
    showToast('Venta eliminada · Stock restaurado ✓');
  } catch(e) { console.error(e); showToast('⚠️ Error al eliminar la venta'); }
}

// ══════════════════════════════════════════════════════════
// FIN GESTIÓN DE VENTAS Y GASTOS ▲▲▲
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// AJUSTE MANUAL DE STOCK — BLOQUE NUEVO COMPLETO ▼▼▼
// ══════════════════════════════════════════════════════════

// ── AGREGADO: variable temporal para el producto que se ajusta ──
let _stockProd = null;

// ── AGREGADO: abre el modal de ajuste de stock ──
function openStockModal(id) {
  const p = DB.productos.find(x => String(x.id) === String(id));
  if (!p || p.tipo === 'servicio') return;
  _stockProd = p;
  document.getElementById('stock-modal-nombre').textContent = p.nombre;
  document.getElementById('stock-actual-display').textContent = p.stock ?? 0;
  document.getElementById('stock-nuevo-val').value            = p.stock ?? 0;
  document.getElementById('stock-motivo').value               = '';
  openModal('stock-ajuste-overlay');
  setTimeout(() => document.getElementById('stock-nuevo-val').focus(), 200);
}

// ── AGREGADO: suma o resta una cantidad rápida al campo ──
function stepStock(delta) {
  const input = document.getElementById('stock-nuevo-val');
  input.value = Math.max(0, (+input.value || 0) + delta);
}

// ── MODIFICADO: guarda el nuevo stock Y registra el movimiento en historial ──
async function saveStockAjuste() {
  if (!_stockProd) return;
  const nuevoStock   = Math.max(0, +document.getElementById('stock-nuevo-val').value || 0);
  const stockAnterior = _stockProd.stock ?? 0;
  const motivo        = document.getElementById('stock-motivo').value.trim() || null;
  const diferencia    = nuevoStock - stockAnterior;

  try {
    // ── MODIFICADO: se agrega negocio_id al UPDATE para pasar RLS de Supabase ──
    const { error } = await sb.from('productos')
      .update({ stock: nuevoStock })
      .eq('id', _stockProd.id)
      .eq('negocio_id', negocioId);
    if (error) throw error;
    // ── FIN MODIFICADO ──

    // ── MODIFICADO: se agrega negocio_id al INSERT de stock_movimientos ──
    const { error: movError } = await sb.from('stock_movimientos').insert({
      producto_id:      _stockProd.id,
      producto_nombre:  _stockProd.nombre,
      stock_anterior:   stockAnterior,
      stock_nuevo:      nuevoStock,
      diferencia:       diferencia,
      motivo:           motivo,
      origen:           'ajuste_manual',
      negocio_id:       negocioId
    });
    if (movError) console.error('⚠️ No se pudo guardar el movimiento:', movError);
    // ── FIN MODIFICADO ──

    // ── LÍNEAS EXISTENTES: actualiza caché local ──
    _stockProd.stock = nuevoStock;
    const idx = DB.productos.findIndex(x => x.id === _stockProd.id);
    if (idx >= 0) DB.productos[idx].stock = nuevoStock;

    closeModal('stock-ajuste-overlay');
    renderProductos(); renderPosGrid();

    // ── MODIFICADO: el toast ahora muestra la diferencia también ──
    const signo = diferencia >= 0 ? `+${diferencia}` : `${diferencia}`;
    showToast(`Stock "${_stockProd.nombre}": ${stockAnterior} → ${nuevoStock} (${signo}) ✓`);
    _stockProd = null;
  } catch(e) {
    // ── AGREGADO: log detallado para diagnóstico ──
    console.error('❌ saveStockAjuste falló:');
    console.error('Mensaje:', e?.message);
    console.error('Código:', e?.code);
    console.error('Detalle:', e?.details);
    console.error('_stockProd:', _stockProd);
    console.error('negocioId:', negocioId);
    console.error('Error completo:', JSON.stringify(e));
    showToast('⚠️ Error al actualizar el stock — revisá consola (F12)');
  }
}
// ── FIN MODIFICACIÓN saveStockAjuste ──

// ── NUEVO: carga y muestra el historial de movimientos del producto actual ──
async function verHistorialStock() {
  if (!_stockProd) return;
  const panel = document.getElementById('stock-historial-panel');
  panel.style.display = 'block';
  panel.innerHTML = '<div style="font-size:.8rem;color:var(--ink3);padding:8px 0;">Cargando historial…</div>';

  try {
    const { data: movs, error } = await sb
      .from('stock_movimientos')
      .select('*')
      .eq('producto_id', _stockProd.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    if (!movs || movs.length === 0) {
      panel.innerHTML = `<div style="font-size:.8rem;color:var(--ink3);text-align:center;padding:12px 0;">
        Sin movimientos registrados aún.</div>`;
      return;
    }

    // ── Renderiza cada movimiento como fila ──
    const rows = movs.map(m => {
      const diff      = m.diferencia >= 0 ? `<span style="color:var(--green);">+${m.diferencia}</span>`
                                           : `<span style="color:#ef4444;">${m.diferencia}</span>`;
      const fecha     = new Date(m.created_at).toLocaleString('es-PY', {
                          day:'2-digit', month:'2-digit', year:'2-digit',
                          hour:'2-digit', minute:'2-digit' });
      const origenTag = m.origen === 'venta'       ? '🛒 Venta'
                      : m.origen === 'devolucion'  ? '↩️ Devolución'
                      :                              '✏️ Ajuste';
      const motivo    = m.motivo
        ? `<div style="font-size:.72rem;color:var(--ink3);margin-top:2px;">💬 ${m.motivo}</div>` : '';
      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;
                    padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:.78rem;font-weight:600;">${origenTag}</div>
            <div style="font-size:.72rem;color:var(--ink3);">${fecha}</div>
            ${motivo}
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:12px;">
            <div style="font-size:.85rem;font-weight:700;">${diff}</div>
            <div style="font-size:.72rem;color:var(--ink3);">${m.stock_anterior} → ${m.stock_nuevo}</div>
          </div>
        </div>`;
    }).join('');

    panel.innerHTML = `
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;
                  letter-spacing:.08em;color:var(--ink3);margin-bottom:6px;">
        Últimos ${movs.length} movimientos
      </div>
      <div style="max-height:220px;overflow-y:auto;">${rows}</div>`;

  } catch(e) {
    console.error(e);
    panel.innerHTML = '<div style="font-size:.8rem;color:#ef4444;padding:8px 0;">⚠️ Error al cargar historial.</div>';
  }
}
// ── FIN verHistorialStock ──

// ── NUEVO: renderiza el historial general de movimientos de stock ──
async function renderHistorialMovimientos() {
  const panel = document.getElementById('stock-movimientos-list');
  panel.innerHTML = `<div style="font-size:.85rem;color:var(--ink3);padding:20px 0;text-align:center;">🔄 Cargando historial…</div>`;

  try {
    const { data: movs, error } = await sb
      .from('stock_movimientos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    if (!movs || movs.length === 0) {
      panel.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">Sin movimientos registrados aún.<br>Los ajustes manuales y ventas aparecerán aquí.</div>
      </div>`;
      return;
    }

    // ── Agrupar por fecha (día) para mejor legibilidad ──
    // ── MODIFICADO: usar zona horaria configurada para agrupar correctamente ──
    const tz = getZonaHoraria();
    const grupos = {};
    movs.forEach(m => {
      const dia = new Date(m.created_at).toLocaleDateString('es-PY', {
        weekday:'long', day:'2-digit', month:'long', year:'numeric',
        timeZone: tz
      });
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(m);
    });

    let html = '';
    Object.entries(grupos).forEach(([dia, items]) => {
      const filas = items.map(m => {
        const diff = m.diferencia >= 0
          ? `<span style="font-weight:800;color:var(--green);">+${m.diferencia}</span>`
          : `<span style="font-weight:800;color:#ef4444;">${m.diferencia}</span>`;
        const origen = m.origen === 'venta'      ? '🛒 Venta'
                     : m.origen === 'devolucion' ? '↩️ Devolución'
                     :                             '✏️ Ajuste manual';
        // ── MODIFICADO: hora con zona horaria configurada ──
        const hora = new Date(m.created_at).toLocaleTimeString('es-PY', {
          hour:'2-digit', minute:'2-digit', timeZone: tz
        });
        const motivo = m.motivo
          ? `<div style="font-size:.72rem;color:var(--ink3);margin-top:2px;">💬 ${m.motivo}</div>` : '';
        return `
          <div class="list-row" style="padding:12px 18px;cursor:default;">
            <div class="row-icon" style="background:${m.diferencia>=0?'var(--green-l)':'var(--red-l)'};">
              ${m.diferencia >= 0 ? '📥' : '📤'}
            </div>
            <div class="row-body">
              <div class="row-name">${m.producto_nombre || '—'}</div>
              <div class="row-sub">${origen} · ${hora}${motivo}</div>
            </div>
            <div class="row-right">
              <div style="font-size:.85rem;">${diff}</div>
              <div class="row-date">${m.stock_anterior} → ${m.stock_nuevo}</div>
            </div>
          </div>`;
      }).join('');

      html += `
        <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
                    color:var(--ink3);padding:14px 4px 6px;">📅 ${dia}</div>
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:12px;">${filas}</div>`;
    });

    panel.innerHTML = `
      <div style="font-size:.78rem;color:var(--ink3);margin-bottom:12px;">
        Últimos ${movs.length} movimiento${movs.length!==1?'s':''} registrados
      </div>
      ${html}`;

  } catch(e) {
    console.error(e);
    panel.innerHTML = `<div style="color:#ef4444;padding:20px;text-align:center;">⚠️ Error al cargar el historial.</div>`;
  }
}
// ── FIN renderHistorialMovimientos ──

// ══════════════════════════════════════════════════════════
// FIN AJUSTE MANUAL DE STOCK ▲▲▲
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// BÚSQUEDA GLOBAL — BLOQUE NUEVO COMPLETO ▼▼▼
// ══════════════════════════════════════════════════════════

// ── AGREGADO: abre el panel de resultados ──
function openGsPanel(){
  document.getElementById('gsearch-panel').classList.add('open');
  document.getElementById('gsearch-backdrop').classList.add('open');
}

// ── AGREGADO: cierra y limpia la búsqueda global ──
function clearGsearch(){
  const inp = document.getElementById('gsearch-input');
  inp.value = '';
  document.getElementById('gsearch-clear').style.display = 'none';
  document.getElementById('gsearch-panel').classList.remove('open');
  document.getElementById('gsearch-panel').innerHTML = '';
  document.getElementById('gsearch-backdrop').classList.remove('open');
}

// ── AGREGADO: función principal — filtra DB y renderiza el panel ──
function globalSearch(q){
  const panel  = document.getElementById('gsearch-panel');
  const btnX   = document.getElementById('gsearch-clear');
  q = q.trim().toLowerCase();

  // Mostrar/ocultar botón limpiar
  btnX.style.display = q ? '' : 'none';

  if(!q){ panel.classList.remove('open'); panel.innerHTML=''; document.getElementById('gsearch-backdrop').classList.remove('open'); return; }

  openGsPanel();

  // ── Filtrar PRODUCTOS ──
  const resProd = DB.productos.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.cat||'').toLowerCase().includes(q)
  ).slice(0, 5);

  // ── Filtrar VENTAS (por cliente, número o ítem) ──
  const resVentas = DB.ventas.filter(v =>
    (v.clienteNombre||'').toLowerCase().includes(q) ||
    String(v.num||v.id).includes(q) ||
    (v.items||[]).some(i => i.nombre.toLowerCase().includes(q))
  ).slice(0, 5);

  // ── Filtrar GASTOS ──
  const resGastos = DB.gastos.filter(g =>
    (g.desc||g.descripcion||'').toLowerCase().includes(q) ||
    (g.cat||'').toLowerCase().includes(q)
  ).slice(0, 5);

  const total = resProd.length + resVentas.length + resGastos.length;

  if(!total){
    panel.innerHTML = `<div class="gsp-empty">🔍 Sin resultados para "<strong>${q}</strong>"</div>`;
    return;
  }

  let html = '';

  // ── Sección Productos ──
  if(resProd.length){
    html += `<div class="gsp-section">
      <div class="gsp-label">📦 Productos / Servicios</div>
      ${resProd.map(p => `
        <div class="gsp-item" onclick="clearGsearch();navTo('productos')">
          <div class="gsp-icon" style="background:${p.tipo==='servicio'?'var(--purple-l)':'var(--blue-l)'}">
            ${p.emoji||'📦'}
          </div>
          <div class="gsp-body">
            <div class="gsp-name">${resaltarMatch(p.nombre, q)}</div>
            <div class="gsp-sub">${p.cat||'—'} · ${p.tipo==='producto'?`Stock: ${p.stock}`:'Servicio'}</div>
          </div>
          <div class="gsp-val">${fmtGs(p.precio)}</div>
        </div>`).join('')}
    </div>`;
  }

  // ── Sección Ventas ──
  if(resVentas.length){
    html += `<div class="gsp-section">
      <div class="gsp-label">🛒 Ventas</div>
      ${resVentas.map(v => `
        <div class="gsp-item" onclick="clearGsearch();navTo('balance');setTimeout(()=>openVentaDetail(${v.id}),120)">
          <div class="gsp-icon" style="background:var(--green-l)">🛒</div>
          <div class="gsp-body">
            <div class="gsp-name">${resaltarMatch(v.clienteNombre||'Venta rápida', q)}</div>
            <div class="gsp-sub">#${v.num||v.id} · ${fmtDate(v.date)} · ${(v.items||[]).length} ítem${(v.items||[]).length!==1?'s':''}</div>
          </div>
          <div class="gsp-val" style="color:var(--green)">${fmtGs(v.total)}</div>
        </div>`).join('')}
    </div>`;
  }

  // ── Sección Gastos ──
  if(resGastos.length){
    html += `<div class="gsp-section">
      <div class="gsp-label">💸 Gastos</div>
      ${resGastos.map(g => `
        <div class="gsp-item" onclick="clearGsearch();navTo('gastos')">
          <div class="gsp-icon" style="background:var(--red-l)">💸</div>
          <div class="gsp-body">
            <div class="gsp-name">${resaltarMatch(g.desc||g.descripcion||'—', q)}</div>
            <div class="gsp-sub">${g.cat||'Otros'} · ${fmtDate(g.date||g.created_at)}</div>
          </div>
          <div class="gsp-val" style="color:var(--red)">−${fmtGs(g.amount)}</div>
        </div>`).join('')}
    </div>`;
  }

  // ── Pequeño pie con total de resultados ──
  html += `<div style="padding:8px 14px 10px;font-size:.72rem;color:var(--ink3);border-top:1px solid var(--border);text-align:right;">
    ${total} resultado${total!==1?'s':''} para "<strong>${q}</strong>"
  </div>`;

  panel.innerHTML = html;
}

// ── AGREGADO: resalta en negrita la parte que coincide con la búsqueda ──
function resaltarMatch(texto, q){
  if(!q) return texto;
  const idx = texto.toLowerCase().indexOf(q);
  if(idx === -1) return texto;
  return texto.slice(0, idx)
    + `<mark style="background:var(--amber-l);color:var(--amber);border-radius:3px;padding:0 2px;font-weight:800;">${texto.slice(idx, idx+q.length)}</mark>`
    + texto.slice(idx + q.length);
}

// ══════════════════════════════════════════════════════════
// FIN BÚSQUEDA GLOBAL ▲▲▲
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// ELIMINAR PRODUCTO Y CLIENTE — BLOQUE NUEVO COMPLETO ▼▼▼
// ══════════════════════════════════════════════════════════

// ── AGREGADO: elimina un producto de Supabase y del caché local ──
async function deleteProducto(id) {
  const p = DB.productos.find(x => x.id === id);
  if (!p) return;

  // Verificar si tiene ventas asociadas
  const tieneVentas = DB.ventas.some(v =>
    v.items && v.items.some(i => i.id === id || i.producto_id === id)
  );

  let mensaje = `¿Eliminar "${p.nombre}"?\nEsta acción no se puede deshacer.`;
  if (tieneVentas) {
    mensaje = `⚠️ "${p.nombre}" tiene ventas registradas.\nEliminar el producto NO borrará esas ventas, pero ya no podrás verlo en el historial con detalle.\n¿Continuar?`;
  }

  if (!confirm(mensaje)) return;

  try {
    const { error } = await sb.from('productos').delete().eq('id', id);
    if (error) throw error;

    // Actualizar caché local
    DB.productos = DB.productos.filter(x => x.id !== id);

    // Re-renderizar vistas afectadas
    renderProductos();
    renderPosGrid();
    renderInicio();

    showToast(`"${p.nombre}" eliminado ✓`);
  } catch(e) {
    console.error(e);
    showToast('⚠️ Error al eliminar el producto');
  }
}

// ── AGREGADO: elimina un cliente de Supabase y del caché local ──
async function deleteCliente(id) {
  const c = DB.clientes.find(x => x.id === id);
  if (!c) return;

  // Contar ventas del cliente
  const ventasCliente = DB.ventas.filter(v => v.clienteId === id);
  const totalComprado = ventasCliente.reduce((s, v) => s + v.total, 0);

  let mensaje = `¿Eliminar al cliente "${c.nombre}"?\nEsta acción no se puede deshacer.`;
  if (ventasCliente.length > 0) {
    mensaje = `⚠️ "${c.nombre}" tiene ${ventasCliente.length} compra${ventasCliente.length !== 1 ? 's' : ''} registrada${ventasCliente.length !== 1 ? 's' : ''} por ${fmtGs(totalComprado)}.\nLas ventas no se borrarán, pero quedarán sin cliente asignado.\n¿Continuar?`;
  }

  if (!confirm(mensaje)) return;

  try {
    const { error } = await sb.from('clientes').delete().eq('id', id);
    if (error) throw error;

    // Actualizar caché local
    DB.clientes = DB.clientes.filter(x => x.id !== id);

    // Re-renderizar vistas afectadas
    renderClientes();
    populateClientes(); // Actualiza el selector en el POS

    showToast(`Cliente "${c.nombre}" eliminado ✓`);
  } catch(e) {
    console.error(e);
    showToast('⚠️ Error al eliminar el cliente');
  }
}

// ══════════════════════════════════════════════════════════
// FIN ELIMINAR PRODUCTO Y CLIENTE ▲▲▲
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// COMPARTIR CATÁLOGO PÚBLICO ── AGREGADO ──
// ══════════════════════════════════════════════════════════
function compartirCatalogo() {
  // Construye el link automáticamente desde la URL actual de Nomi
  const base = window.location.origin + window.location.pathname
    .replace(/\/[^/]*$/, '/');          // carpeta del archivo actual
  const link = base + 'catalogo.html';

  // Intenta copiar al portapapeles
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(() => {
      showToast('🔗 Link copiado: ' + link);
    }).catch(() => {
      _mostrarLinkCatalogo(link);
    });
  } else {
    _mostrarLinkCatalogo(link);
  }
}

// Fallback: muestra el link en un prompt para que el usuario lo copie a mano
function _mostrarLinkCatalogo(link) {
  window.prompt('Copiá el link del catálogo:', link);
}
// ══════════════════════════════════════════════════════════
// FIN COMPARTIR CATÁLOGO
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// FICHA COMPLETA DE CLIENTE  ▼▼▼ NUEVO COMPLETO ▼▼▼
// ══════════════════════════════════════════════════════════

// ── LÍNEAS AGREGADAS: función que abre la ficha del cliente ──
function openFichaCliente(id) {
  const c = DB.clientes.find(x => x.id === id);
  if (!c) return;

  // — Avatar y header —
  const avatar = document.getElementById('ficha-avatar');
  avatar.textContent = c.nombre.charAt(0).toUpperCase();
  avatar.style.background = (c.color || '#6366F1') + '22';
  avatar.style.color = c.color || '#6366F1';

  document.getElementById('ficha-nombre').textContent = c.nombre;

  const subParts = [];
  if (c.phone) subParts.push('📞 ' + c.phone);
  if (c.doc)   subParts.push('🪪 ' + c.doc);
  if (c.notes) subParts.push('📝 ' + c.notes);
  document.getElementById('ficha-sub').textContent = subParts.join('  ·  ') || 'Sin datos adicionales';

  // — Conectar botones del header al cliente actual —
  document.getElementById('ficha-btn-editar').onclick = () => {
    closeModal('ficha-cliente-overlay');
    openClientModal(c.id);
  };
  document.getElementById('ficha-btn-eliminar').onclick = () => {
    closeModal('ficha-cliente-overlay');
    deleteCliente(c.id);
  };

  // — Ventas del cliente —
  const ventasCliente = (DB.ventas || [])
    .filter(v => v.clienteId === c.id)
    .sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));

  const totalComprado = ventasCliente.reduce((s, v) => s + (v.total || 0), 0);

  document.getElementById('ficha-total-comprado').textContent = fmtGs(totalComprado);
  document.getElementById('ficha-cant-compras').textContent   = ventasCliente.length;

  // — Fiados pendientes del cliente —
  const fiados = (DB.cuentasCorrientes || []).filter(cc =>
    cc.estado === 'pendiente' &&
    (cc.cliente_id === c.id || cc.cliente_nombre === c.nombre)
  );
  const deudaTotal = fiados.reduce((s, cc) => s + (cc.monto_original - cc.monto_pagado), 0);
  document.getElementById('ficha-deuda').textContent = fmtGs(deudaTotal);
  document.getElementById('ficha-deuda').style.color = deudaTotal > 0 ? 'var(--red)' : 'var(--green)';

  // — Renderizar sección de fiados pendientes —
  const fiadosSec  = document.getElementById('ficha-fiados-section');
  const fiadosList = document.getElementById('ficha-fiados-list');

  if (fiados.length > 0) {
    fiadosSec.style.display = 'block';
    fiadosList.innerHTML = fiados.map(cc => {
      const debe = cc.monto_original - cc.monto_pagado;
      const pct  = Math.round((cc.monto_pagado / cc.monto_original) * 100);
      return `
        <div class="card" style="margin-bottom:10px;padding:14px 16px;cursor:pointer;border-left:3px solid var(--red);"
          onclick="closeModal('ficha-cliente-overlay');openCCDetail(${cc.id})">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:.82rem;font-weight:700;">Venta #${cc.venta_id} · ${fmtDate(cc.fecha)}</div>
              <div style="margin-top:6px;height:4px;background:var(--border);border-radius:100px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:var(--green);border-radius:100px;"></div>
              </div>
              <div style="font-size:.7rem;color:var(--ink3);margin-top:3px;">${pct}% pagado</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-weight:800;font-size:.95rem;color:var(--red);">${fmtGs(debe)}</div>
              <div style="font-size:.7rem;color:var(--ink3);">de ${fmtGs(cc.monto_original)}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  } else {
    fiadosSec.style.display = 'none';
  }

  // — Renderizar historial de ventas —
  const ventasList = document.getElementById('ficha-ventas-list');
  if (!ventasCliente.length) {
    ventasList.innerHTML = `<div class="empty-state" style="padding:24px 0;">
      <div class="empty-icon">🧾</div>
      <div class="empty-text">Sin ventas registradas aún</div>
    </div>`;
  } else {
    ventasList.innerHTML = ventasCliente.map(v => {
      const items = (v.items || []);
      const resumen = items.length > 0
        ? items.slice(0, 3).map(i => i.nombre || i.name || '—').join(', ') +
          (items.length > 3 ? ` +${items.length - 3} más` : '')
        : 'Sin detalle de ítems';
      const metodoBadge = {
        'Efectivo':      '💵',
        'Transferencia': '🏦',
        'Tarjeta':       '💳',
        'QR':            '📱',
        'Fiado':         '📋',
      }[v.metodoPago] || '💳';

      return `
        <div class="card" style="margin-bottom:10px;padding:14px 16px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-weight:700;font-size:.85rem;">Venta #${v.id}</span>
                <span style="font-size:.75rem;color:var(--ink3);">${fmtDate(v.fecha || v.created_at)}</span>
                <span style="font-size:.75rem;background:var(--surface);border:1px solid var(--border);
                  border-radius:12px;padding:1px 8px;">${metodoBadge} ${v.metodoPago || '—'}</span>
              </div>
              <div style="font-size:.78rem;color:var(--ink3);margin-top:5px;">${resumen}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-weight:800;font-size:1rem;color:var(--green);">${fmtGs(v.total)}</div>
              <div style="font-size:.7rem;color:var(--ink3);">${items.length} ítem${items.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  openModal('ficha-cliente-overlay');
}
// ── FIN LÍNEAS AGREGADAS: openFichaCliente ──

// ══════════════════════════════════════════════════════════
// FIN FICHA COMPLETA DE CLIENTE  ▲▲▲ NUEVO ▲▲▲
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// MÓDULO CUENTAS CORRIENTES / FIADO ── AGREGADO COMPLETO ──
// ══════════════════════════════════════════════════════════

let fiadoTab = 'pendiente'; // 'pendiente' | 'pagado' | 'clientes'
let ccActual = null;        // cuenta corriente abierta en el modal

// ── Actualiza el badge rojo del nav con cantidad de deudas pendientes ──
function updateBadgeFiado(){
  const pendientes = DB.cuentasCorrientes.filter(c => c.estado === 'pendiente');
  const badge = document.getElementById('nb-fiado');
  if(!badge) return;
  if(pendientes.length > 0){
    badge.textContent = pendientes.length;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

// ── Cambia la pestaña activa y re-renderiza ──
function setFiadoTab(tab, btn){
  fiadoTab = tab;
  document.querySelectorAll('#screen-fiado .seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFiado();
}

// ── Render principal de la pantalla Fiado ──
// ── MODIFICADO: se agregó filtro por búsqueda de nombre ──
function renderFiado(){
  updateBadgeFiado();

  // ── LÍNEAS AGREGADAS: leer buscador y filtrar por nombre ──
  const q = (document.getElementById('fiado-search')?.value || '').trim().toLowerCase();
  const todasPendientes = DB.cuentasCorrientes.filter(c => c.estado === 'pendiente');
  const todasPagadas    = DB.cuentasCorrientes.filter(c => c.estado === 'pagado');
  const pendientes = q
    ? todasPendientes.filter(c => (c.cliente_nombre || '').toLowerCase().includes(q))
    : todasPendientes;
  const pagados = q
    ? todasPagadas.filter(c => (c.cliente_nombre || '').toLowerCase().includes(q))
    : todasPagadas;
  // ── FIN LÍNEAS AGREGADAS ──
  const totalPend  = pendientes.reduce((s,c) => s + (c.monto_original - c.monto_pagado), 0);
  const totalCobr  = DB.cuentasCorrientes.reduce((s,c) => s + c.monto_pagado, 0);

  // Clientes únicos con deuda
  const clientesDeudores = [...new Set(pendientes.map(c => c.cliente_nombre))].length;

  // Actualizar tarjetas de resumen
  document.getElementById('fiado-total-pendiente').textContent = fmtGs(totalPend);
  document.getElementById('fiado-clientes-deuda').textContent  = clientesDeudores;
  document.getElementById('fiado-total-cobrado').textContent   = fmtGs(totalCobr);
  document.getElementById('fiado-sub').textContent =
    `${pendientes.length} deuda${pendientes.length!==1?'s':''} pendiente${pendientes.length!==1?'s':''} · ${fmtGs(totalPend)} por cobrar`;

  const lista = document.getElementById('fiado-list');

  // ── Tab: Pendientes ──
  if(fiadoTab === 'pendiente'){
    if(!pendientes.length){
      lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-text">¡Sin deudas pendientes!</div></div>`;
      return;
    }
    lista.innerHTML = pendientes.map(cc => {
      const debe    = cc.monto_original - cc.monto_pagado;
      const pct     = Math.round((cc.monto_pagado / cc.monto_original) * 100);
      return `<div class="card" style="margin-bottom:12px;cursor:pointer;" onclick="openCCDetail(${cc.id})">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:.95rem;">${cc.cliente_nombre || '—'}</div>
            <div style="font-size:.75rem;color:var(--ink3);margin-top:2px;">
              Venta #${cc.venta_id} · ${fmtDate(cc.fecha)}
            </div>
            <!-- Barra de progreso de pago -->
            <div style="margin-top:8px;height:5px;background:var(--border);border-radius:100px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:var(--green);border-radius:100px;transition:width .3s;"></div>
            </div>
            <div style="font-size:.7rem;color:var(--ink3);margin-top:3px;">${pct}% pagado</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-weight:800;font-size:1.05rem;color:var(--red);">${fmtGs(debe)}</div>
            <div style="font-size:.72rem;color:var(--ink3);">de ${fmtGs(cc.monto_original)}</div>
            <span class="tag tag-amber" style="margin-top:6px;display:inline-block;font-size:.65rem;">⏳ Pendiente</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ── Tab: Pagados ──
  else if(fiadoTab === 'pagado'){
    if(!pagados.length){
      lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">Sin cuentas saldadas aún.</div></div>`;
      return;
    }
    lista.innerHTML = pagados.map(cc => `
      <div class="card" style="margin-bottom:12px;opacity:.75;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <div style="font-weight:800;font-size:.95rem;">${cc.cliente_nombre || '—'}</div>
            <div style="font-size:.75rem;color:var(--ink3);">Venta #${cc.venta_id} · ${fmtDate(cc.fecha)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;font-size:1rem;color:var(--green);">${fmtGs(cc.monto_original)}</div>
            <span class="tag tag-green" style="font-size:.65rem;">✅ Saldado</span>
          </div>
        </div>
      </div>`).join('');
  }

  // ── Tab: Por cliente ──
  else if(fiadoTab === 'clientes'){
    // Agrupar deudas pendientes por cliente
    const mapa = {};
    pendientes.forEach(cc => {
      const key = cc.cliente_nombre || 'Sin nombre';
      if(!mapa[key]) mapa[key] = { nombre: key, cuentas: [], total: 0 };
      mapa[key].cuentas.push(cc);
      mapa[key].total += (cc.monto_original - cc.monto_pagado);
    });
    const grupos = Object.values(mapa).sort((a,b) => b.total - a.total);

    if(!grupos.length){
      lista.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><div class="empty-text">Sin clientes con deuda.</div></div>`;
      return;
    }
    lista.innerHTML = grupos.map(g => `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-weight:800;font-size:.95rem;">👤 ${g.nombre}</div>
            <div style="font-size:.75rem;color:var(--ink3);">${g.cuentas.length} deuda${g.cuentas.length!==1?'s':''}</div>
          </div>
          <div style="font-weight:800;font-size:1.1rem;color:var(--red);">${fmtGs(g.total)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${g.cuentas.map(cc => {
            const debe = cc.monto_original - cc.monto_pagado;
            return `<div style="display:flex;justify-content:space-between;align-items:center;
              background:var(--surface2);border-radius:var(--r-sm);padding:8px 12px;cursor:pointer;"
              onclick="openCCDetail(${cc.id})">
              <span style="font-size:.8rem;color:var(--ink2);">Venta #${cc.venta_id} · ${fmtDate(cc.fecha)}</span>
              <span style="font-weight:700;font-size:.85rem;color:var(--red);">${fmtGs(debe)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');
  }
}

// ── Abre el modal de detalle/pago de una cuenta corriente ──
async function openCCDetail(ccId){
  const cc = DB.cuentasCorrientes.find(c => c.id === ccId);
  if(!cc) return;
  ccActual = cc;

  const debe = cc.monto_original - cc.monto_pagado;
  const pct  = Math.round((cc.monto_pagado / cc.monto_original) * 100);

  // Info principal
  document.getElementById('cc-detail-info').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>
        <div style="font-size:.7rem;color:var(--ink3);font-weight:600;">Cliente</div>
        <div style="font-weight:800;">${cc.cliente_nombre || '—'}</div>
      </div>
      <div>
        <div style="font-size:.7rem;color:var(--ink3);font-weight:600;">Venta original</div>
        <div style="font-weight:700;">${fmtGs(cc.monto_original)}</div>
      </div>
      <div>
        <div style="font-size:.7rem;color:var(--ink3);font-weight:600;">Ya pagó</div>
        <div style="font-weight:700;color:var(--green);">${fmtGs(cc.monto_pagado)}</div>
      </div>
      <div>
        <div style="font-size:.7rem;color:var(--ink3);font-weight:600;">Debe</div>
        <div style="font-weight:800;font-size:1.1rem;color:var(--red);">${fmtGs(debe)}</div>
      </div>
    </div>
    <!-- Barra de progreso -->
    <div style="margin-top:10px;height:7px;background:var(--border);border-radius:100px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:var(--green);border-radius:100px;"></div>
    </div>
    <div style="font-size:.72rem;color:var(--ink3);margin-top:4px;">${pct}% pagado · Fecha: ${fmtDate(cc.fecha)}</div>
  `;

  // Cargar historial de pagos desde Supabase
  const {data: pagos} = await sb.from('pagos_cc')
    .select('*').eq('cuenta_id', ccId).order('fecha', {ascending: false});

  const listaP = document.getElementById('cc-pagos-list');
  if(!pagos || !pagos.length){
    listaP.innerHTML = `<div style="font-size:.8rem;color:var(--ink3);padding:8px 0;">Sin pagos registrados aún.</div>`;
  } else {
    listaP.innerHTML = pagos.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:8px 10px;background:var(--surface2);border-radius:var(--r-sm);margin-bottom:6px;">
        <div>
          <div style="font-size:.82rem;font-weight:700;">${fmtGs(p.monto)}</div>
          <div style="font-size:.72rem;color:var(--ink3);">${fmtDate(p.fecha)} · ${p.metodo_pago}</div>
          ${p.notas ? `<div style="font-size:.72rem;color:var(--ink3);">${p.notas}</div>` : ''}
        </div>
        <span class="tag tag-green" style="font-size:.65rem;">✓ Pagado</span>
      </div>`).join('');
  }

  // Mostrar/ocultar formulario de pago según estado
  const form = document.getElementById('cc-pago-form');
  if(cc.estado === 'pagado'){
    form.innerHTML = `<div style="text-align:center;padding:12px;color:var(--green);font-weight:700;">✅ Esta cuenta está completamente saldada.</div>`;
  } else {
    // Botones rápidos de monto
    document.getElementById('cc-pago-monto').value = '';
    document.getElementById('cc-pago-nota').value  = '';
    document.getElementById('cc-pago-btns-rapidos').innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('cc-pago-monto').value=${debe}">
        💰 Total (${fmtGs(debe)})
      </button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('cc-pago-monto').value=${Math.round(debe/2)}">
        50% (${fmtGs(Math.round(debe/2))})
      </button>`;
  }

  openModal('cc-detail-overlay');
}

// ── Registra un pago parcial o total ──
async function registrarPagoCC(){
  if(!ccActual){ showToast('Error: no hay cuenta seleccionada'); return; }

  const monto = +document.getElementById('cc-pago-monto').value;
  if(!monto || monto <= 0){ showToast('Ingresá un monto válido'); return; }

  const debe = ccActual.monto_original - ccActual.monto_pagado;
  if(monto > debe){
    showToast(`⚠️ El monto supera la deuda (${fmtGs(debe)})`);
    return;
  }

  const metodo = document.getElementById('cc-pago-metodo').value;
  const nota   = document.getElementById('cc-pago-nota').value.trim();

  try {
    // 1. Insertar el pago en pagos_cc
    const {error: pe} = await sb.from('pagos_cc').insert({
      cuenta_id:   ccActual.id,
      cliente_id:  ccActual.cliente_id || null,
      monto,
      metodo_pago: metodo,
      notas:       nota || null
    });
    if(pe) throw pe;

    // 2. Actualizar monto_pagado y estado en cuentas_corrientes
    const nuevoMontoPagado = ccActual.monto_pagado + monto;
    const nuevoEstado = nuevoMontoPagado >= ccActual.monto_original ? 'pagado' : 'pendiente';

    const {error: ue} = await sb.from('cuentas_corrientes').update({
      monto_pagado: nuevoMontoPagado,
      estado:       nuevoEstado
    }).eq('id', ccActual.id);
    if(ue) throw ue;

    // 3. Actualizar caché local
    const idx = DB.cuentasCorrientes.findIndex(c => c.id === ccActual.id);
    if(idx !== -1){
      DB.cuentasCorrientes[idx].monto_pagado = nuevoMontoPagado;
      DB.cuentasCorrientes[idx].estado       = nuevoEstado;
      ccActual = DB.cuentasCorrientes[idx];
    }

    showToast(nuevoEstado === 'pagado'
      ? `✅ ¡Cuenta saldada! ${cc.cliente_nombre} pagó todo.`
      : `💰 Pago de ${fmtGs(monto)} registrado.`
    );

    closeModal('cc-detail-overlay');
    renderFiado();
    updateBadgeFiado();

  } catch(e){
    console.error(e);
    showToast('⚠️ Error al registrar el pago');
  }
}

// ── AGREGADO: Cancela/condona una deuda sin registrar pago ──
async function cancelarDeudaCC(){
  if(!ccActual){ showToast('Error: no hay cuenta seleccionada'); return; }

  // Pedir motivo obligatorio (como el campo "motivo" en cualquier baja contable)
  const motivo = window.prompt(
    `Cancelar deuda de ${ccActual.cliente_nombre || 'este cliente'} (${fmtGs(ccActual.monto_original - ccActual.monto_pagado)})\n\nIngresá el motivo de cancelación:`,
    ''
  );

  // Si el usuario cancela el prompt o deja vacío, no hacemos nada
  if(motivo === null) return; // presionó Cancelar
  if(!motivo.trim()){
    showToast('⚠️ El motivo es obligatorio para cancelar una deuda.');
    return;
  }

  // Segunda confirmación para evitar errores accidentales
  const ok = window.confirm(
    `¿Confirmás cancelar esta deuda?\n\nCliente: ${ccActual.cliente_nombre || '—'}\nMonto: ${fmtGs(ccActual.monto_original - ccActual.monto_pagado)}\nMotivo: ${motivo.trim()}`
  );
  if(!ok) return;

  try {
    // MODIFICADO: actualizar estado a 'cancelado' y guardar el motivo en notas
    const notaActual = ccActual.notas ? ccActual.notas + ' | ' : '';
    const {error} = await sb.from('cuentas_corrientes').update({
      estado: 'cancelado',
      notas:  notaActual + `[CANCELADO: ${motivo.trim()}]`
    }).eq('id', ccActual.id);
    if(error) throw error;

    // Actualizar caché local
    const idx = DB.cuentasCorrientes.findIndex(c => c.id === ccActual.id);
    if(idx !== -1){
      DB.cuentasCorrientes[idx].estado = 'cancelado';
      DB.cuentasCorrientes[idx].notas  = notaActual + `[CANCELADO: ${motivo.trim()}]`;
    }

    showToast(`🚫 Deuda de ${ccActual.cliente_nombre || 'cliente'} cancelada.`);
    closeModal('cc-detail-overlay');
    renderFiado();
    updateBadgeFiado();

  } catch(e){
    console.error(e);
    showToast('⚠️ Error al cancelar la deuda');
  }
}
// ── FIN AGREGADO: cancelarDeudaCC ──

// ══════════════════════════════════════════════════════
// AGREGADO: helpers para error de duplicado en modal producto
// ══════════════════════════════════════════════════════
function showProdError(msg){
  const box = document.getElementById('prod-duplicado-error');
  const txt = document.getElementById('prod-duplicado-msg');
  if(!box || !txt) return;
  txt.textContent = msg;
  box.style.display = 'block';
  // Hacer scroll al error para que sea visible en móvil
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearProdError(){
  const box = document.getElementById('prod-duplicado-error');
  if(box) box.style.display = 'none';
}
// ══ FIN AGREGADO ══

// ── Llamar updateBadgeFiado al iniciar también ──
// Se engancha al final de initApp vía renderInicio
const _renderInicioOrig = typeof renderInicio === 'function' ? renderInicio : null;

// ══════════════════════════════════════════════════════════
// FIN MÓDULO CUENTAS CORRIENTES / FIADO ▲▲▲
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// ▼▼▼ ARRANQUE — versión final limpia ▼▼▼
// ══════════════════════════════════════════════════════
(() => {
  // ── CLAVE: recrear el cliente para liberar cualquier lock bloqueado ──
  // Cuando una operación anterior queda colgada (cierre de caja, etc.),
  // el cliente de Supabase queda con un lock interno que congela todas
  // las llamadas futuras. Recrearlo libera ese lock.
  sb = crearClienteSupa();

  showApp(false);
  showLoginScreen(false);

  let cargando = false; // true mientras initApp() está ejecutándose

  function ocultarLoading() {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.style.display = 'none';
  }

  function irAlLogin() {
    negocioId = null;
    ocultarLoading();
    showApp(false);
    showLoginScreen(true);
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
    } catch(e) {}
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    if (emailEl)  emailEl.value         = '';
    if (passEl)   passEl.value          = '';
    if (errorEl)  errorEl.style.display = 'none';
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      showLoginScreen(false);
      showApp(true);
      // Si la app ya cargó (negocioId tiene valor), solo ocultar loading y listo
      if (negocioId !== null) {
        ocultarLoading();
        return;
      }
      // Solo cargar datos la primera vez (negocioId === null)
      if (!cargando) {
        cargando = true;
        const ls = document.getElementById('loading-screen');
        if (ls) ls.style.display = 'flex';
        try {
          await initApp();
        } catch(e) {
          console.error('initApp falló:', e);
        } finally {
          cargando = false;
        }
      }
    } else {
      if (event === 'SIGNED_OUT' && !cargando) {
        irAlLogin();
      }
    }
  });

  // Guard: si a los 15s todo sigue oculto, ir al login
  setTimeout(() => {
    if (cargando) return;
    const loginVisible = document.getElementById('login-screen')?.style.display !== 'none';
    const appVisible   = document.querySelector('.app')?.style.display !== 'none';
    if (!loginVisible && !appVisible) irAlLogin();
  }, 15000);

  // Al volver al frente: solo ocultar loading, nunca recargar datos
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!cargando) ocultarLoading();
  });
})();
// ══════════════════════════════════════════════════════
// ▲▲▲ FIN ARRANQUE ▲▲▲
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// MODO OSCURO — AGREGADO
// Guarda la preferencia en localStorage y aplica la clase .dark
// ══════════════════════════════════════════════════════════
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('nomi-dark-mode', isDark ? '1' : '0');
  document.getElementById('dark-icon').textContent  = isDark ? '☀️' : '🌙';
  document.getElementById('dark-label').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  // Si hay gráficos Chart.js activos, los re-renderiza con los colores correctos
  if (typeof renderGraficosReportes === 'function' &&
      document.getElementById('screen-reportes')?.classList.contains('active')) {
    renderReportes();
  }
}

// Aplica el tema guardado al cargar la página (antes del primer render)
(function initDarkMode() {
  const saved = localStorage.getItem('nomi-dark-mode');
  // También respeta la preferencia del sistema operativo si no hay preferencia guardada
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  if (saved === '1' || (saved === null && prefersDark)) {
    document.documentElement.classList.add('dark');
    // El DOM puede no estar listo aún, usamos DOMContentLoaded como fallback
    document.addEventListener('DOMContentLoaded', () => {
      const icon  = document.getElementById('dark-icon');
      const label = document.getElementById('dark-label');
      if (icon)  icon.textContent  = '☀️';
      if (label) label.textContent = 'Modo claro';
    });
  }
})();
// ══════════════════════════════════════════════════════════
// FIN MODO OSCURO
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// ACORDEÓN GENÉRICO — AGREGADO
// Colapsa/expande cualquier lista con animación suave.
// listId: id del contenedor de la lista
// chevronId: id del ícono ▼
// badgeId: id del badge de resumen (opcional)
// ══════════════════════════════════════════════════════════
function toggleAcordeon(listId, chevronId, badgeId) {
  const list    = document.getElementById(listId);
  const chevron = document.getElementById(chevronId);
  if (!list) return;

  const abierto = list.style.display !== 'none';

  if (abierto) {
    // Colapsar con animación
    list.style.maxHeight   = list.scrollHeight + 'px';
    list.style.overflow    = 'hidden';
    list.style.transition  = 'max-height .25s ease, opacity .2s ease';
    list.style.opacity     = '1';
    requestAnimationFrame(() => {
      list.style.maxHeight = '0';
      list.style.opacity   = '0';
    });
    setTimeout(() => {
      list.style.display = 'none';
      list.style.maxHeight  = '';
      list.style.overflow   = '';
      list.style.transition = '';
      list.style.opacity    = '';
    }, 260);
    if (chevron) { chevron.style.transform = 'rotate(-90deg)'; }
  } else {
    // Expandir
    list.style.display    = '';
    list.style.maxHeight  = '0';
    list.style.overflow   = 'hidden';
    list.style.opacity    = '0';
    list.style.transition = 'max-height .25s ease, opacity .2s ease';
    requestAnimationFrame(() => {
      list.style.maxHeight = list.scrollHeight + 'px';
      list.style.opacity   = '1';
    });
    setTimeout(() => {
      list.style.maxHeight  = '';
      list.style.overflow   = '';
      list.style.transition = '';
    }, 260);
    if (chevron) { chevron.style.transform = 'rotate(0deg)'; }
  }
}
// ══════════════════════════════════════════════════════════════
// FIN ACORDEÓN GENÉRICO
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// FAB CARRITO MÓVIL — v3 sin HTML duplicado
// Mueve el .pos-cart original a bottom-sheet en móvil.
// En PC no hace nada (isMobile() = false).
// ══════════════════════════════════════════════════════════════

function isMobile() {
  return window.innerWidth <= 768;
}

// Agrega botón "✕ Cerrar" al header del carrito solo en móvil
function ensureCartCloseBtn() {
  const header = document.querySelector('.pos-cart .cart-header');
  if (!header || header.querySelector('.cart-close-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'cart-close-btn';
  btn.innerHTML = '✕';
  btn.setAttribute('style',
    'background:none;border:none;font-size:1.3rem;cursor:pointer;' +
    'color:var(--ink3);line-height:1;padding:4px 6px;margin-left:auto;');
  btn.onclick = closeCartModal;
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.appendChild(btn);
}

function openCartModal() {
  if (!isMobile()) return;
  ensureCartCloseBtn();
  const cart = document.querySelector('.pos-cart');
  if (cart) {
    cart.style.height = '96dvh';
    cart.style.maxHeight = '96dvh';
  }
  cart?.classList.add('cart-open');
  document.getElementById('pos-cart-overlay')?.classList.add('overlay-open');
  document.getElementById('pos-cart-fab').style.display = 'none';
}

function closeCartModal() {
  const cart = document.querySelector('.pos-cart');
  if (cart) {
    cart.style.height = '';
    cart.style.maxHeight = '';
  }
  cart?.classList.remove('cart-open');
  document.getElementById('pos-cart-overlay')?.classList.remove('overlay-open');
  updateCartFab();
}

function updateCartFab() {
  const fab = document.getElementById('pos-cart-fab');
  if (!fab) return;
  const enPOS = document.getElementById('screen-pos')?.classList.contains('active');
  if (isMobile() && enPOS) {
    const count = cart.reduce((s, c) => s + c.qty, 0);
    document.getElementById('pos-cart-fab-badge').textContent = count;
    fab.style.display = 'flex';
  } else {
    fab.style.display = 'none';
    // En PC: asegurarse de que el carrito esté visible normalmente
    document.querySelector('.pos-cart')?.classList.remove('cart-open');
    document.getElementById('pos-cart-overlay')?.classList.remove('overlay-open');
  }
}

// Hook sobre renderCart para mantener el FAB actualizado
(function patchRenderCart() {
  const orig = window.renderCart;
  if (!orig) return;
  window.renderCart = function() {
    orig.apply(this, arguments);
    updateCartFab();
  };
})();

// Hook sobre navTo para mostrar/ocultar FAB al cambiar sección
(function patchNavTo() {
  const orig = window.navTo;
  if (!orig) return;
  window.navTo = function(screen) {
    orig.apply(this, arguments);
    // Si salimos del POS en móvil, cerrar el carrito
    if (screen !== 'pos') closeCartModal();
    setTimeout(updateCartFab, 60);
  };
})();

window.addEventListener('load', () => setTimeout(updateCartFab, 400));
window.addEventListener('resize', () => {
  updateCartFab();
  // Al rotar a landscape/PC, cerrar el carrito móvil
  if (!isMobile()) closeCartModal();
});

// ══════════════════════════════════════════════════════════════
// MODAL "MÁS" — Plan, Config, Modo oscuro, Cerrar sesión
// Solo visible en móvil (bottom bar)
// ══════════════════════════════════════════════════════════════

function openMasModal() {
  document.getElementById('mas-modal-overlay')?.classList.add('open');
  // Sincronizar estado del toggle de modo oscuro
  const isDark = document.documentElement.classList.contains('dark');
  const iconModal = document.getElementById('dark-icon-modal');
  if (iconModal) iconModal.textContent = isDark ? '☀️' : '🌙';
}

function closeMasModal() {
  document.getElementById('mas-modal-overlay')?.classList.remove('open');
}

// ══ FIN MODAL MÁS ══

// ══ FIN FAB CARRITO MÓVIL v3 ══