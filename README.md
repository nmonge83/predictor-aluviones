# Riesgo de aluvión estimado

Proyecto aficionado e independiente · precordillera de Santiago.

Probabilidad de aluvión por día y por hora en 15 quebradas, de Colina a Pirque, con nubes del satélite en vivo.

**Proyecto aficionado e independiente, sin carácter oficial.** La información es solo referencial, puede contener errores y no se garantiza su exactitud. Se actualiza sola cada 5 minutos con los pronósticos y el satélite más nuevos, así que el riesgo de mañana y de los días siguientes puede cambiar. **Las alertas oficiales las emite Senapred: sigue siempre sus indicaciones y las de las autoridades.**

## Cómo funciona

Para cada uno de los ~200 escenarios de 6 centros meteorológicos (Open-Meteo), y hora a hora:

1. Lluvia en la cuenca: pronóstico × realce por el cerro × parte de la cuenca bajo la cota de nieve.
2. Chance de que pase una celda de tormenta encima, según la inestabilidad del aire (índice de levantamiento de GFS) y la inhibición convectiva.
3. Minutos más intensos, contando cuánto tiempo pasa la celda sobre la cuenca según su velocidad.
4. Respuesta de la cuenca quemada: modelo M1 del USGS (Staley et al. 2017), que se va cerrando con la vegetación.
5. Barro suelto disponible: cada aluvión se lleva parte y se repone en meses.

Se calibró con los 295 días desde el incendio de diciembre de 2025 en la Quebrada Honda, que tuvo 2 aluviones. Esos dos días quedan en los puestos 1 y 2 de los 295. La tabla de validación está en la página.

## Archivos

- `index.html`: la app completa, en un solo archivo.
- `modelo/cadena.js`: el modelo. `modelo/cuencas.json`: las cuencas. `python3 modelo/armar.py` los copia dentro de `index.html`.
- `modelo/calibrar.js`: la calibración. `modelo/bayes.js`: el promedio de Bayes sobre toda la grilla de calibración, en vez del mejor ajuste. `modelo/base.js`: la tasa base de cada quebrada. `modelo/manana.js`: lo que habría dicho cada mañana.
- `modelo/relieve.py` y `modelo/cuencas.py`: relieve (Terrarium de AWS) y delimitación de cuencas (D8).
- `prueba.js`: prueba (`node prueba.js`).

Datos: Open-Meteo, NASA GIBS (GOES-Este), Esri, OpenStreetMap, Dirección Meteorológica de Chile.
