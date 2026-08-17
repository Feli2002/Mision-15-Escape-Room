// ==========================================
// CONFIGURACIÓN DE EMAILJS
// ==========================================
const EMAILJS_PUBLIC_KEY = "ZJQtRyUlzfRNMv0Hd";  
const EMAILJS_SERVICE_ID = "service_ftyt67o";  
const EMAILJS_TEMPLATE_ID = "template_ajbkawp"; 

(function() {
    if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }
})();

// Variables Globales
let iti = null;
let estructuraBasePorDefecto = []; 
let disponibilidadTurnos = JSON.parse(localStorage.getItem("turnos_db")) || {};
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
function mostrarVista(vistaId) {
    document.querySelectorAll('.vista-seccion').forEach(seccion => {
        seccion.classList.remove('activo');
        seccion.style.display = 'none';
    });
    
    const vistaDestino = document.getElementById(`vista-${vistaId}`);
    if (vistaDestino) {
        vistaDestino.classList.add('activo');
        vistaDestino.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.error(`Error: No existe la vista "vista-${vistaId}" en el HTML.`);
    }
}

function seleccionarMision(tipoMision) {
    modalidadSeleccionada = tipoMision;
    
    const txtMision = document.getElementById("mision-seleccionada-txt");
    const txtPrecio = document.getElementById("precioTxt");
    const selectParticipantes = document.getElementById("cantidad-participantes");
    
    if (txtMision) txtMision.innerText = `Misión ${tipoMision}`;
    if (txtPrecio) txtPrecio.innerText = "$0";
    
    if (selectParticipantes) selectParticipantes.selectedIndex = 0;
    
    grupoSeleccionado = "";
    const inputFecha = document.getElementById("fecha");
    if (inputFecha) inputFecha.value = "";
    
    const contenedor = document.getElementById("contenedorGrupos");
    if (contenedor) {
        contenedor.innerHTML = `<div style="text-align:center; color:#999; grid-column: 1 / -1; padding:10px; font-size:14px;">Selecciona una fecha primero.</div>`;
    }
    
    mostrarVista('reserva-final');
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
// GESTIÓN DE TURNOS Y FECHAS
// ==========================================
function cargarTurnosDelDia(fechaString) {
    if (!fechaString) return;

    fechaSeleccionada = fechaString;
    const contenedor = document.getElementById("contenedorGrupos");
    if (!contenedor) return;
    
    contenedor.innerHTML = ""; 
    grupoSeleccionado = ""; 
    
    if (!disponibilidadTurnos[fechaString]) {
        disponibilidadTurnos[fechaString] = JSON.parse(JSON.stringify(estructuraBasePorDefecto));
        localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));
    }

    const turnosHoy = disponibilidadTurnos[fechaString];

    if (turnosHoy.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; color:#999; grid-column: 1 / -1; padding: 10px; font-size:14px;">No hay horarios disponibles para esta fecha.</div>`;
        return;
    }

    turnosHoy.forEach((turno) => {
        const btn = document.createElement("div");
        const estaAgotado = turno.cupos <= 0;
        
        btn.className = `grupo-btn ${estaAgotado ? 'disabled' : ''}`;
        const textoCupo = estaAgotado ? "Agotado" : `${turno.cupos} lugar disp.`;
        
        btn.innerHTML = `<strong>${turno.hora}</strong><span class="cupo">${textoCupo}</span>`;
        
        if (!estaAgotado) {
            btn.onclick = function() {
                document.querySelectorAll('.grupo-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                grupoSeleccionado = turno.hora;
            };
        }
        contenedor.appendChild(btn);
    });
}

// ==========================================
// ATAJOS Y ADMIN
// ==========================================
const CLAVE_ADMIN = "admin123";

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        abrirMonitorConSeguridad();
    }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        abrirHorariosConSeguridad();
    }
});

function pedirPassword() {
    const pass = prompt("Acceso Restringido. Ingresá la contraseña de administrador:");
    if (pass === CLAVE_ADMIN) return true;
    if (pass !== null) alert("Contraseña incorrecta. Acceso denegado.");
    return false;
}

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

const monitorFechaInput = document.getElementById('monitorFecha');
if (monitorFechaInput) {
    monitorFechaInput.addEventListener('change', function(e) {
        actualizarMonitorSala(e.target.value);
    });
}

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
        divCliente.style = "background: #000; padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid var(--primary); font-size: 13px; border: 1px solid var(--border-color); border-left-width: 4px;";
        divCliente.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <strong style="font-size:14px; color:var(--primary);">${r.hora}</strong>
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
    if (!modal) return;
    if (modal.style.display === "flex") { modal.style.display = "none"; return; }

    if (pedirPassword()) {
        modal.style.display = "flex";
        const hoy = new Date().toISOString().split('T')[0];
        const adminFecha = document.getElementById("adminFecha");
        if (adminFecha) adminFecha.value = fechaSeleccionada || hoy;
        prepararCamposAdmin(fechaSeleccionada || hoy);
    }
}

function cerrarHorarios() { 
    const modal = document.getElementById("modalHorarios");
    if (modal) modal.style.display = "none"; 
}

const adminFechaInput = document.getElementById('adminFecha');
if (adminFechaInput) {
    adminFechaInput.addEventListener('change', function(e) {
        prepararCamposAdmin(e.target.value);
    });
}

function prepararCamposAdmin(fecha) {
    const contenedor = document.getElementById("listaHorariosAdmin");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const turnosExistentes = disponibilidadTurnos[fecha] || estructuraBasePorDefecto;
    turnosExistentes.forEach(t => agregarFilaHorario(t.hora, t.cupos));
}

function agregarFilaHorario(horaTexto = "09:00 hs", cupos = 1) {
    const contenedor = document.getElementById("listaHorariosAdmin");
    if (!contenedor) return;
    const div = document.createElement("div");
    div.className = "fila-horario";

    let cupoNormalizado = parseInt(cupos, 10);
    if (isNaN(cupoNormalizado) || cupoNormalizado < 0) cupoNormalizado = 0;
    if (cupoNormalizado > 1) cupoNormalizado = 1;

    let [hh, mm] = ["09", "00"];
    if (horaTexto) {
        const partes = horaTexto.replace("hs", "").trim().split(":");
        if (partes.length === 2) {
            hh = partes[0].padStart(2, '0');
            mm = partes[1].padStart(2, '0');
        }
    }

    let opcionesHoras = "";
    for (let i = 0; i < 24; i++) {
        const val = i.toString().padStart(2, '0');
        opcionesHoras += `<option value="${val}" ${val === hh ? 'selected' : ''}>${val}</option>`;
    }

    let opcionesMinutos = "";
    for (let i = 0; i < 60; i += 5) {
        const val = i.toString().padStart(2, '0');
        opcionesMinutos += `<option value="${val}" ${val === mm ? 'selected' : ''}>${val}</option>`;
    }

    div.innerHTML = `
        <select class="admin-hh" onchange="validarHoraUnicaEnLinea(this)">${opcionesHoras}</select>
        <span>:</span>
        <select class="admin-mm" onchange="validarHoraUnicaEnLinea(this)">${opcionesMinutos}</select>
        <span style="font-weight: bold; font-size: 13px;">hs</span>
        <input type="number" class="admin-cupos" value="${cupoNormalizado}" min="0" max="1" style="width:50px; margin-left:10px;" oninput="if(this.value>1)this.value=1;if(this.value<0)this.value=0;">
        <button type="button" onclick="this.parentElement.remove()" style="background: var(--danger); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-left: auto;">✕</button>
    `;
    contenedor.appendChild(div);
}

function validarHoraUnicaEnLinea(selectElemento) {
    const fila = selectElemento.parentElement;
    const hh = fila.querySelector(".admin-hh").value;
    const mm = fila.querySelector(".admin-mm").value;
    const horaFormateada = `${hh}:${mm} hs`;

    const todasLasFilas = document.querySelectorAll(".fila-horario");
    let repeticiones = 0;
    todasLasFilas.forEach(f => {
        const h = f.querySelector(".admin-hh").value;
        const m = f.querySelector(".admin-mm").value;
        if (`${h}:${m} hs` === horaFormateada) repeticiones++;
    });
    if (repeticiones > 1) alert(`El horario ${horaFormateada} ya está en la lista.`);
}

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

// ==========================================
// ENVÍO FINAL DE RESERVA
// ==========================================
async function enviarReserva() {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telInput = document.getElementById('telefono');
    const selectParticipantes = document.getElementById('cantidad-participantes');
    const vendedorRadio = document.querySelector('input[name="vendedor"]:checked');
    const btnPagar = document.getElementById('btnPagar');

    const participantes = selectParticipantes ? selectParticipantes.value : "";
    const esValidoTel = iti ? iti.isValidNumber() : true;

    if (!nombre || !email || !fechaSeleccionada || !vendedorRadio || !grupoSeleccionado || !telInput.value || !participantes) {
        alert("Por favor, completa todos los campos obligatorios (incluyendo la cantidad de participantes).");
        return;
    }
    if (!esValidoTel) {
        alert("Teléfono inválido. Verifica el código de área.");
        return;
    }

    const turnosDelDia = disponibilidadTurnos[fechaSeleccionada];
    const turno = turnosDelDia ? turnosDelDia.find(t => t.hora === grupoSeleccionado) : null;

    if (turno && turno.cupos > 0) {
        btnPagar.disabled = true;
        btnPagar.innerText = "Procesando...";

        turno.cupos -= 1;
        localStorage.setItem("turnos_db", JSON.stringify(disponibilidadTurnos));

        let historial = JSON.parse(localStorage.getItem("historial_reservas")) || [];
        historial.push({
            fecha: fechaSeleccionada,
            hora: grupoSeleccionado,
            modalidad: modalidadSeleccionada,
            participantes: participantes,
            nombre: nombre,
            email: email,
            telefono: iti ? iti.getNumber() : telInput.value,
            vendedor: vendedorRadio.value
        });
        localStorage.setItem("historial_reservas", JSON.stringify(historial));

        const templateParams = {
            to_name: nombre,
            to_email: email,
            fecha: fechaSeleccionada,
            hora: grupoSeleccionado,
            modalidad: `Misión ${modalidadSeleccionada}`,
            participantes: participantes,
            vendedor: vendedorRadio.value,
            precio: `$${precioFinal.toLocaleString('es-AR')}`
        };

        if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
            try {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
            } catch (err) {
                console.error("Error EmailJS:", err);
            }
        }

        alert(`¡Reserva Confirmada para Misión ${modalidadSeleccionada}!\nParticipantes: ${participantes}\nFecha: ${fechaSeleccionada}\nHora: ${grupoSeleccionado}\nTotal: $${precioFinal.toLocaleString('es-AR')}`);

        // Reset del formulario
        document.getElementById('nombre').value = "";
        document.getElementById('email').value = "";
        document.getElementById('telefono').value = "";
        if (selectParticipantes) selectParticipantes.selectedIndex = 0;
        document.getElementById('precioTxt').innerText = "$0";
        
        mostrarVista('inicio');
        btnPagar.disabled = false;
        btnPagar.innerText = "Confirmar Reserva";
    } else {
        alert("El turno elegido ya no cuenta con lugares.");
    }
}

// ==========================================
// CARRUSEL DE IMÁGENES
// ==========================================
let fotoActual = 0;

function moverCarrusel(direccion) {
    const imagenes = document.querySelectorAll('.carrusel-img');
    const puntos = document.querySelectorAll('.punto');
    
    if (imagenes.length === 0) return;

    // Ocultar foto actual
    imagenes[fotoActual].classList.remove('activa');
    if (puntos[fotoActual]) puntos[fotoActual].classList.remove('activo');

    // Calcular nueva posición
    fotoActual += direccion;

    if (fotoActual >= imagenes.length) {
        fotoActual = 0; // Volver a la primera
    } else if (fotoActual < 0) {
        fotoActual = imagenes.length - 1; // Ir a la última
    }

    // Mostrar nueva foto
    imagenes[fotoActual].classList.add('activa');
    if (puntos[fotoActual]) puntos[fotoActual].classList.add('activo');
}