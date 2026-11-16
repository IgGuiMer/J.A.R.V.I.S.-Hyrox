// Plan inicial (se carga la primera vez). A partir de ahí manda el plan guardado en Netlify Blobs.
const SEED_PLAN = {
 "semana_inicio": "2026-11-16",
 "decision": "Plan inicial: semana de tu app (16-22 nov) y semana 1 del plan (23-29 nov).",
 "actualizado": "2026-11-15T20:00:00.000Z",
 "dias": [
  {
   "fecha": "2026-11-16",
   "titulo": "Lunes 16 de noviembre",
   "subtitulo": "Tu app: fuerza + Hyrox strength + erg VO2max",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "Banca y remo con pecho apoyado, sled pull y wall balls pesados, 8-10 x 90″ de erg a R4-R5 y 4 x (1200m remo + 100m farmer)"
    }
   ],
   "nota": "Junto al miércoles y el sábado, el día de más demanda. Pre a las 5:30 y 40 g de carbos de intra en los intervalos. Semáforo a las 5:30.",
   "menu": {
    "comida": "car",
    "cena": "pla",
    "postre": "gal"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-17",
   "titulo": "Martes 17 de noviembre",
   "subtitulo": "Tu app: series 400m R4 + 800m R3",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "5-6 x (400m R4 + 800m R3 seguidos, REST 90″). Anota el tiempo de cada 1200m"
    }
   ],
   "nota": "Pre a las 5:30. Mañana es el miércoles más duro: cena con todos los carbos que marca el menú.",
   "menu": {
    "comida": "bol",
    "cena": "bur",
    "postre": "mag"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-18",
   "titulo": "Miércoles 18 de noviembre",
   "subtitulo": "Tu app: fuerza + compromised running",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "Box squat, búlgaras, push press y banca inclinada; 5 x (500m SkiErg R4, 25m sled push, 20m BBJ, 1000m RP, 40 wall balls)"
    }
   ],
   "nota": "Intra: 40 g de carbos. Es el día de máxima demanda; mañana descanso activo.",
   "menu": {
    "comida": "piz",
    "cena": "pla",
    "postre": "cho"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-19",
   "titulo": "Jueves 19 de noviembre",
   "subtitulo": "Tu app: descanso activo, con tarde de trabajo",
   "tipo": "Baja",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "30-45′ de carrera suave o 45-60′ de bici a R1 + movilidad"
    }
   ],
   "nota": "Comida y cena en tupper, y un snack de fruta y yogur en el bolso. Si cenas más tarde, mantén el mismo reparto y no saltes la comida.",
   "menu": {
    "comida": "car",
    "cena": "pla",
    "postre": "gal"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-20",
   "titulo": "Viernes 20 de noviembre",
   "subtitulo": "Tu app: peso muerto + EMOM de 24′",
   "tipo": "Media",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "Peso muerto 4 x 4 a RIR 2, EMOM de 24′ (thrusters, wall balls, lunges y BBJ) y 30′ de bici fácil"
    }
   ],
   "nota": "Mañana es la simulación completa: cena con carbos y sal, y bebe bien.",
   "menu": {
    "comida": "bol",
    "cena": "pla",
    "postre": "cho"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-21",
   "titulo": "Sábado 21 de noviembre",
   "subtitulo": "Tu app: potencia + Hyrox completa invertida",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "Cleans o snatch con broad jumps y Hyrox completa en orden inverso, 70-80′ a RPE 6-8"
    }
   ],
   "nota": "Pre a las 5:30; 40 g de carbos de intra repartidos en la sim y proteína con carbos al terminar. Cena libre: hamburguesa y Magnum, ya encajados.",
   "menu": {
    "comida": "piz",
    "cena": "bur",
    "postre": "mag"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-22",
   "titulo": "Domingo 22 de noviembre",
   "subtitulo": "Tu app: fartlek 8-10 x (4′ R2 + 1′ R4)",
   "tipo": "Media",
   "bloques": [
    {
     "titulo": "Tu app (resumen)",
     "texto": "10′ a R1, 8-10 bloques de 4′ a R2 + 1′ a R4 sin parar y 5′ a R1"
    }
   ],
   "nota": "Cierra la semana: pésate los 7 días y mándame el feedback esta noche. Mañana empieza mi semana 1.",
   "menu": {
    "comida": "car",
    "cena": "pla",
    "postre": "cho"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-23",
   "titulo": "Lunes 23 de noviembre",
   "subtitulo": "Fuerza upper pesada + potencia Hyrox",
   "tipo": "Media",
   "bloques": [
    {
     "titulo": "A. Strength · pesado",
     "texto": "APROXIMACIÓN\n1x6 Weighted Pull Up (peso corporal)\n2x3 Weighted Pull Up @aproximación\n\n5 ROUNDS:\n3 Weighted Pull Up @RIR 2\nREST 30″\n4 Barbell Push Press @RIR 2\nREST 2′30″"
    },
    {
     "titulo": "B. Potencia Hyrox",
     "texto": "6 ROUNDS:\n15m Sled Push @PO (máxima velocidad)\n8 Wall Ball Shot @130% PO\nREST 90″"
    },
    {
     "titulo": "C. Erg intervals · umbral",
     "texto": "CALENTAMIENTO\n5′ @R1\n\n6 ROUNDS:\n3′ SkiErg @R3 (rondas impares) / RowErg @R3 (rondas pares)\n2′ @R1\n\nScoring: metros de cada intervalo"
    },
    {
     "titulo": "D. Core y agarre",
     "texto": "3 ROUNDS:\n10/10 Pallof Press\n10 Hanging Leg Raise\n45″ Dead Hang\n60m Farmer Carry @120% PO\nREST 60″"
    }
   ],
   "nota": "Pull-up pesado sin kipping: tres reps limpias con el peso más alto del bloque. Push Press: la cadera dispara y los brazos terminan. Sled Push a máxima velocidad; si en la tercera ronda baja el ritmo, añade 30″ de descanso. Anota los pesos.",
   "menu": {
    "comida": "bol",
    "cena": "bur",
    "postre": "gal"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-24",
   "titulo": "Martes 24 de noviembre",
   "subtitulo": "Series de umbral largo + strides",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "A. Running intervals",
     "texto": "CALENTAMIENTO (15′)\n10′ Easy Run @R1\n4x (20″ progresivo hasta R4 + 40″ Easy Run @R1)\n\nTRABAJO PRINCIPAL\n3 ROUNDS:\n2000m Run @R3\nREST 90″ trotando\n\n5′ Easy Run @R1\n\n6x\n150m Run @R5 (rápido y relajado)\n150m caminando\n\nVUELTA A LA CALMA\n10′ Easy Run @R1"
    }
   ],
   "nota": "Seis kilómetros a R3 en tres bloques largos: el umbral se aprende aguantando, no apretando. Sal en 4:21 y no bajes de 4:10; los tres 2000m dentro de ±3″ entre sí. Los strides son técnica y cadencia, no esprint. Si la FC pasa de 170 lpm antes del bloque 3, la sesión acaba ahí. Anota el ritmo medio de cada bloque.",
   "menu": {
    "comida": "piz",
    "cena": "pla",
    "postre": "cho"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-25",
   "titulo": "Miércoles 25 de noviembre",
   "subtitulo": "Sentadilla pesada + Hyrox run-to-station",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "A. Strength",
     "texto": "APROXIMACIÓN\n1x8 Back Squat (barra vacía)\n2x3 Back Squat @aproximación\n\n1. 4 ROUNDS:\n4 Back Squat @RIR 2\nREST 20″\n5 Box Jump (altura cómoda, bajar caminando)\nREST 2′30″\n\n2. 3 ROUNDS:\n8/8 Bulgarian Split Squat @RIR 2\n12/12 Single Leg Bent-Knee Calf Raise (3″ bajando)\nREST 90″"
    },
    {
     "titulo": "B. Hyrox run-to-station",
     "texto": "CALENTAMIENTO\n10′ Easy Run @R1\n\n8 ROUNDS (las 8 estaciones, en orden de carrera):\n500m Run @RP\nESTACIÓN\nREST 60″\n\nRonda 1: 250m SkiErg @R4\nRonda 2: 25m Sled Push @PO\nRonda 3: 25m Sled Pull @PO\nRonda 4: 40m Burpee Broad Jump\nRonda 5: 250m RowErg @R4\nRonda 6: 100m Farmer Carry @PO\nRonda 7: 40m Sandbag Walking Lunges @PO\nRonda 8: 30 Wall Ball Shot @PO\n\nScoring: tiempo total y tiempo de cada 500m"
    },
    {
     "titulo": "C. Finisher · opcional",
     "texto": "8x\n20″ SkiErg máximo\n40″ SkiErg suave"
    }
   ],
   "nota": "Aquí manda la carrera: cada 500m a 4:27 (2:14) aunque llegues cargado de la estación anterior. Si el último 500m es más de 8″ más lento que el primero, es tu fuga y la trabajamos. Back Squat: el peso más alto del mes con 4 reps a RIR 2.",
   "menu": {
    "comida": "car",
    "cena": "bur",
    "postre": "mag"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-26",
   "titulo": "Jueves 26 de noviembre",
   "subtitulo": "Descanso activo aeróbico",
   "tipo": "Baja",
   "bloques": [
    {
     "titulo": "A. Easy run / easy bike",
     "texto": "OPCIÓN A\n35-45′ Easy Run @R1\n\nOPCIÓN B\n45-60′ Easy Bike @R1"
    },
    {
     "titulo": "B. Movilidad y prehab",
     "texto": "2 ROUNDS:\n10/10 Knee-to-Wall\n12 Bent-Knee Calf Raise (3″ bajando)\n10/10 90/90 Hip Switch\n10 Cat Cow\n1′ Deep Squat Hold\n1′ Couch Stretch por lado"
    }
   ],
   "nota": "Opcional. Si notas fatiga en las piernas, elige la bici. Cero esfuerzos: este día resta fatiga.",
   "menu": {
    "comida": "bol",
    "cena": "pla",
    "postre": "cho"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-27",
   "titulo": "Viernes 27 de noviembre",
   "subtitulo": "Peso muerto + fuerza-resistencia Hyrox",
   "tipo": "Media",
   "bloques": [
    {
     "titulo": "A. Strength",
     "texto": "APROXIMACIÓN\n1x8 Barbell Deadlift (barra vacía)\n2x3 Barbell Deadlift @aproximación\n\n5 ROUNDS:\n3 Barbell Deadlift @RIR 2\nREST 20″\n5 Broad Jump (aterriza estable)\nREST 2′30″"
    },
    {
     "titulo": "B. Hyrox fuerza-resistencia",
     "texto": "EMOM 16′ (4 rondas de 4′):\n1. 12 Wall Ball Shot @130% PO\n2. 25m Sandbag Walking Lunges @PO\n3. 15m Sled Push @PO\n4. 20m Burpee Broad Jump"
    },
    {
     "titulo": "C. Accesorios",
     "texto": "3 ROUNDS:\n10/10 Single Arm DB Row @RIR 2\n8 Strict Toes To Bar\nREST 60″"
    },
    {
     "titulo": "D. Easy aerobic",
     "texto": "6 ROUNDS (30′) @R1:\n3′ RowErg\n2′ Easy Bike"
    }
   ],
   "nota": "Peso muerto: 3 reps a RIR 2 (~160-165 kg), cada una desde parada. Si una ronda del EMOM no cabe en su minuto, baja la carga en la siguiente, no el ritmo. Wall balls unbroken.",
   "menu": {
    "comida": "car",
    "cena": "pla",
    "postre": "gal"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-28",
   "titulo": "Sábado 28 de noviembre",
   "subtitulo": "Skills + simulación Hyrox completa",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "A. Skills",
     "texto": "EMOM 10′:\n1. 10-12 Wall Ball Shot @PO\n2. 20m Sandbag Walking Lunges @PO"
    },
    {
     "titulo": "B. Simulación Hyrox completa",
     "texto": "CALENTAMIENTO\n10′ Easy Run @R1\n500m SkiErg progresivo\n\nFOR QUALITY (70-80′) · RPE 6-8:\n1000m Run @R2 alto\n1000m SkiErg @RP\n1000m Run @R2 alto\n50m Sled Push @PO\n1000m Run @R2 alto\n50m Sled Pull @PO\n1000m Run @R2 alto\n80m Burpee Broad Jump\n1000m Run @RP\n1000m RowErg @RP\n1000m Run @RP\n200m Farmer Carry @PO\n1000m Run @RP\n100m Sandbag Walking Lunges @PO\n1000m Run @RP\n100 Wall Ball Shot @PO\n\nScoring: tiempo total y el de cada mitad"
    }
   ],
   "nota": "Hyrox completa en orden de carrera con negative split: primera mitad en R2 alto y segunda a RP (carrera 4:27/km, SkiErg 2:08 y remo 2:00 por 500m). RPE 6 al principio y 8 al final; no es una competición. Transiciones ≤ 20″. Si la segunda mitad no sale más rápida que la primera, saliste fuerte.",
   "menu": {
    "comida": "piz",
    "cena": "bur",
    "postre": "mag"
   },
   "clave": ""
  },
  {
   "fecha": "2026-11-29",
   "titulo": "Domingo 29 de noviembre",
   "subtitulo": "Long run aeróbico con final a ritmo de carrera",
   "tipo": "Alta",
   "bloques": [
    {
     "titulo": "A. Long run",
     "texto": "CALENTAMIENTO\n10′ Easy Run @R1\n\nTRABAJO PRINCIPAL\n45′ Run @R2 (mitad baja)\n15′ Run progresivo de R2 a RP\n\nVUELTA A LA CALMA\n5′ Easy Run @R1"
    }
   ],
   "nota": "Los primeros 45′ en la mitad baja de R2 (4:46 a ~4:36/km, 144-152 lpm); los últimos 15′ suben hasta 4:27 sin perder la técnica. Al menos la mitad en terreno blando. Si el sóleo llega a 3/10, vuelve a R1 y termina. Esta noche, tu feedback de la semana.",
   "menu": {
    "comida": "car",
    "cena": "pla",
    "postre": "gal"
   },
   "clave": ""
  }
 ]
};

export default SEED_PLAN;

// Registros iniciales.
export const SEED_LOGS = {
 "2026-11-15": {
  "peso_kg": 83.5,
  "hrv": 66,
  "notas": "Media de peso semana 9-15 nov. Buenas sensaciones; soleo recuperado."
 }
};
