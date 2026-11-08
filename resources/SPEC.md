# SPEC: Invitación Promoción 2026 — Madrina Prof.ª Rossy Guzmán Reyes

GOAL:    El espectador vive la construcción mágica y progresiva de la invitación de graduación de 5 años, viendo aparecer cada detalle poco a poco (marco, flores, birretes, niños, título dorado, placa de la Madrina Prof.ª Rossy Guzmán Reyes, fiesta, fecha, lugar y hora) con acercamientos cinematográficos hasta culminar en la vista global de la invitación completa.
OUTPUT:  HyperFrames, 1080 x 1920 (9:16 vertical), 30 fps
TIME:    30.0 s x 30 fps = 900 frames
LOOK:    Ground: lienzo de acuarela crema nacarado (#FFFDF9) con nubes suaves en rosa pastel (#FCE4EC) y celeste (#E3F2FD);
         Card: invitación reconstruida en 48 capas independientes dentro de un contenedor de 920 x 1381 px (centrado en left: 80px, top: 270px) con sombra cálida (0 28px 70px rgba(155,115,55,0.24));
         Ink & Paleta: azul marino real (#0F3576 / #0D2E6E), oro metálico tridimensional (#D4AF37 / #FFF0A8), rosa festivo (#D81B60), rosa satén (#F8BBD0), celeste acuarela (#BCE0FD);
         Tipografías fieles al modelo: serif solemne para encabezados ("INVITACIÓN ESPECIAL", "MADRINA DE PROMOCIÓN", "FIESTA DE PROMOCIÓN"), serif 3D biselada en oro para "PROMOCIÓN 2026", y caligrafía cursiva para "Prof.ª Rossy Guzmán Reyes" y dedicatoria final;
OBJECTS: 48 capas individuales extraídas y reconstruidas con precisión sub-píxel sobre el papel acuarela limpio (`bg-paper.png`):
         - Marco perimetral dorado (`svg-gold-rect` + `layer-gold-frame`).
         - Ramilletes florales de acuarela en las 4 esquinas (`flower-tl`, `flower-tr`, `flower-bl`, `flower-br`).
         - Birretes azules laterales con lazos y cintas ondulantes (`cap-ribbon-left`, `cap-ribbon-right`).
         - Niño graduado en traje azul (`child-boy`) y niña graduada en vestido rosa de tul (`child-girl`) + estrellas doradas (`bg-stars-top`).
         - Corona dorada y filigrana divisoria superior (`crown-divider-top`).
         - Encabezado "INVITACIÓN ESPECIAL" (`header-invitacion`) flanqueado por mini birretes (`mini-cap-left`, `mini-cap-right`).
         - Título 3D dorado "PROMOCIÓN 2026" (`title-promocion`).
         - Cinta rosa superior (`ribbon-top-empty`) y lema arqueado `"SIEMPRE UNIDOS, LISTOS PARA BRILLAR"` (`ribbon-top-text`).
         - Líneas de invitación del aula de 5 años A (`intro-line-1`, `intro-line-2`).
         - Placa ornamentada celeste y oro de la Madrina: corona (`madrina-crown`), placa base (`madrina-plaque-empty`), abanicos dorados laterales (`madrina-wing-left`, `madrina-wing-right`), cargo `"MADRINA DE PROMOCIÓN"` (`madrina-role-text`) y firma caligráfica `"Prof.ª Rossy Guzmán Reyes"` (`madrina-name-text`).
         - Sección de celebración: línea introductoria (`fiesta-lead`), título `"FIESTA DE PROMOCIÓN"` (`fiesta-title`), adornos dorados (`fiesta-wing-left`, `fiesta-wing-right`) y subtítulo de culminación (`fiesta-sub-1`, `fiesta-sub-2`).
         - Fila de 3 columnas de datos con divisores dorados (`divider-v1`, `divider-v2`, `divider-v3`, `divider-dots`): Calendario + Día 13 de noviembre del 2026 (`detail-calendar-icon`, `detail-dia-text`), Pin + Lugar Auditorio del mercado (`detail-pin-icon`, `detail-lugar-text`), Reloj + 4:00 p. m. (`detail-clock-icon`, `detail-hora-text`).
         - Cierre emotivo: mensaje de presencia (`emotional-line-1`, `emotional-line-2`), cinta rosa inferior (`ribbon-bottom-empty`, `ribbon-bottom-text`), agradecimiento final (`closing-line-1`, `closing-line-2`) y filigrana de corazón dorado (`bottom-heart`).
MOTION:  Construcción progresiva ("apareciendo poco a poco") guiada por cámara cinematográfica (`#camera-stage`):
         - Movimientos de cámara: `power2.inOut` y `power3.inOut` en el cierre global;
         - Aparición de flores, iconos y coronas: resortes suaves `back.out(1.4)` a `back.out(1.7)`;
         - Despliegue de cintas y firma caligráfica: `clipPath` progresivo acompañado por destello de pluma dorada (`#sparkle-pen`);
         - Barridos de luz especular dorada (`mix-blend-mode: screen`) sobre títulos principales y vista global final;
SHOTS:
         - Shot 1 (0.0s - 3.6s | f0 - f108): Aparece el lienzo de papel acuarela; el borde dorado se dibuja alrededor de la tarjeta, brotan los ramilletes florales superiores y se despliegan los birretes con cintas laterales (zoom suave a scale 1.16, y: 240).
         - Shot 2 (3.6s - 7.8s | f108 - f234): Zoom al sector superior (scale 1.38, y: 470). Aparece primero el niño graduado, luego la niña graduada a su lado, brillan las estrellas de fondo y se extiende la corona divisoria bajo sus pies.
         - Shot 3 (7.8s - 12.2s | f234 - f366): Encuadre de títulos superiores (scale 1.22, y: 170). Aparecen los mini birretes, "INVITACIÓN ESPECIAL", el gran título dorado "PROMOCIÓN 2026" con barrido de luz, se despliega la cinta rosa con su lema y emergen las dos líneas del aula de 5 años A.
         - Shot 4 (12.2s - 17.0s | f366 - f510): Zoom central a la placa de honor (scale 1.28, y: -38). Brota la corona, se abre la placa celeste vacía, se despliegan las alas doradas, aparece "MADRINA DE PROMOCIÓN" y se escribe caligráficamente "Prof.ª Rossy Guzmán Reyes" seguida de una chispa dorada.
         - Shot 5 (17.0s - 20.8s | f510 - f624): Descenso suave a la celebración (scale 1.22, y: -225). Aparece la frase de invitación, estalla con brillo "FIESTA DE PROMOCIÓN" junto a sus hojas doradas y se revelan las líneas de culminación.
         - Shot 6 (20.8s - 25.4s | f624 - f762): Zoom cercano (scale 1.44, y: -475) con paneo horizontal de izquierda a derecha construyendo columna por columna: 1) Icono de calendario + "Día 13 de noviembre del 2026" (x: 185), 2) Pin de ubicación + "Lugar: Auditorio del mercado" (x: -15), 3) Reloj + "4:00 p. m." (x: -205).
         - Shot 7 (25.4s - 30.0s | f762 - f900): Revelado del mensaje emotivo, cinta inferior, agradecimiento, corazón dorado y flores inferiores mientras la cámara realiza un pull-back majestuoso al plano general (scale 1.0, x: 0, y: 0), finalizando con la imagen global de la invitación construida.
BANNED:  Mostrar la invitación ya completa desde el segundo 0; fondos oscuros; tipografías genéricas que alteren el modelo original; recortes de texto en los acercamientos; elementos estáticos sin vida.
QA:
         - Frame 45 (1.5s): Lienzo acuarela con marco dorado dibujándose y flores superiores brotando (centro aún limpio).
         - Frame 180 (6.0s): Primer plano de los niños graduados y corona divisoria recién aparecidos.
         - Frame 330 (11.0s): "PROMOCIÓN 2026", cinta rosa y dedicatoria del aula de 5 años A construidos.
         - Frame 465 (15.5s): Placa de "MADRINA DE PROMOCIÓN Prof.ª Rossy Guzmán Reyes" terminando de escribirse.
         - Frame 585 (19.5s): "FIESTA DE PROMOCIÓN" y subtítulo revelados.
         - Frame 735 (24.5s): Las tres columnas de fecha, lugar y hora completándose con zoom.
         - Frame 870 (29.0s): Vista global 100% completa y nítida de la invitación construida.
