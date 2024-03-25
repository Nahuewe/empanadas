const datosGuardados = {};
let seActivaronParticulas = false;
let confetiEnMarcha = false;

// Modal general
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

// Agregar el comensal, el tipo de empanada y la cantidad de las mismas

document.getElementById('btnAgregar').addEventListener('click', function () {
    let nombre = document.getElementById('nombre').value.trim();
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

        // Hace scroll en vista mobile hacia las cards creadas
        const mediaQuery = window.matchMedia('(max-width: 640px)');
        if (mediaQuery.matches) {
            const resultadoDiv = document.getElementById('resultado');
            const lastCard = resultadoDiv.lastElementChild;
            if (lastCard) {
                lastCard.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
            }
        }

        // confeti
        if (!seActivaronParticulas) {
            celebrar();
            seActivaronParticulas = true;
        }
    } else {
        alert('Te faltó rellenar los tres campos');
    }
});

// Calcula el precio total de las empanadas

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
        modalContent.textContent = 'Te faltó el precio';
        modal.classList.remove('hidden');
    }
});

// Al hacer clic en "mandar guarap" se abre un modal en el que se elige la sucursal a donde enviar el mensaje

function enviarWhatsapp(numero) {
    var mensaje = "Buenos días! Quiero encargar\n";
    var cantidadesPorTipo = {};

    for (const nombre in datosGuardados) {
        const empanadas = datosGuardados[nombre];
        empanadas.forEach(empanada => {
            cantidadesPorTipo[empanada.tipoEmpanadas] = (cantidadesPorTipo[empanada.tipoEmpanadas] || 0) + empanada.cantidad;
        });
    }

    for (const tipoEmpanada in cantidadesPorTipo) {
        const cantidad = cantidadesPorTipo[tipoEmpanada];
        const empanadaText = cantidad === 1 ? 'empanada' : 'empanadas';
        mensaje += `${cantidad} ${empanadaText} de ${tipoEmpanada}\n`;
    }

    var url = "https://api.whatsapp.com/send?phone=" + numero + "&text=" + encodeURIComponent(mensaje);
    window.open(url, "_blank");
}

// Abre el modal

document.getElementById("enviarWhatsapp").addEventListener("click", function () {
    const numerosModal = document.getElementById('numerosModal');
    numerosModal.classList.remove('hidden');
});

// Cierra el modal

document.getElementById("closeNumerosModalButton").addEventListener("click", function () {
    const numerosModal = document.getElementById('numerosModal');
    numerosModal.classList.add('hidden');
});

// Elegis la sucursal a donde queres enviar el mensaje

document.getElementById("seleccionarNumeroButton").addEventListener("click", function () {
    const selectedNumero = document.querySelector('input[name="numero"]:checked');
    if (selectedNumero) {
        const numero = selectedNumero.value;
        enviarWhatsapp(numero);
        const numerosModal = document.getElementById('numerosModal');
        numerosModal.classList.add('hidden');
    } else {
        alert('Por favor, seleccioná una sucursal');
    }
});

// Crea cartas donde se muestra la informacion de la persona, las empanadas y las cantidades

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

        empanadas.forEach((empanada, index) => {
            const empanadaDiv = document.createElement('div');
            empanadaDiv.className = 'mb-2';
            empanadaDiv.innerHTML = `
                <p class="text-gray-700">Tipo de Empanada: <span class="font-bold">${empanada.tipoEmpanadas}</span></p>
            `;

            const botonEliminarEmpanada = document.createElement('button');
            botonEliminarEmpanada.className = 'bg-red-500 text-white px-2 rounded hover:bg-red-700 focus:outline-none';
            botonEliminarEmpanada.textContent = 'Eliminar empanada';
            botonEliminarEmpanada.onclick = function () {
                eliminarTipoEmpanada(nombre, index);
            };
            
            const cantidadDiv = document.createElement('div');
            cantidadDiv.className = 'flex items-center mt-2';
        
            const cantidadLabel = document.createElement('p');
            cantidadLabel.className = 'text-gray-700 mr-2';
            cantidadLabel.textContent = 'Cantidad:';
        
            const cantidadCantidad = document.createElement('span');
            cantidadCantidad.className = 'font-bold mr-2';
            cantidadCantidad.textContent = empanada.cantidad;
        
            const botonIncrementar = document.createElement('button');
            botonIncrementar.className = 'bg-green-500 text-white px-2 rounded hover:bg-green-700 focus:outline-none';
            botonIncrementar.textContent = '+';
            botonIncrementar.onclick = function () {
                empanada.cantidad++;
                cantidadCantidad.textContent = empanada.cantidad;
            };
        
            const botonDecrementar = document.createElement('button');
            botonDecrementar.className = 'bg-red-500 text-white px-2 mr-2 rounded hover:bg-red-700 focus:outline-none';
            botonDecrementar.textContent = '-';
            botonDecrementar.onclick = function () {
                if (empanada.cantidad > 0) {
                    empanada.cantidad--;
                    cantidadCantidad.textContent = empanada.cantidad;
                }
            };
        
            cantidadDiv.appendChild(cantidadLabel);
            cantidadDiv.appendChild(cantidadCantidad);
            cantidadDiv.appendChild(botonDecrementar);
            cantidadDiv.appendChild(botonIncrementar);
            empanadaDiv.appendChild(botonEliminarEmpanada);
            tarjetaDiv.appendChild(empanadaDiv);
            tarjetaDiv.appendChild(cantidadDiv);
        });

        const resultadoCalculoDiv = document.createElement('div');
        resultadoCalculoDiv.className = 'mt-4 text-lg font-bold text-gray-700';
        tarjetaDiv.appendChild(resultadoCalculoDiv);

        const botonesDiv = document.createElement('div');
        botonesDiv.className = 'flex items-center justify-between mt-2';

        // Crea el boton para calcular el precio total (basado en el precio de otro input)
        const botonEliminar = document.createElement('button');
        botonEliminar.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none ml-2';
        botonEliminar.innerText = 'Eliminar';
        botonEliminar.onclick = function () {
            eliminarTarjeta(nombre);
        };
        botonesDiv.appendChild(botonEliminar);

        // Crea el boton para eliminar al comensal
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

// Calcula el precio total de las empanadas basado en las cards existentes

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

// Detener el confeti

function detenerConfeti() {
    if (confetiEnMarcha) {
        particlesJS('particles-js', 'destroy');
        confetiEnMarcha = false;
    }
}

// Eliminar el tipo de empanada en particular

function eliminarTipoEmpanada(nombre, indice) {
    const eliminarModal = document.getElementById('eliminarModal');
    const eliminarModalContent = document.getElementById('eliminarModalContent');

    eliminarModalContent.textContent = `¿No tenian esta empanada?`;
    eliminarModal.classList.remove('hidden');

    const confirmarEliminarButton = document.getElementById('confirmarEliminarButton');
    const cancelarEliminarButton = document.getElementById('cancelarEliminarButton');

    confirmarEliminarButton.onclick = function () {
        datosGuardados[nombre].splice(indice, 1);
        mostrarDatosGuardados();
        eliminarModal.classList.add('hidden');
    };

    cancelarEliminarButton.onclick = function () {
        eliminarModal.classList.add('hidden');
    };
}

// Funcion que sirve para eliminar al comensal

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

    detenerConfeti();
}

// Expresion regular hecha para que no se puedan ingresar numeros u caracteres especiales en los input

function validarTexto() {
    const input = document.getElementById('nombreInvitado');
    input.value = input.value.replace(/[^A-Za-z]/g, ''); // Solo permite letras, elimina todo lo que no sea una letra
}

// Funcion para configurar el confeti

function celebrar() {
    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 150,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#4b0082" // Color de las partículas
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#000000"
                }
            },
            "opacity": {
                "value": 0.5,
                "random": false,
                "anim": {
                    "enable": false,
                    "speed": 1,
                    "opacity_min": 0.1,
                    "sync": false
                }
            },
            "size": {
                "value": 5,
                "random": true
            },
            "line_linked": {
                "enable": false
            },
            "move": {
                "enable": true,
                "speed": 10,
                "direction": "bottom",
                "random": true,
                "straight": false,
                "out_mode": "out",
                "bounce": false
            }
        },
        "interactivity": {
            "events": {
                "onhover": {
                    "enable": false
                },
                "onclick": {
                    "enable": false
                }
            },
            "modes": {
                "bubble": {
                    "distance": 250,
                    "duration": 2,
                    "size": 0,
                    "opacity": 0
                },
                "repulse": {
                    "distance": 400,
                    "duration": 4
                }
            }
        }
    });
}