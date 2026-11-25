// Sprüche zu Serien über alle Spiele hinweg (js/streaks.js) und winterliche Varianten (js/winter.js).
// {n} = Länge der Serie, {amt} = Betrag in Chips.
export const STREAK = {
  // Kortomi: Die Bank gewinnt gern, und das sagt sie auch.
  kortomi: {
    lose3: [
      'Drei verloren am Stück. Ich nenn das Spenden-Serie.',
      'Dreimal daneben. Meine Törtchen-Kasse sagt danke. Laut.',
      'Drei Pleiten hintereinander. Soll ich dir einen Glücksbringer verkaufen? Kostet extra.',
      'Hattrick! Nur leider in die falsche Richtung.',
    ],
    lose5: [
      '{n} verloren in Folge. Ich hab dir schon einen Stammplatz reserviert.',
      '{n} am Stück! Du bist mein Lieblingsgast. Rate mal, warum.',
      '{n} Niederlagen. Weißt du was? Ich glaub fast an dich. Fast.',
      'Noch eine? Ich kann die Chips gar nicht so schnell zählen, wie du sie verlierst.',
    ],
    lose8: [
      '{n} in Folge. Selbst die Karten haben jetzt Mitleid. Ich nicht.',
      '{n} verloren. Das ist kein Pech mehr, das ist ein Hobby.',
      'Ich lass dir ein Denkmal bauen. Aus deinen Chips. Die eh mir gehören.',
    ],
    win3: [
      'Drei gewonnen am Stück. Hmpf. Zufall.',
      'Drei in Folge? Ich hab ein Auge auf dich. Beide Augen.',
      'Schon wieder? Grrr. Ich misch nächstes Mal mit mehr Liebe. Böser Liebe.',
    ],
    win5: [
      '{n} Siege hintereinander! Okay. Ich bin beeindruckt. Erzähl’s keinem.',
      '{n} am Stück. Zählst du Karten? Ich zähl nämlich meine Tränen.',
      '{n} in Folge! Das geht so nicht weiter. Das geht von meinem Taschengeld ab!',
    ],
    win8: [
      '{n} Siege. Ich ruf gleich die Aufsicht. Ich BIN die Aufsicht. Mist.',
      '{n} in Folge?! Gib mir deine Glückssocken. Sofort.',
    ],
    bigWin: [
      '{amt} auf einen Schlag?! Ich muss mich kurz hinsetzen.',
      'Plus {amt}. Mein Herz. Meine Kasse. Beides kaputt.',
      '{amt} Chips! Na toll, jetzt bist du arrogant. Steht dir aber.',
    ],
    bigLoss: [
      'Minus {amt}. Autsch. Für dich. Für mich: Lecker.',
      '{amt} weg. Ich hab sie gut aufgehoben. In meiner Tasche.',
      'Das waren {amt} Chips. Waren. Schöne Vergangenheitsform.',
    ],
    comeback: [
      'Nach {n} Niederlagen ein Sieg? Ach, das Comeback-Kind. Wie rührend.',
      'Na endlich! Ich dachte schon, du spielst für mich.',
      'Die Pechsträhne ist gerissen. Ich hatte sie so liebgewonnen.',
    ],
  },
  // Choccypuddin: tröstet, statt zu sticheln.
  choc: {
    lose3: [
      'Dreimal verloren. Hey. Das ist nur Pech. Pech schläft auch irgendwann ein.',
      'Drei Mal daneben. Kenn ich. Klausuren. Wird wieder.',
      'Atme durch. Ich mach das auch immer. Dann gähn ich. Hilft.',
    ],
    lose5: [
      '{n} Mal verloren… komm, nimm einen Keks. Unsichtbar, aber gut gemeint.',
      '{n} am Stück. Das tut mir echt leid. Ich misch extra vorsichtig, versprochen.',
      'Weißt du was? Ich hab heute auch alles verpennt. Wir schaffen das zusammen.',
    ],
    lose8: [
      '{n} in Folge… vielleicht kurz Pause? Ich halt deinen Platz warm. Und schlaf drauf.',
      'Hey. Es sind nur Kortomi-Chips. Du bist trotzdem super.',
    ],
    win3: [
      'Drei gewonnen! Cool. Ich freu mich. Wirklich. Man sieht’s nur nicht.',
      'Dreimal hintereinander. Du bist wacher als ich. Ist nicht schwer, aber trotzdem.',
    ],
    win5: [
      '{n} Siege! Wow. Bring mir das bei. Morgen. Nach dem Schlafen.',
      '{n} am Stück. Kortomi wird toben. Ich find’s super.',
    ],
    win8: ['{n} in Folge! Ich bin jetzt offiziell wach. Kurz.'],
    bigWin: [
      '{amt} Chips! Davon könnt ich ein Semester studieren. Gönn dir.',
      'Plus {amt}. Ich klatsch. Ganz leise, damit Kortomi nichts hört.',
    ],
    bigLoss: [
      '{amt} weg. Uff. Komm her, wir schweigen kurz gemeinsam.',
      'Minus {amt}. Das holen wir uns zurück. Also du. Ich guck zu.',
    ],
    comeback: [
      'Gewonnen! Nach {n} Niederlagen. Siehst du? Ich hab’s gewusst. Irgendwie.',
      'Endlich! Ich war die ganze Zeit auf deiner Seite. Nur halt müde.',
    ],
  },
};

// Winterliche Varianten: ersetzen in der Winterzeit ab und zu einen normalen Spruch.
export const WINTER_LINES = {
  kortomi: {
    lobby: [
      'Frohe Wintergruft! Die Chips liegen unterm Baum. Also auf meinem Tisch.',
      'Ho, ho, hol deine Chips raus. Kortomi hat Weihnachtswünsche.',
      'Schau, Mütze! Steht mir, oder? Sag ja. Ja ist die einzige Antwort.',
    ],
    lobbyNight: ['Spät noch wach? Der Weihnachtsmann sieht alles. Ich auch.'],
    idleLobby: [
      'Ich hab Plätzchen gebacken. Nur für mich. Ist doch Fest der Liebe. Selbstliebe.',
      'Schneit’s draußen? Hier drin schneit’s nur Chips. In meine Richtung.',
    ],
    idleBj: [
      'Wenn du verlierst, ist das wie Geschenke verteilen. An mich. Danke!',
      'Mein Wunschzettel ist lang. Du kannst mit deinem Einsatz anfangen.',
    ],
    dailyGift: ['Hier, ein Geschenk. Vom Christkind Kortomi. Einmalig gnädig.'],
    bjWin: ['Grrr. Gewonnen. Na gut, nimm’s als Weihnachtsgeld.'],
    bjLose: ['Danke! Das kommt in meinen Adventskalender. Türchen für Türchen.'],
  },
  choc: {
    lobby: [
      'Frohe Feiertage. Ich hab ’ne Elfenmütze. Die Glocke weckt mich alle zehn Minuten.',
      'Winterschicht. Draußen schneit’s, drinnen gähn ich. Gemütlich eigentlich.',
    ],
    idle: [
      'Ich hab Kakao. Mit Sahne. Ich bin quasi selbst ein Wintergetränk.',
      'Weihnachten heißt: zwei Wochen ausschlafen. Theoretisch.',
    ],
    bjWin: ['Gewonnen! Frohes Fest. Vorgezogen.'],
  },
};
