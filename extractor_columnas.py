import pandas as pd

# 1. Configuración de archivos
# Ponemos el CSV original que descargaste
ARCHIVO_ENTRADA = 'obras_infobras.csv' 
ARCHIVO_SALIDA = 'datos_geovisor_pasco_optimizados.xlsx'

# 2. Lista actualizada con los nombres EXACTOS de tu archivo
columnas_necesarias = [
    # Ubicación
    'Departamento', 
    'Provincia', 
    'Distrito', 
    'Dirección o información de referencia',
    
    # Datos Generales
    'Nombre de obra', 
    'Entidad Pública', 
    'Código SNIP', 
    'Estado de ejecución', 
    'Estado del proyecto',
    
    # Presupuesto y Avance
    'Monto Viable/Aprobado', 
    'Monto de ejecución financiera de la obra', 
    'Avance Físico Real Acumulado (%)', 
    'Fecha de inicio de obra', 
    'Plazo de ejecución (en dias)',
    
    # Control y Riesgos
    'N° Denuncias vinculadas', 
    'N° de modificaciones', 
    'Existe Paralización', 
    'Causal de paralización'
]

def principal():
    print("🚀 Iniciando la extracción y filtrado exclusivo para Pasco...")
    
    try:
        # --- CORRECCIÓN CLAVE AQUÍ ---
        # Agregamos sep=';' y forzamos latin1 desde el principio
        df = pd.read_csv(ARCHIVO_ENTRADA, encoding='latin1', sep=';')
        
        # Asegurarnos de que la columna 'Departamento' existe antes de filtrar
        if 'Departamento' in df.columns:
            # Limpiamos el texto para evitar fallos por espacios
            df['Departamento_Limpio'] = df['Departamento'].astype(str).str.strip().str.upper()
            
            # Filtramos solo PASCO
            df_pasco = df[df['Departamento_Limpio'] == 'PASCO'].copy()
            df_pasco = df_pasco.drop(columns=['Departamento_Limpio'])
            
            print(f"📍 Se filtraron {len(df_pasco)} obras de Pasco.")
        else:
            print("❌ Error: Aún no se encuentra la columna 'Departamento'. Revisa el separador.")
            return

        # Verificar columnas
        columnas_disponibles = [col for col in columnas_necesarias if col in df_pasco.columns]
        columnas_faltantes = [col for col in columnas_necesarias if col not in df_pasco.columns]
        
        if columnas_faltantes:
            print("\n⚠️ Advertencia: Las siguientes columnas no se encontraron:")
            for col in columnas_faltantes:
                print(f"  - {col}")
                
        # 3. Crear el nuevo DataFrame
        df_optimizado = df_pasco[columnas_disponibles]
        
        # 4. Exportar a Excel
        print(f"\n💾 Guardando {len(df_optimizado)} registros en Excel...")
        df_optimizado.to_excel(ARCHIVO_SALIDA, index=False, engine='openpyxl')
        
        print(f"✅ ¡Éxito! Tu archivo '{ARCHIVO_SALIDA}' está listo.")
        print("➡️ Siguiente paso: Ahora puedes pasar este archivo al script de geolocalización.")
        
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo '{ARCHIVO_ENTRADA}'.")
    except Exception as e:
        print(f"❌ Ocurrió un error inesperado: {e}")

if __name__ == "__main__":
    principal()