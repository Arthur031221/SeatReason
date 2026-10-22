[Demo en vivo](https://arthur031221.github.io/SeatReason/) | [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

<img src="assets/logo.svg" width="56" height="56" alt="SeatReason logo">

# SeatReason

Reglas de asientos que explican por qué no pueden cumplirse todas.

Mediana de 18 a 32 ms, y 0,38 s en el peor caso, para hallar un conflicto mínimo que necesita el solucionador SAT. Las vistas previas de reparación de esos mismos casos tardan una mediana de 0,26 a 0,49 s. 51 casos, cinco ejecuciones, método en [Mediciones](#mediciones).

Las peticiones de un docente pueden ser imposibles a la vez, y casi todos los planificadores solo responden "sin solución". SeatReason señala las pocas peticiones que chocan, te deja probar a renunciar a cada una y comprueba todo el conjunto restante antes de que el plan cambie.

![Un conflicto en la clase de ejemplo, un plan reparado con los asientos cambiados marcados con un borde, y luego un movimiento manual que rompe un asiento fijo y se deshace](assets/demo.gif)

Es una aplicación web estática. Los nombres se quedan en el navegador y no se sube nada. Tras la primera visita se abre sin conexión y el navegador puede instalarla como aplicación.

## Antes y después

El ejemplo "Apretados en la primera fila": 24 alumnos, un aula de 5 por 6 con dos pupitres que faltan y 10 peticiones.

|                       | Antes                                               | Después de elegir "Noor se sienta en la primera fila"                |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Resultado             | "Estas 6 peticiones no se pueden cumplir a la vez"  | "El plan puede cumplir todas las peticiones (9 activadas)"           |
| Lo que dice la página | Las 6 peticiones, numeradas y en palabras sencillas | Los asientos que se mueven aparecen marcados con un borde en el aula |
| Asientos cambiados    | Ninguno                                             | 4                                                                    |
| Plan reemplazado      | No                                                  | Solo tras pulsar "Usar este plan y desactivar la petición"           |

## Cómo se hace un plan

1. **Describe la clase.** Pega nombres o una columna CSV, hasta 40 alumnos. Los nombres iguales se distinguen con ids internos. Fija las filas y los asientos por fila y marca los pupitres que faltan. El aula tiene como máximo 48 asientos.
2. **Añade peticiones.** Hay cinco tipos: un asiento fijo, un sitio en las primeras N filas, un sitio en las últimas N filas, dos alumnos que no deben sentarse juntos y dos que sí deben (a izquierda, derecha, delante o detrás). Cada una se puede desactivar sin borrarla.
3. **Lee el veredicto.** Poco después de cada cambio, la comprobación se ejecuta sola en un worker, con un botón para cancelar. Termina como resuelto, imposible o no concluyente. Imposible viene con un conjunto mínimo de peticiones: si desactivas cualquiera de ellas, el resto se puede cumplir. SeatReason solo lo afirma después de probar cada petición del conjunto.
4. **Prueba una reparación.** Cada petición del conflicto cuya retirada deja que el resto se cumpla tiene un botón "Ver este plan". La vista previa planifica de nuevo sin esa petición y conserva los asientos actuales donde puede. Los asientos cambiados llevan un borde. El plan solo se reemplaza cuando pulsas el botón que lo dice.
5. **Ajusta y guarda.** Arrastra alumnos o pulsa dos asientos para intercambiarlos, y fija a un alumno en su asiento actual con un botón. Un movimiento que rompe una petición se muestra con el motivo y se puede deshacer. La clase se guarda en el navegador, se exporta a un archivo `.seatreason.json` y se imprime como plano con un resumen de peticiones.

## Archivos

| Ruta                          | Función                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/core/sat.ts`             | Resolutor SAT guiado por conflictos con suposiciones, presupuesto de conflictos y callback de parada |
| `src/core/encode.ts`          | Convierte las reglas de asientos en cláusulas, con un selector por petición                          |
| `src/core/hall.ts`            | Emparejamiento y violadores de Hall para asientos fijos y primeras filas                             |
| `src/core/analyze.ts`         | Planificación, extracción del conflicto mínimo y vistas previas de reparación                        |
| `src/core/validate.ts`        | Comprobador independiente de planes, usado por la app y las pruebas                                  |
| `src/core/oracle.ts`          | Búsqueda exhaustiva usada solo en las pruebas                                                        |
| `src/core/project.ts`         | Modelo del proyecto, acciones de historial, importación y exportación de archivos                    |
| `src/worker.ts`, `src/hooks/` | Worker, cancelación y límite de tiempo, historial de deshacer                                        |
| `src/ui/`, `src/style.css`    | Interfaz, plano de asientos, hoja de impresión, temas claro y oscuro                                 |
| `src/locales/`                | Nueve archivos de idioma y una prueba de que comparten las mismas claves                             |
| `tests/e2e/`                  | Pruebas de navegador sobre la app compilada                                                          |
| `scripts/`                    | Prueba de rendimiento, grabación de la demo, generador de la tarjeta social                          |
| `docs/`                       | Notas de instalación, uso, configuración y arquitectura                                              |

## Instalación

```sh
git clone https://github.com/Arthur031221/SeatReason && cd SeatReason && npm ci && npm start
```

La página queda entonces en `http://127.0.0.1:4173/`.

<details>
<summary>Linux y macOS</summary>

Instala Node.js 22.12 o posterior y ejecuta el comando de arriba en una terminal.

</details>

<details>
<summary>Windows</summary>

Instala Node.js 22.12 o posterior. En PowerShell, ejecuta estos comandos uno tras otro:

```powershell
git clone https://github.com/Arthur031221/SeatReason
cd SeatReason
npm ci
npm start
```

</details>

<details>
<summary>Cualquier alojamiento estático</summary>

Ejecuta `npm ci && npm run build` y sube la carpeta `dist/`. Todas las rutas son relativas, así que funciona desde una subcarpeta. No hay código de servidor ni peticiones de red después de cargar la página.

</details>

## Uso

La página se abre con el ejemplo "Apretados en la primera fila", así que la lista del conflicto ya está ahí, con una reparación bajo cada petición. Los demás ejemplos están en Clase de ejemplo.

Para usar tu propia clase:

1. Pega la lista y pulsa "Actualizar clase".
2. Fija el tamaño del aula y marca los pupitres que faltan.
3. Añade peticiones. La comprobación se reinicia sola.
4. Pulsa "Ver este plan" bajo una petición en conflicto y, si te sirve, "Usar este plan y desactivar la petición".
5. Pulsa "Imprimir" para el plano y el resumen de peticiones, o "Guardar archivo" para una copia de seguridad.

Los ajustes, los archivos y los límites están en [docs/config.md](docs/config.md). Los detalles de los pasos están en [docs/usage.md](docs/usage.md).

## Mediciones

`npm run bench` ejecuta dos conjuntos de clases aleatorias con semillas fijas y después un caso fijo. Los dos conjuntos están en la tabla.

- **Clases aleatorias.** 40 clases de 40 alumnos en un aula de 6 por 8, cada una con entre 12 y 31 peticiones aleatorias de los tres tipos. Todo caso imposible de este conjunto se halla solo con el emparejamiento, porque los asientos fijos y las filas delanteras aleatorias chocan entre sí mucho antes de que importen las parejas que separar.
- **Parejas que separar.** 80 clases en las que 8 alumnos deben ocupar los 8 asientos delanteros, con entre 14 y 26 parejas aleatorias que separar. Los asientos fijos y las filas delanteras por sí solos siempre se pueden cumplir, así que todo conflicto de este conjunto viene del solucionador SAT.

| Conjunto            | Resultado                                  | Casos | Mediana      | Más lento      |
| ------------------- | ------------------------------------------ | ----- | ------------ | -------------- |
| Clases aleatorias   | Resuelto                                   | 19    | 8 a 16 ms    | 17 a 44 ms     |
| Clases aleatorias   | Imposible, conjunto mínimo encontrado      | 21    | 8 a 22 ms    | 20 a 45 ms     |
| Clases aleatorias   | Vistas previas de reparación de esos casos | 21    | 20 a 43 ms   | 26 a 71 ms     |
| Parejas que separar | Resuelto                                   | 29    | 3 a 5 ms     | 10 a 22 ms     |
| Parejas que separar | Imposible, conjunto mínimo encontrado      | 51    | 18 a 32 ms   | 327 a 382 ms   |
| Parejas que separar | Vistas previas de reparación de esos casos | 51    | 262 a 492 ms | 1234 a 2133 ms |

Cada celda es el rango de cinco ejecuciones de `npm run bench`, en un AMD Ryzen 5 7500F con Node 24.21, un solo hilo, en la línea de comandos y sin navegador. La máquina tenía otros trabajos en marcha, por eso las ejecuciones difieren. Los casos son los mismos cada vez. Son clases aleatorias. Una clase real con muchas parejas que separar puede ser más difícil. La medición permite 20 segundos para planificar y no limita las vistas previas, mientras que la página comparte 8 segundos. El caso más lento aquí tardó 2,1 segundos.

La medición termina con un caso fijo: nueve alumnos que quieren los ocho asientos delanteros. El emparejamiento lo resuelve en 2 a 5 ms.

Las pruebas comparan el resolutor con una búsqueda exhaustiva en aulas pequeñas. También comprueban que todo conflicto indicado es mínimo y que todo plan reparado pasa el comprobador independiente.

## Límites

- Un conjunto de muchas parejas que separar entre sí en un aula estrecha puede ser demasiado difícil para el límite de 8 segundos. La página dice entonces "no concluyente" y no afirma que las reglas sean imposibles. Nueve alumnos que deben estar todos separados en un aula de 4 por 4 es un caso así.
- Separar significa vecinos ortogonales. Los asientos en diagonal están permitidos. Sentar juntos exige el mismo tipo de vecino, así que un asiento en diagonal no cuenta.
- La vista previa de reparación prueba una petición cada vez. No busca la reparación que cambie menos asientos.
- Solo existen cinco tipos de petición. No hay equilibrio de género, ni grupos ni rotación.

## Principios de diseño

- Una comprobación fallida se informa como fallida. Quedarse sin tiempo nunca se informa como imposible.
- Un plan lo comprueba código que no comparte la codificación del resolutor. En las pruebas, cada conflicto se compara con una búsqueda exhaustiva.
- Un plan que el docente ha colocado a mano solo se reemplaza por elección suya. Tras un cambio en la clase o en las peticiones, un plan que incumple alguna se planifica de nuevo, y Deshacer lo recupera.
- Los nombres se quedan en el dispositivo. Las clases de ejemplo son ficticias.

## Desarrollo

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` y `npm run test:e2e` son las comprobaciones que ejecuta CI. Consulta [CONTRIBUTING.md](CONTRIBUTING.md) y [docs/architecture.md](docs/architecture.md).

Licencia MIT.

Assisted by Claude/Codex.
