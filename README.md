# Planificador de reels · Pavoneo 360º

## Abrir la aplicación

Para editar planos y crear rótulos manualmente, abre `index.html` en Chrome o Edge. No necesita conexión, servidor ni instalación. El ejemplo de Pavoneo dura 86 segundos.

Las tarjetas permiten editar, añadir, eliminar y reordenar planos. La duración total se actualiza al instante. El guion y los diseños se guardan en el almacenamiento local del navegador. **Guardar proyecto** descarga un JSON de respaldo; **Abrir proyecto** lo restaura. **Recuperar ejemplo** sustituye el trabajo actual tras confirmación.

## Generar diseños con Claude Opus 5.5

La integración usa la [API de Claude](https://platform.claude.com/docs/en/api/messages/create) y el modelo oficial [`claude-opus-5-5`](https://platform.claude.com/docs/en/models/opus-5-5/overview). Requiere una clave de Anthropic con acceso al modelo y Node.js 22.15 o posterior. No hay paquetes que instalar.

En PowerShell, dentro de esta carpeta:

```powershell
$env:ANTHROPIC_API_KEY = 'tu-clave-api'
node --use-system-ca .\server.mjs
```

Abre **http://127.0.0.1:4173/** en el navegador. En una tarjeta, escribe el texto exacto del rótulo, el plano y la voz; pulsa **Diseñar rótulo** y después **Pedir código animado a Opus 5.5**. La aplicación envía a Opus ese texto, el plano, la voz y los rótulos anterior y siguiente para que interprete el mensaje en su contexto. **Opus escribe el HTML de los elementos visuales, el CSS de la composición y sus animaciones, y el JavaScript que considere útil.** La aplicación inserta el texto exacto, muestra el código resultante y permite copiarlo o descargarlo. El botón **Volver al diseño manual** permite usar el editor anterior.

Cada solicitud también incluye [CREATIVE_DIRECTION.md](CREATIVE_DIRECTION.md): el encargo de estilo editorial, jerarquía tipográfica, metáfora visual ligada al mensaje y movimiento durante toda la duración. Puedes afinar ese archivo para cambiar la dirección artística de futuras generaciones; los rótulos ya generados conservan su código hasta que vuelvas a pedirlos a Opus.

La generación de código usa `output_config.effort: "high"` y un máximo de 24 000 tokens entre razonamiento y respuesta. Mantiene el encargo creativo y reduce el margen de consumo frente a `xhigh`; el coste real depende de los tokens utilizados. La propuesta de diseño manual conserva su ajuste anterior.

`--use-system-ca` usa los certificados de confianza del sistema, necesarios en este equipo para conectar por HTTPS. La clave se lee únicamente desde la variable de entorno del proceso local; no entra en el HTML, el JSON exportado ni el almacenamiento del navegador. El servicio escucha solo en `127.0.0.1`. La vista previa ejecuta el código de Opus en un iframe aislado, sin acceso al origen de la aplicación ni a recursos de red. El HTML descargado incluye una política de contenido que bloquea recursos externos. **Cada clic en el botón envía una solicitud facturable a la API de Anthropic**; el coste depende de las tarifas de tu cuenta y de los tokens utilizados.

Si ya editaste el guion al abrir `index.html` como archivo, usa **Guardar proyecto** ahí y luego **Abrir proyecto** en la versión `http://127.0.0.1:4173/`. El almacenamiento de `file://` y el del servidor local son independientes.

Sin clave API, el editor y los rótulos manuales siguen funcionando. Para editar rótulos manuales abriendo el archivo directamente, conserva `motion-renderer.js` junto a `index.html`. Puedes copiar el fragmento HTML/CSS o descargar un `.html` vertical 9:16. El fondo transparente permite superponerlo sobre vídeo en herramientas compatibles; el rótulo se desvanece al finalizar la duración elegida.

## Demostración pública

El flujo de GitHub Actions en `.github/workflows/pages.yml` publica en GitHub Pages el editor estático y [un ejemplo animado escrito por Opus](rotulo-plano-02-opus.html). Permite editar el guion, diseñar rótulos manuales, guardar proyectos y ver ese ejemplo. El trabajo se guarda en el navegador de cada visitante; no se sincroniza con GitHub.

**GitHub Pages no ejecuta `server.mjs` ni puede guardar `ANTHROPIC_API_KEY` de forma segura.** Por eso el botón de generación nueva con Opus muestra una explicación en la demostración pública. Para probar esa función desde Internet hace falta desplegar el servidor en un servicio con variables de entorno y proteger el acceso antes de poner la clave API, ya que cada solicitud es facturable. El código de producción y la clave nunca deben publicarse juntos.

## Despliegue completo en Coolify

El `Dockerfile` ejecuta el editor y la API en el mismo dominio. Crea una **aplicación nueva** desde el repositorio público `https://github.com/artesbuhooficial-max/pavoneo-motion-graphics`, rama `main`, usando **Dockerfile** y puerto interno **4173**. Asigna un dominio `https://...` que Coolify dirija a ese puerto. No uses GitHub Pages como URL de esta aplicación: seguirá siendo una demostración estática.

En **Environment Variables** de esa aplicación configura, solo para ejecución y no para build:

```text
PAVONEO_PUBLIC_ORIGIN=https://tu-dominio-exacto-sin-barra-final
PAVONEO_AUTH_USER=tu-usuario
PAVONEO_AUTH_PASSWORD=una-contraseña-larga
ANTHROPIC_API_KEY=tu-clave-de-Anthropic
```

`PAVONEO_BIND_HOST=0.0.0.0` y `PAVONEO_PORT=4173` ya están en el Dockerfile. El servidor se niega a escuchar públicamente si no hay URL HTTPS y credenciales; también rechaza cualquier petición sin autenticación. Coolify debe terminar HTTPS antes de reenviar al contenedor. Abre el dominio en una ventana privada: primero debe pedir usuario y contraseña, y después cargar el editor. Comprueba que el botón **Pedir código animado a Opus 5.5** devuelve un rótulo animado y que la vista previa se mueve. No publiques la contraseña ni la clave en GitHub, en el HTML o en una URL.

Para que los próximos commits desplieguen también el servidor, conecta el repositorio mediante la integración de GitHub de Coolify y activa **Auto Deploy**. Un repositorio público añadido solo por URL no crea el webhook automáticamente.

## Referencia visual

La paleta azul noche `#0c3065`, azul vivo `#105bbe`, crema `#f6f8ce`, la combinación de titular sans con acento serif cursivo y el archivo `logo-pavoneo.png` proceden del [dashboard de Pavoneo 360º](https://artesbuhooficial-max.github.io/pavoneo-360/oficina/dashboard-maestro.html). El logotipo se sirve localmente para que el planificador funcione sin conexión.
