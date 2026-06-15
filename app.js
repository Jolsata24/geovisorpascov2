// --- LÓGICA DEL GRÁFICO CIRCULAR (CHART.JS) ---
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('donutChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Devengado', 'Por Ejecutar'],
            datasets: [{
                data: [68, 32], // Los porcentajes
                backgroundColor: [
                    '#10b981', // Verde
                    '#f3f4f6'  // Gris claro
                ],
                borderWidth: 0,
                cutout: '75%' // Hace que el anillo sea delgado
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Ocultamos la leyenda por defecto
                tooltip: { enabled: true }
            }
        },
        // Plugin personalizado para poner el texto "68%" en el centro
        plugins: [{
            id: 'textCenter',
            beforeDraw: function(chart) {
                var width = chart.width,
                    height = chart.height,
                    ctx = chart.ctx;

                ctx.restore();
                var fontSize = (height / 114).toFixed(2);
                ctx.font = "bold " + fontSize + "em sans-serif";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#333";

                var text = "68%",
                    textX = Math.round((width - ctx.measureText(text).width) / 2),
                    textY = height / 2 - 5;

                ctx.fillText(text, textX, textY);
                
                // Texto pequeño "Devengado" abajo
                ctx.font = "normal 0.5em sans-serif";
                ctx.fillStyle = "#888";
                var text2 = "Devengado",
                    text2X = Math.round((width - ctx.measureText(text2).width) / 2),
                    text2Y = height / 2 + 15;
                ctx.fillText(text2, text2X, text2Y);
                
                ctx.save();
            }
        }]
    });
});

// --- LÓGICA DEL GRÁFICO CIRCULAR (CHART.JS) ---
document.addEventListener('DOMContentLoaded', function() {
    const canvasGrafico = document.getElementById('donutChart');
    
    // Solo ejecutamos Chart.js si el canvas existe (es decir, estamos en el dashboard)
    if (canvasGrafico) {
        const ctx = canvasGrafico.getContext('2d');
        new Chart(ctx, {
            // ... (AQUÍ VA TODO EL CÓDIGO DEL GRÁFICO QUE YA TIENES) ...
        });
    }
});