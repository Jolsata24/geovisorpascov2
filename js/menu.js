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

// ==========================================
// LÓGICA DEL PRELOADER GLOBAL
// ==========================================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        // Agrega un pequeñísimo retraso (opcional) para que se aprecie la animación
        setTimeout(() => {
            preloader.classList.add('preloader-oculto');
        }, 300); // 300 milisegundos
    }
});

// ==========================================
// LÓGICA DEL MODAL DE BIENVENIDA (Solo en Inicio)
// ==========================================
window.addEventListener('load', () => {
    const modalBienvenida = document.getElementById('modalBienvenida');
    const btnCerrarBienvenida = document.getElementById('cerrarBienvenida');
    const btnEntendido = document.getElementById('btnEntendido');

    if (modalBienvenida) {
        // Hacemos que el modal aparezca 800 milisegundos después de cargar la página 
        // (así le damos tiempo al preloader de desaparecer primero)
        setTimeout(() => {
            modalBienvenida.style.display = 'flex';
        }, 800);

        // Función para cerrar el modal
        const cerrarModalBienvenida = () => {
            modalBienvenida.style.display = 'none';
        };

        // Cerramos si hacen clic en la "X" o en el botón "¡Entendido!"
        if (btnCerrarBienvenida) btnCerrarBienvenida.addEventListener('click', cerrarModalBienvenida);
        if (btnEntendido) btnEntendido.addEventListener('click', cerrarModalBienvenida);

        // También cerramos si hacen clic en la zona oscura fuera de la tarjeta blanca
        window.addEventListener('click', (e) => {
            if (e.target === modalBienvenida) {
                cerrarModalBienvenida();
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 1. Seleccionamos los elementos clave del DOM
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li a');

    // Verificamos que los elementos existan en la página actual para evitar errores en consola
    if (menuToggle && navLinks) {
        
        // 2. Abrir/Cerrar menú al hacer clic en el botón de hamburguesa
        menuToggle.addEventListener('click', function(event) {
            event.stopPropagation(); // Evita que el clic cierre el menú inmediatamente
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active'); // Útil si luego quieres animar el icono a una "X"
        });

        // 3. Cerrar el menú automáticamente al hacer clic en un enlace
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });

        // 4. Cerrar el menú si el usuario hace clic en cualquier parte fuera del menú
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = navLinks.contains(event.target);
            const isClickOnToggle = menuToggle.contains(event.target);

            // Si el clic no fue en el menú ni en el botón, y el menú está abierto, lo cerramos
            if (!isClickInsideMenu && !isClickOnToggle && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
        
    } else {
        console.warn("Aviso: No se encontró '.menu-toggle' o '.nav-links' en este archivo HTML.");
    }
});

// 1. Lógica para desaparecer el Preloader correctamente
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        // Añade la clase que lo oculta visualmente
        preloader.classList.add('preloader-oculto');
        
        // Lo removemos del DOM después de la animación para que no estorbe (medio segundo)
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
});

// 2. Lógica del Menú Hamburguesa
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    
    if (menuToggle && navLinks) {
        
        // Abrir/Cerrar menú
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita conflictos
            navLinks.classList.toggle('active');
        });

        // Cerrar menú al hacer clic fuera de él
        document.addEventListener('click', function(e) {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
        
        // Cerrar menú al tocar un enlace
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
        
    }
});