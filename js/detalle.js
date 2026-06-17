document.addEventListener('DOMContentLoaded', async function() {
    // 1. Obtener el código SNIP de la URL
    const parametrosURL = new URLSearchParams(window.location.search);
    const snipURL = parametrosURL.get('snip');

    if (!snipURL) {
        const titulo = document.getElementById('det-titulo');
        if (titulo) titulo.innerText = "Error: No se proporcionó un código SNIP.";
        return;
    }

    // 2. Cargar nuestro JSON local para pintar la columna izquierda
    // Asegúrate de que la ruta sea correcta desde la raíz hacia el archivo JSON
    try {
        const respuesta = await fetch('obras_pasco_geolocalizadas.json');
        const obras = await respuesta.json();

        // Buscar la obra específica por SNIP
        const obraEncontrada = obras.find(o => (o['Código SNIP'] || '').toString().trim() === snipURL);

        if (obraEncontrada) {
            
            // Función mejorada para limpiar y formatear Moneda
            const formatoSoles = (valor) => {
                // Limpiar: convertir a cadena, reemplazar espacio por punto, parsear a flotante
                let num = 0;
                if (valor) {
                    const strValor = valor.toString().replace(' ', '.').replace(',', '.');
                    num = parseFloat(strValor) || 0;
                }
                return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
            };

            // Llenar el HTML de la izquierda (Resumen)
            const elTitulo = document.getElementById('det-titulo');
            if (elTitulo) elTitulo.innerText = obraEncontrada['Nombre de obra'] || "Sin nombre";
            
            const elEntidad = document.getElementById('det-entidad');
            if (elEntidad) elEntidad.innerHTML = `<i class="fa-solid fa-building-columns"></i> ${obraEncontrada['Entidad Pública'] || 'Sin entidad'}`;
            
            const estado = (obraEncontrada['Estado de ejecución'] || "Desconocido").toLowerCase();
            const elEstado = document.getElementById('det-estado');
            if (elEstado) {
                elEstado.innerText = obraEncontrada['Estado de ejecución'] || "Desconocido";
                if(estado.includes('paralizada')) { elEstado.style.background = '#fee2e2'; elEstado.style.color = '#dc2626'; }
                else if(estado.includes('ejecución') || estado.includes('ejecucion')) { elEstado.style.background = '#dcfce7'; elEstado.style.color = '#16a34a'; }
                else { elEstado.style.background = '#e0f2fe'; elEstado.style.color = '#0284c7'; }
            }

            const elAvance = document.getElementById('det-avance');
            if (elAvance) elAvance.innerText = (obraEncontrada['Avance Físico Real Acumulado (%)'] || 0) + '%';
            
            const elMonto = document.getElementById('det-monto');
            if (elMonto) elMonto.innerText = formatoSoles(obraEncontrada['Monto de ejecución financiera de la obra']);
            
            const elUbicacion = document.getElementById('det-ubicacion');
            if (elUbicacion) elUbicacion.innerText = `${obraEncontrada['Distrito'] || ''}, ${obraEncontrada['Provincia'] || ''}`;
            
            const elSnip = document.getElementById('det-snip');
            if (elSnip) elSnip.innerText = snipURL;

            // ==========================================
            // 3. LÓGICA DEL IFRAME (INVIERTE.PE)
            // ==========================================
            const urlMEF = `https://ofi5.mef.gob.pe/ssi/ssi/Index?codigo=${snipURL}&tipo=1`;
            
            const iframe = document.getElementById('iframe-mef');
            const linkExterno = document.getElementById('link-mef-externo');
            const mensajeCarga = document.getElementById('mensaje-carga-iframe');

            if (linkExterno) linkExterno.href = urlMEF;

            if (iframe) {
                iframe.src = urlMEF;
                iframe.onload = function() {
                    if (mensajeCarga) mensajeCarga.style.display = 'none';
                    iframe.style.display = 'block';
                };
            }

        } else {
            const titulo = document.getElementById('det-titulo');
            if (titulo) titulo.innerText = "Obra no encontrada en la base de datos.";
        }

    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});