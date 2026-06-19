document.addEventListener('DOMContentLoaded', () => {

    const contenedorObras = document.getElementById('contenedorObras');
    if (!contenedorObras) return;

    const quitarTildes = (str) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    };

    let todasLasObrasExplorar = []; 

    const inputTexto = document.getElementById('filtroTexto');
    const selectProv = document.getElementById('filtroProvincia') || document.getElementById('filtroProv'); 
    const selectEstado = document.getElementById('filtroEstadoObra') || document.getElementById('filtroEstado');
    const selectAnio = document.getElementById('filtroAnio'); 
    const rangeAvance = document.getElementById('filtroAvance');
    const labelAvance = document.getElementById('valorAvance');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const contador = document.getElementById('contadorResultados');

    function filtrarYRenderizarExplorar() {
        const textoBusqueda = inputTexto ? quitarTildes(inputTexto.value.toLowerCase().trim()) : "";
        const provincia = selectProv ? selectProv.value : "todas";
        const estadoBusqueda = selectEstado ? quitarTildes(selectEstado.value.toLowerCase()) : "todos";
        const anioBusqueda = selectAnio ? selectAnio.value : "todos";
        const avanceMinimo = rangeAvance ? parseInt(rangeAvance.value) : 0;

        const obrasFiltradas = todasLasObrasExplorar.filter(obra => {
            
            // CORRECCIÓN: Nombre de la obra
            const nombre = obra['Nombre de la obra'] || "";
            const entidad = obra['Entidad Pública'] || "";
            const snip = obra['Código SNIP'] || "";
            const textoObra = quitarTildes(`${nombre} ${entidad} ${snip}`.toLowerCase());
            const pasaTexto = textoBusqueda === "" || textoObra.includes(textoBusqueda);

            const provObra = (obra['Provincia'] || "").trim().toUpperCase();
            const pasaProv = (provincia === 'todas') || provObra.includes(provincia);

            // CORRECCIÓN: Estado de obra
            const estadoObraActual = quitarTildes((obra['Estado de obra'] || "").toLowerCase());
            let pasaEstado = true;
            if (estadoBusqueda !== 'todos') {
                if (estadoBusqueda === 'terminada' || estadoBusqueda === 'recepcion') {
                    pasaEstado = estadoObraActual.includes('terminada') || estadoObraActual.includes('recepcion') || estadoObraActual.includes('liquidada') || estadoObraActual.includes('concluida') || estadoObraActual.includes('finalizado') || estadoObraActual.includes('finalizada');
                } else {
                    pasaEstado = estadoObraActual.includes(estadoBusqueda);
                }
            }

            // CORRECCIÓN: Fecha de Inicio
            const fechaObra = (obra['Fecha de Inicio'] || "").toString();
            let pasaAnio = true;
            if (anioBusqueda !== 'todos') {
                const matchAnio = fechaObra.match(/\d{4}/);
                const anioReal = matchAnio ? parseInt(matchAnio[0]) : 0;
                if (anioBusqueda === '2022') {
                    pasaAnio = anioReal > 0 && anioReal <= 2022;
                } else {
                    pasaAnio = fechaObra.includes(anioBusqueda);
                }
            }

            const avanceStr = (obra['Avance Físico Real Acumulado (%)'] || "0").toString().replace(',', '.');
            const avanceActual = parseFloat(avanceStr) || 0;
            const pasaAvance = avanceActual >= avanceMinimo;

            return pasaTexto && pasaProv && pasaEstado && pasaAnio && pasaAvance;
        });

        if (contador) {
            contador.innerText = `Mostrando ${Math.min(obrasFiltradas.length, 50)} de ${obrasFiltradas.length} resultados encontrados`;
        }
        renderizarTarjetas(obrasFiltradas.slice(0, 50));
    }

    function renderizarTarjetas(obras) {
        contenedorObras.innerHTML = ''; 

        if (obras.length === 0) {
            contenedorObras.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                    <h3 style="color: #64748b; margin:0;">No se encontraron obras</h3>
                </div>
            `;
            return;
        }

        obras.forEach(obra => {
            // CORRECCIÓN: Estado de obra
            const estado = obra['Estado de obra'] || "Desconocido";
            const avanceStr = (obra['Avance Físico Real Acumulado (%)'] || "0").toString().replace(',', '.');
            const avance = parseFloat(avanceStr) || 0;
            const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
            
            const enlaceSSI = codigoSnip ? `detalle_obra.html?snip=${codigoSnip}` : '#';
            const estiloBotonExtra = codigoSnip ? '' : 'pointer-events: none; opacity: 0.5; cursor: not-allowed;';
            const textoBoton = codigoSnip ? '<i class="fa-solid fa-arrow-up-right-from-square"></i> Ver ficha detallada' : 'Sin código SNIP';

            let colorEstado = '#0284c7'; let bgEstado = '#e0f2fe';
            if(estado.toLowerCase().includes('paralizada')) { colorEstado = '#dc2626'; bgEstado = '#fee2e2'; } 
            else if(estado.toLowerCase().includes('ejecución') || estado.toLowerCase().includes('ejecucion') || estado.toLowerCase().includes('contrata')) { colorEstado = '#16a34a'; bgEstado = '#dcfce7'; }

            const tarjeta = document.createElement('div');
            tarjeta.className = 'obra-card';
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <span class="etiqueta-estado" style="background:${bgEstado}; color:${colorEstado};">${estado}</span>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:600;">SNIP: ${codigoSnip || '-'}</span>
                </div>
                <h4 class="obra-card-titulo" title="${obra['Nombre de la obra'] || 'Sin nombre'}">
                    ${obra['Nombre de la obra'] || 'Sin nombre'}
                </h4>
                
                <div class="obra-card-ubicacion"><i class="fa-solid fa-location-dot"></i> ${obra['Provincia'] || ''}, ${obra['Región'] || 'PASCO'}</div>
                
                <div class="obra-card-footer">
                    
                    <a href="${enlaceSSI}" class="btn-primary" style="${estiloBotonExtra}">${textoBoton}</a>
                </div>
            `;
            contenedorObras.appendChild(tarjeta);
        });
    }

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
            if(rangeAvance) { rangeAvance.value = '0'; if(labelAvance) labelAvance.innerText = '0%'; }
            filtrarYRenderizarExplorar();
        });
    }

    // CORRECCIÓN: Nombre exacto del archivo generado por Python
    // Los dos puntos y la barra (../) le dicen que suba una carpeta
    fetch('Obras_Pasco_Procesado.json')
        .then(res => res.json())
        .then(obras => {
            todasLasObrasExplorar = obras;
            filtrarYRenderizarExplorar(); 
        })
        .catch(err => {
            console.error("Error cargando JSON de Explorar:", err);
            if (contador) contador.innerText = "Error de conexión al cargar datos.";
        });
});