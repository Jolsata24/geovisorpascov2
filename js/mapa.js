document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. FUNCIONES DE UTILIDAD
    // ==========================================
    
    // Limpia tildes y mayúsculas para búsquedas exactas
    const quitarTildes = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    
    // Formatea números a moneda peruana
    const formatoMoneda = (valor) => {
        if (!valor || isNaN(valor)) return "Datos no disponibles";
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
    };

    // Inyecta texto de forma SEGURA en el HTML
    const setTexto = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };

    // ==========================================
    // 1. INICIALIZACIÓN DEL MAPA
    // ==========================================
    const contenedorMapa = document.getElementById('mi_mapa');
    if (!contenedorMapa) return; // Si no hay mapa, detiene el script

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

    // ==========================================
    // 2. LEYENDA FLOTANTE
    // ==========================================
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

    // ==========================================
    // 3. LÓGICA DEL MODAL
    // ==========================================
    const modal = document.getElementById("modalObras");
    
    // Cerrar modal
    document.addEventListener('click', function(e) {
        if (e.target.closest('.modal-cerrar') || e.target.id === 'modalObras') {
            if(modal) modal.style.setProperty('display', 'none', 'important');
        }
    });

    // ==========================================
    // 4. DISEÑO DE PINES Y RENDERIZADO
    // ==========================================
    let todasLasObrasMapa = [];

    const crearIconoHtml = (color) => L.divIcon({
        className: "custom-pin",
        html: `<div style="background-color:${color}; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
    
    const iconVerde = crearIconoHtml('#16a34a');
    const iconRojo = crearIconoHtml('#dc2626');
    const iconAzul = crearIconoHtml('#0284c7');

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

                // EVENTO CLICK DEL PIN
                marcador.on('click', function() {
                    if(!modal) return; 
                    
                    setTexto("modal-titulo", obra['Nombre de obra'] || "Obra sin nombre");
                    setTexto("modal-entidad", obra['Entidad Pública'] || "Entidad no registrada");
                    setTexto("modal-estado", obra['Estado de ejecución'] || "Desconocido");
                    setTexto("modal-avance", (obra['Avance Físico Real Acumulado (%)'] || 0) + "%");
                    setTexto("modal-monto", formatoMoneda(obra['Monto de ejecución financiera de la obra']));
                    setTexto("modal-ubicacion", `${obra['Distrito']}, ${obra['Provincia']}`);
                    
                    const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
                    setTexto("modal-snip", codigoSnip || "N/A");

                    // Botón de ficha detallada
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

                    // Color de la etiqueta
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

                    // Forzar la apertura del modal sobre el mapa
                    modal.style.setProperty('display', 'flex', 'important');
                    modal.style.setProperty('z-index', '999999', 'important');
                    modal.style.setProperty('position', 'fixed', 'important');
                });
                
                marcadoresAgrupados.addLayer(marcador);
            }
        });
    }

    // ==========================================
    // 5. FILTROS DEL MAPA
    // ==========================================
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

    // ==========================================
    // 6. CARGA DE DATOS (JSON)
    // ==========================================
    fetch('obras_pasco_geolocalizadas.json')
        .then(res => res.json())
        .then(obras => {
            todasLasObrasMapa = obras;
            renderizarMapa(todasLasObrasMapa);
        })
        .catch(err => console.error("Error cargando JSON del Mapa:", err));
});