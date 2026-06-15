document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. FUNCIONES DE UTILIDAD (A PRUEBA DE FALLOS)
    // ==========================================
    
    // Limpia tildes y mayúsculas para búsquedas exactas
    const quitarTildes = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    
    // Formatea números a moneda peruana
    const formatoMoneda = (valor) => {
        if (!valor || isNaN(valor)) return "Datos no disponibles";
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
    };

    // Inyecta texto de forma SEGURA (si el ID no existe en el HTML, no detiene el programa)
    const setTexto = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };


    // ==========================================
    // 1. LÓGICA DEL MAPA Y LOS MARCADORES
    // ==========================================
    const contenedorMapa = document.getElementById('mi_mapa');
    
    if (contenedorMapa) {
        const mapa = L.map('mi_mapa').setView([-10.6678, -76.2561], 9);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapa);

        const marcadoresAgrupados = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        mapa.addLayer(marcadoresAgrupados);

        // --- LEYENDA DEL MAPA FLOTANTE ---
        const leyenda = L.control({position: 'bottomright'});
        leyenda.onAdd = function () {
            const div = L.DomUtil.create('div', 'info leyenda');
            div.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 15px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 0.85rem; color: #333; z-index: 1000; position: relative;">
                    <h4 style="margin: 0 0 10px 0; color: #005a87; border-bottom: 1px solid #eee; padding-bottom: 5px;"><i class="fa-solid fa-circle-info"></i> Estado de la Obra</h4>
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <span style="background: #16a34a; width: 14px; height: 14px; border-radius: 50%; display: inline-block; margin-right: 10px; border: 2px solid white;"></span> En Ejecución
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <span style="background: #dc2626; width: 14px; height: 14px; border-radius: 50%; display: inline-block; margin-right: 10px; border: 2px solid white;"></span> Paralizada
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="background: #0284c7; width: 14px; height: 14px; border-radius: 50%; display: inline-block; margin-right: 10px; border: 2px solid white;"></span> Terminada / Otros
                    </div>
                </div>
            `;
            return div;
        };
        leyenda.addTo(mapa);

        // --- SISTEMA DE CIERRE DE MODAL FLUIDO ---
        document.addEventListener('click', function(e) {
            // Cierra el modal al dar clic en la X o en el fondo oscuro
            if (e.target.closest('.modal-cerrar') || e.target.id === 'modalObras') {
                const m = document.getElementById("modalObras");
                if(m) m.style.display = 'none';
            }
        });

        let todasLasObrasMapa = [];

        // Diseño de pines
        const crearIconoHtml = (color) => L.divIcon({
            className: "custom-pin",
            html: `<div style="background-color:${color}; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
        
        const iconVerde = crearIconoHtml('#16a34a');
        const iconRojo = crearIconoHtml('#dc2626');
        const iconAzul = crearIconoHtml('#0284c7');

        // Función que dibuja el mapa
        function renderizarMapa(obras) {
            marcadoresAgrupados.clearLayers(); 

            obras.forEach(obra => {
                const lat = parseFloat(obra.Latitud);
                const lng = parseFloat(obra.Longitud);

                if (!isNaN(lat) && !isNaN(lng)) {
                    const estado = (obra['Estado de ejecución'] || "").toLowerCase();
                    let iconoActual = iconAzul;
                    if (estado.includes('paralizada')) iconoActual = iconRojo;
                    else if (estado.includes('ejecución') || estado.includes('ejecucion')) iconoActual = iconVerde;

                    const marcador = L.marker([lat, lng], { icon: iconoActual });

                    // EVENTO CLICK BLINDADO
                    marcador.on('click', function() {
                        try {
                            const m = document.getElementById("modalObras");
                            if(!m) return; 
                            
                            setTexto("modal-titulo", obra['Nombre de obra'] || "Obra sin nombre");
                            setTexto("modal-entidad", obra['Entidad Pública'] || "Entidad no registrada");
                            setTexto("modal-estado", obra['Estado de ejecución'] || "Desconocido");
                            setTexto("modal-avance", (obra['Avance Físico Real Acumulado (%)'] || 0) + "%");
                            setTexto("modal-monto", formatoMoneda(obra['Monto de ejecución financiera de la obra']));
                            setTexto("modal-ubicacion", `${obra['Distrito']}, ${obra['Provincia']}`);
                            
                            const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
                            setTexto("modal-snip", codigoSnip || "N/A");

                            const btnEnlace = document.getElementById("modal-enlace-mef");
                            if (btnEnlace) {
                                if (codigoSnip) {
                                    btnEnlace.href = `detalle_obra.html?snip=${codigoSnip}`;
                                    btnEnlace.style.pointerEvents = 'auto';
                                    btnEnlace.style.opacity = '1';
                                    btnEnlace.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver ficha detallada';
                                } else {
                                    btnEnlace.href = '#';
                                    btnEnlace.style.pointerEvents = 'none';
                                    btnEnlace.style.opacity = '0.5';
                                    btnEnlace.innerText = 'Sin código SNIP';
                                }
                            }

                            const estadoElem = document.getElementById("modal-estado");
                            if (estadoElem) {
                                if (estado.includes("paralizada")) {
                                    estadoElem.style.backgroundColor = "#fee2e2"; estadoElem.style.color = "#dc2626";         
                                } else if (estado.includes("ejecución") || estado.includes("ejecucion")) {
                                    estadoElem.style.backgroundColor = "#dcfce7"; estadoElem.style.color = "#16a34a";
                                } else {
                                    estadoElem.style.backgroundColor = "#e0f2fe"; estadoElem.style.color = "#0284c7";
                                }
                            }

                            // Abre el modal de forma estándar
                            m.style.display = 'flex';
                            
                        } catch(error) {
                            console.error("Error al inyectar datos en el modal:", error);
                        }
                    });
                    
                    marcadoresAgrupados.addLayer(marcador);
                }
            });
        }

        // Lógica de Filtros del Mapa
        const btnFiltrarMapa = document.getElementById('btnFiltrar');
        if (btnFiltrarMapa) {
            btnFiltrarMapa.addEventListener('click', () => {
                const elTxt = document.getElementById('buscarTexto');
                const elProv = document.getElementById('filtroProvincia');
                const elEst = document.getElementById('filtroEstado');

                const txtBusqueda = elTxt ? quitarTildes(elTxt.value.toLowerCase().trim()) : "";
                const valProvincia = elProv ? elProv.value : "todas";
                const valEstado = elEst ? quitarTildes(elEst.value.toLowerCase()) : "todos";

                const obrasFiltradas = todasLasObrasMapa.filter(obra => {
                    const textoObra = quitarTildes(`${obra['Nombre de obra']||''} ${obra['Código SNIP']||''}`.toLowerCase());
                    const pasaTxt = txtBusqueda === "" || textoObra.includes(txtBusqueda);

                    const provObra = (obra['Provincia'] || "").trim().toUpperCase();
                    const pasaProv = (valProvincia === 'todas') || provObra.includes(valProvincia);

                    const estObra = quitarTildes((obra['Estado de ejecución'] || "").toLowerCase());
                    let pasaEst = true;
                    
                    if (valEstado !== 'todos') {
                        if (valEstado === 'terminada' || valEstado === 'recepcion') {
                            pasaEst = estObra.includes('terminada') || estObra.includes('recepcion') || estObra.includes('liquidada') || estObra.includes('concluida') || estObra.includes('finalizado') || estObra.includes('finalizada');
                        } else {
                            pasaEst = estObra.includes(valEstado);
                        }
                    }

                    return pasaTxt && pasaProv && pasaEst;
                });

                renderizarMapa(obrasFiltradas);
            });
        }

        // Carga inicial
        fetch('obras_pasco_geolocalizadas.json')
            .then(res => res.json())
            .then(obras => {
                todasLasObrasMapa = obras;
                
                const kpiTotales = document.getElementById('kpi-totales');
                if (kpiTotales) {
                    let ejecucion = 0; let culminadas = 0; let inversionTotal = 0;
                    let provPasco = 0; let provDAC = 0; let provOxa = 0;

                    todasLasObrasMapa.forEach(obra => {
                        const estado = (obra['Estado de ejecución'] || "").toLowerCase();
                        if (estado.includes('ejecución') || estado.includes('ejecucion')) ejecucion++;
                        if (estado.includes('terminada') || estado.includes('recepción') || estado.includes('liquidada') || estado.includes('concluida') || estado.includes('finalizado') || estado.includes('finalizada')) culminadas++;
                        
                        inversionTotal += (parseFloat(obra['Monto de ejecución financiera de la obra']) || 0);

                        const provincia = (obra['Provincia'] || "").toUpperCase();
                        if (provincia === 'PASCO') provPasco++;
                        else if (provincia.includes('DANIEL ALCIDES')) provDAC++;
                        else if (provincia === 'OXAPAMPA') provOxa++;
                    });

                    const totalObras = todasLasObrasMapa.length;
                    setTexto('kpi-totales', totalObras.toLocaleString('es-PE'));
                    setTexto('kpi-ejecucion', ejecucion.toLocaleString('es-PE'));
                    setTexto('kpi-culminadas', culminadas.toLocaleString('es-PE'));
                    setTexto('kpi-inversion', `S/ ${(inversionTotal / 1000000).toFixed(2)} M`);

                    const pctPasco = totalObras > 0 ? Math.round((provPasco / totalObras) * 100) : 0;
                    const pctDAC = totalObras > 0 ? Math.round((provDAC / totalObras) * 100) : 0;
                    const pctOxa = totalObras > 0 ? Math.round((provOxa / totalObras) * 100) : 0;

                    setTexto('pct-pasco', pctPasco + '%'); 
                    const barPasco = document.getElementById('bar-pasco'); if(barPasco) barPasco.style.width = pctPasco + '%';
                    
                    setTexto('pct-dac', pctDAC + '%'); 
                    const barDac = document.getElementById('bar-dac'); if(barDac) barDac.style.width = pctDAC + '%';
                    
                    setTexto('pct-oxa', pctOxa + '%'); 
                    const barOxa = document.getElementById('bar-oxa'); if(barOxa) barOxa.style.width = pctOxa + '%';
                }

                renderizarMapa(todasLasObrasMapa);
            })
            .catch(err => console.error("Error cargando JSON del Mapa:", err));
    }
    // ==========================================
    // 2. LÓGICA DEL GRÁFICO CIRCULAR
    // ==========================================
    const canvasGrafico = document.getElementById('donutChart');
    if (canvasGrafico) {
        const ctx = canvasGrafico.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Devengado', 'Por Ejecutar'], datasets: [{ data: [68, 32], backgroundColor: ['#10b981', '#f3f4f6'], borderWidth: 0, cutout: '75%' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } },
            plugins: [{
                id: 'textCenter',
                beforeDraw: function(chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();
                    ctx.font = "bold " + (height / 114).toFixed(2) + "em sans-serif";
                    ctx.textBaseline = "middle"; ctx.fillStyle = "#333";
                    var text = "68%", textX = Math.round((width - ctx.measureText(text).width) / 2), textY = height / 2 - 5;
                    ctx.fillText(text, textX, textY);
                    ctx.font = "normal 0.5em sans-serif"; ctx.fillStyle = "#888";
                    var text2 = "Devengado", text2X = Math.round((width - ctx.measureText(text2).width) / 2), text2Y = height / 2 + 15;
                    ctx.fillText(text2, text2X, text2Y);
                    ctx.save();
                }
            }]
        });
    }


    // ==========================================
    // 3. LÓGICA DE EXPLORACIÓN Y FILTROS (explorar.html)
    // ==========================================
    const contenedorObras = document.getElementById('contenedorObras');
    if (contenedorObras) {
        let todasLasObrasExplorar = [];

        const inputTexto = document.getElementById('filtroTexto');
        const selectProv = document.getElementById('filtroProv');
        const selectEstado = document.getElementById('filtroEstadoObra');
        const rangeAvance = document.getElementById('filtroAvance');
        const labelAvance = document.getElementById('valorAvance');
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        const contador = document.getElementById('contadorResultados');

        function filtrarYRenderizarExplorar() {
            const textoBusqueda = inputTexto ? quitarTildes(inputTexto.value.toLowerCase().trim()) : "";
            const provincia = selectProv ? selectProv.value : "todas";
            const estadoBusqueda = selectEstado ? quitarTildes(selectEstado.value.toLowerCase()) : "todos";
            const avanceMinimo = rangeAvance ? parseInt(rangeAvance.value) : 0;

            const obrasFiltradas = todasLasObrasExplorar.filter(obra => {
                const textoObra = quitarTildes(`${obra['Nombre de obra']||''} ${obra['Entidad Pública']||''} ${obra['Código SNIP']||''}`.toLowerCase());
                const pasaTexto = textoBusqueda === "" || textoObra.includes(textoBusqueda);

                const provObra = (obra['Provincia'] || "").trim().toUpperCase();
                const pasaProv = (provincia === 'todas') || provObra.includes(provincia);

                const estadoObraActual = quitarTildes((obra['Estado de ejecución'] || "").toLowerCase());
                let pasaEstado = true;
                
                if (estadoBusqueda !== 'todos') {
                    if (estadoBusqueda === 'terminada' || estadoBusqueda === 'recepcion') {
                        pasaEstado = estadoObraActual.includes('terminada') || estadoObraActual.includes('recepcion') || estadoObraActual.includes('liquidada') || estadoObraActual.includes('concluida') || estadoObraActual.includes('finalizado') || estadoObraActual.includes('finalizada');
                    } else {
                        pasaEstado = estadoObraActual.includes(estadoBusqueda);
                    }
                }

                const avanceStr = (obra['Avance Físico Real Acumulado (%)'] || "0").toString().replace(',', '.');
                const pasaAvance = (parseFloat(avanceStr) || 0) >= avanceMinimo;

                return pasaTexto && pasaProv && pasaEstado && pasaAvance;
            });

            if(contador) contador.innerText = `Mostrando ${Math.min(obrasFiltradas.length, 50)} de ${obrasFiltradas.length} resultados encontrados`;
            
            contenedorObras.innerHTML = '';
            if (obrasFiltradas.length === 0) {
                contenedorObras.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#777;">No se encontraron obras con estos filtros.</p>';
                return;
            }

            obrasFiltradas.slice(0, 50).forEach(obra => {
                const estado = obra['Estado de ejecución'] || "Desconocido";
                const avance = obra['Avance Físico Real Acumulado (%)'] || 0;
                const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
                const enlaceSSI = codigoSnip ? `detalle_obra.html?snip=${codigoSnip}` : '#';
                const estiloBotonExtra = codigoSnip ? '' : 'pointer-events: none; opacity: 0.5; cursor: not-allowed;';
                const textoBoton = codigoSnip ? '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver ficha detallada' : 'Sin código SNIP';

                let colorEstado = '#0284c7'; let bgEstado = '#e0f2fe';
                if(estado.toLowerCase().includes('paralizada')) { colorEstado = '#dc2626'; bgEstado = '#fee2e2'; }
                if(estado.toLowerCase().includes('ejecución') || estado.toLowerCase().includes('ejecucion')) { colorEstado = '#16a34a'; bgEstado = '#dcfce7'; }

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
                            <span>Avance Físico:</span><strong>${avance}%</strong>
                        </div>
                        <div class="track" style="margin-bottom:15px; height:6px;">
                            <div class="fill" style="width: ${Math.min(avance, 100)}%; background-color: ${avance >= 80 ? '#16a34a' : (avance < 30 ? '#dc2626' : '#eab308')};"></div>
                        </div>
                        <a href="${enlaceSSI}" class="btn-primary" style="display: block; text-align: center; width: 100%; text-decoration: none; font-size: 0.9rem; padding: 10px 0; border-radius: 6px; transition: 0.2s; ${estiloBotonExtra}">
                            ${textoBoton}
                        </a>
                    </div>
                `;
                contenedorObras.appendChild(tarjeta);
            });
        }

        if (inputTexto) inputTexto.addEventListener('input', filtrarYRenderizarExplorar);
        if (selectProv) selectProv.addEventListener('change', filtrarYRenderizarExplorar);
        if (selectEstado) selectEstado.addEventListener('change', filtrarYRenderizarExplorar);
        if (rangeAvance) {
            rangeAvance.addEventListener('input', function() {
                if(labelAvance) labelAvance.innerText = `${this.value}%`;
                filtrarYRenderizarExplorar();
            });
        }
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                if(inputTexto) inputTexto.value = '';
                if(selectProv) selectProv.value = 'todas';
                if(selectEstado) selectEstado.value = 'todos';
                if(rangeAvance) { rangeAvance.value = '0'; if(labelAvance) labelAvance.innerText = '0%'; }
                filtrarYRenderizarExplorar();
            });
        }

        fetch('obras_pasco_geolocalizadas.json')
            .then(res => res.json())
            .then(obras => {
                todasLasObrasExplorar = obras;
                filtrarYRenderizarExplorar();
            })
            .catch(err => console.error("Error cargando JSON de Explorar:", err));
    }
});