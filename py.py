import polars as pl
import re
import json # Importamos la librería nativa de JSON

# 1. Cargar el archivo CSV
archivo_entrada = "BusquedaObras.csv" # Asegúrate de que este siga siendo tu nombre de archivo

# Leemos el archivo
df = pl.read_csv(archivo_entrada, separator=",", ignore_errors=True)

# 2. Diccionario de Ubigeo de Pasco
ubigeo_pasco = {
    "PASCO": [
        "CHAUPIMARCA", "HUACHON", "HUARIACA", "HUAYLLAY", "NINACACA", 
        "PALLANCHACRA", "PAUCARTAMBO", "SAN FRANCISCO DE ASIS DE YARUSYACAN","SAN FRANCISCO DE ASÍS DE YARUSYACAN", 
        "SIMÓN BOLÍVAR","SIMON BOLIVAR", "TICLACAYAN", "TINYAHUARCO", "VICCO", "YANACANCHA","QUIULACOCHA", "NINACA", "YANAMATE", "PERENE", "SAN FRANCISCO DE AÍS DE YARUSYACAN", "SAN FRANCISCO DE ASIS DE YARUSYACÁN"
    ],
    "DANIEL ALCIDES CARRION": [
        "YANAHUANCA", "CHACAYAN", "GOYLLARISQUIZGA", "PAUCAR", 
        "SAN PEDRO DE PILLAO", "SANTA ANA DE TUSI", "TAPUC", "VILCABAMBA", "SANTA ANA"
    ],
    "OXAPAMPA": [
        "OXAPAMPA", "CHONTABAMBA", "HUANCABAMBA", "PALCAZU", "POZUZO", 
        "PUERTO BERMUDEZ", "VILLA RICA", "CONSTITUCION"
    ]
}

# 3. Función de extracción con expresiones regulares
def extraer_ubicacion(texto):
    texto = str(texto).upper() if texto is not None else ""
    region = "PASCO"
    provincia_hallada = None
    distrito_hallado = None
    
    for prov, distritos in ubigeo_pasco.items():
        if prov in texto:
            provincia_hallada = prov
            
        for dist in distritos:
            if re.search(r'\b' + dist + r'\b', texto):
                distrito_hallado = dist
                if not provincia_hallada:
                    provincia_hallada = prov
                    
    return {"Distrito": distrito_hallado, "Provincia": provincia_hallada, "Región": region}

# 4. Aplicar la función usando Polars
dtype_ubicacion = pl.Struct([
    pl.Field("Distrito", pl.String),
    pl.Field("Provincia", pl.String),
    pl.Field("Región", pl.String)
])

df = (
    df
    .with_columns(
        pl.col("Nombre de la obra")
        .map_elements(extraer_ubicacion, return_dtype=dtype_ubicacion)
        .alias("ubicacion")
    )
    .unnest("ubicacion")
)

# 5. Guardar el resultado final usando la librería json estándar
archivo_salida = "Obras_Pasco_Procesado.json"

# Convertimos el DataFrame de Polars a una lista de diccionarios nativa de Python
datos_json = df.to_dicts()

# Guardamos el archivo forzando UTF-8 y con indentación para que sea legible
with open(archivo_salida, "w", encoding="utf-8") as f:
    json.dump(datos_json, f, ensure_ascii=False, indent=4)

print(f"¡Proceso finalizado con éxito!")
print(f"Se ha generado el archivo JSON con {df.height} registros.")
print(f"Búscalo en tu carpeta como: {archivo_salida}")