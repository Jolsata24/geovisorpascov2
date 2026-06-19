document.addEventListener('DOMContentLoaded', () => {

    const formatoSoles = (valor) => {
        let num = 0;
        if (valor) {
            const strValor = valor.toString().replace(' ', '.').replace(',', '.');
            num = parseFloat(strValor) || 0;
        }
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
    };

    const setTexto = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };

    let todasLasObras = [];
    let marcadoresAgrupados = null;
    let graficoDonut = null;

    const selectAnio = document.getElementById('filtroAnioDashboard');

    // 1. INICIALIZAR MAPA
    const contenedorMapa = document.getElementById('mi_mapa');
    if (contenedorMapa) {
        const mapaDashboard = L.map('mi_mapa').setView([-10.6678, -76.2561], 9);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapaDashboard);

        marcadoresAgrupados = L.markerClusterGroup({
            spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true
        });
        mapaDashboard.addLayer(marcadoresAgrupados);

        // Sistema de cierre del modal
        document.addEventListener('click', function(e) {
            if (e.target.closest('.modal-cerrar') || e.target.id === 'modalObras') {
                const modal = document.getElementById("modalObras");
                if(modal) modal.style.setProperty('display', 'none', 'important');
            }
        });
    }

    // 2. INICIALIZAR GRÁFICO
    const canvasGrafico = document.getElementById('donutChart');
    if (canvasGrafico) {
        const ctx = canvasGrafico.getContext('2d');
        graficoDonut = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels: ['Avance Promedio', 'Por Ejecutar'], 
                datasets: [{ data: [0, 100], backgroundColor: ['#10b981', '#f3f4f6'], borderWidth: 0, cutout: '75%' }] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } } },
            plugins: [{
                id: 'textCenter',
                beforeDraw: function(chart) {
                    var width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();
                    ctx.font = "bold " + (height / 114).toFixed(2) + "em sans-serif";
                    ctx.textBaseline = "middle"; ctx.fillStyle = "#333";
                    
                    var valorReal = chart.data.datasets[0].data[0] || 0;
                    var text = valorReal + "%", textX = Math.round((width - ctx.measureText(text).width) / 2), textY = height / 2 - 5;
                    ctx.fillText(text, textX, textY);
                    
                    ctx.font = "normal 0.5em sans-serif"; ctx.fillStyle = "#888";
                    var text2 = "Promedio", text2X = Math.round((width - ctx.measureText(text2).width) / 2), text2Y = height / 2 + 15;
                    ctx.fillText(text2, text2X, text2Y);
                    ctx.save();
                }
            }]
        });
    }

    // 3. FUNCIÓN MAESTRA DE ACTUALIZACIÓN
    function actualizarDashboard() {
        const anioBusqueda = selectAnio ? selectAnio.value : "todos";

        // A. FILTRAR DATOS
        const obrasFiltradas = todasLasObras.filter(obra => {
            // CORRECCIÓN: Nombre correcto de columna "Fecha de Inicio"
            const fechaObra = (obra['Fecha de Inicio'] || "").toString();
            let pasaAnio = true;
            
            if (anioBusqueda !== 'todos') {
                const matchAnio = fechaObra.match(/\d{4}/);
                const anioReal = matchAnio ? parseInt(matchAnio[0]) : 0;
                
                if (anioBusqueda === '2022') pasaAnio = anioReal > 0 && anioReal <= 2022;
                else pasaAnio = fechaObra.includes(anioBusqueda);
            }
            return pasaAnio;
        });

        // B. CÁLCULO DE KPIs
        let ejecucion = 0; let culminadas = 0; 
        let provPasco = 0; let provDAC = 0; let provOxa = 0;
        let sumaAvance = 0; let contadorAvance = 0;

        obrasFiltradas.forEach(obra => {
            // CORRECCIÓN: Nombre correcto de columna "Estado de obra"
            const estado = (obra['Estado de obra'] || "").toLowerCase();
            if (estado.includes('ejecución') || estado.includes('ejecucion')) ejecucion++;
            if (estado.includes('terminada') || estado.includes('recepción') || estado.includes('liquidada') || estado.includes('concluida') || estado.includes('finalizado') || estado.includes('finalizada')) culminadas++;
            
            const provincia = (obra['Provincia'] || "").toUpperCase();
            if (provincia === 'PASCO') provPasco++;
            else if (provincia.includes('DANIEL ALCIDES')) provDAC++;
            else if (provincia === 'OXAPAMPA') provOxa++;

            const avanceStr = (obra['Avance Físico Real Acumulado (%)'] || "0").toString().replace(',', '.');
            const avance = parseFloat(avanceStr) || 0;
            sumaAvance += avance;
            contadorAvance++;
        });

        const totalObras = obrasFiltradas.length;
        
        // C. PINTAR KPIs Y BARRAS
        setTexto('kpi-totales', totalObras.toLocaleString('es-PE'));
        setTexto('kpi-ejecucion', ejecucion.toLocaleString('es-PE'));
        setTexto('kpi-culminadas', culminadas.toLocaleString('es-PE'));

        const pctPasco = totalObras > 0 ? Math.round((provPasco / totalObras) * 100) : 0;
        const pctDAC = totalObras > 0 ? Math.round((provDAC / totalObras) * 100) : 0;
        const pctOxa = totalObras > 0 ? Math.round((provOxa / totalObras) * 100) : 0;

        setTexto('pct-pasco', pctPasco + '%'); 
        const barPasco = document.getElementById('bar-pasco'); if(barPasco) barPasco.style.width = pctPasco + '%';
        setTexto('pct-dac', pctDAC + '%'); 
        const barDac = document.getElementById('bar-dac'); if(barDac) barDac.style.width = pctDAC + '%';
        setTexto('pct-oxa', pctOxa + '%'); 
        const barOxa = document.getElementById('bar-oxa'); if(barOxa) barOxa.style.width = pctOxa + '%';

        // D. ACTUALIZAR GRÁFICO CIRCULAR
        if (graficoDonut) {
            let promedioAvance = contadorAvance > 0 ? Math.round(sumaAvance / contadorAvance) : 0;
            graficoDonut.data.datasets[0].data = [promedioAvance, 100 - promedioAvance];
            graficoDonut.update();
        }

        // E. ACTUALIZAR MAPA
        if (marcadoresAgrupados) {
            marcadoresAgrupados.clearLayers();

            const crearIconoHtml = (color) => L.divIcon({
                className: "custom-pin",
                html: `<div style="background-color:${color}; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
                iconSize: [18, 18], iconAnchor: [9, 9]
            });
            const iconVerde = crearIconoHtml('#16a34a'); const iconRojo = crearIconoHtml('#dc2626'); const iconAzul = crearIconoHtml('#0284c7');

            obrasFiltradas.forEach(obra => {
                const lat = parseFloat(obra.Latitud);
                const lng = parseFloat(obra.Longitud);

                if (!isNaN(lat) && !isNaN(lng)) {
                    // CORRECCIÓN: Nombre correcto de columna "Estado de obra"
                    const estado = (obra['Estado de obra'] || "").toLowerCase();
                    let iconoActual = iconAzul;
                    if (estado.includes('paralizada')) iconoActual = iconRojo;
                    else if (estado.includes('ejecución') || estado.includes('ejecucion')) iconoActual = iconVerde;

                    const marcador = L.marker([lat, lng], { icon: iconoActual });

                    marcador.on('click', function() {
                        const modal = document.getElementById("modalObras");
                        if(!modal) return; 
                        
                        // CORRECCIÓN: Nombre de la obra
                        setTexto("modal-titulo", obra['Nombre de la obra'] || "Obra sin nombre");
                        setTexto("modal-entidad", obra['Entidad Pública'] || "Entidad no registrada");
                        setTexto("modal-avance", (obra['Avance Físico Real Acumulado (%)'] || 0) + "%");
                        setTexto("modal-monto", formatoSoles(obra['Monto Expediente Técnico'])); // Ajustado el monto al nombre de tu CSV
                        setTexto("modal-ubicacion", `${obra['Distrito']}, ${obra['Provincia']}`);
                        
                        const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
                        setTexto("modal-snip", codigoSnip || "N/A");

                        const btnEnlace = document.getElementById("modal-enlace-mef");
                        if (btnEnlace) {
                            if (codigoSnip && codigoSnip !== "0") {
                                btnEnlace.href = `detalle_obra.html?snip=${codigoSnip}`;
                                btnEnlace.style.pointerEvents = 'auto'; btnEnlace.style.opacity = '1';
                                btnEnlace.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver ficha detallada';
                            } else {
                                btnEnlace.href = '#'; btnEnlace.style.pointerEvents = 'none';
                                btnEnlace.style.opacity = '0.5'; btnEnlace.innerText = 'Sin código SNIP';
                            }
                        }

                        const estadoElem = document.getElementById("modal-estado");
                        if (estadoElem) {
                            // CORRECCIÓN: Estado de obra
                            estadoElem.innerText = obra['Estado de obra'] || "Desconocido";
                            if (estado.includes("paralizada")) { estadoElem.style.background = "#fee2e2"; estadoElem.style.color = "#dc2626"; } 
                            else if (estado.includes("ejecución") || estado.includes("ejecucion")) { estadoElem.style.background = "#dcfce7"; estadoElem.style.color = "#16a34a"; } 
                            else { estadoElem.style.background = "#e0f2fe"; estadoElem.style.color = "#0284c7"; }
                        }

                        modal.style.setProperty('display', 'flex', 'important');
                    });
                    
                    marcadoresAgrupados.addLayer(marcador);
                }
            });
        }
    }

    // 4. EVENT LISTENERS Y CARGA INICIAL
    if (selectAnio) {
        selectAnio.addEventListener('change', actualizarDashboard);
    }

    // AQUI ESTABA EL ERROR: Usar el fetch correcto para el dashboard
    fetch('Obras_Pasco_Procesado.json')
        .then(res => res.json())
        .then(obras => {
            todasLasObras = obras;
            actualizarDashboard(); 
        })
        .catch(err => {
            console.error("Error cargando JSON en Dashboard:", err);
        });
});