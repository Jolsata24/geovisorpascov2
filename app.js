// ==========================================
// 1. LÓGICA DEL MAPA Y LOS MARCADORES (LEAFLET)
// ==========================================

// Solo inicializamos el mapa si existe un contenedor con el ID 'mi_mapa'
const contenedorMapa = document.getElementById('mi_mapa');

if (contenedorMapa) {
    // Inicializar el mapa centrado en Pasco
    const mapa = L.map('mi_mapa').setView([-10.6678, -76.2561], 9);

    // Cargar la capa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapa);

    // Crear el grupo para agrupar los marcadores (Clustering)
    const marcadoresAgrupados = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    // Elementos del Modal
    const modal = document.getElementById("modalObras");
    const btnCerrar = document.querySelector(".modal-cerrar");

    // Funciones del Modal
    if (btnCerrar) {
        btnCerrar.onclick = () => modal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };

    function formatoMoneda(valor) {
        if (!valor || isNaN(valor)) return "Datos no disponibles";
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
    }

    // Cargar los datos JSON y pintarlos en el mapa
    async function cargarObras() {
        try {
            const respuesta = await fetch('obras_pasco_geolocalizadas.json');
            const obras = await respuesta.json();

            obras.forEach(obra => {
                if (obra.Latitud && obra.Longitud) {
                    const marcador = L.marker([obra.Latitud, obra.Longitud]);

                    // Evento al hacer clic en el marcador
                    marcador.on('click', function() {
                        document.getElementById("modal-titulo").innerText = obra['Nombre de obra'] || "Obra sin nombre";
                        document.getElementById("modal-entidad").innerText = obra['Entidad Pública'] || "Entidad no registrada";
                        document.getElementById("modal-estado").innerText = obra['Estado de ejecución'] || "Desconocido";
                        
                        document.getElementById("modal-avance").innerText = (obra['Avance Físico Real Acumulado (%)'] || 0) + "%";
                        document.getElementById("modal-monto").innerText = formatoMoneda(obra['Monto de ejecución financiera de la obra']);
                        
                        document.getElementById("modal-ubicacion").innerText = `${obra['Distrito']}, ${obra['Provincia']}`;
                        document.getElementById("modal-snip").innerText = obra['Código SNIP'] || "N/A";

                        // Colores de la etiqueta de estado
                        const estadoElem = document.getElementById("modal-estado");
                        const estadoTexto = (obra['Estado de ejecución'] || "").toLowerCase();
                        
                        if (estadoTexto.includes("paralizada")) {
                            estadoElem.style.backgroundColor = "#fee2e2"; 
                            estadoElem.style.color = "#dc2626";         
                        } else if (estadoTexto.includes("ejecución")) {
                            estadoElem.style.backgroundColor = "#dcfce7"; 
                            estadoElem.style.color = "#16a34a";
                        } else {
                            estadoElem.style.backgroundColor = "#e0f2fe"; 
                            estadoElem.style.color = "#0284c7";
                        }

                        modal.style.display = "flex";
                    });
                    
                    marcadoresAgrupados.addLayer(marcador);
                }
            });

            mapa.addLayer(marcadoresAgrupados);
            console.log(`¡Se cargaron ${obras.length} obras en el mapa!`);

        } catch (error) {
            console.error("Error al cargar el archivo JSON:", error);
        }
    }

    cargarObras();
}

// ==========================================
// 2. LÓGICA DEL GRÁFICO CIRCULAR (CHART.JS)
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    const canvasGrafico = document.getElementById('donutChart');
    
    // Solo ejecutamos Chart.js si el canvas existe (es decir, estamos en el index.html / Dashboard)
    if (canvasGrafico) {
        const ctx = canvasGrafico.getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Devengado', 'Por Ejecutar'],
                datasets: [{
                    data: [68, 32], 
                    backgroundColor: ['#10b981', '#f3f4f6'],
                    borderWidth: 0,
                    cutout: '75%' 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, 
                    tooltip: { enabled: true }
                }
            },
            plugins: [{
                id: 'textCenter',
                beforeDraw: function(chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();
                    var fontSize = (height / 114).toFixed(2);
                    ctx.font = "bold " + fontSize + "em sans-serif";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#333";

                    var text = "68%",
                        textX = Math.round((width - ctx.measureText(text).width) / 2),
                        textY = height / 2 - 5;

                    ctx.fillText(text, textX, textY);
                    
                    ctx.font = "normal 0.5em sans-serif";
                    ctx.fillStyle = "#888";
                    var text2 = "Devengado",
                        text2X = Math.round((width - ctx.measureText(text2).width) / 2),
                        text2Y = height / 2 + 15;
                    ctx.fillText(text2, text2X, text2Y);
                    ctx.save();
                }
            }]
        });
    }
});

// ==========================================
// 3. LÓGICA DE EXPLORACIÓN Y FILTROS (EXPLORAR.HTML)
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    const contenedorObras = document.getElementById('contenedorObras');
    
    // Solo ejecutamos esto si estamos en la página explorar.html
    if (contenedorObras) {
        let todasLasObras = []; // Aquí guardaremos todas las obras en memoria

        // Elementos del DOM (Filtros)
        const inputTexto = document.getElementById('filtroTexto');
        const selectProv = document.getElementById('filtroProv');
        const selectEstado = document.getElementById('filtroEstadoObra');
        const rangeAvance = document.getElementById('filtroAvance');
        const labelAvance = document.getElementById('valorAvance');
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        const contador = document.getElementById('contadorResultados');

        // Función para formatear moneda
        const formatoSoles = (valor) => {
            if (!valor || isNaN(valor)) return "S/ 0.00";
            return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
        };

        // 1. Cargar datos del JSON
        async function cargarDatosParaExplorar() {
            try {
                const respuesta = await fetch('obras_pasco_geolocalizadas.json');
                todasLasObras = await respuesta.json();
                filtrarYRenderizar(); // Pintar por primera vez
            } catch (error) {
                contador.innerText = "Error al cargar las obras.";
                console.error(error);
            }
        }

        // 2. Lógica del motor de filtrado
        function filtrarYRenderizar() {
            const textoBusqueda = inputTexto.value.toLowerCase();
            const provincia = selectProv.value;
            const estadoBusqueda = selectEstado.value.toLowerCase();
            const avanceMinimo = parseInt(rangeAvance.value);

            // Filtrar el array en memoria
            const obrasFiltradas = todasLasObras.filter(obra => {
                // Filtro de Texto (Busca en Nombre, Entidad o SNIP)
                const textoObra = `${obra['Nombre de obra']} ${obra['Entidad Pública']} ${obra['Código SNIP']}`.toLowerCase();
                const pasaTexto = textoObra.includes(textoBusqueda);

                // Filtro Provincia
                const pasaProv = (provincia === 'todas') || (obra['Provincia'] && obra['Provincia'].toUpperCase() === provincia);

                // Filtro Estado
                const estadoObraActual = (obra['Estado de ejecución'] || "").toLowerCase();
                let pasaEstado = true;
                if (estadoBusqueda !== 'todos') {
                    pasaEstado = estadoObraActual.includes(estadoBusqueda);
                }

                // Filtro Avance Físico
                const avanceActual = parseFloat(obra['Avance Físico Real Acumulado (%)']) || 0;
                const pasaAvance = avanceActual >= avanceMinimo;

                return pasaTexto && pasaProv && pasaEstado && pasaAvance;
            });

            // Actualizar el contador
            contador.innerText = `Mostrando ${Math.min(obrasFiltradas.length, 50)} de ${obrasFiltradas.length} resultados encontrados`;

            // 3. Renderizar las tarjetas (Limitamos a 50 para no congelar el navegador)
            renderizarTarjetas(obrasFiltradas.slice(0, 50));
        }

        // 4. Dibujar el HTML de cada tarjeta
        // 4. Dibujar el HTML de cada tarjeta
        function renderizarTarjetas(obras) {
            contenedorObras.innerHTML = ''; // Limpiar el contenedor

            if (obras.length === 0) {
                contenedorObras.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#777;">No se encontraron obras con estos filtros.</p>';
                return;
            }

            obras.forEach(obra => {
                const estado = obra['Estado de ejecución'] || "Desconocido";
                const avance = obra['Avance Físico Real Acumulado (%)'] || 0;
                
                // Extraemos el código SNIP limpio (sin espacios)
                const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
                
                // Construimos el enlace dinámico al SSI del MEF
                // Ahora enviamos al usuario a nuestra propia página, pasándole el SNIP por la URL
                const enlaceSSI = codigoSnip ? `detalle_obra.html?snip=${codigoSnip}` : '#';
                
                // Si por alguna razón la obra no tiene SNIP, deshabilitamos el botón para evitar errores
                const estiloBotonExtra = codigoSnip ? '' : 'pointer-events: none; opacity: 0.5; cursor: not-allowed;';
                const textoBoton = codigoSnip ? '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver ficha detallada' : 'Sin código SNIP';

                // Definir colores según estado
                let colorEstado = '#0284c7'; // Azul
                let bgEstado = '#e0f2fe';
                if(estado.toLowerCase().includes('paralizada')) { colorEstado = '#dc2626'; bgEstado = '#fee2e2'; }
                if(estado.toLowerCase().includes('ejecución')) { colorEstado = '#16a34a'; bgEstado = '#dcfce7'; }

                const tarjeta = document.createElement('div');
                tarjeta.className = 'obra-card';
                tarjeta.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <span class="etiqueta-estado" style="background:${bgEstado}; color:${colorEstado}; font-size:0.7rem;">${estado}</span>
                        <span style="font-size:0.75rem; color:#888;">SNIP: ${codigoSnip || '-'}</span>
                    </div>
                    <h4 class="obra-card-titulo">${obra['Nombre de obra'] || 'Sin nombre'}</h4>
                    <div class="obra-card-entidad"><i class="fa-solid fa-building-columns"></i> ${obra['Entidad Pública'] || '-'}</div>
                    <div class="obra-card-ubicacion"><i class="fa-solid fa-location-dot"></i> ${obra['Distrito']}, ${obra['Provincia']}</div>
                    
                    <div class="obra-card-footer">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.85rem;">
                            <span>Avance Físico:</span>
                            <strong>${avance}%</strong>
                        </div>
                        <div class="track" style="margin-bottom:15px; height:6px;">
                            <div class="fill" style="width: ${Math.min(avance, 100)}%; background-color: ${avance >= 80 ? '#16a34a' : (avance < 30 ? '#dc2626' : '#eab308')};"></div>
                        </div>
                        
                        <a href="${enlaceSSI}" target="_blank" class="btn-primary" style="display: block; text-align: center; width: 100%; text-decoration: none; font-size: 0.9rem; padding: 10px 0; border-radius: 6px; transition: 0.2s; ${estiloBotonExtra}">
                            ${textoBoton}
                        </a>
                    </div>
                `;
                contenedorObras.appendChild(tarjeta);
            });
        }

        // 5. Escuchar eventos de los filtros en tiempo real
        inputTexto.addEventListener('input', filtrarYRenderizar);
        selectProv.addEventListener('change', filtrarYRenderizar);
        selectEstado.addEventListener('change', filtrarYRenderizar);
        
        rangeAvance.addEventListener('input', function() {
            labelAvance.innerText = `${this.value}%`;
            filtrarYRenderizar();
        });

        btnLimpiar.addEventListener('click', () => {
            inputTexto.value = '';
            selectProv.value = 'todas';
            selectEstado.value = 'todos';
            rangeAvance.value = '0';
            labelAvance.innerText = '0%';
            filtrarYRenderizar();
        });

        // Iniciar todo
        cargarDatosParaExplorar();
    }
});