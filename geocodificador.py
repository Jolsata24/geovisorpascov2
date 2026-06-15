import pandas as pd
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time

# 1. Configuración Inicial
ARCHIVO_ENTRADA = 'obras_infobras.csv'
ARCHIVO_SALIDA = 'obras_geolocalizadas.csv'

# Inicializamos el geocodificador (Nominatim requiere un user_agent personalizado y descriptivo)
geolocator = Nominatim(user_agent="proyecto_geovisor_pasco")

def obtener_coordenadas(direccion, intento=1):
    """Función para conectarse a la API de mapas con manejo de errores."""
    try:
        # Nominatim exige máximo 1 petición por segundo para no bloquearte
        time.sleep(1.1) 
        return geolocator.geocode(direccion, timeout=10)
    except (GeocoderTimedOut, GeocoderServiceError):
        if intento <= 3:
            time.sleep(2) # Espera antes de reintentar
            return obtener_coordenadas(direccion, intento + 1)
        return None

def principal():
    print("🚀 Iniciando el procesamiento de datos...")
    
    # 2. Cargar el CSV
    try:
        # Intenta cargar con codificación utf-8, si falla por tildes usa latin1
        df = pd.read_csv(ARCHIVO_ENTRADA, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(ARCHIVO_ENTRADA, encoding='latin1')

    # Crear columnas nuevas si no existen
    if 'Latitud' not in df.columns:
        df['Latitud'] = None
        df['Longitud'] = None
        df['Precision_Mapa'] = None # Para saber si es ubicación exacta o referencial

    total_obras = len(df)
    print(f"📊 Se encontraron {total_obras} obras para procesar.\n")

    # 3. Iterar sobre cada fila del DataFrame
    for index, row in df.iterrows():
        # Limpiar los datos (manejar valores nulos)
        direccion_exacta = str(row.get('Dirección o indicación', '')).strip()
        distrito = str(row.get('Distrito', '')).strip()
        provincia = str(row.get('Provincia', '')).strip()
        departamento = str(row.get('Departamento', 'Pasco')).strip()
        
        # Ignorar 'nan' si pandas lo leyó como texto
        if direccion_exacta.lower() == 'nan': direccion_exacta = ""
        if distrito.lower() == 'nan': distrito = ""

        # --- ESTRATEGIA A: Búsqueda Exacta ---
        if direccion_exacta:
            busqueda_exacta = f"{direccion_exacta}, {distrito}, {provincia}, {departamento}, Perú"
            print(f"[{index + 1}/{total_obras}] Buscando exacta: {busqueda_exacta[:50]}...")
            ubicacion = obtener_coordenadas(busqueda_exacta)
            
            if ubicacion:
                df.at[index, 'Latitud'] = ubicacion.latitude
                df.at[index, 'Longitud'] = ubicacion.longitude
                df.at[index, 'Precision_Mapa'] = "Exacta"
                continue # Pasa a la siguiente obra

        # --- ESTRATEGIA B: Fallback (Centroide del Distrito) ---
        # Si no había dirección, o si la búsqueda exacta falló
        busqueda_distrital = f"{distrito}, {provincia}, {departamento}, Perú"
        print(f"[{index + 1}/{total_obras}] ⚠️ Fallback a distrito: {busqueda_distrital}")
        ubicacion_fallback = obtener_coordenadas(busqueda_distrital)
        
        if ubicacion_fallback:
            df.at[index, 'Latitud'] = ubicacion_fallback.latitude
            df.at[index, 'Longitud'] = ubicacion_fallback.longitude
            df.at[index, 'Precision_Mapa'] = "Referencial (Distrito)"
        else:
            print(f"[{index + 1}/{total_obras}] ❌ No se pudo ubicar de ninguna forma.")
            df.at[index, 'Precision_Mapa'] = "No ubicada"

    # 4. Guardar los resultados
    df.to_csv(ARCHIVO_SALIDA, index=False, encoding='utf-8')
    print(f"\n✅ ¡Proceso terminado! Archivo guardado como '{ARCHIVO_SALIDA}'")

# Ejecutar el script
if __name__ == "__main__":
    principal()