// ==========================================
// CONFIGURACIÓN DE EMAILJS
// ==========================================
const EMAILJS_PUBLIC_KEY = "ZJQtRyUlzfRNMv0Hd";  
const EMAILJS_SERVICE_ID = "service_ftyt67o";  
const EMAILJS_TEMPLATE_ID = "template_nf403al"; 

(function() {
    if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }
})();

// Variables Globales
let iti = null;
let estructuraBasePorDefecto = []; 
let disponibilidadTurnos = {
    "2026-08-18": [
        {hora:"16:00 hs",cupos:1},
    ]
};
let precioFinal = 0;
let grupoSeleccionado = "";
let fechaSeleccionada = "";
let modalidadSeleccionada = "";

// Precios dinámicos extraídos del PDF
const tablaPrecios = {
    "Express": {
        "2": 30000,
        "3": 40000,
        "4": 50000,
        "5": 60000,
        "6": 75000
    },
    "Extendida": {
        "2": 43000,
        "3": 59000,
        "4": 70000,
        "5": 78000,
        "6": 84000
    }
};

// ==========================================
// CONTROL DE VISTAS (SPA)
// ==========================================
let misionSeleccionada = "Express";

function mostrarVista(idVista) {
    if (!idVista.startsWith('vista-')) {
        idVista = 'vista-' + idVista;
    }

    const secciones = document.querySelectorAll(".vista-seccion");
    
    secciones.forEach(sec => {
        sec.style.display = "none";
        sec.classList.remove("activo");
    });

    const vistaDestino = document.getElementById(idVista);
    if (vistaDestino) {
        vistaDestino.style.display = "block";
        vistaDestino.classList.add("activo");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        console.error("No se encontró ninguna sección con el ID:", idVista);
    }
}

function seleccionarMision(nombreMision) {
    misionSeleccionada = nombreMision;
    modalidadSeleccionada = nombreMision; // ← sincronizamos ambas variables

    const tituloTxt = document.getElementById("mision-seleccionada-txt");
    if (tituloTxt) {
        tituloTxt.innerText = nombreMision;
    }

    mostrarVista("vista-reserva-final");

    if (typeof calcularPrecioReserva === "function") {
        calcularPrecioReserva();
    }
}

function actualizarPrecioPorParticipantes() {
    calcularPrecioReserva();
}

// Event Listeners DOM
document.addEventListener("DOMContentLoaded", function() {
    const telInput = document.querySelector("#telefono");
    if (telInput && typeof window.intlTelInput !== "undefined") {
        iti = window.intlTelInput(telInput, {
            initialCountry: "ar",
            separateDialCode: true,
            preferredCountries: ["ar", "cl", "uy", "br", "mx"],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });
    }

    const btnExpress = document.getElementById("btn-express");
    const btnExtendida = document.getElementById("btn-extendida");

    if (btnExpress) {
        btnExpress.addEventListener("click", function() {
            seleccionarMision('Express');
        });
    }

    if (btnExtendida) {
        btnExtendida.addEventListener("click", function() {
            seleccionarMision('Extendida');
        });
    }

    const inputFecha = document.getElementById('fecha');
    if (inputFecha) {
        inputFecha.addEventListener('input', function(e) {
            cargarTurnosDelDia(e.target.value);
        });
    }
});

window.mostrarVista = mostrarVista;
window.seleccionarMision = seleccionarMision;
window.actualizarPrecioPorParticipantes = actualizarPrecioPorParticipantes;

// ==========================================
// GESTIÓN DE TURNOS Y FECHAS
// ==========================================
function cargarTurnosDelDia(fechaString) {
    if (!fechaString) return;

    fechaSeleccionada = fechaString;
    const contenedor = document.getElementById("contenedorGrupos");
    if (!contenedor) return;
    
    contenedor.innerHTML = ""; 
    grupoSeleccionado = ""; 

    disponibilidadTurnos = JSON.parse(localStorage.getItem("turnos_db")) || disponibilidadTurnos;

    if (!disponibilidadTurnos[fechaString]) {
        disponibilidadTurnos[fechaString] = JSON.parse(JSON.stringify(estructuraBasePorDefecto));
        localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));
    }

    const turnosHoy = disponibilidadTurnos[fechaString];
    const turnosDisponibles = turnosHoy.filter(turno => Number(turno.cupos) > 0);

    if (turnosDisponibles.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; color:#999; grid-column: 1 / -1; padding: 10px; font-size:14px;">No hay horarios disponibles para esta fecha.</div>`;
        return;
    }

    turnosDisponibles.forEach((turno) => {
        const wrapper = document.createElement("div");
        wrapper.className = "tarjeta-turno-wrapper";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-turno";

        // ✅ FIX 1: Solo muestra la hora, sin texto de cupos
        btn.innerHTML = turno.hora;

        btn.onclick = function() {
            document.querySelectorAll('.btn-turno').forEach(b => b.classList.remove('seleccionado'));
            btn.classList.add('seleccionado');
            grupoSeleccionado = turno.hora;
        };

        wrapper.appendChild(btn);
        contenedor.appendChild(wrapper);
    });
}

// ==========================================
// ATAJOS Y ADMIN
// ==========================================
const CLAVE_ADMIN = "admin123";

document.addEventListener('keydown', function(event) {
    if ((event.altKey && event.key.toLowerCase() === 'h') || event.key === 'F10') {
        event.preventDefault();
        abrirHorariosConSeguridad();
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        event.stopPropagation();
        abrirHorariosConSeguridad();
    }

    if (event.altKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        abrirMonitorConSeguridad();
    }
}, true);

function pedirPassword() {
    const pass = prompt("Acceso Restringido. Ingresá la contraseña de administrador:");
    if (pass === CLAVE_ADMIN) return true;
    if (pass !== null) alert("Contraseña incorrecta. Acceso denegado.");
    return false;
}

function gestionarHorariosAdmin() {
    abrirHorariosConSeguridad();
}
window.gestionarHorariosAdmin = gestionarHorariosAdmin;

// ==========================================
// MONITOR DE RESERVAS (ADMIN)
// ==========================================
function abrirMonitorConSeguridad() {
    const modal = document.getElementById("modalMonitor");
    if (!modal) return;
    if (modal.style.display === "flex") { modal.style.display = "none"; return; }

    if (pedirPassword()) {
        modal.style.display = "flex";
        const hoy = new Date().toISOString().split('T')[0];
        const monitorFecha = document.getElementById("monitorFecha");
        if (monitorFecha) monitorFecha.value = fechaSeleccionada || hoy;
        actualizarMonitorSala(fechaSeleccionada || hoy);
    }
}

function cerrarMonitor() { 
    const modal = document.getElementById("modalMonitor");
    if (modal) modal.style.display = "none"; 
}
window.cerrarMonitor = cerrarMonitor;

document.addEventListener("DOMContentLoaded", function() {
    const monitorFechaInput = document.getElementById('monitorFecha');
    if (monitorFechaInput) {
        monitorFechaInput.addEventListener('change', function(e) {
            actualizarMonitorSala(e.target.value);
        });
    }
});

function actualizarMonitorSala(fechaFiltrar) {
    const contenedor = document.getElementById("tablaSalaContenedor");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    const historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
    const reservasDelDia = historial.filter(r => r.fecha === fechaFiltrar);

    if (reservasDelDia.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; color:#999; margin-top:20px; font-size:14px;">No hay reservas para esta fecha.</div>`;
        return;
    }

    reservasDelDia.sort((a, b) => a.hora.localeCompare(b.hora));
    reservasDelDia.forEach(r => {
        const divCliente = document.createElement("div");
        divCliente.style = "background: #000; padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid #d4af37; font-size: 13px; border: 1px solid #333; border-left-width: 4px;";
        divCliente.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <strong style="font-size:14px; color:#d4af37;">${r.hora}</strong>
                <span style="background:#262626; padding:2px 6px; border-radius:4px; font-size:11px;">Vendedor: ${r.vendedor}</span>
            </div>
            <strong>Modalidad:</strong> Misión ${r.modalidad || 'No especificada'}<br>
            <strong>Participantes:</strong> ${r.participantes || 'No indicado'}<br>
            <strong>Nombre:</strong> ${r.nombre}<br>
            <strong>Tel:</strong> ${r.telefono} | <strong>Email:</strong> ${r.email}
        `;
        contenedor.appendChild(divCliente);
    });
}

// ==========================================
// CONFIGURACIÓN DE HORARIOS (ADMIN)
// ==========================================
function abrirHorariosConSeguridad() {
    const modal = document.getElementById("modalHorarios");
    if (!modal) {
        console.error('Error: No existe el elemento "modalHorarios" en el HTML.');
        return;
    }
    if (modal.style.display === "flex") { modal.style.display = "none"; return; }

    if (pedirPassword()) {
        modal.style.display = "flex";
        const hoy = new Date().toISOString().split('T')[0];
        const adminFecha = document.getElementById("adminFecha");
        if (adminFecha) adminFecha.value = fechaSeleccionada || hoy;
        prepararCamposAdmin(fechaSeleccionada || hoy);
    }
}
window.abrirHorariosConSeguridad = abrirHorariosConSeguridad;

function cerrarHorarios() { 
    const modal = document.getElementById("modalHorarios");
    if (modal) modal.style.display = "none"; 
}
window.cerrarHorarios = cerrarHorarios;

document.addEventListener("DOMContentLoaded", function() {
    const adminFechaInput = document.getElementById('adminFecha');
    if (adminFechaInput) {
        adminFechaInput.addEventListener('change', function(e) {
            prepararCamposAdmin(e.target.value);
        });
    }
});

function prepararCamposAdmin(fecha) {
    const contenedor = document.getElementById("listaHorariosAdmin");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    // Siempre recuperar la información más reciente guardada
    const turnosGuardados = JSON.parse(
        localStorage.getItem("turnos_db")
    ) || {};

    // Sincronizar variable global
    disponibilidadTurnos = turnosGuardados;

    const turnosExistentes = disponibilidadTurnos[fecha];

    if (turnosExistentes && turnosExistentes.length > 0) {
        turnosExistentes.forEach(t => {
            agregarFilaHorario(t.hora, t.cupos);
        });
    } else {
        // Si todavía no hay horarios para ese día,
        // dejamos una fila inicial para que el administrador pueda cargarla.
        agregarFilaHorario("09:00 hs", 1);
    }
}
window.prepararCamposAdmin = prepararCamposAdmin;

function agregarFilaHorario(hora = "09:00 hs", cupos = 1) {
    const contenedor = document.getElementById("listaHorariosAdmin");
    if (!contenedor) return;

    const partes = hora.replace(" hs", "").split(":");
    const hhInicial = partes[0] || "09";
    const mmInicial = partes[1] || "00";

    const div = document.createElement("div");
    div.className = "fila-horario";
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "8px";
    div.style.alignItems = "center";

    div.innerHTML = `
        <select class="input-control admin-hh" onchange="validarHoraUnicaEnLinea(this)">
            ${generarOpcionesHoras(hhInicial)}
        </select>
        <span>:</span>
        <select class="input-control admin-mm" onchange="validarHoraUnicaEnLinea(this)">
            <option value="00" ${mmInicial === '00' ? 'selected' : ''}>00</option>
            <option value="15" ${mmInicial === '15' ? 'selected' : ''}>15</option>
            <option value="30" ${mmInicial === '30' ? 'selected' : ''}>30</option>
            <option value="45" ${mmInicial === '45' ? 'selected' : ''}>45</option>
        </select>
        <span>hs</span>

        <input type="number" class="input-control input-cupos" value="${cupos}" min="1" style="width: 80px;" placeholder="Cupos">
        
        <button type="button" onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;">X</button>
    `;

    contenedor.appendChild(div);
}
window.agregarFilaHorario = agregarFilaHorario;

function generarOpcionesHoras(seleccionada) {
    let html = "";
    for (let i = 0; i < 24; i++) {
        const val = i.toString().padStart(2, '0');
        html += `<option value="${val}" ${val === seleccionada ? 'selected' : ''}>${val}</option>`;
    }
    return html;
}

function validarHoraUnicaEnLinea(selectElemento) {
    const fila = selectElemento.parentElement;
    const hhElem = fila.querySelector(".admin-hh");
    const mmElem = fila.querySelector(".admin-mm");

    if (!hhElem || !mmElem) return;

    const horaFormateada = `${hhElem.value}:${mmElem.value} hs`;
    const todasLasFilas = document.querySelectorAll(".fila-horario");
    
    let repeticiones = 0;
    todasLasFilas.forEach(f => {
        const h = f.querySelector(".admin-hh")?.value;
        const m = f.querySelector(".admin-mm")?.value;
        if (h && m && `${h}:${m} hs` === horaFormateada) {
            repeticiones++;
        }
    });

    if (repeticiones > 1) {
        alert(`⚠️ El horario ${horaFormateada} ya está agregado en la lista.`);
    }
}
window.validarHoraUnicaEnLinea = validarHoraUnicaEnLinea;

function guardarHorariosAdmin(fechaTarget) {

    // Si no se recibe fecha, tomarla del input del administrador
    if (!fechaTarget) {
        const inputFechaAdmin = document.getElementById("adminFecha");

        if (inputFechaAdmin) {
            fechaTarget = inputFechaAdmin.value;
        }
    }

    if (!fechaTarget) {
        alert("⚠️ Por favor seleccioná una fecha en el panel de administración.");
        return;
    }

    const filas = document.querySelectorAll(
        "#listaHorariosAdmin .fila-horario"
    );

    const nuevosTurnos = [];

    filas.forEach(fila => {

        const hhElem = fila.querySelector(".admin-hh");
        const mmElem = fila.querySelector(".admin-mm");
        const cuposElem = fila.querySelector(".input-cupos");

        if (!hhElem || !mmElem || !cuposElem) return;

        const hh = hhElem.value;
        const mm = mmElem.value;

        let cantCupos = parseInt(cuposElem.value, 10);

        if (isNaN(cantCupos) || cantCupos < 1) {
            cantCupos = 1;
        }

        const horaTexto = `${hh}:${mm} hs`;

        // Evitar horarios duplicados
        if (!nuevosTurnos.some(t => t.hora === horaTexto)) {
            nuevosTurnos.push({
                hora: horaTexto,
                cupos: cantCupos
            });
        }
    });

    // Ordenar cronológicamente
    nuevosTurnos.sort((a, b) => {
        return a.hora.localeCompare(b.hora);
    });

    // Recuperar la base actual
    const baseActual = JSON.parse(
        localStorage.getItem("turnos_db")
    ) || {};

    // Guardar los nuevos horarios para ESA fecha
    baseActual[fechaTarget] = nuevosTurnos;

    // Actualizar variable global
    disponibilidadTurnos = baseActual;

    // Persistir
    localStorage.setItem(
        "turnos_db",
        JSON.stringify(baseActual)
    );

    // Si estamos configurando la fecha actualmente seleccionada
    // en la página de reservas, actualizar inmediatamente la pantalla.
    const inputFechaReserva = document.getElementById("fecha");

    if (
        inputFechaReserva &&
        inputFechaReserva.value === fechaTarget
    ) {
        fechaSeleccionada = fechaTarget;
        cargarTurnosDelDia(fechaTarget);
    }

    alert(
        `✅ ¡Horarios guardados con éxito para la fecha ${fechaTarget}!\n\n` +
        `Horarios cargados: ${nuevosTurnos.length}`
    );

    cerrarHorarios();
}

window.guardarHorariosAdmin = guardarHorariosAdmin;

// ==========================================
// MENSAJES DE ERROR / CONFIRMACIÓN
// ==========================================
function mostrarErrorLocal(mensaje) {
    const boxError = document.getElementById('error-formulario-superior');
    if (boxError) {
        boxError.innerText = mensaje;
        boxError.style.display = 'block';
        boxError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function ocultarErrorLocal() {
    const boxError = document.getElementById('error-formulario-superior');
    if (boxError) {
        boxError.innerText = '';
        boxError.style.display = 'none';
    }
}

function mostrarConfirmacionReserva(datosReserva) {
    const modal = document.getElementById('modal-confirmacion');
    const contenedorDetalles = document.getElementById('detalles-reserva-texto');

    if (contenedorDetalles) {
        contenedorDetalles.innerHTML = `
            <strong>Nombre:</strong> ${datosReserva.nombre || 'N/A'}<br>
            <strong>Fecha:</strong> ${datosReserva.fecha || 'N/A'}<br>
            <strong>Hora:</strong> ${datosReserva.hora || 'N/A'}<br>
            <strong>Jugadores:</strong> ${datosReserva.jugadores || 'N/A'}
        `;
    }

    if (modal) {
        modal.style.display = 'flex';
    }
}

function cerrarModalConfirmacion() {
    const modal = document.getElementById('modal-confirmacion');
    if (modal) {
        modal.style.display = 'none';
    }
    window.location.reload();
}

// ==========================================
// ENVÍO DE RESERVA
// ==========================================
async function enviarReserva(e) {
    if (e && e.preventDefault) {
        e.preventDefault();
    }

    ocultarErrorLocal();

    const nombreInput    = document.getElementById('nombre');
    const emailInput     = document.getElementById('email');
    const telInput       = document.getElementById('telefono');
    const selectPartic   = document.getElementById('cantidad-participantes');
    const tipoPagoRadio  = document.querySelector('input[name="tipoPago"]:checked');
    const btnPagar       = document.getElementById('btnPagar');

    const nombre       = nombreInput  ? nombreInput.value.trim()  : "";
    const email        = emailInput   ? emailInput.value.trim()   : "";
    const participantes= selectPartic ? selectPartic.value        : "";
    const telefonoVal  = telInput     ? telInput.value.trim()     : "";
    const tipoPago     = tipoPagoRadio ? tipoPagoRadio.value      : 'sena';
    const esValidoTel  = (typeof iti !== "undefined" && iti) ? iti.isValidNumber() : true;

    // VALIDACIONES
    if (!fechaSeleccionada) {
        mostrarErrorLocal("⚠️ Por favor, seleccioná una fecha para la reserva.");
        return;
    }
    if (!grupoSeleccionado) {
        mostrarErrorLocal("⚠️ Por favor, seleccioná un horario disponible.");
        return;
    }
    if (!participantes) {
        mostrarErrorLocal("⚠️ Por favor, seleccioná la cantidad de participantes.");
        return;
    }
    if (!nombre) {
        mostrarErrorLocal("⚠️ Por favor, ingresá tu Nombre y Apellido.");
        return;
    }
    if (!email) {
        mostrarErrorLocal("⚠️ Por favor, ingresá un correo electrónico válido.");
        return;
    }
    if (!telefonoVal) {
        mostrarErrorLocal("⚠️ Por favor, ingresá un número de teléfono.");
        return;
    }
    if (!esValidoTel) {
        mostrarErrorLocal("⚠️ El número de teléfono no es válido. Verificá el código de área.");
        return;
    }

    // Verificar cupo
    const turnosDelDia = disponibilidadTurnos[fechaSeleccionada];
    const turno = turnosDelDia ? turnosDelDia.find(t => t.hora === grupoSeleccionado) : null;

    if (!turno || turno.cupos <= 0) {
        mostrarErrorLocal("⚠️ El turno elegido ya no cuenta con lugares disponibles.");
        return;
    }

    // ✅ FIX 2: Guardamos la hora ANTES de resetear grupoSeleccionado
    const horaReservada = grupoSeleccionado;

    if (btnPagar) {
        btnPagar.disabled = true;
        btnPagar.innerText = "Procesando...";
    }

    try {
        // 1. Descontar cupo
        turno.cupos -= 1;
        localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

        // 2. Refrescar visualmente los turnos (usando el ID correcto del contenedor)
        // ✅ FIX 2b: Llamamos a cargarTurnosDelDia que usa el ID real "contenedorGrupos"
        cargarTurnosDelDia(fechaSeleccionada);

        // 3. Guardar en el historial
        let historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
        historial.push({
            fecha: fechaSeleccionada,
            hora: horaReservada,                                               // ← hora guardada antes del reset
            modalidad: typeof misionSeleccionada !== "undefined" ? misionSeleccionada : "Estándar",
            participantes: participantes,
            nombre: nombre,
            email: email,
            telefono: (typeof iti !== "undefined" && iti) ? iti.getNumber() : telefonoVal,
            vendedor: "Web",
            tipoPago: tipoPago === 'sena' ? 'Seña' : 'Total',
            monto: `$${precioFinal.toLocaleString('es-AR')}`,
            fechaCreacion: new Date().toLocaleString()
        });
        localStorage.setItem("historial_reservas", JSON.stringify(historial));

        // ✅ FIX 3: Variables del templateParams alineadas con el esqueleto de EmailJS
        if (typeof emailjs !== "undefined") {
            const horaLimpia = horaReservada.replace(/\s*hs\s*/gi, '').trim();

            const templateParams = {
                to_name:           nombre,
                to_email:          email,
                nombre:            nombre,
                dia_fecha:         fechaSeleccionada,           // {{dia_fecha}}
                hora:              horaLimpia,                  // {{hora}}
                cantidad_jugadores: participantes,              // {{cantidad_jugadores}}
                modalidad:         misionSeleccionada || "Estándar", // {{modalidad}}
                pago:              tipoPago === 'sena' ? 'Seña (Abonar el resto de la sala antes de ingresar)' : 'Total', // {{pago}}
                precio:            `$${precioFinal.toLocaleString('es-AR')}`
            };

            await Promise.race([
                emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout en EmailJS")), 4000))
            ]);
        }

        // 4. Mostrar confirmación
        mostrarConfirmacionReserva({
            nombre:   nombre,
            fecha:    fechaSeleccionada,
            hora:     horaReservada,                            // ← hora correcta
            jugadores: participantes
        });

    } catch (err) {
        console.error("Detalle en el proceso de reserva:", err);
        mostrarErrorLocal("Hubo un detalle al procesar la reserva, pero fue registrada.");
    } finally {
        if (btnPagar) {
            btnPagar.disabled = false;
            btnPagar.innerText = "Confirmar Reserva";
        }
    }
}
window.enviarReserva = enviarReserva;

// ==========================================
// CÁLCULO DE PRECIO
// ==========================================
function calcularPrecioReserva() {
    const selectParticipantes = document.getElementById('cantidad-participantes');
    const cantParticipantes = selectParticipantes ? parseInt(selectParticipantes.value, 10) : 0;
    const tipoPagoRadio = document.querySelector('input[name="tipoPago"]:checked');
    const tipoPago = tipoPagoRadio ? tipoPagoRadio.value : 'sena';

    const modTexto = (typeof misionSeleccionada !== "undefined" && misionSeleccionada) 
        ? String(misionSeleccionada) 
        : "";

    const modLimpia = modTexto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const esExtendida = modLimpia.includes("extendid");

    // Precio seña fijo / precio total por participantes
    if (tipoPago === 'sena') {
        precioFinal = esExtendida ? 20000 : 15000;
    } else {
        if (cantParticipantes > 0) {
            const tabla = esExtendida ? tablaPrecios["Extendida"] : tablaPrecios["Express"];
            precioFinal = tabla[String(cantParticipantes)] || 0;
        } else {
            precioFinal = 0;
        }
    }

    const precioTxt = document.getElementById('precioTxt');
    if (precioTxt) {
        precioTxt.innerText = precioFinal > 0 ? `$${precioFinal.toLocaleString('es-AR')}` : "$0";
    }
}
window.calcularPrecioReserva = calcularPrecioReserva;

// ==========================================
// MONITOR: TABLA DE RESERVAS
// ==========================================
function renderizarTablaReservas() {
    const contenedor = document.getElementById("tablaSalaContenedor");
    const inputFecha = document.getElementById("monitorFecha");
    if (!contenedor) return;

    const historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
    const fechaFiltro = inputFecha ? inputFecha.value : "";

    const reservasFiltradas = fechaFiltro 
        ? historial.filter(r => r.fecha === fechaFiltro)
        : historial;

    if (reservasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No hay reservas registradas ${fechaFiltro ? 'para la fecha ' + fechaFiltro : ''}.</p>`;
        return;
    }

    let html = `
        <table style="width:100%; border-collapse: collapse; background: #fff; font-size: 13px; color: #333; border-radius:6px; overflow:hidden;">
            <thead>
                <tr style="background-color: #1a1a1a; color: #f1c40f; text-align: left;">
                    <th style="padding: 10px; border: 1px solid #333;">Fecha</th>
                    <th style="padding: 10px; border: 1px solid #333;">Hora</th>
                    <th style="padding: 10px; border: 1px solid #333;">Misión</th>
                    <th style="padding: 10px; border: 1px solid #333;">Cliente</th>
                    <th style="padding: 10px; border: 1px solid #333;">Teléfono</th>
                    <th style="padding: 10px; border: 1px solid #333;">Part.</th>
                    <th style="padding: 10px; border: 1px solid #333;">Pago</th>
                    <th style="padding: 10px; border: 1px solid #333;">Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    reservasFiltradas.forEach((res) => {
        const indexReal = historial.indexOf(res);
        html += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${res.fecha || '-'}</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${res.hora || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${res.modalidad || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    <strong>${res.nombre || '-'}</strong><br>
                    <small style="color:#666;">${res.email || ''}</small>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${res.telefono || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">${res.participantes || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    <span style="font-weight:bold; color: #27ae60;">${res.monto || ''}</span><br>
                    <small style="color:#888;">${res.tipoPago || ''}</small>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">
                    <button onclick="eliminarReservaAdmin(${indexReal})" style="background:#e74c3c; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-weight:bold;" title="Eliminar reserva">🗑️</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

function eliminarReservaAdmin(index) {
    if (confirm("⚠️ ¿Estás seguro de que querés borrar esta reserva de la base de datos?")) {
        let historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
        historial.splice(index, 1);
        localStorage.setItem("historial_reservas", JSON.stringify(historial));
        renderizarTablaReservas();
    }
}
window.eliminarReservaAdmin = eliminarReservaAdmin;

document.addEventListener("DOMContentLoaded", function() {
    const inputFechaMonitor = document.getElementById("monitorFecha");
    if (inputFechaMonitor) {
        inputFechaMonitor.addEventListener("change", renderizarTablaReservas);
    }
});

// ==========================================
// CARRUSEL Y LIGHTBOX
// ==========================================
let indiceCarrusel = 0;
let indiceLightbox = 0;

function mostrarDiapositiva(indice) {
    const elementos = document.querySelectorAll('.carrusel-slide .carrusel-img');
    const puntos = document.querySelectorAll('.carrusel-puntos .punto');

    if (elementos.length === 0) return;

    if (indice >= elementos.length) {
        indiceCarrusel = 0;
    } else if (indice < 0) {
        indiceCarrusel = elementos.length - 1;
    } else {
        indiceCarrusel = indice;
    }

    elementos.forEach((el) => {
        el.classList.remove('activa');
        if (el.tagName === 'VIDEO') el.pause();
    });

    puntos.forEach((p) => p.classList.remove('activo'));

    if (elementos[indiceCarrusel]) elementos[indiceCarrusel].classList.add('activa');
    if (puntos[indiceCarrusel]) puntos[indiceCarrusel].classList.add('activo');
}

function moverCarrusel(direccion) {
    mostrarDiapositiva(indiceCarrusel + direccion);
}

function irAFoto(indice) {
    mostrarDiapositiva(indice);
}

function abrirLightbox(elemento) {
    const elementos = Array.from(document.querySelectorAll('.carrusel-slide .carrusel-img'));
    const index = elementos.indexOf(elemento);

    if (index !== -1) {
        indiceLightbox = index;
        actualizarContenidoLightbox();
        const modal = document.getElementById('lightbox-modal');
        if (modal) modal.style.display = 'flex';
    }
}

function actualizarContenidoLightbox() {
    const elementos = document.querySelectorAll('.carrusel-slide .carrusel-img');
    const imgAmpliada  = document.getElementById('lightbox-img');
    const videoAmpliado = document.getElementById('lightbox-video');
    const videoSource   = document.getElementById('lightbox-video-source');

    if (elementos.length === 0 || !elementos[indiceLightbox]) return;

    const elementoActual = elementos[indiceLightbox];

    if (elementoActual.tagName === 'VIDEO') {
        imgAmpliada.style.display = 'none';
        elementoActual.pause();
        const fuenteOriginal = elementoActual.querySelector('source') ? elementoActual.querySelector('source').src : elementoActual.src;
        videoSource.src = fuenteOriginal;
        videoAmpliado.load();
        videoAmpliado.style.display = 'block';
    } else {
        videoAmpliado.pause();
        videoAmpliado.style.display = 'none';
        imgAmpliada.src = elementoActual.src;
        imgAmpliada.style.display = 'block';
    }
}

function cambiarFotoLightbox(direccion) {
    const elementos = document.querySelectorAll('.carrusel-slide .carrusel-img');
    if (elementos.length === 0) return;

    indiceLightbox += direccion;

    if (indiceLightbox >= elementos.length) indiceLightbox = 0;
    else if (indiceLightbox < 0) indiceLightbox = elementos.length - 1;

    actualizarContenidoLightbox();
    mostrarDiapositiva(indiceLightbox);
}

function cerrarLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const videoAmpliado = document.getElementById('lightbox-video');
    if (videoAmpliado) videoAmpliado.pause();
    if (modal) modal.style.display = 'none';
}

function cerrarLightboxEnFondo(e) {
    if (e.target.id === 'lightbox-modal') cerrarLightbox();
}

document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('lightbox-modal');
    if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') cerrarLightbox();
        if (e.key === 'ArrowRight') cambiarFotoLightbox(1);
        if (e.key === 'ArrowLeft') cambiarFotoLightbox(-1);
    }
});

// Exportar funciones al scope global
window.mostrarDiapositiva = mostrarDiapositiva;
window.moverCarrusel = moverCarrusel;
window.irAFoto = irAFoto;
window.abrirLightbox = abrirLightbox;
window.cambiarFotoLightbox = cambiarFotoLightbox;
window.cerrarLightbox = cerrarLightbox;
window.cerrarLightboxEnFondo = cerrarLightboxEnFondo;
window.cerrarModalConfirmacion = cerrarModalConfirmacion;
window.renderizarTablaReservas = renderizarTablaReservas;

// ==========================================
// INICIALIZACIÓN
// ==========================================
const turnosGuardados = localStorage.getItem("turnos_db");

if (turnosGuardados) {
    disponibilidadTurnos = JSON.parse(turnosGuardados);
} else {
    localStorage.setItem(
        "turnos_db",
        JSON.stringify(disponibilidadTurnos)
    );
}

document.addEventListener("DOMContentLoaded", function() {
    const inputFecha = document.getElementById("fecha");
    
    if (inputFecha) {
        if (!inputFecha.value) {
            inputFecha.value = "2026-08-18";
        }
        cargarTurnosDelDia(inputFecha.value);

        inputFecha.addEventListener("change", function() {
            cargarTurnosDelDia(this.value);
        });
    }
});
