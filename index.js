const datosGuardados = {};

document.getElementById('btnAgregar').addEventListener('click', function () {
    const nombre = document.getElementById('nombre').value;
    const tipoEmpanadas = document.getElementById('tipoEmpanadas').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);

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

        mostrarDatosGuardados();
    } else {
        alert('Completa los tres campos');
    }
});

document.getElementById('btnCalcular').addEventListener('click', function () {
    const multiplicador = parseFloat(document.getElementById('precio').value);
    if (!isNaN(multiplicador) && multiplicador > 0) {
        let cantidadTotal = 0;
        for (const nombre in datosGuardados) {
            const empanadas = datosGuardados[nombre];
            empanadas.forEach(empanada => {
                cantidadTotal += empanada.cantidad;
            });
        }

        const cantidadMultiplicada = cantidadTotal * multiplicador;
        alert(`El total de empanadas es ${cantidadTotal}, multiplicada por $${multiplicador} son en total $${cantidadMultiplicada}`);
    } else {
        alert('Te falto el precio');
    }
});

function mostrarDatosGuardados() {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = '';

    for (const nombre in datosGuardados) {
        const empanadas = datosGuardados[nombre];
        const tarjetaDiv = document.createElement('div');
        tarjetaDiv.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col';

        const tituloDiv = document.createElement('div');
        tituloDiv.innerHTML = `<h2 class="text-xl font-bold mb-2">${nombre}</h2>`;
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
    if (confirm(`¿${nombre} se arrepintió de pedir empanadas?`)) {
        delete datosGuardados[nombre];
        mostrarDatosGuardados();
    }
}

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

