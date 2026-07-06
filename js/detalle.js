document.addEventListener('DOMContentLoaded', async function() {
    // 1. Obtener el código SNIP de la URL
    const parametrosURL = new URLSearchParams(window.location.search);
    const snipURL = parametrosURL.get('snip');

    if (!snipURL) {
        const titulo = document.getElementById('det-titulo');
        if (titulo) titulo.innerText = "Error: No se proporcionó un código SNIP.";
        return;
    }

    // 2. Cargar el JSON local (CORREGIDO AL NOMBRE REAL)
    // 2. Cargar el JSON local (Sin la trampa del caché)
    try {
        const respuesta = await fetch('Obras_Pasco_Procesado.json');
        const obras = await respuesta.json();

        // Buscar la obra específica por SNIP
        const obraEncontrada = obras.find(o => (o['Código SNIP'] || '').toString().trim() === snipURL);

        if (obraEncontrada) {
            
            // Función para limpiar y formatear Moneda
            const formatoSoles = (valor) => {
                let num = 0;
                if (valor) {
                    const strValor = valor.toString().replace(' ', '.').replace(',', '.');
                    num = parseFloat(strValor) || 0;
                }
                return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
            };

            // Llenar el HTML de la izquierda (Resumen)
            // CORREGIDO: Nombre de la obra
            const elTitulo = document.getElementById('det-titulo');
            if (elTitulo) elTitulo.innerText = obraEncontrada['Nombre de la obra'] || "Sin nombre";
            
            const elEntidad = document.getElementById('det-entidad');
            if (elEntidad) elEntidad.innerHTML = `<i class="fa-solid fa-building-columns"></i> ${obraEncontrada['Entidad Pública'] || 'Sin entidad'}`;
            
            // CORREGIDO: Estado de obra
            const estado = (obraEncontrada['Estado de obra'] || "Desconocido").toLowerCase();
            const elEstado = document.getElementById('det-estado');
            if (elEstado) {
                elEstado.innerText = obraEncontrada['Estado de obra'] || "Desconocido";
                if(estado.includes('paralizada')) { elEstado.style.background = '#fee2e2'; elEstado.style.color = '#dc2626'; }
                else if(estado.includes('ejecución') || estado.includes('ejecucion') || estado.includes('contrata')) { elEstado.style.background = '#dcfce7'; elEstado.style.color = '#16a34a'; }
                else { elEstado.style.background = '#e0f2fe'; elEstado.style.color = '#0284c7'; }
            }

            const elAvance = document.getElementById('det-avance');
            if (elAvance) elAvance.innerText = (obraEncontrada['Avance Físico Real Acumulado (%)'] || 0) + '%';
            
            // CORREGIDO: Monto Expediente Técnico
            const elMonto = document.getElementById('det-monto');
            if (elMonto) elMonto.innerText = formatoSoles(obraEncontrada['Monto Expediente Técnico']);
            
            const elUbicacion = document.getElementById('det-ubicacion');
            if (elUbicacion) elUbicacion.innerText = `${obraEncontrada['Distrito'] || ''}, ${obraEncontrada['Provincia'] || ''}`;
            
            const elSnip = document.getElementById('det-snip');
            if (elSnip) elSnip.innerText = snipURL;

            // ==========================================
            // 3. LÓGICA DEL IFRAME GIGANTE (INFOBRAS)
            // ==========================================
            
            // CORREGIDO: Columna "Código INFOBRAS" real
            const codigoInfobras = obraEncontrada['Código INFOBRAS'];
            const iframe = document.getElementById('iframe-infobras');
            const linkExterno = document.getElementById('link-infobras-externo');
            const mensajeCarga = document.getElementById('mensaje-carga-iframe');

            // Validamos que exista un código válido para esta obra (que no sea 0 o vacío)
            if (codigoInfobras && codigoInfobras !== "NaN" && codigoInfobras !== "null" && codigoInfobras !== "" && codigoInfobras !== 0 && codigoInfobras !== "0") {
                
                // Formateamos quitando cualquier decimal residual
                const cleanCode = codigoInfobras.toString().replace('.0', '');
                
                // Construimos la URL de la Contraloría
                const urlInfobras = `https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/Sumario?ObraId=${cleanCode}`;
                
                if (linkExterno) {
                    linkExterno.href = urlInfobras;
                    linkExterno.style.display = 'inline-block';
                }

                if (iframe) {
                    iframe.src = urlInfobras;
                    iframe.onload = function() {
                        if (mensajeCarga) mensajeCarga.style.display = 'none';
                        iframe.style.display = 'block';
                    };
                }

            } else {
                // Si la obra no tiene registro válido en INFObras
                if (mensajeCarga) {
                    mensajeCarga.innerHTML = `
                        <i class="fa-solid fa-eye-slash fa-2x mb-2" style="color: #cbd5e1;"></i>
                        <p style="margin-top: 10px;">Esta obra aún no cuenta con un registro fotográfico en INFObras o no tiene código asignado.</p>
                    `;
                }
            }

        } else {
            const titulo = document.getElementById('det-titulo');
            if (titulo) titulo.innerText = "Obra no encontrada en la base de datos.";
        }

    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
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