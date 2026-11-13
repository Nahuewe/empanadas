/* ==========================================================================
   Estado y persistencia
   ========================================================================== */

const CLAVE_PEDIDO = 'empanadas:pedido';
const CLAVE_ULTIMO = 'empanadas:ultimo';
const CLAVE_AGOTADOS = 'empanadas:agotados';
const CANTIDAD_MAXIMA = 99;
const LARGO_MAXIMO_NOMBRE = 30;

const estado = {
    comensales: {},          // id -> { id, nombre, pagado, items: [{ sabor, cantidad }] }
    ordenComensales: [],     // ids, en el orden en que se sumaron
    comensalActivo: null,
    saborSeleccionado: null,
    precio: 0,               // precio por empanada
    envio: 0,
    tipoEnvioWhatsapp: 'pedido',
    modoAgotados: false,
    agotados: new Set(),
    busqueda: ''
};

let contadorId = 0;

function generarId() {
    contadorId += 1;
    return `c-${Date.now().toString(36)}-${contadorId}`;
}

function leerStorage(clave) {
    try {
        const crudo = localStorage.getItem(clave);
        return crudo ? JSON.parse(crudo) : null;
    } catch (error) {
        return null;
    }
}

function escribirStorage(clave, valor) {
    try {
        if (valor === null) localStorage.removeItem(clave);
        else localStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
        /* sin almacenamiento: la app sigue funcionando en memoria */
    }
}

function fechaDeHoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function guardarPedido() {
    const hayAlgo = estado.ordenComensales.length || estado.envio;
    escribirStorage(CLAVE_PEDIDO, hayAlgo ? {
        comensales: estado.comensales,
        orden: estado.ordenComensales,
        activo: estado.comensalActivo,
        precio: estado.precio,
        envio: estado.envio
    } : null);
    escribirStorage(CLAVE_AGOTADOS, { fecha: fechaDeHoy(), sabores: Array.from(estado.agotados) });
}

function limpiarItem(item) {
    if (!item || !SABORES.includes(item.sabor)) return null;
    return {
        sabor: item.sabor,
        cantidad: Math.min(CANTIDAD_MAXIMA, Math.max(1, parseInt(item.cantidad, 10) || 1))
    };
}

// Con `renovarIds` se generan ids nuevos y se desmarcan los pagos (repetir último pedido).
function aplicarPedidoGuardado(datos, renovarIds) {
    estado.comensales = {};
    estado.ordenComensales = [];
    estado.comensalActivo = null;
    estado.envio = 0;

    if (!datos || !Array.isArray(datos.orden) || typeof datos.comensales !== 'object') return;

    datos.orden.forEach(idViejo => {
        const guardado = datos.comensales[idViejo];
        if (!guardado || !guardado.nombre) return;
        const id = renovarIds ? generarId() : String(idViejo);
        estado.comensales[id] = {
            id,
            nombre: String(guardado.nombre).slice(0, LARGO_MAXIMO_NOMBRE),
            pagado: renovarIds ? false : Boolean(guardado.pagado),
            items: (guardado.items || []).map(limpiarItem).filter(Boolean)
        };
        estado.ordenComensales.push(id);
        if (datos.activo === idViejo) estado.comensalActivo = id;
    });

    if (!estado.comensalActivo && estado.ordenComensales.length) {
        estado.comensalActivo = estado.ordenComensales[0];
    }
    estado.precio = Math.max(0, Number(datos.precio) || 0);
    estado.envio = renovarIds ? 0 : Math.max(0, Number(datos.envio) || 0);
}

function cargarEstadoInicial() {
    aplicarPedidoGuardado(leerStorage(CLAVE_PEDIDO), false);

    const agotados = leerStorage(CLAVE_AGOTADOS);
    if (agotados && agotados.fecha === fechaDeHoy() && Array.isArray(agotados.sabores)) {
        estado.agotados = new Set(agotados.sabores.filter(s => SABORES.includes(s)));
    }
}

/* ==========================================================================
   Cálculos
   ========================================================================== */

const formatoPrecio = new Intl.NumberFormat('es-AR');

function formatearPrecio(valor) {
    return '$' + formatoPrecio.format(Math.round(valor));
}

function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = String(texto);
    return div.innerHTML;
}

function unidadesComensal(id) {
    return estado.comensales[id].items.reduce((suma, item) => suma + item.cantidad, 0);
}

function unidadesTotales() {
    return estado.ordenComensales.reduce((suma, id) => suma + unidadesComensal(id), 0);
}

function comensalesConItems() {
    return estado.ordenComensales.filter(id => estado.comensales[id].items.length > 0);
}

function subtotalComensal(id) {
    return unidadesComensal(id) * estado.precio;
}

// Reparte el envío en partes iguales entre los que pidieron algo (sin perder centavos).
function repartirEnvio(ids) {
    const reparto = {};
    if (!ids.length) return reparto;
    const base = Math.floor(estado.envio / ids.length);
    let resto = Math.round(estado.envio - base * ids.length);
    ids.forEach(id => {
        reparto[id] = base + (resto > 0 ? 1 : 0);
        if (resto > 0) resto -= 1;
    });
    return reparto;
}

function subtotalGeneral() {
    return unidadesTotales() * estado.precio;
}

// El envío solo cuenta si hay alguien que lo pague.
function envioAplicado() {
    return comensalesConItems().length ? Math.round(estado.envio) : 0;
}

function totalGeneral() {
    return subtotalGeneral() + envioAplicado();
}

function hayPedidosCargados() {
    return unidadesTotales() > 0;
}

function textoDocenas(n) {
    const docenas = Math.floor(n / 12);
    const sueltas = n % 12;
    if (!docenas) return '';
    return `${docenas} ${docenas === 1 ? 'docena' : 'docenas'}${sueltas ? ` y ${sueltas}` : ''}`;
}

/* ==========================================================================
   Render
   ========================================================================== */

function render() {
    renderComensales();
    renderSabores();
    renderComanda();
    renderTotales();
    renderResumenActual();
    guardarPedido();
}

function renderTotales() {
    const total = formatearPrecio(totalGeneral());
    document.querySelectorAll('.js-total').forEach(el => { el.textContent = total; });
    document.querySelectorAll('.js-subtotal').forEach(el => { el.textContent = formatearPrecio(subtotalGeneral()); });
    document.querySelectorAll('.js-envio').forEach(el => { el.textContent = formatearPrecio(envioAplicado()); });
    document.querySelectorAll('.js-unidades').forEach(el => { el.textContent = unidadesTotales(); });
}

function renderComensales() {
    const cont = document.getElementById('listaComensales');
    if (!estado.ordenComensales.length) {
        cont.innerHTML = '<p class="vacio">Todavía no sumaste a nadie.</p>';
        return;
    }
    cont.innerHTML = estado.ordenComensales.map(id => {
        const c = estado.comensales[id];
        const activo = id === estado.comensalActivo ? ' chip--activo' : '';
        return `<span class="chip${activo}">
            <button type="button" class="chip__nombre" data-accion="activar" data-id="${id}">${escapar(c.nombre)}</button>
            <button type="button" class="chip__quitar" data-accion="quitar-comensal" data-id="${id}" aria-label="Quitar a ${escapar(c.nombre)}">×</button>
        </span>`;
    }).join('');
}

function renderSabores() {
    const cont = document.getElementById('listaSabores');
    const termino = estado.busqueda.trim().toLowerCase();
    const visibles = SABORES.filter(s => s.toLowerCase().includes(termino));

    if (!visibles.length) {
        cont.innerHTML = '<p class="vacio">No hay sabores con ese nombre.</p>';
        return;
    }

    cont.innerHTML = visibles.map(sabor => {
        const agotado = estado.agotados.has(sabor);
        const clases = ['sabor'];
        if (agotado) clases.push('sabor--agotado');
        if (sabor === estado.saborSeleccionado && !agotado) clases.push('sabor--activo');
        const bloqueado = agotado && !estado.modoAgotados;
        return `<button type="button" class="${clases.join(' ')}" data-accion="sabor" data-sabor="${escapar(sabor)}" ${bloqueado ? 'disabled' : ''}>
            <span>${escapar(sabor)}</span>${agotado ? '<small>agotado</small>' : ''}
        </button>`;
    }).join('');
}

function renderComanda() {
    const cont = document.getElementById('comanda');
    if (!estado.ordenComensales.length) {
        cont.innerHTML = '<p class="vacio vacio--grande">El pedido está vacío.<br>Sumá un comensal y elegí sus empanadas.</p>';
        return;
    }

    const envios = repartirEnvio(comensalesConItems());
    cont.innerHTML = estado.ordenComensales.map(id => {
        const c = estado.comensales[id];
        const envioComensal = envios[id] || 0;
        const filas = c.items.length
            ? c.items.map((item, i) => `
                <li class="linea">
                    <span class="linea__sabor">${escapar(item.sabor)}</span>
                    <span class="linea__controles">
                        <button type="button" class="mini" data-accion="menos" data-id="${id}" data-i="${i}" aria-label="Una menos">−</button>
                        <span class="linea__cantidad">${item.cantidad}</span>
                        <button type="button" class="mini" data-accion="mas" data-id="${id}" data-i="${i}" aria-label="Una más">+</button>
                        <button type="button" class="mini mini--peligro" data-accion="quitar-item" data-id="${id}" data-i="${i}" aria-label="Quitar ${escapar(item.sabor)}">×</button>
                    </span>
                </li>`).join('')
            : '<li class="vacio">Sin empanadas todavía.</li>';

        const unidades = unidadesComensal(id);
        return `<article class="tarjeta${c.pagado ? ' tarjeta--pagada' : ''}">
            <header class="tarjeta__cabecera">
                <h3 class="tarjeta__nombre">${escapar(c.nombre)}</h3>
                <label class="check-pago">
                    <input type="checkbox" data-accion="pagado" data-id="${id}" ${c.pagado ? 'checked' : ''}>
                    <span>Pagó</span>
                </label>
            </header>
            <ul class="tarjeta__lineas">${filas}</ul>
            <footer class="tarjeta__pie">
                <div class="tarjeta__fila">
                    <span>${unidades} ${unidades === 1 ? 'empanada' : 'empanadas'}</span>
                    <strong>${estado.precio > 0 ? formatearPrecio(subtotalComensal(id)) : '— falta precio'}</strong>
                </div>
                ${envioComensal > 0 ? `<div class="tarjeta__fila"><span>Envío</span><strong>${formatearPrecio(envioComensal)}</strong></div>
                <div class="tarjeta__fila tarjeta__fila--total"><span>Total</span><strong>${formatearPrecio(subtotalComensal(id) + envioComensal)}</strong></div>` : ''}
            </footer>
        </article>`;
    }).join('');
}

function renderResumenActual() {
    const boton = document.getElementById('btnAgregarItem');
    const resumen = document.getElementById('resumenActual');
    const comensal = estado.comensales[estado.comensalActivo];
    const cantidad = leerCantidad();

    const listo = Boolean(comensal && estado.saborSeleccionado && cantidad > 0);
    boton.disabled = !listo;

    if (listo) {
        resumen.innerHTML = `<strong>${escapar(comensal.nombre)}</strong>: ${cantidad} de ${escapar(estado.saborSeleccionado)}` +
            (estado.precio > 0 ? ` · ${formatearPrecio(cantidad * estado.precio)}` : '');
    } else if (!comensal) {
        resumen.textContent = 'Sumá o elegí un comensal para empezar.';
    } else if (!estado.saborSeleccionado) {
        resumen.textContent = 'Elegí un sabor.';
    } else {
        resumen.textContent = 'Poné una cantidad válida.';
    }
}

/* ==========================================================================
   Acciones
   ========================================================================== */

function leerCantidad() {
    const n = parseInt(document.getElementById('inputCantidad').value, 10);
    return Number.isNaN(n) ? 0 : Math.min(CANTIDAD_MAXIMA, Math.max(0, n));
}

function sumarComensal(nombreCrudo) {
    const nombre = nombreCrudo.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAXIMO_NOMBRE);
    if (!nombre) {
        mostrarToast('Escribí un nombre', 'error');
        return;
    }
    const existente = estado.ordenComensales.find(id => estado.comensales[id].nombre.toLowerCase() === nombre.toLowerCase());
    if (existente) {
        estado.comensalActivo = existente;
        mostrarToast(`${estado.comensales[existente].nombre} ya estaba, lo seleccioné`, 'ok');
    } else {
        const id = generarId();
        estado.comensales[id] = { id, nombre, pagado: false, items: [] };
        estado.ordenComensales.push(id);
        estado.comensalActivo = id;
    }
    render();
}

function quitarComensal(id) {
    const c = estado.comensales[id];
    const accion = () => {
        delete estado.comensales[id];
        estado.ordenComensales = estado.ordenComensales.filter(otro => otro !== id);
        if (estado.comensalActivo === id) estado.comensalActivo = estado.ordenComensales[0] || null;
        render();
    };
    if (!c.items.length) return accion();
    abrirModalConfirmacion(`¿${c.nombre} se arrepintió de pedir empanadas?`, accion, 'Mal ahí');
}

function agregarItem() {
    const comensal = estado.comensales[estado.comensalActivo];
    const cantidad = leerCantidad();
    if (!comensal || !estado.saborSeleccionado || cantidad < 1) return;

    const existente = comensal.items.find(i => i.sabor === estado.saborSeleccionado);
    if (existente) {
        existente.cantidad = Math.min(CANTIDAD_MAXIMA, existente.cantidad + cantidad);
    } else {
        comensal.items.push({ sabor: estado.saborSeleccionado, cantidad });
    }

    mostrarToast(`${cantidad} de ${estado.saborSeleccionado} para ${comensal.nombre}`, 'ok');
    estado.saborSeleccionado = null;
    document.getElementById('inputCantidad').value = 1;
    render();

    if (window.matchMedia('(max-width: 900px)').matches) {
        document.getElementById('barraTotalMovil').classList.add('barra-total-movil--pulso');
        setTimeout(() => document.getElementById('barraTotalMovil').classList.remove('barra-total-movil--pulso'), 600);
    }
}

function cambiarCantidadItem(id, indice, delta) {
    const comensal = estado.comensales[id];
    const item = comensal && comensal.items[indice];
    if (!item) return;
    item.cantidad = Math.min(CANTIDAD_MAXIMA, item.cantidad + delta);
    if (item.cantidad < 1) comensal.items.splice(indice, 1);
    render();
}

function quitarItem(id, indice) {
    const comensal = estado.comensales[id];
    const item = comensal && comensal.items[indice];
    if (!item) return;
    abrirModalConfirmacion(`¿${comensal.nombre} no tenía ${item.sabor}?`, () => {
        comensal.items.splice(indice, 1);
        render();
    }, 'Mal ahí');
}

function alternarAgotado(sabor) {
    if (estado.agotados.has(sabor)) estado.agotados.delete(sabor);
    else {
        estado.agotados.add(sabor);
        if (estado.saborSeleccionado === sabor) estado.saborSeleccionado = null;
    }
    render();
}

function nuevoPedido() {
    const hayAlgo = estado.ordenComensales.length || estado.envio;
    const reiniciar = () => {
        if (hayAlgo) escribirStorage(CLAVE_ULTIMO, {
            comensales: estado.comensales,
            orden: estado.ordenComensales,
            precio: estado.precio
        });
        aplicarPedidoGuardado(null, false);
        estado.saborSeleccionado = null;
        document.getElementById('inputEnvio').value = '';
        actualizarBotonRepetir();
        render();
    };
    if (!hayAlgo) return mostrarToast('El pedido ya está vacío', 'ok');
    abrirModalConfirmacion('¿Empezar un pedido nuevo? El actual queda guardado para repetirlo.', reiniciar, 'Sí, nuevo');
}

function repetirUltimoPedido() {
    const ultimo = leerStorage(CLAVE_ULTIMO);
    if (!ultimo) return;
    const aplicar = () => {
        aplicarPedidoGuardado(ultimo, true);
        document.getElementById('inputPrecio').value = estado.precio || '';
        document.getElementById('inputEnvio').value = '';
        render();
        mostrarToast('Pedido anterior cargado', 'ok');
    };
    if (estado.ordenComensales.length) {
        abrirModalConfirmacion('Esto reemplaza el pedido actual. ¿Seguimos?', aplicar, 'Sí, repetir');
    } else {
        aplicar();
    }
}

function actualizarBotonRepetir() {
    document.getElementById('btnRepetirPedido').hidden = !leerStorage(CLAVE_ULTIMO);
}

/* ==========================================================================
   Mensajes de WhatsApp
   ========================================================================== */

// Suma por sabor las empanadas de todos los comensales.
function consolidarPedido() {
    const resumen = new Map();
    estado.ordenComensales.forEach(id => {
        estado.comensales[id].items.forEach(item => {
            resumen.set(item.sabor, (resumen.get(item.sabor) || 0) + item.cantidad);
        });
    });
    return SABORES.filter(s => resumen.has(s)).map(sabor => ({ sabor, cantidad: resumen.get(sabor) }));
}

function construirMensajePedido() {
    let mensaje = '¡Buenos días! Quisiera encargar lo siguiente:\n\n';
    consolidarPedido().forEach(linea => {
        mensaje += `${linea.cantidad} ${linea.sabor}\n`;
    });
    mensaje += '\n\n¿A qué hora estarían listas y cuánto sería todo? ¡Muchas gracias!';
    return mensaje;
}

function construirMensajeConsulta() {
    return 'Buen día! ¿Qué empanadas tienen disponibles?';
}

function construirMensajeDesglose() {
    const ids = comensalesConItems();
    const envios = repartirEnvio(ids);
    let pendiente = 0;
    let hayPagados = false;

    let mensaje = 'Desglose de pagos — empanadas\n\n';

    ids.forEach(id => {
        const c = estado.comensales[id];
        const total = subtotalComensal(id) + envios[id];
        if (c.pagado) hayPagados = true;
        else pendiente += total;

        mensaje += `📌 ${c.nombre}${c.pagado ? ' ✅ ya pagó' : ''}\n`;
        c.items.forEach(item => {
            const parcial = estado.precio > 0 ? ` → ${formatearPrecio(item.cantidad * estado.precio)}` : '';
            mensaje += `  ${item.cantidad}x ${item.sabor}${parcial}\n`;
        });
        if (envios[id] > 0) mensaje += `  Envío → ${formatearPrecio(envios[id])}\n`;
        mensaje += `  Total ${c.nombre}: ${formatearPrecio(total)}\n\n`;
    });

    mensaje += `Empanadas: ${formatearPrecio(subtotalGeneral())}\n`;
    if (envioAplicado() > 0) mensaje += `Envío: ${formatearPrecio(envioAplicado())}\n`;
    mensaje += `Total a cobrar entre todos: ${formatearPrecio(totalGeneral())}`;
    if (hayPagados) mensaje += `\nPendiente de cobro: ${formatearPrecio(pendiente)}`;
    return mensaje;
}

function enviarWhatsapp(numero, mensaje) {
    const digitos = String(numero).replace(/\D/g, '');
    const url = 'https://api.whatsapp.com/send?phone=' + digitos + '&text=' + encodeURIComponent(mensaje);
    window.open(url, '_blank', 'noopener,noreferrer');
}

function copiarAlPortapapeles(texto, exito) {
    if (!navigator.clipboard) {
        mostrarToast('Tu navegador no permite copiar desde acá.', 'error');
        return;
    }
    navigator.clipboard.writeText(texto)
        .then(() => mostrarToast(exito, 'ok'))
        .catch(() => mostrarToast('No se pudo copiar. Intentá de nuevo.', 'error'));
}

// Ejecuta la acción solo si hay empanadas y (para el cobro) un precio cargado.
function exigirPedido(accion, { conPrecio = false } = {}) {
    if (!hayPedidosCargados()) {
        mostrarToast('Todavía no hay ninguna empanada en el pedido', 'error');
        return;
    }
    if (conPrecio && !(estado.precio > 0)) {
        mostrarToast('Cargá el precio por empanada para calcular el cobro', 'error');
        document.getElementById('inputPrecio').focus();
        return;
    }
    accion();
}

function renderSucursales() {
    const cont = document.getElementById('listaSucursales');
    cont.innerHTML = SUCURSALES.map((s, i) => `
        <label class="opcion-sucursal">
            <input type="radio" name="sucursal" value="${escapar(s.numero)}" ${i === 0 ? 'checked' : ''}>
            <span>${escapar(s.nombre)}</span>
        </label>`).join('');
}

/* ==========================================================================
   Modales, toast
   ========================================================================== */

const IDS_MODALES = ['modalSucursales', 'modalConfirmacion'];
let enfoqueAnterior = null;
let onConfirmarModal = null;

function abrirModal(id) {
    enfoqueAnterior = document.activeElement;
    const modal = document.getElementById(id);
    modal.classList.add('modal--visible');
    document.body.classList.add('modal-abierto');
    const primero = modal.querySelector('input:checked, button');
    if (primero) primero.focus();
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('modal--visible');
    const quedaAlguno = IDS_MODALES.some(otro => document.getElementById(otro).classList.contains('modal--visible'));
    if (!quedaAlguno) {
        document.body.classList.remove('modal-abierto');
        if (enfoqueAnterior && enfoqueAnterior.focus) enfoqueAnterior.focus();
        enfoqueAnterior = null;
    }
}

function abrirModalSucursales(tipo) {
    if (tipo === 'pedido' && !hayPedidosCargados()) {
        mostrarToast('Todavía no hay ninguna empanada en el pedido', 'error');
        return;
    }
    estado.tipoEnvioWhatsapp = tipo;
    document.getElementById('modalSucursalesTitulo').textContent =
        tipo === 'consulta' ? 'Seleccioná dónde preguntar' : 'Seleccioná dónde pedir';
    abrirModal('modalSucursales');
}

function abrirModalConfirmacion(texto, alConfirmar, textoBoton) {
    document.getElementById('modalConfirmacionTexto').textContent = texto;
    document.getElementById('btnAceptarConfirmacion').textContent = textoBoton || 'Sí';
    onConfirmarModal = alConfirmar;
    abrirModal('modalConfirmacion');
}

function cerrarModalConfirmacion() {
    onConfirmarModal = null;
    cerrarModal('modalConfirmacion');
}

let temporizadorToast = null;

function mostrarToast(texto, tipo) {
    const toast = document.getElementById('toast');
    toast.textContent = texto;
    toast.className = `toast toast--visible toast--${tipo || 'ok'}`;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => toast.classList.remove('toast--visible'), 2600);
}

/* ==========================================================================
   Eventos
   ========================================================================== */

function configurarEventos() {
    // Modales: clic afuera y Escape
    IDS_MODALES.forEach(id => {
        const modal = document.getElementById(id);
        modal.addEventListener('click', event => {
            if (event.target !== modal) return;
            if (id === 'modalConfirmacion') cerrarModalConfirmacion();
            else cerrarModal(id);
        });
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (document.getElementById('modalConfirmacion').classList.contains('modal--visible')) cerrarModalConfirmacion();
        else if (document.getElementById('modalSucursales').classList.contains('modal--visible')) cerrarModal('modalSucursales');
    });

    document.getElementById('btnCerrarModalSucursales').addEventListener('click', () => cerrarModal('modalSucursales'));
    document.getElementById('btnCancelarConfirmacion').addEventListener('click', cerrarModalConfirmacion);
    document.getElementById('btnAceptarConfirmacion').addEventListener('click', () => {
        const accion = onConfirmarModal;
        cerrarModalConfirmacion();
        if (accion) accion();
    });

    // Comensales
    const inputComensal = document.getElementById('inputComensal');
    document.getElementById('formComensal').addEventListener('submit', event => {
        event.preventDefault();
        sumarComensal(inputComensal.value);
        inputComensal.value = '';
    });
    document.getElementById('listaComensales').addEventListener('click', event => {
        const boton = event.target.closest('button[data-accion]');
        if (!boton) return;
        if (boton.dataset.accion === 'activar') {
            estado.comensalActivo = boton.dataset.id;
            render();
        } else if (boton.dataset.accion === 'quitar-comensal') {
            quitarComensal(boton.dataset.id);
        }
    });

    // Sabores
    document.getElementById('buscadorSabores').addEventListener('input', event => {
        estado.busqueda = event.target.value;
        renderSabores();
    });
    document.getElementById('listaSabores').addEventListener('click', event => {
        const boton = event.target.closest('button[data-sabor]');
        if (!boton) return;
        const sabor = boton.dataset.sabor;
        if (estado.modoAgotados) return alternarAgotado(sabor);
        estado.saborSeleccionado = estado.saborSeleccionado === sabor ? null : sabor;
        renderSabores();
        renderResumenActual();
    });
    document.getElementById('chkModoAgotados').addEventListener('change', event => {
        estado.modoAgotados = event.target.checked;
        document.body.classList.toggle('modo-agotados', estado.modoAgotados);
        renderSabores();
    });

    // Cantidad y precio
    const inputCantidad = document.getElementById('inputCantidad');
    document.getElementById('btnMenos').addEventListener('click', () => {
        inputCantidad.value = Math.max(1, leerCantidad() - 1);
        renderResumenActual();
    });
    document.getElementById('btnMas').addEventListener('click', () => {
        inputCantidad.value = Math.min(CANTIDAD_MAXIMA, leerCantidad() + 1);
        renderResumenActual();
    });
    inputCantidad.addEventListener('input', renderResumenActual);
    inputCantidad.addEventListener('keydown', event => {
        if (event.key === 'Enter') agregarItem();
    });

    document.getElementById('inputPrecio').addEventListener('input', event => {
        estado.precio = Math.max(0, parseFloat(event.target.value) || 0);
        renderComanda();
        renderTotales();
        renderResumenActual();
        guardarPedido();
    });
    document.getElementById('inputEnvio').addEventListener('input', event => {
        estado.envio = Math.max(0, parseFloat(event.target.value) || 0);
        renderTotales();
        guardarPedido();
    });
    document.getElementById('btnAgregarItem').addEventListener('click', agregarItem);

    // Comanda (delegación)
    const comanda = document.getElementById('comanda');
    comanda.addEventListener('click', event => {
        const boton = event.target.closest('button[data-accion]');
        if (!boton) return;
        const { accion, id } = boton.dataset;
        const indice = Number(boton.dataset.i);
        if (accion === 'mas') cambiarCantidadItem(id, indice, 1);
        else if (accion === 'menos') cambiarCantidadItem(id, indice, -1);
        else if (accion === 'quitar-item') quitarItem(id, indice);
    });
    comanda.addEventListener('change', event => {
        const check = event.target.closest('input[data-accion="pagado"]');
        if (!check) return;
        estado.comensales[check.dataset.id].pagado = check.checked;
        render();
    });

    // Mensajes
    document.getElementById('btnEnviarWhatsapp').addEventListener('click', () => abrirModalSucursales('pedido'));
    document.getElementById('btnConsultarDisponibilidad').addEventListener('click', () => abrirModalSucursales('consulta'));
    document.getElementById('btnCopiarPedido').addEventListener('click', () => {
        exigirPedido(() => copiarAlPortapapeles(construirMensajePedido(), 'Mensaje del pedido copiado'));
    });
    document.getElementById('btnConfirmarSucursal').addEventListener('click', () => {
        const seleccionada = document.querySelector('input[name="sucursal"]:checked');
        if (!seleccionada) return mostrarToast('Seleccioná una sucursal', 'error');
        const mensaje = estado.tipoEnvioWhatsapp === 'consulta' ? construirMensajeConsulta() : construirMensajePedido();
        enviarWhatsapp(seleccionada.value, mensaje);
        cerrarModal('modalSucursales');
    });

    document.getElementById('btnEnviarDesglose').addEventListener('click', () => {
        exigirPedido(() => {
            const numero = document.getElementById('inputNumeroDesglose').value.replace(/\D/g, '');
            if (numero.length < 8) {
                mostrarToast('Escribí el número de WhatsApp para el desglose', 'error');
                document.getElementById('inputNumeroDesglose').focus();
                return;
            }
            enviarWhatsapp(numero, construirMensajeDesglose());
        }, { conPrecio: true });
    });
    document.getElementById('btnCopiarDesglose').addEventListener('click', () => {
        exigirPedido(() => copiarAlPortapapeles(construirMensajeDesglose(), 'Desglose copiado'), { conPrecio: true });
    });

    // Barra superior y móvil
    document.getElementById('btnNuevoPedido').addEventListener('click', nuevoPedido);
    document.getElementById('btnRepetirPedido').addEventListener('click', repetirUltimoPedido);
    document.getElementById('btnVerComanda').addEventListener('click', () => {
        document.getElementById('panelComanda').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

/* ==========================================================================
   Inicio
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    cargarEstadoInicial();
    renderSucursales();
    configurarEventos();
    document.getElementById('inputPrecio').value = estado.precio || '';
    document.getElementById('inputEnvio').value = estado.envio || '';
    actualizarBotonRepetir();
    render();
});
