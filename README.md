# Resultados Lotería MX

Directorio de resultados de lotería de México: Melate, Melate Revancha, Melate Revanchita, Melate Retro, Chispazo, Tris, Gana Gato y sorteos Lotenal.

## Stack

- **Astro 5** (sitio estático, cero JS por defecto)
- Datos oficiales de Lotenal y Pronósticos
- Deploy en Vercel desde este repo

## Estructura (Topical Authority Map)

```
src/
  data/juegos.json        # Object types: juego
  data/resultados.json    # Object types: sorteo, resultado
  lib/data.ts             # Capa de datos + relaciones
  layouts/Base.astro
  pages/
    index.astro                    # Hub: todos los juegos
    [juego]/index.astro            # Hub por juego
    [juego]/sorteo-[n]/index.astro # Página por sorteo
    [juego]/resultados.astro       # Archivo histórico
    [juego]/estadisticas.astro     # Números calientes/fríos
    calendario.astro               # Freshness node
    pronosticos.astro
```

## URLs

- `/melate/` — hub del juego
- `/melate/sorteo-4275/` — sorteo individual
- `/melate/resultados/` — historial
- `/melate/estadisticas/` — estadísticas
- `/calendario/` — próximos sorteos

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

## Licencia

Datos de sorteos: uso informativo. No somos Lotenal ni Pronósticos.
