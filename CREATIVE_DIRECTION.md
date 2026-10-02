# Dirección creativa para Opus 5.5

La referencia del usuario es un motion design editorial de alto nivel: composición limpia, tipografía como protagonista, contraste fuerte, un gesto visual que conduce la secuencia y movimiento con intención. El objetivo es alcanzar esa calidad de criterio y acabado con una idea original para Pavoneo 360º; no reproducir literalmente una escena ajena.

## Criterios visuales

- Empieza por una sola metáfora visual vinculada a las palabras y al plano. Desarróllala de principio a fin: una forma debe transformarse o conducir a la siguiente, no aparecer como adorno aislado.
- Diseña con jerarquía editorial: un titular claramente legible, espacio negativo generoso, composición asimétrica cuando aporta tensión, y uno o dos acentos de color. Evita llenar el lienzo de iconos pequeños, brillos, partículas, órbitas o tarjetas genéricas.
- La referencia combina fondos claros, negro intenso y un acento verde. Adapta ese rigor a Pavoneo: azul noche `#0c3065`, azul vivo `#105bbe`, crema `#f6f8ce`, blanco y menta. Puedes usar un fondo claro o oscuro; escoge el que dé mayor contraste. Evita transparencia si el resultado depende de un vídeo de fondo que aquí no existe.
- El texto exacto del rótulo debe dominar la imagen. En la vista previa de 220 × 390 px, debe leerse sin esfuerzo y caber completo. En 1080 × 1920 px debe mantener el mismo equilibrio. No partas una palabra larga ni la recortes.
- Usa líneas, máscaras, trazos SVG, transformaciones tipográficas, cambios de escala y profundidad sutil cuando tengan función narrativa. Prefiere 2 o 3 gestos precisos a muchos efectos simultáneos.

## Ritmo y acabado

- Estructura la duración en tres momentos: preparación breve, revelación memorable y cierre limpio. El movimiento debe ser visible durante la pieza, no limitarse a una entrada de un segundo.
- Usa curvas de aceleración deliberadas, desfases y pausas legibles. Coordina la gráfica con la lectura del texto; deja tiempo para comprenderlo.
- Mantén 60 fps potenciales: anima principalmente `transform`, `opacity`, `clip-path` o SVG cuando haga falta. Evita cambios costosos de layout por fotograma.
- Termina en una composición clara que pueda enlazar con el siguiente plano. En la vista previa, el bucle vuelve al inicio; el archivo exportado conserva la duración indicada.
- Antes de entregar, comprueba mentalmente tres fotogramas: inicio, momento central y cierre. El rótulo debe tener buena composición en los tres.

## Implementación

- Opus escribe el HTML, CSS y JavaScript creativos. La aplicación solo inserta el texto exacto y ejecuta el resultado en un iframe aislado.
- Incluye exactamente un `#opus-stage` de tamaño completo y un único `<div id="exact-caption"></div>` vacío en el lugar elegido. Nunca escribas el texto del rótulo en el HTML ni generes palabras adicionales visibles.
- El código debe ser autocontenido, responsive, reproducible y sin recursos externos.
