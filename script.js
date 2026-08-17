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
// Variable global para almacenar la modalidad
// Función auxiliar para alternar vistas/pantallas
// Variable global para controlar la misión
let misionSeleccionada = "Express";

// 1. FUNCIÓN PARA MOSTRAR Y OCULTAR VISTAS
function mostrarVista(idVista) {
    // Si olvidaste ponerle "vista-", se lo agrega automáticamente
    if (!idVista.startsWith('vista-')) {
        idVista = 'vista-' + idVista;
    }

    // Buscamos todas las secciones
    const secciones = document.querySelectorAll(".vista-seccion");
    
    secciones.forEach(sec => {
        sec.style.display = "none";
        sec.classList.remove("activo");
    });

    // Mostramos la sección seleccionada
    const vistaDestino = document.getElementById(idVista);
    if (vistaDestino) {
        vistaDestino.style.display = "block";
        vistaDestino.classList.add("activo");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        console.error("No se encontró ninguna sección con el ID:", idVista);
    }
}

// 2. FUNCIÓN PARA SELECCIONAR LA MISIÓN Y IR A LA RESERVA
function seleccionarMision(nombreMision) {
    misionSeleccionada = nombreMision;

    // Actualizamos el texto del título en el formulario
    const tituloTxt = document.getElementById("mision-seleccionada-txt");
    if (tituloTxt) {
        tituloTxt.innerText = nombreMision;
    }

    // Mostramos directamente el formulario de reserva final
    mostrarVista("vista-reserva-final");

    // Recalculamos el precio dinámico si la función existe
    if (typeof calcularPrecioReserva === "function") {
        calcularPrecioReserva();
    }
}


function actualizarPrecioPorParticipantes() {
    const selectParticipantes = document.getElementById("cantidad-participantes");
    const txtPrecio = document.getElementById("precioTxt");
    
    if (!selectParticipantes || !modalidadSeleccionada) return;
    
    const cantidad = selectParticipantes.value;
    
    if (cantidad && tablaPrecios[modalidadSeleccionada][cantidad]) {
        precioFinal = tablaPrecios[modalidadSeleccionada][cantidad];
        if (txtPrecio) txtPrecio.innerText = `$${precioFinal.toLocaleString('es-AR')}`;
    } else {
        precioFinal = 0;
        if (txtPrecio) txtPrecio.innerText = "$0";
    }
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
// GESTIÓN DE TURNOS Y FECHAS (CON FILTRO DE AGOTADOS)
// ==========================================
function cargarTurnosDelDia(fechaString) {
    if (!fechaString) return;

    fechaSeleccionada = fechaString;
    const contenedor = document.getElementById("contenedorGrupos");
    if (!contenedor) return;
    
    contenedor.innerHTML = ""; 
    grupoSeleccionado = ""; 

    // 🔴 0. REFRESCAMOS LA VARIABLE GLOBAL DESDE LOCALSTORAGE
    disponibilidadTurnos = JSON.parse(localStorage.getItem("turnos_db")) || {};

    // 1. Solo si la fecha REALMENTE no existe en la base de datos, usamos la estructura base
    if (!disponibilidadTurnos[fechaString]) {
        disponibilidadTurnos[fechaString] = JSON.parse(JSON.stringify(estructuraBasePorDefecto));
        localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));
    }

    const turnosHoy = disponibilidadTurnos[fechaString];

    // 2. Filtrado seguro: convertimos cupos a número por si vino como texto ("1")
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

        btn.innerHTML = `${turno.hora}<br><span class="cupo" style="font-weight:400; font-size:12px;">${turno.cupos} lugar disp.</span>`;

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
// ==========================================
// ATAJOS Y ADMIN (Versión Directa e Inmune al Navegador)
// ==========================================
const CLAVE_ADMIN = "admin123";

document.addEventListener('keydown', function(event) {
    // Alt + H  o  Ctrl + F10 -> Configuración de Horarios
    if ((event.altKey && event.key.toLowerCase() === 'h') || event.key === 'F10') {
        event.preventDefault();
        abrirHorariosConSeguridad();
    }

    // Ctrl + Shift + A -> Configuración de Horarios (atajo alternativo)
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        event.stopPropagation();
        abrirHorariosConSeguridad();
    }

    // Alt + M -> Monitor de Reservas
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

// Punto de entrada único para abrir el panel de administración de horarios.
// Lo usa tanto el atajo de teclado como el link "⚙️ Admin" del footer.
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
    const turnosExistentes = disponibilidadTurnos[fecha] || estructuraBasePorDefecto;
    turnosExistentes.forEach(t => agregarFilaHorario(t.hora, t.cupos));
}
window.prepararCamposAdmin = prepararCamposAdmin;

// 1. Crear la fila visual en el panel admin (usando selects para HH y MM para evitar errores de tipeo)
function agregarFilaHorario(hora = "09:00 hs", cupos = 1) {
    const contenedor = document.getElementById("listaHorariosAdmin");
    if (!contenedor) return;

    // Separamos "09:00 hs" en hora ("09") y minuto ("00")
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

// Auxiliar para llenar las 24 horas en el select
function generarOpcionesHoras(seleccionada) {
    let html = "";
    for (let i = 0; i < 24; i++) {
        const val = i.toString().padStart(2, '0');
        html += `<option value="${val}" ${val === seleccionada ? 'selected' : ''}>${val}</option>`;
    }
    return html;
}

// 2. Validar que no se repitan horarios al cambiar los selects
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

// 3. 🚨 FUNCIÓN CLAVE: Guarda los horarios creados en la base de datos
function guardarHorariosAdmin(fechaTarget) {
    if (!fechaTarget) {
        alert("⚠️ Por favor seleccioná una fecha en el panel de administración.");
        return;
    }

    const filas = document.querySelectorAll("#listaHorariosAdmin .fila-horario");
    const nuevosTurnos = [];

    filas.forEach(fila => {
        const hh = fila.querySelector(".admin-hh").value;
        const mm = fila.querySelector(".admin-mm").value;
        const cuposInput = fila.querySelector(".input-cupos").value;

        const horaTexto = `${hh}:${mm} hs`;
        const cantCupos = parseInt(cuposInput, 10) || 1;

        // Evitar duplicados al armar el array final
        if (!nuevosTurnos.some(t => t.hora === horaTexto)) {
            nuevosTurnos.push({
                hora: horaTexto,
                cupos: cantCupos
            });
        }
    });

    // Ordenar los horarios de menor a mayor
    nuevosTurnos.sort((a, b) => a.hora.localeCompare(b.hora));

    // Guardar en el objeto global y en localStorage
    disponibilidadTurnos[fechaTarget] = nuevosTurnos;
    localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

    // Refrescar el cliente si la fecha coincide
    if (typeof fechaSeleccionada !== "undefined" && fechaSeleccionada === fechaTarget) {
        if (typeof renderizarTurnosDisponibles === "function") {
            renderizarTurnosDisponibles(fechaTarget);
        }
    }

    alert(`✅ ¡Horarios guardados con éxito para la fecha ${fechaTarget}!`);
}
window.guardarHorariosAdmin = guardarHorariosAdmin;
window.validarHoraUnicaEnLinea = validarHoraUnicaEnLinea;

function guardarConfiguracionAdmin() {
    const fecha = document.getElementById("adminFecha").value;
    if (!fecha) { alert("Seleccioná una fecha válida."); return; }

    const filas = document.querySelectorAll(".fila-horario");
    const horasVistas = new Set();
    const nuevosTurnos = [];

    for (let fila of filas) {
        const hh = fila.querySelector(".admin-hh").value;
        const mm = fila.querySelector(".admin-mm").value;
        let cupos = parseInt(fila.querySelector(".admin-cupos").value, 10);
        const horaFinal = `${hh}:${mm} hs`;

        if (horasVistas.has(horaFinal)) {
            alert(`El horario "${horaFinal}" está duplicado.`);
            return;
        }
        if (isNaN(cupos) || cupos < 0 || cupos > 1) {
            alert("Los cupos solo pueden ser 0 o 1.");
            return;
        }
        horasVistas.add(horaFinal);
        nuevosTurnos.push({ hora: horaFinal, cupos: cupos });
    }

    nuevosTurnos.sort((a, b) => a.hora.localeCompare(b.hora));
    disponibilidadTurnos[fecha] = nuevosTurnos;
    localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

    alert("¡Horarios guardados con éxito!");
    cerrarHorarios();

    if (document.getElementById("fecha") && document.getElementById("fecha").value === fecha) {
        cargarTurnosDelDia(fecha);
    }
}
window.guardarConfiguracionAdmin = guardarConfiguracionAdmin;

// Función para mostrar el mensaje dentro del div existente en el HTML
function mostrarErrorLocal(mensaje) {
    const boxError = document.getElementById('error-formulario-superior');
    if (boxError) {
        boxError.innerText = mensaje;
        boxError.style.display = 'block'; // Lo hacemos visible
        boxError.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll suave hasta el error
    }
}

// Función para ocultar el mensaje cuando la validación pasa
function ocultarErrorLocal() {
    const boxError = document.getElementById('error-formulario-superior');
    if (boxError) {
        boxError.innerText = '';
        boxError.style.display = 'none';
    }
}

// Función para mostrar el cartel de confirmación
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

// Función para cerrar el cartel
function cerrarModalConfirmacion() {
    const modal = document.getElementById('modal-confirmacion');
    if (modal) {
        modal.style.display = 'none';
    }
}
function renderizarTurnosDisponibles(fecha) {
    const contenedor = document.getElementById('contenedor-horarios'); // Tu contenedor
    if (!contenedor) return;

    contenedor.innerHTML = ""; // Limpiamos los anteriores

    const turnos = disponibilidadTurnos[fecha] || [];

    turnos.forEach(turno => {
        // ⚠️ Si no hay cupos, omitimos el botón o lo mostramos deshabilitado
        if (turno.cupos <= 0) {
            /* OPCIÓN A: No mostrar el horario directamente */
            return; 

            /* OPCIÓN B: Mostrarlo pero deshabilitado (gris)
            const btn = document.createElement('button');
            btn.className = 'btn-horario deshabilitado';
            btn.disabled = true;
            btn.innerText = `${turno.hora} (Agotado)`;
            contenedor.appendChild(btn);
            return;
            */
        }

        // Si hay cupo, mostramos el botón normalmente
        const btn = document.createElement('button');
        btn.className = 'btn-horario';
        btn.innerText = turno.hora;
        btn.onclick = () => seleccionarHorario(turno.hora);
        contenedor.appendChild(btn);
    });
}
async function enviarReserva(e) {
    // Si viene un evento (ej. onSubmit del formulario), prevenimos el recargo de página
    if (e && e.preventDefault) {
        e.preventDefault();
    }

    ocultarErrorLocal(); // Ocultamos errores anteriores

    const nombreInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const telInput = document.getElementById('telefono');
    const selectParticipantes = document.getElementById('cantidad-participantes');
    const vendedorRadio = document.querySelector('input[name="vendedor"]:checked');
    const btnPagar = document.getElementById('btnPagar');

    // Captura del tipo de pago (Seña o Total)
    const tipoPagoRadio = document.querySelector('input[name="tipoPago"]:checked');
    const tipoPago = tipoPagoRadio ? tipoPagoRadio.value : 'sena';

    const nombre = nombreInput ? nombreInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const participantes = selectParticipantes ? selectParticipantes.value : "";
    const telefonoVal = telInput ? telInput.value.trim() : "";
    const esValidoTel = (typeof iti !== "undefined" && iti) ? iti.isValidNumber() : true;

    // 🔍 VALIDACIONES
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

    // Comprobar disponibilidad de cupo
    const turnosDelDia = disponibilidadTurnos[fechaSeleccionada];
    const turno = turnosDelDia ? turnosDelDia.find(t => t.hora === grupoSeleccionado) : null;

    if (!turno || turno.cupos <= 0) {
        mostrarErrorLocal("⚠️ El turno elegido ya no cuenta con lugares disponibles.");
        return;
    }

    // PROCESAMIENTO DE RESERVA
    if (btnPagar) {
        btnPagar.disabled = true;
        btnPagar.innerText = "Procesando...";
    }

    try {
        // 1. Descontar cupo y guardar en localStorage
      // 1. Descontar cupo y guardar en localStorage
turno.cupos -= 1;
localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

// 🔄 DESHABILITAR O REMOVER EL HORARIO RECIÉN RESERVADO EN EL DOM
if (turno.cupos <= 0) {
    // Buscamos todos los botones/elementos de horarios
    const elementosHorario = document.querySelectorAll('.btn-horario, .opcion-horario, [data-hora]');
    
    elementosHorario.forEach(el => {
        // Comparamos si el texto o atributo coincide con el horario reservado
        if (el.innerText.includes(grupoSeleccionado) || el.dataset.hora === grupoSeleccionado) {
            el.classList.add('deshabilitado');
            el.disabled = true;
            el.style.opacity = '0.3';
            el.style.pointerEvents = 'none';
            el.innerText = `${grupoSeleccionado} (Agotado)`;
        }
    });
}

// Reseteamos el horario seleccionado para que no quede marcado
grupoSeleccionado = null;

// 👇 AGREGÁ ESTA LÍNEA (Usá el nombre exacto de tu función que dibuja los turnos en el DOM)
        renderizarTurnosDisponibles(fechaSeleccionada)
        // 2. Guardar en el historial
        let historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
        historial.push({
            fecha: fechaSeleccionada,
            hora: grupoSeleccionado,
            modalidad: typeof modalidadSeleccionada !== "undefined" ? modalidadSeleccionada : "Estándar",
            participantes: participantes,
            nombre: nombre,
            email: email,
            telefono: typeof iti !== "undefined" && iti ? iti.getNumber() : telefonoVal,
            vendedor: vendedorRadio ? vendedorRadio.value : "Sin definir",
            tipoPago: tipoPago === 'sena' ? 'Seña' : 'Total',
            monto: typeof precioFinal !== "undefined" ? `$${precioFinal.toLocaleString('es-AR')}` : "-",
            fechaCreacion: new Date().toLocaleString()
        });
        localStorage.setItem("historial_reservas", JSON.stringify(historial));

       // 3. Envío por EmailJS
if (typeof emailjs !== "undefined" && typeof EMAILJS_PUBLIC_KEY !== "undefined") {
    
    // Limpiamos la hora para evitar el "hs hs" si ya trae "hs"
    const horaLimpia = horaReservada ? horaReservada.replace(/hs/gi, '').trim() : "";

    const templateParams = {
        to_name: nombre,
        to_email: email,
        nombre: nombre,                          // Para {{nombre}}
        dia: fechaSeleccionada || "",             // Para {{dia}} o {{fecha}}
        fecha: fechaSeleccionada || "",           // Respaldo por si usás {{fecha}}
        hora: horaLimpia,                        // Para {{hora}}
        jugadores: participantes || "",           // Para {{jugadores}} o {{participantes}}
        participantes: participantes || "",       // Respaldo
        experiencia: typeof modalidadSeleccionada !== "undefined" ? modalidadSeleccionada : "Estándar",
        pago: tipoPago === 'sena' ? 'Seña' : 'Total', // Para {{pago}}
        precio: typeof precioFinal !== "undefined" ? `$${precioFinal.toLocaleString('es-AR')}` : "-"
    };

    await Promise.race([
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout en EmailJS")), 4000))
    ]);
}

        // 4. Mostrar cartel de confirmación con los datos capturados
        const datosReserva = {
            nombre: nombre,
            fecha: fechaSeleccionada,
            hora: grupoSeleccionado,
            jugadores: participantes
        };

        mostrarConfirmacionReserva(datosReserva);

    } catch (err) {
        console.error("Detalle en el proceso de reserva:", err);
        mostrarErrorLocal("Hubo un detalle al procesar la reserva, pero fue registrada.");
    } finally {
        // Restablecemos siempre el botón para que no quede "Procesando..."
        if (btnPagar) {
            btnPagar.disabled = false;
            btnPagar.innerText = "Pagar / Reservar";
        }
    }
}

// Función para renderizar los botones de horarios/turnos
function renderizarHorarios(fecha) {
    const contenedorHorarios = document.getElementById('contenedor-horarios'); // Asegúrate de usar el ID real de tu HTML
    if (!contenedorHorarios) return;

    contenedorHorarios.innerHTML = ""; // Limpiar horarios anteriores

    const turnosDelDia = disponibilidadTurnos[fecha];

    if (!turnosDelDia || turnosDelDia.length === 0) {
        contenedorHorarios.innerHTML = "<p>No hay horarios disponibles para esta fecha.</p>";
        return;
    }

    // 🔍 FILTRADO: Solo tomamos los turnos que tengan más de 0 cupos
    const turnosDisponibles = turnosDelDia.filter(turno => turno.cupos > 0);

    // Si todos los horarios están agotados
    if (turnosDisponibles.length === 0) {
        contenedorHorarios.innerHTML = "<p>Todos los turnos de este día ya fueron reservados.</p>";
        return;
    }

    // Dibujar únicamente los horarios con cupos
    turnosDisponibles.forEach(turno => {
        const btnHora = document.createElement('button');
        btnHora.classList.add('btn-horario');
        btnHora.innerText = turno.hora;

        // Evento al seleccionar un horario
        btnHora.onclick = () => {
            // Desmarcar otros botones si tenías clase 'activo' o 'seleccionado'
            document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('seleccionado'));
            btnHora.classList.add('seleccionado');
            
            grupoSeleccionado = turno.hora; // Guardar la hora elegida
        };

        contenedorHorarios.appendChild(btnHora);
    });
}
function guardarHorariosAdmin() {
    // 1. Obtenemos la fecha seleccionada en el modal de admin
    const inputFechaAdmin = document.getElementById("fechaAdmin") || document.getElementById("fecha");
    
    if (!inputFechaAdmin || !inputFechaAdmin.value) {
        alert("Por favor, selecciona una fecha primero.");
        return;
    }

    const fechaKey = inputFechaAdmin.value; // Formato YYYY-MM-DD (ej: 2026-08-17)
    const nuevosHorarios = [];

    // 2. Leemos cada fila de horarios que agregaste en el modal
    const filas = document.querySelectorAll("#listaHorariosAdmin .fila-horario") || document.querySelectorAll(".fila-horario");

    filas.forEach(fila => {
        const inputHora = fila.querySelector("input[type='text']") || fila.querySelector(".input-hora");
        const inputCupos = fila.querySelector("input[type='number']") || fila.querySelector(".input-cupos");

        if (inputHora && inputHora.value.trim() !== "") {
            nuevosHorarios.push({
                hora: inputHora.value.trim(),
                cupos: inputCupos ? (parseInt(inputCupos.value, 10) || 1) : 1
            });
        }
    });

    // 3. Si no hay filas pero usaste agregarFilaHorario, guardamos lo que haya
    if (nuevosHorarios.length === 0) {
        alert("Agregá al menos un horario antes de guardar.");
        return;
    }

    // 4. Actualizamos la base de datos local
    disponibilidadTurnos[fechaKey] = nuevosHorarios;
    localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

    alert(`¡Horarios guardados correctamente para el ${fechaKey}!`);

    // 5. Refrescamos automáticamente la pantalla principal de reservas
    if (typeof cargarTurnosDelDia === "function") {
        cargarTurnosDelDia(fechaKey);
    }

    // 6. Cerramos el modal si tenés una función para eso
    const modal = document.getElementById("modalHorarios");
    if (modal) modal.style.display = "none";
}
// Cargar lo que haya en el almacenamiento local


// Asignar el horario del 18 de agosto
// AL INICIO DE TU SCRIPT.JS:
// Lee PRIMERO el localStorage. Si no existe, toma la base inicial.

// Guardar inmediatamente la actualización
localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

document.addEventListener("DOMContentLoaded", function() {
    const inputFecha = document.getElementById("fecha");
    
    // Si la fecha seleccionada es el 18 o la asignamos por defecto:
    if (inputFecha) {
        if (!inputFecha.value) {
            inputFecha.value = "2026-08-18";
        }
        
        // Cargar los turnos
        cargarTurnosDelDia(inputFecha.value);

        // Escuchar cuando el usuario cambia la fecha en el calendario
        inputFecha.addEventListener("change", function() {
            cargarTurnosDelDia(this.value);
        });
    }
});

// Variable global para guardar el monto actual a cobrar

function calcularPrecioReserva() {
    const selectParticipantes = document.getElementById('cantidad-participantes');
    const cantParticipantes = selectParticipantes ? parseInt(selectParticipantes.value, 10) : 0;
    const tipoPagoRadio = document.querySelector('input[name="tipoPago"]:checked');
    const tipoPago = tipoPagoRadio ? tipoPagoRadio.value : 'sena';

    // 1. Leemos la modalidad global
    let modTexto = (typeof modalidadSeleccionada !== "undefined" && modalidadSeleccionada) 
        ? String(modalidadSeleccionada) 
        : "";

    // 2. Normalizamos: pasamos a minúsculas y quitamos tildes/acentos
    const modLimpia = modTexto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // "Misión Extendida" -> "mision extendida"

    // Evaluamos si es extendida de forma flexible
    const esExtendida = modLimpia.includes("extendid") || modLimpia.includes("mision 2") || modLimpia.includes("larga");

    console.log("🔍 DIAGNÓSTICO PRECIO:", {
        modalidadOriginal: modTexto,
        modalidadLimpia: modLimpia,
        esExtendida: esExtendida,
        tipoPago: tipoPago
    });

    // 3. Calculamos el precio base total
    let precioTotalSala = 0;
    if (cantParticipantes > 0) {
        const tarifaPorPersona = esExtendida ? 12000 : 9000;
        precioTotalSala = cantParticipantes * tarifaPorPersona;
    }

    // 4. Evaluamos según el tipo de pago
    if (tipoPago === 'sena') {
        precioFinal = esExtendida ? 20000 : 15000;
    } else {
        precioFinal = precioTotalSala;
    }

    // 5. Actualizamos el HTML
    const precioTxt = document.getElementById('precioTxt');
    if (precioTxt) {
        if (cantParticipantes === 0 && tipoPago === 'total') {
            precioTxt.innerText = "$0";
        } else {
            precioTxt.innerText = `$${precioFinal.toLocaleString('es-AR')}`;
        }
    }
}

// Aseguramos que el selector de participantes ejecute esta función
function actualizarPrecioPorParticipantes() {
    calcularPrecioReserva();
}

document.addEventListener('keydown', function(event) {
    if ((event.altKey && (event.key === 'm' || event.key === 'M')) || event.key === 'F9') {
        event.preventDefault();
        abrirMonitorConPassword();
    }
});

// Solicitud de contraseña para abrir el monitor


// Función para cerrar el modal
function cerrarMonitor() {
    const modal = document.getElementById("modalMonitor");
    if (modal) modal.style.display = "none";
}

// Función principal para leer localStorage y mostrar la tabla
function renderizarTablaReservas() {
    const contenedor = document.getElementById("tablaSalaContenedor");
    const inputFecha = document.getElementById("monitorFecha");
    if (!contenedor) return;

    // Leemos el historial guardado
    const historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
    const fechaFiltro = inputFecha ? inputFecha.value : "";

    // Filtrar si hay fecha seleccionada (o mostrar todas si se borra el filtro)
    const reservasFiltradas = fechaFiltro 
        ? historial.filter(r => r.fecha === fechaFiltro)
        : historial;

    if (reservasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No hay reservas registradas ${fechaFiltro ? 'para la fecha ' + fechaFiltro : ''}.</p>`;
        return;
    }

    // Construcción de la tabla HTML
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

    reservasFiltradas.forEach((res, index) => {
        // Buscamos el índice real dentro del array global de historial para poder borrar la correcta
        const indexReal = historial.indexOf(res);

        html += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${res.fecha || '-'}</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${res.hora || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${res.mision || res.modalidad || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    <strong>${res.nombre || '-'}</strong><br>
                    <small style="color:#666;">${res.email || ''}</small>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${res.telefono || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">${res.participantes || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    <span style="font-weight:bold; color: #27ae60;">${res.montoAbonado || res.precio || ''}</span><br>
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

// Función para eliminar una reserva del historial
function eliminarReservaAdmin(index) {
    if (confirm("⚠️ ¿Estás seguro de que querés borrar esta reserva de la base de datos?")) {
        let historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
        historial.splice(index, 1);
        localStorage.setItem("historial_reservas", JSON.stringify(historial));
        renderizarTablaReservas(); // Volvemos a pintar la tabla
    }
}

// Evento para que al cambiar la fecha del filtro se actualice la lista
document.addEventListener("DOMContentLoaded", function() {
    const inputFechaMonitor = document.getElementById("monitorFecha");
    if (inputFechaMonitor) {
        inputFechaMonitor.addEventListener("change", renderizarTablaReservas);
    }
});

let indiceCarrusel = 0;
let indiceLightbox = 0;

// --- 1. CARRUSEL PRINCIPAL ---
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
        if (el.tagName === 'VIDEO') {
            el.pause();
        }
    });

    puntos.forEach((p) => p.classList.remove('activo'));

    if (elementos[indiceCarrusel]) {
        elementos[indiceCarrusel].classList.add('activa');
    }
    if (puntos[indiceCarrusel]) {
        puntos[indiceCarrusel].classList.add('activo');
    }
}

function moverCarrusel(direccion) {
    mostrarDiapositiva(indiceCarrusel + direccion);
}

function irAFoto(indice) {
    mostrarDiapositiva(indice);
}


// --- 2. LIGHTBOX CON SOPORTE DE VIDEO ---
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
    const imgAmpliada = document.getElementById('lightbox-img');
    const videoAmpliado = document.getElementById('lightbox-video');
    const videoSource = document.getElementById('lightbox-video-source');

    if (elementos.length === 0 || !elementos[indiceLightbox]) return;

    const elementoActual = elementos[indiceLightbox];

    if (elementoActual.tagName === 'VIDEO') {
        // Ocultar imagen y mostrar video
        imgAmpliada.style.display = 'none';
        
        // Pausar video del carrusel de fondo
        elementoActual.pause();

        // Cargar y reproducir en el modal
        const fuenteOriginal = elementoActual.querySelector('source') ? elementoActual.querySelector('source').src : elementoActual.src;
        videoSource.src = fuenteOriginal;
        videoAmpliado.load();
        videoAmpliado.style.display = 'block';
    } else {
        // Pausar video del modal si estaba sonando
        videoAmpliado.pause();
        videoAmpliado.style.display = 'none';

        // Mostrar imagen
        imgAmpliada.src = elementoActual.src;
        imgAmpliada.style.display = 'block';
    }
}

function cambiarFotoLightbox(direccion) {
    const elementos = document.querySelectorAll('.carrusel-slide .carrusel-img');
    if (elementos.length === 0) return;

    indiceLightbox += direccion;

    if (indiceLightbox >= elementos.length) {
        indiceLightbox = 0;
    } else if (indiceLightbox < 0) {
        indiceLightbox = elementos.length - 1;
    }

    actualizarContenidoLightbox();

    // Sincronizar el carrusel de fondo
    mostrarDiapositiva(indiceLightbox);
}

function cerrarLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const videoAmpliado = document.getElementById('lightbox-video');
    
    if (videoAmpliado) {
        videoAmpliado.pause();
    }
    
    if (modal) {
        modal.style.display = 'none';
    }
}

function cerrarLightboxEnFondo(e) {
    if (e.target.id === 'lightbox-modal') {
        cerrarLightbox();
    }
}

// Teclas para el Lightbox
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('lightbox-modal');
    if (modal && modal.style.display === 'flex') {
        if (e.key === 'Escape') cerrarLightbox();
        if (e.key === 'ArrowRight') cambiarFotoLightbox(1);
        if (e.key === 'ArrowLeft') cambiarFotoLightbox(-1);
    }
});

function seleccionarFecha(fecha) {
    fechaSeleccionada = fecha;

    // ⚠️ CRUCIAL: Volver a cargar la base de datos actualizada del localStorage
    const turnosGuardados = localStorage.getItem("turnos_db");
    if (turnosGuardados) {
        disponibilidadTurnos = JSON.parse(turnosGuardados);
    }

    // Dibujar los horarios para esta fecha
    renderizarHorariosDeLaFecha(fechaSeleccionada);
}

function renderizarHorariosDeLaFecha(fecha) {
    const turnos = disponibilidadTurnos[fecha] || [];

    turnos.forEach(t => {
        const elementoBoton = document.getElementById(`turno-${t.hora}`); // Adaptá el ID según tu HTML
        
        if (elementoBoton) {
            if (t.cupos <= 0) {
                elementoBoton.disabled = true;
                elementoBoton.classList.add('agotado');
                elementoBoton.style.display = 'none'; // O usar display: 'none' si querés ocultarlo por completo
            } else {
                elementoBoton.disabled = false;
                elementoBoton.classList.remove('agotado');
                elementoBoton.style.display = 'block';
            }
        }
    });
}

function cerrarModalConfirmacion() {
    const modal = document.getElementById('modal-confirmacion');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 🔄 Recarga la página para refrescar el estado limpio de los turnos
    window.location.reload();
}
