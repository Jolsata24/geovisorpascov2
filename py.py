import polars as pl
import re
import json
import random 

# 1. Cargar el archivo CSV
archivo_entrada = "BusquedaObras.csv" 
df = pl.read_csv(archivo_entrada, separator=",", ignore_errors=True)

# 2. Diccionario Maestro: Nombre Oficial -> Alias (Malas escrituras) -> Coordenadas
ubigeo_pasco = {
    "PASCO": {
        "CHAUPIMARCA": {"alias": ["CHAUPIMARCA"], "coords": [-10.6678, -76.2561]},
        "HUACHON": {"alias": ["HUACHON"], "coords": [-10.6417, -75.9381]},
        "HUARIACA": {"alias": ["HUARIACA"], "coords": [-10.4358, -76.1956]},
        "HUAYLLAY": {"alias": ["HUAYLLAY"], "coords": [-10.9997, -76.3333]},
        "NINACACA": {"alias": ["NINACACA", "NINACA"], "coords": [-10.8522, -76.1042]},
        "PALLANCHACRA": {"alias": ["PALLANCHACRA"], "coords": [-10.4578, -76.2425]},
        "PAUCARTAMBO": {"alias": ["PAUCARTAMBO"], "coords": [-10.7719, -75.9861]},
        "SAN FRANCISCO DE ASIS DE YARUSYACAN": {
            "alias": ["SAN FRANCISCO DE ASIS DE YARUSYACAN", "SAN FRANCISCO DE ASÍS DE YARUSYACAN", "SAN FRANCISCO DE AÍS DE YARUSYACAN", "SAN FRANCISCO DE ASIS DE YARUSYACÁN"], 
            "coords": [-10.5186, -76.2625]
        },
        "SIMON BOLIVAR": {"alias": ["SIMON BOLIVAR", "SIMÓN BOLÍVAR", "QUIULACOCHA"], "coords": [-10.6869, -76.2750]},
        "TICLACAYAN": {"alias": ["TICLACAYAN"], "coords": [-10.5975, -76.1558]},
        "TINYAHUARCO": {"alias": ["TINYAHUARCO"], "coords": [-10.7417, -76.2694]},
        "VICCO": {"alias": ["VICCO", "YANAMATE"], "coords": [-10.8175, -76.2417]},
        "YANACANCHA": {"alias": ["YANACANCHA"], "coords": [-10.6558, -76.2525]},
        "PERENE": {"alias": ["PERENE"], "coords": [-10.9333, -75.2167]} # Agregado de tu lista
    },
    "DANIEL ALCIDES CARRION": {
        "YANAHUANCA": {"alias": ["YANAHUANCA"], "coords": [-10.4908, -76.5133]},
        "CHACAYAN": {"alias": ["CHACAYAN"], "coords": [-10.4550, -76.4525]},
        "GOYLLARISQUIZGA": {"alias": ["GOYLLARISQUIZGA"], "coords": [-10.5750, -76.4117]},
        "PAUCAR": {"alias": ["PAUCAR"], "coords": [-10.4619, -76.5367]},
        "SAN PEDRO DE PILLAO": {"alias": ["SAN PEDRO DE PILLAO"], "coords": [-10.4128, -76.4253]},
        "SANTA ANA DE TUSI": {"alias": ["SANTA ANA DE TUSI", "SANTA ANA"], "coords": [-10.4667, -76.3536]},
        "TAPUC": {"alias": ["TAPUC"], "coords": [-10.4144, -76.4531]},
        "VILCABAMBA": {"alias": ["VILCABAMBA"], "coords": [-10.4853, -76.4533]}
    },
    "OXAPAMPA": {
        "OXAPAMPA": {"alias": ["OXAPAMPA"], "coords": [-10.5753, -75.4050]},
        "CHONTABAMBA": {"alias": ["CHONTABAMBA"], "coords": [-10.5950, -75.4419]},
        "HUANCABAMBA": {"alias": ["HUANCABAMBA"], "coords": [-10.3889, -75.5414]},
        "PALCAZU": {"alias": ["PALCAZU"], "coords": [-10.1550, -75.1481]},
        "POZUZO": {"alias": ["POZUZO"], "coords": [-10.0717, -75.5517]},
        "PUERTO BERMUDEZ": {"alias": ["PUERTO BERMUDEZ"], "coords": [-10.2981, -74.9367]},
        "VILLA RICA": {"alias": ["VILLA RICA"], "coords": [-10.7381, -75.2692]},
        "CONSTITUCION": {"alias": ["CONSTITUCION"], "coords": [-9.8456, -74.9639]}
    }
}

coord_default = [-10.6678, -76.2561]

# 3. Función de extracción y normalización
def extraer_ubicacion(texto):
    texto = str(texto).upper() if texto is not None else ""
    region = "PASCO"
    provincia_hallada = None
    distrito_oficial = None
    lat = coord_default[0]
    lon = coord_default[1]
    
    # Buscar primero la provincia explícita
    for prov in ubigeo_pasco.keys():
        if prov in texto:
            provincia_hallada = prov
            
    # Buscar el distrito usando tus alias personalizados
    for prov, distritos in ubigeo_pasco.items():
        for nombre_oficial, datos in distritos.items():
            for alias in datos["alias"]:
                if re.search(r'\b' + alias + r'\b', texto):
                    distrito_oficial = nombre_oficial # Guarda el nombre limpio, no el alias
                    
                    # Agregar coordenadas con leve dispersión para el mapa
                    lat = datos["coords"][0] + random.uniform(-0.02, 0.02)
                    lon = datos["coords"][1] + random.uniform(-0.02, 0.02)
                    
                    if not provincia_hallada:
                        provincia_hallada = prov
                        
                    # Retorna en cuanto encuentra el distrito para ser más rápido
                    return {
                        "Distrito": distrito_oficial, "Provincia": provincia_hallada, 
                        "Región": region, "Latitud": round(lat, 6), "Longitud": round(lon, 6)
                    }
                    
    # Si no encuentra nada, retorna nulos y la coordenada por defecto
    return {
        "Distrito": distrito_oficial, "Provincia": provincia_hallada, 
        "Región": region, "Latitud": round(lat, 6), "Longitud": round(lon, 6)
    }

# 4. Aplicar Polars
dtype_ubicacion = pl.Struct([
    pl.Field("Distrito", pl.String), pl.Field("Provincia", pl.String), pl.Field("Región", pl.String),
    pl.Field("Latitud", pl.Float64), pl.Field("Longitud", pl.Float64)
])

df = (
    df.with_columns(
        pl.col("Nombre de la obra").map_elements(extraer_ubicacion, return_dtype=dtype_ubicacion).alias("ubicacion")
    ).unnest("ubicacion")
)

# 5. Guardar JSON
archivo_salida = "Obras_Pasco_Procesado.json"
datos_json = df.to_dicts()

with open(archivo_salida, "w", encoding="utf-8") as f:
    json.dump(datos_json, f, ensure_ascii=False, indent=4)

print(f"¡Proceso finalizado con éxito y coordenadas agregadas!")