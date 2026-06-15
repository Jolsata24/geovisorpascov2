document.addEventListener('DOMContentLoaded', async function() {
    // 1. Obtener el código SNIP de la URL
    const parametrosURL = new URLSearchParams(window.location.search);
    const snipURL = parametrosURL.get('snip');

    if (!snipURL) {
        document.getElementById('det-titulo').innerText = "Error: No se proporcionó un código SNIP.";
        return;
    }

    // 2. Cargar nuestro JSON local para pintar la columna izquierda
    try {
        const respuesta = await fetch('obras_pasco_geolocalizadas.json');
        const obras = await respuesta.json();

        // Buscar la obra específica
        const obraEncontrada = obras.find(o => (o['Código SNIP'] || '').toString() === snipURL);

        if (obraEncontrada) {
            // Formatear Moneda
            const formatoSoles = (valor) => {
                if (!valor || isNaN(valor)) return "S/ 0.00";
                return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);
            };

            // Llenar el HTML de la izquierda (Resumen)
            document.getElementById('det-titulo').innerText = obraEncontrada['Nombre de obra'];
            document.getElementById('det-entidad').innerHTML = `<i class="fa-solid fa-building-columns"></i> ${obraEncontrada['Entidad Pública']}`;
            
            const estado = obraEncontrada['Estado de ejecución'] || "Desconocido";
            const elEstado = document.getElementById('det-estado');
            elEstado.innerText = estado;
            if(estado.toLowerCase().includes('paralizada')) { elEstado.style.background = '#fee2e2'; elEstado.style.color = '#dc2626'; }
            if(estado.toLowerCase().includes('ejecución')) { elEstado.style.background = '#dcfce7'; elEstado.style.color = '#16a34a'; }

            document.getElementById('det-avance').innerText = (obraEncontrada['Avance Físico Real Acumulado (%)'] || 0) + '%';
            document.getElementById('det-monto').innerText = formatoSoles(obraEncontrada['Monto de ejecución financiera de la obra']);
            document.getElementById('det-ubicacion').innerText = `${obraEncontrada['Distrito']}, ${obraEncontrada['Provincia']}`;
            document.getElementById('det-snip').innerText = snipURL;

            // ==========================================
            // 3. LÓGICA DEL IFRAME (INVIERTE.PE)
            // ==========================================
            const urlMEF = `https://ofi5.mef.gob.pe/ssi/ssi/Index?codigo=${snipURL}&tipo=1`;
            
            const iframe = document.getElementById('iframe-mef');
            const linkExterno = document.getElementById('link-mef-externo');
            const mensajeCarga = document.getElementById('mensaje-carga-iframe');

            // Asignar el enlace al botón superior por si quieren verlo en pantalla completa
            linkExterno.href = urlMEF;

            // Asignar la URL al iframe
            iframe.src = urlMEF;

            // Cuando el iframe termine de cargar la página del MEF, ocultamos el mensaje de carga y mostramos el iframe
            iframe.onload = function() {
                mensajeCarga.style.display = 'none';
                iframe.style.display = 'block';
            };

        } else {
            document.getElementById('det-titulo').innerText = "Obra no encontrada en la base de datos.";
        }

    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
});