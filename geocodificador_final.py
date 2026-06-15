import pandas as pd
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
import json

ARCHIVO_ENTRADA = 'datos_geovisor_pasco_optimizados.xlsx'
ARCHIVO_SALIDA = 'obras_pasco_geolocalizadas.json'

geolocator = Nominatim(user_agent="geovisor_obras_pasco_v1")

def obtener_coordenadas(direccion, intento=1):
    try:
        time.sleep(1.2) # Respetar el límite del servidor gratuito
        return geolocator.geocode(direccion, timeout=10)
    except (GeocoderTimedOut, GeocoderServiceError):
        if intento <= 3:
            time.sleep(2)
            return obtener_coordenadas(direccion, intento + 1)
        return None

def principal():
    print("🚀 Iniciando geolocalización de las obras de Pasco...")
    df = pd.read_excel(ARCHIVO_ENTRADA)
    
    # Asegurarnos de que existan las columnas para las coordenadas
    df['Latitud'] = None
    df['Longitud'] = None
    
    total = len(df)
    
    for index, row in df.iterrows():
        distrito = str(row.get('Distrito', '')).strip()
        provincia = str(row.get('Provincia', '')).strip()
        direccion = str(row.get('Dirección o información de referencia', '')).strip()
        
        if direccion.lower() == 'nan': direccion = ""
        
        # Intentar con dirección exacta
        if direccion:
            busqueda = f"{direccion}, {distrito}, {provincia}, Pasco, Perú"
            ubicacion = obtener_coordenadas(busqueda)
            if ubicacion:
                df.at[index, 'Latitud'] = ubicacion.latitude
                df.at[index, 'Longitud'] = ubicacion.longitude
                print(f"[{index+1}/{total}] ✅ Exacta: {busqueda[:40]}...")
                continue
                
        # Fallback: Solo distrito
        busqueda_distrito = f"{distrito}, {provincia}, Pasco, Perú"
        ubicacion_fallback = obtener_coordenadas(busqueda_distrito)
        if ubicacion_fallback:
            df.at[index, 'Latitud'] = ubicacion_fallback.latitude
            df.at[index, 'Longitud'] = ubicacion_fallback.longitude
            print(f"[{index+1}/{total}] ⚠️ Distrito: {busqueda_distrito}")
        else:
            print(f"[{index+1}/{total}] ❌ No encontrada")

    # Limpiar obras que no se pudieron geolocalizar en absoluto para evitar errores en el mapa
    df_limpio = df.dropna(subset=['Latitud', 'Longitud'])
    
    # Exportar a JSON (Formato ideal para web)
    df_limpio.to_json(ARCHIVO_SALIDA, orient='records', force_ascii=False, indent=4)
    print(f"\n✅ ¡Listo! Se guardó '{ARCHIVO_SALIDA}' con {len(df_limpio)} obras listas para el mapa.")

if __name__ == "__main__":
    principal()