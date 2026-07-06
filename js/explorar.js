document.addEventListener('DOMContentLoaded', () => {

    const contenedorObras = document.getElementById('contenedorObras');
    const paginacionContainer = document.getElementById('paginacionContainer');
    if (!contenedorObras) return;

    const quitarTildes = (str) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    };

    // Variables globales para la Paginación
    let todasLasObrasExplorar = []; 
    let obrasFiltradasGlobal = []; 
    let paginaActual = 1;
    const obrasPorPagina = 20; // <--- Aquí configuras que sean 20 por página

    const inputTexto = document.getElementById('filtroTexto');
    const selectProv = document.getElementById('filtroProvincia') || document.getElementById('filtroProv'); 
    const selectEstado = document.getElementById('filtroEstadoObra') || document.getElementById('filtroEstado');
    const selectAnio = document.getElementById('filtroAnio'); 
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const contador = document.getElementById('contadorResultados');

    function filtrarObras() {
        const textoBusqueda = inputTexto ? quitarTildes(inputTexto.value.toLowerCase().trim()) : "";
        const provincia = selectProv ? selectProv.value : "todas";
        const estadoBusqueda = selectEstado ? quitarTildes(selectEstado.value.toLowerCase()) : "todos";
        const anioBusqueda = selectAnio ? selectAnio.value : "todos";

        obrasFiltradasGlobal = todasLasObrasExplorar.filter(obra => {
            const nombre = obra['Nombre de la obra'] || "";
            const entidad = obra['Entidad Pública'] || "";
            const snip = obra['Código SNIP'] || "";
            const textoObra = quitarTildes(`${nombre} ${entidad} ${snip}`.toLowerCase());
            const pasaTexto = textoBusqueda === "" || textoObra.includes(textoBusqueda);

            const provObra = (obra['Provincia'] || "").trim().toUpperCase();
            const pasaProv = (provincia === 'todas') || provObra.includes(provincia);

            const estadoObraActual = quitarTildes((obra['Estado de obra'] || "").toLowerCase());
            let pasaEstado = true;
            if (estadoBusqueda !== 'todos') {
                if (estadoBusqueda === 'terminada' || estadoBusqueda === 'recepcion') {
                    pasaEstado = estadoObraActual.includes('terminada') || estadoObraActual.includes('recepcion') || estadoObraActual.includes('liquidada') || estadoObraActual.includes('concluida') || estadoObraActual.includes('finalizado') || estadoObraActual.includes('finalizada');
                } else {
                    pasaEstado = estadoObraActual.includes(estadoBusqueda);
                }
            }

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

            return pasaTexto && pasaProv && pasaEstado && pasaAnio;
        });

        // Al hacer cualquier búsqueda nueva, regresamos siempre a la página 1
        paginaActual = 1; 
        renderizarPaginaActual();
    }

    function renderizarPaginaActual() {
        if (contador) {
            contador.innerHTML = `<i class="fa-solid fa-list-check"></i> Mostrando ${obrasFiltradasGlobal.length} resultados`;
        }

        // Matemáticas de la paginación: calcular inicio y fin del array
        const inicio = (paginaActual - 1) * obrasPorPagina;
        const fin = inicio + obrasPorPagina;
        const obrasPaginadas = obrasFiltradasGlobal.slice(inicio, fin);

        renderizarTarjetas(obrasPaginadas);
        renderizarControlesPaginacion();
    }

    function renderizarControlesPaginacion() {
        if (!paginacionContainer) return;
        paginacionContainer.innerHTML = '';

        const totalPaginas = Math.ceil(obrasFiltradasGlobal.length / obrasPorPagina);
        
        // Si no hay resultados o solo hay 1 página, no mostramos los botones
        if (totalPaginas <= 1) return; 

        // 1. Botón Anterior
        const btnAnterior = document.createElement('button');
        btnAnterior.className = 'btn-pagina';
        btnAnterior.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        btnAnterior.disabled = paginaActual === 1;
        btnAnterior.addEventListener('click', () => {
            if (paginaActual > 1) {
                paginaActual--;
                renderizarPaginaActual();
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll suave hacia arriba
            }
        });
        paginacionContainer.appendChild(btnAnterior);

        // 2. Lógica para mostrar máximo 5 botoncitos numéricos para que no sea inmenso
        let inicioPag = Math.max(1, paginaActual - 2);
        let finPag = Math.min(totalPaginas, inicioPag + 4);
        
        if (finPag - inicioPag < 4) {
            inicioPag = Math.max(1, finPag - 4);
        }

        for (let i = inicioPag; i <= finPag; i++) {
            const btnNum = document.createElement('button');
            btnNum.className = `btn-pagina ${i === paginaActual ? 'active' : ''}`;
            btnNum.innerText = i;
            btnNum.addEventListener('click', () => {
                paginaActual = i;
                renderizarPaginaActual();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            paginacionContainer.appendChild(btnNum);
        }

        // 3. Botón Siguiente
        const btnSiguiente = document.createElement('button');
        btnSiguiente.className = 'btn-pagina';
        btnSiguiente.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        btnSiguiente.disabled = paginaActual === totalPaginas;
        btnSiguiente.addEventListener('click', () => {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                renderizarPaginaActual();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        paginacionContainer.appendChild(btnSiguiente);
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
            const estado = obra['Estado de obra'] || "Desconocido";
            const codigoSnip = (obra['Código SNIP'] || '').toString().trim();
            
            const enlaceSSI = codigoSnip ? `detalle_obra.html?snip=${codigoSnip}` : '#';
            const estiloBotonExtra = codigoSnip ? '' : 'pointer-events: none; opacity: 0.5; cursor: not-allowed;';
            
            let colorEstado = '#4338ca'; let bgEstado = '#e0e7ff'; 
            if(estado.toLowerCase().includes('paralizada')) { 
                colorEstado = '#dc2626'; bgEstado = '#fee2e2'; 
            } else if(estado.toLowerCase().includes('ejecución') || estado.toLowerCase().includes('contrata')) { 
                colorEstado = '#059669'; bgEstado = '#d1fae5'; 
            } else if(estado.toLowerCase().includes('recepci') || estado.toLowerCase().includes('terminada')) {
                colorEstado = '#d97706'; bgEstado = '#fef3c7'; 
            }
            
            const provincia = obra['Provincia'] || 'Pasco';
            const distrito = obra['Distrito'] || '';
            const ubicacionText = distrito ? `${distrito}, ${provincia}` : provincia;

            const tarjeta = document.createElement('div');
            tarjeta.className = 'obra-card';
            tarjeta.innerHTML = `
                <div class="obra-card-header">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 10px;">
                        <span class="obra-estado-badge" style="background:${bgEstado}; color:${colorEstado};">${estado}</span>
                        <span style="font-size:0.75rem; color:var(--texto-gris); font-weight:700;">SNIP: ${codigoSnip || '-'}</span>
                    </div>
                    <h3 title="${obra['Nombre de la obra'] || 'Sin nombre'}">
                        ${obra['Nombre de la obra'] || 'Sin nombre'}
                    </h3>
                </div>
                
                <div class="obra-detalle-item">
                    <i class="fa-solid fa-location-dot"></i> 
                    <span>${ubicacionText}</span>
                </div>
                
                <div class="obra-card-footer" style="justify-content: flex-end;">
                    <a href="${enlaceSSI}" class="btn-ver-detalle" style="${estiloBotonExtra}">
                        <i class="fa-solid fa-arrow-right"></i> Ver detalle
                    </a>
                </div>
            `;
            contenedorObras.appendChild(tarjeta);
        });
    }

    // --- EVENTOS (Escuchadores) ---
    if (inputTexto) inputTexto.addEventListener('input', filtrarObras);
    if (selectProv) selectProv.addEventListener('change', filtrarObras);
    if (selectEstado) selectEstado.addEventListener('change', filtrarObras);
    if (selectAnio) selectAnio.addEventListener('change', filtrarObras);
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if(inputTexto) inputTexto.value = '';
            if(selectProv) selectProv.value = 'todas';
            if(selectEstado) selectEstado.value = 'todos';
            if(selectAnio) selectAnio.value = 'todos';
            filtrarObras();
        });
    }

    // --- CARGA INICIAL DE DATOS ---
    fetch('Obras_Pasco_Procesado.json')
        .then(res => res.json())
        .then(obras => {
            todasLasObrasExplorar = obras;
            filtrarObras(); // Llamamos la nueva función principal
        })
        .catch(err => {
            console.error("Error cargando JSON de Explorar:", err);
            if (contador) contador.innerText = "Error de conexión al cargar datos.";
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