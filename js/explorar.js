document.addEventListener('DOMContentLoaded', () => {

    const contenedorObras = document.getElementById('contenedorObras');
    
    // Solo ejecutamos este script si estamos en la página de explorar
    if (!contenedorObras) return;

    // ==========================================
    // 0. FUNCIONES DE UTILIDAD
    // ==========================================
    
    // Limpia tildes y acentos para búsquedas exactas
    const quitarTildes = (str) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    };

    // Formatear moneda a Soles
    const formatoSoles = (valor) => {
        if (!valor || isNaN(valor)) return "S/ 0.00";
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
    };

    // ==========================================
    // 1. VARIABLES DEL DOM Y ESTADO
    // ==========================================
    let todasLasObrasExplorar = []; 

    const inputTexto = document.getElementById('filtroTexto');
    const selectProv = document.getElementById('filtroProvincia') || document.getElementById('filtroProv'); 
    const selectEstado = document.getElementById('filtroEstadoObra') || document.getElementById('filtroEstado');
    const selectAnio = document.getElementById('filtroAnio'); // El nuevo filtro de fecha
    const rangeAvance = document.getElementById('filtroAvance');
    const labelAvance = document.getElementById('valorAvance');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const contador = document.getElementById('contadorResultados');

    // ==========================================
    // 2. MOTOR DE FILTRADO INTELIGENTE
    // ==========================================
    function filtrarYRenderizarExplorar() {
        // Capturar valores actuales de los filtros
        const textoBusqueda = inputTexto ? quitarTildes(inputTexto.value.toLowerCase().trim()) : "";
        const provincia = selectProv ? selectProv.value : "todas";
        const estadoBusqueda = selectEstado ? quitarTildes(selectEstado.value.toLowerCase()) : "todos";
        const anioBusqueda = selectAnio ? selectAnio.value : "todos";
        const avanceMinimo = rangeAvance ? parseInt(rangeAvance.value) : 0;

        // Filtrar el array completo
        const obrasFiltradas = todasLasObrasExplorar.filter(obra => {
            
            // A. Filtro de Texto (Busca en Nombre, Entidad y SNIP)
            const nombre = obra['Nombre de obra'] || "";
            const entidad = obra['Entidad Pública'] || "";
            const snip = obra['Código SNIP'] || "";
            const textoObra = quitarTildes(`${nombre} ${entidad} ${snip}`.toLowerCase());
            const pasaTexto = textoBusqueda === "" || textoObra.includes(textoBusqueda);

            // B. Filtro de Provincia
            const provObra = (obra['Provincia'] || "").trim().toUpperCase();
            const pasaProv = (provincia === 'todas') || provObra.includes(provincia);

            // C. Filtro de Estado (Con sinónimos)
            const estadoObraActual = quitarTildes((obra['Estado de ejecución'] || "").toLowerCase());
            let pasaEstado = true;
            if (estadoBusqueda !== 'todos') {
                if (estadoBusqueda === 'terminada' || estadoBusqueda === 'recepcion') {
                    pasaEstado = estadoObraActual.includes('terminada') || 
                                 estadoObraActual.includes('recepcion') || 
                                 estadoObraActual.includes('liquidada') || 
                                 estadoObraActual.includes('concluida') || 
                                 estadoObraActual.includes('finalizado') || 
                                 estadoObraActual.includes('finalizada');
                } else {
                    pasaEstado = estadoObraActual.includes(estadoBusqueda);
                }
            }

            // D. Filtro de Año (Busca en la columna 'Fecha de inicio' o 'Fecha')
            // D. Filtro de Año (Busca el nombre exacto de la columna)
            const fechaObra = (obra['Fecha de inicio de obra'] || "").toString();
            let pasaAnio = true;
            
            if (anioBusqueda !== 'todos') {
                // Extraemos inteligentemente los 4 dígitos del año de la fecha (ej. "17/05/2010" -> 2010)
                const matchAnio = fechaObra.match(/\d{4}/);
                const anioReal = matchAnio ? parseInt(matchAnio[0]) : 0;

                if (anioBusqueda === '2022') {
                    // Si elige "2022 y anteriores", aprueba cualquier obra del 2022 hacia atrás
                    pasaAnio = anioReal > 0 && anioReal <= 2022;
                } else {
                    // Si elige un año específico (2026, 2025, etc.), busca coincidencia exacta
                    pasaAnio = fechaObra.includes(anioBusqueda);
                }
            }

            // E. Filtro de Avance Físico
            const avanceStr = (obra['Avance Físico Real Acumulado (%)'] || "0").toString().replace(',', '.');
            const avanceActual = parseFloat(avanceStr) || 0;
            const pasaAvance = avanceActual >= avanceMinimo;

            // Retorna verdadero solo si pasa TODOS los filtros
            return pasaTexto && pasaProv && pasaEstado && pasaAnio && pasaAvance;
        });

        // Actualizar contador
        if (contador) {
            contador.innerText = `Mostrando ${Math.min(obrasFiltradas.length, 50)} de ${obrasFiltradas.length} resultados encontrados`;
        }

        // Enviar a dibujar (limitado a 50 para que no se congele el navegador)
        renderizarTarjetas(obrasFiltradas.slice(0, 50));
    }

    // ==========================================
    // 3. RENDERIZADO DE TARJETAS HTML
    // ==========================================
    function renderizarTarjetas(obras) {
        contenedorObras.innerHTML = ''; 

        if (obras.length === 0) {
            contenedorObras.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <h3 style="color: #64748b; margin:0;">No se encontraron obras</h3>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Prueba ajustando los filtros de búsqueda.</p>
                </div>
            `;
            return;
        }

        obras.forEach(obra => {
            const estado = obra['Estado de ejecución'] || "Desconocido";
            const avanceStr = (obra['Avance Físico Real Acumulado (%)'] || "0").toString().replace(',', '.');
            const avance = parseFloat(avanceStr) || 0;
            const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
            
            // Enlace seguro hacia tu página detalle_obra.html
            const enlaceSSI = codigoSnip ? `detalle_obra.html?snip=${codigoSnip}` : '#';
            const estiloBotonExtra = codigoSnip ? '' : 'pointer-events: none; opacity: 0.5; cursor: not-allowed;';
            const textoBoton = codigoSnip ? '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver ficha detallada' : 'Sin código SNIP';

            // Colores por estado
            let colorEstado = '#0284c7'; 
            let bgEstado = '#e0f2fe';
            if(estado.toLowerCase().includes('paralizada')) { 
                colorEstado = '#dc2626'; bgEstado = '#fee2e2'; 
            } else if(estado.toLowerCase().includes('ejecución') || estado.toLowerCase().includes('ejecucion')) { 
                colorEstado = '#16a34a'; bgEstado = '#dcfce7'; 
            }

            const tarjeta = document.createElement('div');
            tarjeta.className = 'obra-card';
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <span class="etiqueta-estado" style="background:${bgEstado}; color:${colorEstado};">${estado}</span>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">SNIP: ${codigoSnip || '-'}</span>
                </div>
                <h4 class="obra-card-titulo" title="${obra['Nombre de obra'] || 'Sin nombre'}">
                    ${obra['Nombre de obra'] || 'Sin nombre'}
                </h4>
                <div class="obra-card-entidad"><i class="fa-solid fa-building-columns"></i> ${obra['Entidad Pública'] || '-'}</div>
                <div class="obra-card-ubicacion"><i class="fa-solid fa-location-dot"></i> ${obra['Distrito']}, ${obra['Provincia']}</div>
                
                <div class="obra-card-footer">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85rem;">
                        <span style="color: #64748b; font-weight:600;">Avance Físico:</span>
                        <strong style="color: var(--text-main);">${avance}%</strong>
                    </div>
                    <div class="track">
                        <div class="fill" style="width: ${Math.min(avance, 100)}%; background-color: ${avance >= 80 ? '#10b981' : (avance < 30 ? '#ef4444' : '#f59e0b')};"></div>
                    </div>
                    
                    <a href="${enlaceSSI}" class="btn-primary" style="${estiloBotonExtra}">
                        ${textoBoton}
                    </a>
                </div>
            `;
            contenedorObras.appendChild(tarjeta);
        });
    }

    // ==========================================
    // 4. EVENT LISTENERS DE LOS FILTROS
    // ==========================================
    if (inputTexto) inputTexto.addEventListener('input', filtrarYRenderizarExplorar);
    if (selectProv) selectProv.addEventListener('change', filtrarYRenderizarExplorar);
    if (selectEstado) selectEstado.addEventListener('change', filtrarYRenderizarExplorar);
    if (selectAnio) selectAnio.addEventListener('change', filtrarYRenderizarExplorar);
    
    if (rangeAvance) {
        rangeAvance.addEventListener('input', function() {
            if (labelAvance) labelAvance.innerText = `${this.value}%`;
            filtrarYRenderizarExplorar();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if(inputTexto) inputTexto.value = '';
            if(selectProv) selectProv.value = 'todas';
            if(selectEstado) selectEstado.value = 'todos';
            if(selectAnio) selectAnio.value = 'todos';
            if(rangeAvance) { 
                rangeAvance.value = '0'; 
                if(labelAvance) labelAvance.innerText = '0%'; 
            }
            filtrarYRenderizarExplorar();
        });
    }

    // ==========================================
    // 5. CARGA INICIAL DE DATOS
    // ==========================================
    fetch('obras_pasco_geolocalizadas.json')
        .then(res => res.json())
        .then(obras => {
            todasLasObrasExplorar = obras;
            filtrarYRenderizarExplorar(); // Primera pintada de tarjetas
        })
        .catch(err => {
            console.error("Error cargando JSON de Explorar:", err);
            if (contador) contador.innerText = "Error de conexión al cargar datos.";
        });
});