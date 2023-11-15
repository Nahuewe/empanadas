const datosGuardados = {};

// Modal
document.getElementById('closeModalButton').addEventListener('click', function () {
    const modal = document.getElementById('myModal');
    modal.classList.add('hidden');
});

// Evento de cambio en el select de nombre
document.getElementById('nombre').addEventListener('change', function () {
    const nombreInput = document.getElementById('nombre');
    const nombreInvitadoInput = document.getElementById('nombreInvitado');

    if (nombreInput.value === 'Invitado') {
        // Mostrar el input para el nombre del invitado y ocultar el select
        nombreInput.classList.add('hidden');
        nombreInvitadoInput.classList.remove('hidden');
        nombreInvitadoInput.focus(); // Hacer focus en el nuevo input
    } else {
        // Mostrar el select y ocultar el input para el nombre del invitado
        nombreInput.classList.remove('hidden');
        nombreInvitadoInput.classList.add('hidden');
    }
});

document.getElementById('btnAgregar').addEventListener('click', function () {
    let nombre = document.getElementById('nombre').value;
    const tipoEmpanadas = document.getElementById('tipoEmpanadas').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const nombreInput = document.getElementById('nombre');
    const nombreInvitadoInput = document.getElementById('nombreInvitado');

    if (nombreInput.value === 'Invitado') {
        // Si se selecciona "Invitado", usar el valor del nuevo input
        nombre = nombreInvitadoInput.value.trim();
    } else {
        // Si se selecciona otra opción, usar el valor del select original
        nombre = nombreInput.value;
    }

    if (nombre && tipoEmpanadas && !isNaN(cantidad) && cantidad > 0) {
        if (!datosGuardados[nombre]) {
            datosGuardados[nombre] = [];
        }

        // Verificar si ya existe el mismo tipo de empanada para el usuario
        const empanadaExistente = datosGuardados[nombre].find(empanada => empanada.tipoEmpanadas === tipoEmpanadas);

        if (empanadaExistente) {
            // Si existe, sumar la cantidad
            empanadaExistente.cantidad += cantidad;
        } else {
            // Si no existe, agregar una nueva entrada
            datosGuardados[nombre].push({
                tipoEmpanadas: tipoEmpanadas,
                cantidad: cantidad
            });
        }

        nombreInput.classList.remove('hidden');
        nombreInvitadoInput.classList.add('hidden');
        mostrarDatosGuardados();
    } else {
        alert('Te falto rellenar los tres campos');
    }
});

document.getElementById('btnCalcular').addEventListener('click', function () {
    const multiplicador = parseFloat(document.getElementById('precio').value);
    const modal = document.getElementById('myModal');
    const modalContent = document.getElementById('modalContent');

    // Verificar si hay al menos una tarjeta de empanadas creada
    if (Object.keys(datosGuardados).length === 0) {
        modalContent.textContent = 'No hay empanadas para calcular';
        modal.classList.remove('hidden');
    } else if (!isNaN(multiplicador) && multiplicador > 0) {
        let cantidadTotal = 0;
        for (const nombre in datosGuardados) {
            const empanadas = datosGuardados[nombre];
            empanadas.forEach(empanada => {
                cantidadTotal += empanada.cantidad;
            });
        }

        const cantidadMultiplicada = cantidadTotal * multiplicador;
        modalContent.textContent = `El total de empanadas es ${cantidadTotal}, multiplicada por $${multiplicador} son en total $${cantidadMultiplicada}`;
        modal.classList.remove('hidden');
    } else {
        // Crear el modal con el mensaje de error y mostrarlo
        modalContent.textContent = 'Te faltó el precio';
        modal.classList.remove('hidden');
    }
});


document.getElementById("enviarWhatsapp").addEventListener("click", function () {
    var telefono = "+5493834001071"; // Definir el número de WhatsApp aquí
    var mensaje = "Buenos días! Quiero encargar\n";
    var cantidadesPorTipo = {}; // Objeto para mantener un registro de las cantidades por tipo de empanada

    for (const nombre in datosGuardados) {
        const empanadas = datosGuardados[nombre];

        empanadas.forEach(empanada => {
            // Si el tipo de empanada ya está en el objeto, suma la cantidad, de lo contrario, inicializa la cantidad
            cantidadesPorTipo[empanada.tipoEmpanadas] = (cantidadesPorTipo[empanada.tipoEmpanadas] || 0) + empanada.cantidad;
        });
    }

    // Construir el mensaje utilizando las cantidades acumuladas por tipo de empanada
    for (const tipoEmpanada in cantidadesPorTipo) {
        mensaje += `${cantidadesPorTipo[tipoEmpanada]} empanadas de ${tipoEmpanada}\n`;
    }

    var url = "https://api.whatsapp.com/send?phone=" + telefono + "&text=" + encodeURIComponent(mensaje);
    window.open(url, "_blank");
});

function mostrarDatosGuardados() {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = '';

    for (const nombre in datosGuardados) {
        const empanadas = datosGuardados[nombre];
        const tarjetaDiv = document.createElement('div');
        tarjetaDiv.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col';

        const tituloDiv = document.createElement('div');
        tituloDiv.innerHTML = `<h2 class="text-xl font-bold mb-2 capitalize">${nombre}</h2>`;
        tarjetaDiv.appendChild(tituloDiv);

        empanadas.forEach(empanada => {
            const empanadaDiv = document.createElement('div');
            empanadaDiv.className = 'mb-2';
            empanadaDiv.innerHTML = `
                <p class="text-gray-700">Tipo de Empanada: <span class="font-bold">${empanada.tipoEmpanadas}</span></p>
                <p class="text-gray-700">Cantidad: <span class="font-bold">${empanada.cantidad}</span></p>
            `;
            tarjetaDiv.appendChild(empanadaDiv);
        });

        const resultadoCalculoDiv = document.createElement('div');
        resultadoCalculoDiv.className = 'mt-4 text-lg font-bold text-gray-700';
        tarjetaDiv.appendChild(resultadoCalculoDiv);

        const botonesDiv = document.createElement('div');
        botonesDiv.className = 'flex items-center justify-between mt-2';

        const botonEliminar = document.createElement('button');
        botonEliminar.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none ml-2';
        botonEliminar.innerText = 'Eliminar';
        botonEliminar.onclick = function () {
            eliminarTarjeta(nombre);
        };
        botonesDiv.appendChild(botonEliminar);

        const botonCalcular = document.createElement('button');
        botonCalcular.className = 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none ml-2';
        botonCalcular.innerText = 'Calcular';
        botonCalcular.onclick = function () {
            calcularPrecio(nombre, resultadoCalculoDiv);
        };
        botonesDiv.appendChild(botonCalcular);

        tarjetaDiv.appendChild(botonesDiv);
        resultadoDiv.appendChild(tarjetaDiv);
    }
}

function calcularPrecio(nombre, resultadoCalculoDiv) {
    const precioInput = document.getElementById('precio');
    const multiplicador = parseFloat(precioInput.value);

    if (!isNaN(multiplicador) && multiplicador > 0) {
        let cantidadTotal = 0;
        const empanadas = datosGuardados[nombre];

        empanadas.forEach(empanada => {
            cantidadTotal += empanada.cantidad;
        });

        const cantidadMultiplicada = cantidadTotal * multiplicador;
        resultadoCalculoDiv.innerText = `Total: $${cantidadMultiplicada}`;
    } else {
        resultadoCalculoDiv.innerText = 'Te falto el precio';
        precioInput.focus();
    }
}

function eliminarTarjeta(nombre) {
    const eliminarModal = document.getElementById('eliminarModal');
    const eliminarModalContent = document.getElementById('eliminarModalContent');

    eliminarModalContent.textContent = `¿${nombre} se arrepintió de pedir empanadas?`;
    eliminarModal.classList.remove('hidden');

    const confirmarEliminarButton = document.getElementById('confirmarEliminarButton');
    const cancelarEliminarButton = document.getElementById('cancelarEliminarButton');

    confirmarEliminarButton.onclick = function () {
        delete datosGuardados[nombre];
        mostrarDatosGuardados();
        eliminarModal.classList.add('hidden');
    };

    cancelarEliminarButton.onclick = function () {
        eliminarModal.classList.add('hidden');
    };
}

function validarTexto() {
    const input = document.getElementById('nombreInvitado');
    input.value = input.value.replace(/[^A-Za-z]/g, ''); // Solo permite letras, elimina todo lo que no sea una letra
}