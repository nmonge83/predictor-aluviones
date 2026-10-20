# Aluviones después de un incendio: qué dice la literatura y cómo se compara esta estimación

20 de octubre de 2026. Revisión hecha para contrastar la estimación de riesgo con lo publicado.

## 1. Lo que dice la literatura

**Qué los gatilla.** En un cerro quemado, el aluvión lo gatilla un chaparrón muy intenso de pocos minutos (15 a 60 min), no la lluvia acumulada. El suelo quemado repele el agua, el agua corre por la superficie y arrastra el material suelto: son flujos «generados por escorrentía» ([Kean y otros 2011](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2011JF002005); [Staley y otros 2013](https://www.researchgate.net/publication/257497100_Objective_definition_of_rainfall_intensity-duration_thresholds_for_the_initiation_of_post-fire_debris_flows_in_southern_California)). Promediar la lluvia en 15 a 60 min predice mejor que en duraciones más largas (Staley 2013).

**Umbrales medidos (sur de California, primer año).** La lluvia de 15 minutos que gatilla flujos va de 15 a 30 mm/h en los montes San Gabriel y de 40 a 56 mm/h en los Santa Ynez (Kean 2011). Staley 2013 da el rango I = 7,2 a 12,5 · D^−0,4 (I en mm/h, D en horas), o sea 12 a 22 mm/h para 15 minutos.

**Qué tormentas lo producen.** Ríos atmosféricos con bandas angostas de lluvia muy intensa a lo largo del frente frío, y convección dentro de sistemas frontales ([Oakley y otros 2017](https://ninaoakley.com/publications/)). El aluvión de Montecito (California, 9-ene-2018, 23 muertos) lo gatilló una de esas bandas, con 157 mm/h en 5 minutos ([Oakley y otros 2018](https://nhess.copernicus.org/articles/18/3037/2018/)).

**El cerro se recupera.** El umbral sube con los años, porque vuelve la vegetación, el suelo absorbe más y el cauce se queda sin material fino. En el incendio Fish (California), el umbral de 15 minutos pasaría de 15-30 mm/h el primer año a más de 60 mm/h el tercero, y el volumen de los flujos cae a menos de un tercio después de un año ([Hoch y otros 2021](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2021JF006374); [McGuire y otros 2021](https://cw3e.ucsd.edu/wp-content/uploads/2021/04/McGuireetal2021_EEG.pdf)). Ajustar el umbral por recuperación reduce las falsas alarmas en los años 2 y 3 ([USGS](https://www.usgs.gov/publications/characterizing-changes-postfire-debris-flow-hazard-burned-areas-recover)). La rapidez cambia de un lugar a otro.

**El barro se agota.** Los primeros flujos y crecidas vacían el cauce, y eso puede limitar los siguientes (Hoch 2021).

**La cota de nieve importa.** En el aluvión de la Quebrada de Macul (1993), la isoterma 0 °C subió a 3.000-4.000 m, y eso más que duplicó el área donde cayó lluvia y no nieve ([CIGIDEN](https://www.santiagoresiliente.cl/wp-content/uploads/2017/05/Informe_Final_CIGIDEN.pdf)).

**Chile después de incendios.** Para Viña del Mar después del incendio de 2024, el CIGIDEN estimó de forma preliminar que 20 mm en 3 horas bastan para activar procesos en las laderas quemadas ([CIGIDEN](https://www.cigiden.cl/informe-de-danos-fase-de-rehabilitacion-y-reconstruccion-incendios-02-y-03-de-febrero-de-2024-vina-del-mar-region-de-valparaiso/)). No encontré un umbral calibrado y revisado por pares para la precordillera de Santiago.

**Cómo se avisa en EE.UU.** El USGS calcula los umbrales de cada incendio y el Servicio Meteorológico los compara con la lluvia del radar. Los avisos de vigilancia salen con 12 a 24 h de anticipación; las alertas, con minutos a 45 min ([ficha del USGS sobre el sistema NOAA-USGS](https://pubs.usgs.gov/fs/2005/3104/pdf/FS-2005-3104.pdf); [artículo del sistema](https://www.researchgate.net/publication/234358962_NOAAUSGS_Demonstration_Flash-Flood_and_Debris-Flow_Early-Warning_System); [Congreso de EE.UU.](https://www.congress.gov/crs-product/R47618)).

**Rayos.** Se usan para anticipar chaparrones y crecidas repentinas en tormentas convectivas (proyecto europeo [FLASH](https://cordis.europa.eu/project/id/36852)). Su ausencia no descarta un chaparrón: las bandas de los frentes fríos pueden ser muy intensas.

## 2. Cómo se compara la estimación

**Usa el mismo modelo del USGS** (M1 de Staley 2017), con la fracción quemada y empinada de cada cuenca. Su umbral (50 % de probabilidad con la lluvia de 15 min) para la Quebrada Honda:

| Días desde el incendio | Umbral de 15 min |
|---|---|
| 30 (31-ene, 1.er aluvión) | ~27 mm/h |
| 295 (hoy) | ~34 mm/h |
| 365 | ~36 mm/h |
| 730 | ~46 mm/h |

Queda dentro del rango medido en California (15 a 56 mm/h).

**En qué se aparta:**

1. **No tiene radar ni pluviómetro en la cuenca.** Usa pronósticos, satélite y rayos. En EE.UU. la alerta se basa en la lluvia medida por radar: es lo que más falta.
2. **La recuperación es más lenta que en California.** El umbral sube ~33 % en un año, contra ~100 % en el incendio Fish.
3. **Las bandas de los frentes fríos no se modelan aparte, y la calibración rebaja la lluvia frontal.** Con lluvia frontal el modelo usa un 15 % de la hora en los 15 min más intensos. Una lluvia perfectamente pareja ya daría el 25 %, así que el 15 % no es físico: es lo que mejor explica los 295 días con la lluvia que dan los pronósticos (la calibración lo dejó en el borde inferior de lo que probó). Además, los modelos globales suavizan esas bandas. Las dos cosas empujan para el mismo lado: puede quedarse corto en un evento tipo Montecito.
4. **Se calibró con 2 aluviones.** Por eso se usa Bayes y los rangos son anchos.

**Prueba contra los 295 días** (cambiando un supuesto a la vez, el resto fijo; log-verosimilitud más alta es mejor; actual −4,38):

| Supuesto | Log-ver. | Aluviones esperados (hubo 2) |
|---|---|---|
| Recuperación en 180 días | −4,21 | 1,5 |
| Recuperación en 365 días | −4,26 | 2,0 |
| **Actual: 730 días** | **−4,38** | **2,3** |
| 1.095 días | −4,45 | 2,4 |
| Sin recuperación | −4,65 | 2,8 |
| El aluvión se lleva 70 % del barro | −4,19 | 2,1 |
| El barro se repone en 365 días | −4,21 | 1,8 |

Los datos de la quebrada apuntan, igual que la literatura, a una recuperación más rápida y a un barro que se repone más lento. Las diferencias son chicas porque hay solo 2 aluviones.

## 3. Qué cambiar

1. **Hecho (20-oct):** la calibración y Bayes prueban recuperación de 180, 365 y 730 días y reposición del barro de 90, 365 y 730 días. Solos, los 295 días empujan a los bordes (no alcanzan para fijarlas), así que el modelo usa 365 y 365 (lo que sugiere la literatura, sin bordes: log-ver. −3,95 frente a −4,38 antes) y Bayes parte de la literatura (365 como lo más probable) y la corrige con los datos.
2. **Decir en la página que una banda de frente frío puede ser peligrosa sin rayos.** La regla de los rayos confirma una tormenta, pero no la descarta.
3. **El mejor dato posible: un pluviómetro con registro cada 5 minutos dentro de la cuenca**, o el radar de la DMC si publica datos.
