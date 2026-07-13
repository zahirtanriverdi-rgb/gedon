// Hand-written EN/RU translations for the docx-sourced peak/camp/hiking tours, keyed by tour id.
// LibreTranslate's Azerbaijani model proved unreliable for this content (common tourism words
// like "zirvə"/"şəlalə" produced nonsense output), so these are human translations used instead
// of the machine-translated extra_data.translations normally populated by scheduleTourTranslation.
export type TourTranslationEntry = {
  en: { name: string; description: string };
  ru: { name: string; description: string };
};

const NOTE_EN = '✔️ Important note: We\'re heading into nature — if it doesn\'t bother you to deal with rain, wind or mud, if you don\'t complain about everything, and you\'re a good-natured, fun-loving, genuine outdoors person who won\'t spoil the trip for others, come along! 🌞';
const NOTE_RU = '✔️ Важно: мы отправляемся на природу — если вас не пугают дождь, ветер и грязь, вы не будете жаловаться на всё подряд и вы дружелюбный, весёлый, настоящий любитель активного отдыха, который не испортит поездку другим — присоединяйтесь! 🌞';
const CONTACT_EN = '📲 For registration and more information: +994 70 671 78 04 (WhatsApp)';
const CONTACT_RU = '📲 Для регистрации и дополнительной информации: +994 70 671 78 04 (WhatsApp)';

export const tourTranslations: Record<string, TourTranslationEntry> = {
  'tour-mestdergah': {
    en: {
      name: 'Mastdargah Peak and Griz Waterfall',
      description: `We're taking you to breathtaking mountain scenery — Mastdargah Peak (2743 m)! 🏔️ This hike is ideal for both beginners and experienced hikers.\n\nWe drive towards Quba and reach Griz village by 4x4 mountain vehicles. From there it's about a 3 km climb to the summit. On the way back, enjoy a homestyle tea table in Griz village ☕\n\n🗓 DAY SCHEDULE\n06:30 — Gathering\n07:00–10:00 — Baku → Quba\n10:00–12:00 — Quba → Griz (4x4)\n12:00–14:00 — Griz → Mastdargah peak hike\n14:00–14:30 — Lunch break\n14:30–16:30 — Summit → Griz descent\n16:30–17:30 — Tea break in Griz\n17:30–22:00 — Griz → Quba → Baku\n\n💵 Price: 65 AZN (60 AZN for groups of 3+)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Пик Местдергях и водопад Гриз',
      description: `Мы отправляемся к захватывающим горным пейзажам — на пик Местдергях (2743 м)! 🏔️ Этот поход идеально подходит как для новичков, так и для опытных туристов.\n\nЕдем в сторону Губы и на внедорожниках 4x4 добираемся до села Гриз. Оттуда около 3 км подъёма до вершины. На обратном пути — чаепитие в домашней обстановке в селе Гриз ☕\n\n🗓 ПРОГРАММА ДНЯ\n06:30 — Сбор\n07:00–10:00 — Баку → Губа\n10:00–12:00 — Губа → Гриз (4x4)\n12:00–14:00 — Гриз → восхождение на пик Местдергях\n14:00–14:30 — Обеденный перерыв\n14:30–16:30 — Спуск с вершины в Гриз\n16:30–17:30 — Чаепитие в Гризе\n17:30–22:00 — Гриз → Губа → Баку\n\n💵 Цена: 65 AZN (60 AZN для групп от 3 человек)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-heydar-ataturk': {
    en: {
      name: 'Heydar Aliyev & Atatürk Peaks Expedition',
      description: `One of the most striking peaks of the Gizilgaya massif — we're going on a two-day hike to Heydar Aliyev Peak (3751 m)! 🏔️\n\nWe drive by 4x4 from Khinalig village up to near Ateshgah, then hike ~2.2 km to reach base camp. We spend the night at camp and set off for the summit in the morning (~2.9 km, ~814 m ascent).\n\n🗓 Day 1: Baku → Quba → Khinalig → Ateshgah (4x4) → hike to camp, set up camp, acclimatization\n🗓 Day 2: Early wake-up → summit hike (~6 hours) → descent to camp → Khinalig → Baku\n\n💵 Price: 220 AZN\n👥 Group limit: 18 people\n✍️ Registration requires a scan of your ID card (needed for permits)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Экспедиция на пики Гейдар Алиев и Ататюрк',
      description: `Один из самых впечатляющих пиков массива Гызылгая — отправляемся в двухдневный поход на пик Гейдар Алиев (3751 м)! 🏔️\n\nНа внедорожниках 4x4 едем от села Хыналыг до района Атешгях, затем идём пешком ~2.2 км до базового лагеря. Ночуем в лагере, утром выходим на восхождение (~2.9 км, набор высоты ~814 м).\n\n🗓 День 1: Баку → Губа → Хыналыг → Атешгях (4x4) → пеший переход до лагеря, установка лагеря, акклиматизация\n🗓 День 2: Ранний подъём → восхождение на вершину (~6 часов) → спуск в лагерь → Хыналыг → Баку\n\n💵 Цена: 220 AZN\n👥 Лимит группы: 18 человек\n✍️ Для регистрации требуется скан удостоверения личности (для оформления пропусков)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-sulut': {
    en: {
      name: 'Sulut Peak Hike (Fit Mountain)',
      description: `A unique place, real hiking, scenery and history all in one! Fit Mountain (1810 m), the Girkhotag fortress and Buzkhana adventures await us 🍀 Starting from the ancient village of Sulut in Ismayilli, we'll discover the beauty of nature together.\n\n🚶‍♂️ Hike distance: 12 km (medium difficulty)\n💸 Price: 55 AZN (50 AZN if joining with friends)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Поход на пик Сулут (гора Фит)',
      description: `Особое место, настоящий хайкинг, пейзажи и история в одном походе! Нас ждут гора Фит (1810 м), крепость Гырхотаг и приключения у Бузханы 🍀 Начиная от древнего села Сулут в Исмаиллы, вместе откроем красоту природы.\n\n🚶‍♂️ Дистанция похода: 12 км (средняя сложность)\n💸 Цена: 55 AZN (50 AZN при регистрации с друзьями)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-kepez': {
    en: {
      name: 'One-Day Kapaz Peak + Goygol and Maralgol Lakes',
      description: `We'll greet the sunrise from the summit 😍 A delightful hike awaits with our fun, hand-picked group.\n\n✅ Schedule\n21:00 – Gathering (Genclik)\n21:30 – Departure\n03:30 – Arrive at Togana village, foot of Kapaz\n03:40 – Hike begins\n06:30 – At Kapaz summit\n11:00 – Descend, return by UAZ and Niva jeeps\n14:00 – Head to Goygol\n15:00–16:00 – Time at Goygol lake\n17:00 – Depart for Baku\n23:00 – Arrive in Baku\n\n🌱 Price: 120 AZN per person\nNote: This is a medium-level tour, not suitable for first-timers\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Однодневный пик Капаз + озёра Гёйгёль и Маралгёль',
      description: `Встретим восход солнца на вершине 😍 Тебя ждёт восхитительный поход с нашей весёлой, отобранной группой.\n\n✅ Программа\n21:00 – Сбор (Генджлик)\n21:30 – Выезд\n03:30 – Прибытие в село Тогана, у подножия Капаза\n03:40 – Начало похода\n06:30 – На вершине Капаза\n11:00 – Спуск, возвращение на УАЗах и Нивах\n14:00 – Едем к Гёйгёлю\n15:00–16:00 – Время у озера Гёйгёль\n17:00 – Выезд в Баку\n23:00 – Прибытие в Баку\n\n🌱 Цена: 120 AZN с человека\nПримечание: тур средней сложности, не подходит для новичков\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-bazarduzu': {
    en: {
      name: "Bazarduzu Peak Conquest (Azerbaijan's Highest Point)",
      description: `We're heading to Azerbaijan's highest peak — Bazarduzu (4466 m)! 🏔️ From the summit you can see Shahdag, Tufandag, Gizilgaya, Bazaryurd, and even towards Dagestan.\n\nWe drive by 4x4 from Khinalig village up to Shahyaylag, then hike ~4 km to reach base camp. We camp overnight and set off early for the summit (~6 hours).\n\n🗓 3-day schedule: Baku → Quba → Khinalig → Shahyaylag → camp (Day 1), summit hike (Day 2), breaking camp → Khinalig → Baku (Day 3)\n\n💵 Price: 300 AZN\n👥 Group limit: 14 people\n✍️ Registration requires a scan of your ID card\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Покорение пика Базардюзю (высшая точка Азербайджана)',
      description: `Отправляемся на высочайшую вершину Азербайджана — Базардюзю (4466 м)! 🏔️ С вершины видны Шахдаг, Туфандаг, Гызылгая, Базарюрд и даже в сторону Дагестана.\n\nНа внедорожниках 4x4 едем от села Хыналыг до Шахъяйлага, затем ~4 км пешком до базового лагеря. Ночуем в лагере и рано утром выходим на восхождение (~6 часов).\n\n🗓 Программа на 3 дня: Баку → Губа → Хыналыг → Шахъяйлаг → лагерь (1-й день), восхождение (2-й день), сбор лагеря → Хыналыг → Баку (3-й день)\n\n💵 Цена: 300 AZN\n👥 Лимит группы: 14 человек\n✍️ Для регистрации требуется скан удостоверения личности\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-tufandag': {
    en: {
      name: 'Tufandag Peak Hike (4191 m)',
      description: `We invite you to one of Azerbaijan's most epic mountain adventures! Tufandag — the country's 4th highest peak. From here you can see Bazarduzu, Shahdag, Zafar and Bazaryurd peaks all at once.\n\nWe drive by 4x4 from Khinalig up to Shahyaylag, then hike 6.4 km to camp (near Tufan lake). We camp overnight in tents, then attempt the summit in the morning (3.4 km).\n\n🔥 Difficulty: Hard (4.5–5/5)\n💰 Price: 270 AZN\n⚠️ Maximum 14 people, documents required in advance\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Поход на пик Туфандаг (4191 м)',
      description: `Приглашаем вас в одно из самых эпичных горных приключений Азербайджана! Туфандаг — 4-я по высоте вершина страны. Отсюда одновременно видны пики Базардюзю, Шахдаг, Зафар и Базарюрд.\n\nНа внедорожниках 4x4 едем от Хыналыга до Шахъяйлага, затем 6.4 км пешком до лагеря (у озера Туфан). Ночуем в палатках, утром выходим на штурм вершины (3.4 км).\n\n🔥 Сложность: Тяжёлая (4.5–5/5)\n💰 Цена: 270 AZN\n⚠️ Максимум 14 человек, документы требуются заранее\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-niyaldag': {
    en: {
      name: 'Niyaldag Peak Hike',
      description: `We're heading to Niyal mountain peak (2053 m), full of forest trails, mountain roads and vast views! 🏔️ Early in the morning we reach Lahij village and climb toward the summit through forest and mountain trails. From Niyal plateau, Babadag and surrounding peaks accompany the view.\n\n🗓 DAY SCHEDULE\n06:30 — Gathering\n07:00–11:00 — Baku → Lahij\n11:00–15:00 — Lahij → Niyal peak hike\n15:00–16:00 — Rest & lunch\n16:00–18:00 — Summit → Lahij descent\n18:00–19:00 — Tea break\n19:00–22:30 — Lahij → Baku\n\n⛰️ Distance: 11 km (round trip) | Difficulty: 4/5 (Medium-Hard)\n💵 Price: 55 AZN (50 AZN for groups of 3+)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Поход на пик Нияльдаг',
      description: `Отправляемся на вершину горы Нияль (2053 м), полную лесных троп, горных дорог и широких панорам! 🏔️ Рано утром прибываем в село Лагич и поднимаемся к вершине через лес и горные тропы. С плато Нияль открывается вид на Бабадаг и соседние вершины.\n\n🗓 ПРОГРАММА ДНЯ\n06:30 — Сбор\n07:00–11:00 — Баку → Лагич\n11:00–15:00 — Лагич → восхождение на пик Нияль\n15:00–16:00 — Отдых и обед\n16:00–18:00 — Спуск с вершины в Лагич\n18:00–19:00 — Чаепитие\n19:00–22:30 — Лагич → Баку\n\n⛰️ Дистанция: 11 км (туда-обратно) | Сложность: 4/5 (средне-тяжёлая)\n💵 Цена: 55 AZN (50 AZN для групп от 3 человек)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-mixtoken': {
    en: {
      name: 'Mikhtoken Plateau and Suvar Hike',
      description: `We invite you to one of Azerbaijan's most beautiful highland plateaus — Mikhtoken plateau and the Suvar hike! 🏔️ Starting from Laza village, the hike goes through alpine meadows and mountain trails. At Mikhtoken plateau, views of Gizilgaya and Shahdag come together.\n\n🗓 DAY SCHEDULE\n06:30 — Gathering\n07:00–11:00 — Baku → Laza\n11:00–17:00 — Mikhtoken plateau & Suvar hike\n17:00–18:00 — Tea break at the village house\n18:00–22:00 — Laza → Baku\n\n⛰️ Distance: 9 km | Difficulty: 3/5 (Medium)\n💵 Price: 55 AZN (50 AZN for groups of 3+)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Плато Михтёкен и поход Сувар',
      description: `Приглашаем на одно из красивейших высокогорных плато Азербайджана — плато Михтёкен и поход Сувар! 🏔️ Начиная от села Лаза, маршрут проходит через альпийские луга и горные тропы. С плато Михтёкен открывается вид на Гызылгая и Шахдаг одновременно.\n\n🗓 ПРОГРАММА ДНЯ\n06:30 — Сбор\n07:00–11:00 — Баку → Лаза\n11:00–17:00 — Плато Михтёкен и поход Сувар\n17:00–18:00 — Чаепитие в сельском доме\n18:00–22:00 — Лаза → Баку\n\n⛰️ Дистанция: 9 км | Сложность: 3/5 (средняя)\n💵 Цена: 55 AZN (50 AZN для групп от 3 человек)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-cenub-camp': {
    en: {
      name: 'Mushroom Foraging & Camp Tour (Lankaran, Khanbulan Lake)',
      description: `This time it's not just a tour, it's a real nature adventure! Over 2 days deep in the Hirkan forests, we'll both learn and relax under the stars 😍\n\n🍄 Professional expedition: mushroom foraging and scientific exploration with mycologist Elgun müəllim\n🌲 Hirkan forests: 2 full days in the enchanting nature of Lankaran\n💧 Khanbulan Lake: easy hike along the lakeside\n🔥 Camp: conversations, music by the campfire\n🏠 Choice of accommodation: village house or tent\n\n🗓️ Day 1: Departure from Baku, arrival in Lankaran, settling in, evening movie night by the fire\n🗓️ Day 2: Mushroom expedition at Khanbulan lake, analysis and training, return to Baku\n\n💰 Price: 80 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Сбор грибов и кемпинг-тур (Ленкорань, озеро Ханбулан)',
      description: `На этот раз это не просто тур, а настоящее приключение на природе! За 2 дня в глубине лесов Гиркан будем и учиться, и отдыхать под звёздами 😍\n\n🍄 Профессиональная экспедиция: сбор грибов и научное исследование с микологом Эльгюном муаллимом\n🌲 Леса Гиркан: 2 полных дня в чарующей природе Ленкорани\n💧 Озеро Ханбулан: лёгкий поход вдоль берега озера\n🔥 Лагерь: разговоры у костра, музыка\n🏠 Выбор ночёвки: сельский дом или палатка\n\n🗓️ День 1: Выезд из Баку, прибытие в Ленкорань, размещение, вечером киновечер у костра\n🗓️ День 2: Грибная экспедиция у озера Ханбулан, разбор находок и обучение, возвращение в Баку\n\n💰 Цена: 80 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-hamosam': {
    en: {
      name: 'Hamosham Mountain Camp',
      description: `The most beloved camp, the one whose views sweep us off our feet — Hamosham camp is back! 🤩⛺🔥 Ready for an unforgettable 2-day adventure?\n\n📍 Location: Astara, Hamosham (Digoli) | 📌 Altitude: 1300 m | 👥 Maximum 25 people\n\n🔥 Tour Schedule:\nDay 1: 06:15 Gathering → 12:00 Arrive at Hamosham village → transfer to camp area by mountain vehicle\nDay 2: Breaking camp → return to village by mountain vehicle → departure for Baku\n\n💰 Price: 85 AZN per person\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Горный лагерь Хамошам',
      description: `Самый любимый лагерь, чьи виды покоряют с первого взгляда — лагерь Хамошам снова с нами! 🤩⛺🔥 Готовы к незабываемому 2-дневному приключению?\n\n📍 Место: Астара, Хамошам (Диголи) | 📌 Высота: 1300 м | 👥 Максимум 25 человек\n\n🔥 Программа тура:\n1-й день: 06:15 Сбор → 12:00 Прибытие в село Хамошам → переезд в лагерь на горном транспорте\n2-й день: Сбор лагеря → возвращение в село на горном транспорте → выезд в Баку\n\n💰 Цена: 85 AZN с человека\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qusar-lazy': {
    en: {
      name: 'Qusar Lazy Camp',
      description: `A delightful camp in a forest area on the riverside in Qusar, at the foot of the mountains. This camp for 20 people includes movie night, lighting, and full camp organization.\n\n✅ If you have your own gear and skip the meals: 65 AZN\n✅ If you rent gear and join the meals: 85 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Лагерь Qusar Lazy Camp',
      description: `Прекрасный лагерь в лесной зоне на берегу реки в Кусарах, у подножия гор. Этот лагерь на 20 человек включает киновечер, освещение и полную организацию кемпинга.\n\n✅ Если у вас своё снаряжение и вы не участвуете в питании: 65 AZN\n✅ Если вы арендуете снаряжение и участвуете в питании: 85 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qax-qocyataq-camp': {
    en: {
      name: 'Gakh Camp: Gochyataq Waterfall and Ilisu Baths',
      description: `We can now finally access the Gochyataq and Shahverdi waterfalls, closed off for many years 🌊 Hot spring baths in Ilisu, an open-air movie night, and mountain-road adventures on the Gaz-66 await us.\n\n📌 Saturday: Gathering → depart from Baku → arrive in Ilisu, camp set up → lunch, movie night, conversations by the fire\n📌 Sunday: Wake up → depart for the baths by Gaz-66 → hike to Shahverdi & Gochyataq waterfalls → rest at the baths → return to Baku\n\n💸 Price: 120 AZN (100 AZN for those bringing their own camping gear and food)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Лагерь Гах: водопад Гочятаг и бани Илису',
      description: `Наконец-то можно попасть к водопадам Гочятаг и Шахверди, закрытым долгие годы 🌊 Нас ждут горячие бани в Илису, ночь кино под открытым небом и приключения по горным дорогам на ГАЗ-66.\n\n📌 Суббота: Сбор → выезд из Баку → прибытие в Илису, установка лагеря → обед, вечер кино, разговоры у костра\n📌 Воскресенье: Подъём → выезд к баням на ГАЗ-66 → поход к водопадам Шахверди и Гочятаг → отдых в банях → возвращение в Баку\n\n💸 Цена: 120 AZN (100 AZN для тех, кто берёт своё снаряжение и еду)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-naxcivan-ev': {
    en: {
      name: 'Ancient Land Nakhchivan Tour (With Village-House Overnight)',
      description: `We're going for a lovely weekend in Nakhchivan during its blooming season 🔥 A trip rich with visits to the Salt Cave, Ashabi Kahf shrine, Batabat lake and Alinja fortress.\n\n💰 Price: 319 AZN\n\n❗️Not included: lunch/dinner, other personal expenses\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Тур по древней земле Нахчывана (с ночёвкой в сельском доме)',
      description: `Едем на прекрасные выходные в Нахчыван в период его цветения 🔥 Насыщенная поездка с посещением Соляной пещеры, святыни Ашаби-Кяхф, озера Батабат и крепости Алинджа.\n\n💰 Цена: 319 AZN\n\n❗️Не включено: обед/ужин, прочие личные расходы\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-gedebey': {
    en: {
      name: 'Gadabay Adventure (With Overnight Stay)',
      description: `This time we're going far 🚀 We'll visit Bashkand lake, Korogli fortress, Namard fortress (hike), Mahsara monument, Simens bridge and Hachagaya mountain.\n\n📌 Accommodation: in tents\n\n🗓 Schedule:\nDay 1: 23:30 gathering, 00:00 departure\nDay 2: 06:00 arrival in Gadabay, meal then sightseeing\nDay 3: 23:00 back in Baku\n\n🤑 Price: 160 AZN (150 AZN for those booking by June 30; 150 AZN for those with their own camping gear)\nNote: Meals aren't included in the price, but we'll buy/prepare food together at a fair price\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Приключение в Гадабае (с ночёвкой)',
      description: `На этот раз едем далеко 🚀 Посетим озеро Башканд, крепость Кёроглы, крепость Намерд (поход), памятник Махсара, мост Сименс и гору Хачагая.\n\n📌 Ночёвка: в палатках\n\n🗓 Программа:\n1-й день: 23:30 сбор, 00:00 выезд\n2-й день: 06:00 прибытие в Гадабай, приём пищи и экскурсии\n3-й день: 23:00 возвращение в Баку\n\n🤑 Цена: 160 AZN (150 AZN при бронировании до 30 июня; 150 AZN для тех, у кого своё кемпинговое снаряжение)\nПримечание: питание не включено в цену, но еду купим/приготовим вместе по разумной цене\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-sim-kendi-yurusu': {
    en: {
      name: '🌿 Astara, Sim Village Hike (Dustaghana and Shirhal Waterfalls)',
      description: `In spring, Astara's Sim village takes on a whole new beauty! 💚 A day full of fresh air, roaring waterfalls and magnificent nature views awaits you.\n\nTOUR PLAN:\n🕡 06:30 – Gathering (Genclik, Badamli exit)\n🚌 07:00 – Departure from Baku\n🏡 10:00 – Arrive in the village, drive to the waterfalls by mountain vehicle\n🏞️ 10:30 – Hike to Dustaghana and Shirhal waterfalls\n🍽️ 14:00 – Return to the village house, lunch and tea\n🚙 16:00 – Leave the village\n🚐 17:00 – Depart towards Baku\n🏙️ 22:00 – Arrive in Baku\n\n💸 Price: 55 AZN (per person)\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: '🌿 Астара, поход в село Сым (водопады Дустагана и Ширхал)',
      description: `Весной село Сым в Астаре обретает совершенно новую красоту! 💚 Вас ждёт день, полный свежего воздуха, шумных водопадов и великолепных природных пейзажей.\n\nПЛАН ТУРА:\n🕡 06:30 – Сбор (Генджлик, выезд у Бадамлы)\n🚌 07:00 – Выезд из Баку\n🏡 10:00 – Прибытие в село, едем к водопадам на горном транспорте\n🏞️ 10:30 – Поход к водопадам Дустагана и Ширхал\n🍽️ 14:00 – Возвращение в сельский дом, обед и чай\n🚙 16:00 – Выезжаем из села\n🚐 17:00 – Отправляемся в сторону Баку\n🏙️ 22:00 – Прибытие в Баку\n\n💸 Цена: 55 AZN (с человека)\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-sim-siyov-bendasar': {
    en: {
      name: '🌿 Astara – Sim ➝ Siyov ➝ Bandasar Hiking',
      description: `One day, 3 villages, 17.5 km of hiking! Astara's green forests, citrus orchards and village roads await us 🍊💚\n\n🥾 Long-distance, difficult route – Sim ➝ Siyov ➝ Bandasar\n📏 Distance: 17.5 km\n\n🎒 Included in price: comfortable transport, entry to Hirkan National Park, lunch at the village house, mountain guide\n\n📍Meeting point: 04:45 – Genclik, Ataturk Park\n⏰ Departure from Baku: 05:00\n🏙 Return: 23:00\n\n⚠ Maximum 15 people!\n💸 Price: 65 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: '🌿 Астара – Сым ➝ Сийов ➝ Бендесер, хайкинг',
      description: `Один день, 3 деревни, 17.5 км пешего пути! Нас ждут зелёные леса Астары, цитрусовые сады и деревенские дороги 🍊💚\n\n🥾 Дальний, сложный маршрут – Сым ➝ Сийов ➝ Бендесер\n📏 Дистанция: 17.5 км\n\n🎒 В цену включено: комфортный транспорт, вход в национальный парк Гиркан, обед в сельском доме, горный гид\n\n📍Встреча: 04:45 – Генджлик, парк Ататюрка\n⏰ Выезд из Баку: 05:00\n🏙 Возвращение: 23:00\n\n⚠ Максимум 15 человек!\n💸 Цена: 65 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-si-salalesi': {
    en: {
      name: "🌿 A Magnificent Hike to Astara's Massive Shi Waterfall",
      description: `We advance through the enchanted forests of the Talysh mountains to visit the famous Shi waterfall, 60 meters high. Along the way we'll enjoy the natural scenery of both Digo and Avyarud villages.\n\n📍 Location: Astara, Shi waterfall\n🚶‍♀️ Difficulty: Medium–hard\n⏱️ Distance: 14 km\n\n✅ Schedule:\n06:00 – Gathering\n06:30 – Departure\n11:00 – Arrive at Pelikesh village, Astara\n11:30 – Ascend to Avyarud village by mountain vehicle\n12:30 – Hike to Shi waterfall\n15:00 – Arrive at the waterfall and rest\n16:00 – Return to Pelikesh village, tea at the village house\n19:00 – Depart towards Baku\n23:00 – Arrive in Baku\n\n💰 Price: 55 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: '🌿 Великолепный поход к огромному водопаду Ши в Астаре',
      description: `Мы идём через волшебные леса Талышских гор к знаменитому водопаду Ши высотой 60 метров. По пути насладимся природными пейзажами сёл Дигях и Авьяруд.\n\n📍 Место: Астара, водопад Ши\n🚶‍♀️ Сложность: средне-тяжёлая\n⏱️ Дистанция: 14 км\n\n✅ Программа:\n06:00 – Сбор\n06:30 – Выезд\n11:00 – Прибытие в село Пеликеш, Астара\n11:30 – Подъём в село Авьяруд на горном транспорте\n12:30 – Поход к водопаду Ши\n15:00 – Прибытие к водопаду, отдых\n16:00 – Возвращение в село Пеликеш, чаепитие в сельском доме\n19:00 – Отправление в сторону Баку\n23:00 – Прибытие в Баку\n\n💰 Цена: 55 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-avyarud-salalesi': {
    en: {
      name: 'Astara, Avyarud Waterfall Hike',
      description: `This time we're heading to one of Astara's most beloved routes — Avyarud village and its waterfall! 💧 A day full of spring's first colors, cool air and the calm of mountain roads awaits you.\n\n📍 Route length: 4 km | 📈 Level: Medium\n\n✅ Tour schedule:\n06:30 – Gathering, Genclik Badamli exit\n07:00 – Departure\n11:00 – Arrive at Pelikesh village, Astara\n11:30 – Ascend to Avyarud village by mountain vehicle\n12:30 – Hike to the waterfall\n14:30 – Arrive at the waterfall, rest\n16:00 – Tea at the village house\n19:00 – Depart towards Baku\n23:00 – Arrive in Baku\n\n💰 Price: 50 AZN\n🌱 Limited spots – only 15-18 people\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Астара, поход к водопаду Авьяруд',
      description: `На этот раз отправляемся по одному из самых любимых маршрутов Астары — в село Авьяруд к его водопаду! 💧 Вас ждёт день, полный первых красок весны, прохладного воздуха и спокойствия горных дорог.\n\n📍 Длина маршрута: 4 км | 📈 Уровень: средний\n\n✅ Программа тура:\n06:30 – Сбор, выезд у Генджлик/Бадамлы\n07:00 – Выезд\n11:00 – Прибытие в село Пеликеш, Астара\n11:30 – Подъём в село Авьяруд на горном транспорте\n12:30 – Поход к водопаду\n14:30 – Прибытие к водопаду, отдых\n16:00 – Чаепитие в сельском доме\n19:00 – Отправление в сторону Баку\n23:00 – Прибытие в Баку\n\n💰 Цена: 50 AZN\n🌱 Ограниченное количество мест – всего 15-18 человек\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-lerik-bibiyoni': {
    en: {
      name: 'Lerik, Bibiyoni Waterfalls',
      description: `We're going to the Greater and Lesser Bibiyoni waterfalls – this natural gem, whose name comes from the ancient Talysh language meaning "grandmother's spring," is about 30 meters high and will bring you coolness and comfort.\n\nDifficulty: easy-medium\n\nTour schedule:\n• 06:30 – Meet at Genclik\n• 07:00 – Depart from Baku\n• 11:00 – Arrive in Lerik\n• 11:15 – Hike to Greater Bibiyoni waterfall\n• 14:00 – Lunch (sandwiches) near the waterfall\n• 16:30 – Return to Hamarmesha village\n• 18:30 – Depart towards Baku\n• 22:30 – Arrive in Baku\n\nPrice: 55 AZN\n🌱 Limited spots – only 15-18 people\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Лерик, водопады Бибийони',
      description: `Отправляемся к Большому и Малому водопадам Бибийони – эта природная жемчужина, чьё название с древнего талышского языка означает «бабушкин родник», имеет высоту около 30 метров и подарит вам прохладу и комфорт.\n\nСложность: лёгкая-средняя\n\nПрограмма тура:\n• 06:30 – Встреча в Генджлик\n• 07:00 – Выезд из Баку\n• 11:00 – Прибытие в Лерик\n• 11:15 – Поход к Большому водопаду Бибийони\n• 14:00 – Обед (сэндвичи) у водопада\n• 16:30 – Возвращение в село Хамармеша\n• 18:30 – Отправление в сторону Баку\n• 22:30 – Прибытие в Баку\n\nЦена: 55 AZN\n🌱 Ограниченное количество мест – всего 15-18 человек\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-lerik-qelebin': {
    en: {
      name: 'Lerik, Galabin Waterfall',
      description: `We're going to discover the Galabins 😍 On this trip we'll see the Upper and Lower Galabin waterfalls! 💦\n\n📌 Distance: 6 km | 📌 Difficulty level: Medium\n\n🔻 Tour Plan:\n🕡 06:40 – Gathering (Genclik, Badamli exit)\n🕙 10:00 – Drive to Galabin village by mountain vehicle\n🕚 11:00–16:00 – Hike to Upper and Lower Galabin waterfalls\n🕐 13:00–14:00 – Lunch break\n🕔 17:00 – Return by mountain vehicle\n🕘 21:00 – Arrive back in Baku\n\n💰 Price: 50 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Лерик, водопад Галабин',
      description: `Отправляемся открывать Галабины 😍 В этой поездке увидим Верхний и Нижний водопады Галабин! 💦\n\n📌 Дистанция: 6 км | 📌 Уровень сложности: средний\n\n🔻 План тура:\n🕡 06:40 – Сбор (Генджлик, выезд у Бадамлы)\n🕙 10:00 – Едем в село Галабин на горном транспорте\n🕚 11:00–16:00 – Поход к Верхнему и Нижнему водопадам Галабин\n🕐 13:00–14:00 – Обеденный перерыв\n🕔 17:00 – Возвращение на горном транспорте\n🕘 21:00 – Возвращение в Баку\n\n💰 Цена: 50 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-lerik-tokiexil': {
    en: {
      name: 'Lerik, Tokiakhil Waterfall',
      description: `An easy, cool and delicious hike 🤩 At Lerik's beautiful Tokiakhil waterfall, a forest walk, swimming in cool waters and village delicacies await you: lavangi, tandoor bread and campfire tea! 🍃🔥\n\n📍 Location: Tokiakhil, Lerik | 🚶‍♀️ Length: 6 km | 📈 Difficulty: Easy | ⏳ Duration: 3–4 hours\n\n🎒 Tour Plan:\n06:30 – Meeting point: Genclik, Ataturk Park\n07:00 – Departure from Baku\n11:00 – Arrive at Vizazamin village\n11:30 – Hike to the waterfall\n13:00 – Cool off at the waterfall\n15:30 – Lavangi, tandoor bread and tea\n17:00 – Return to the village\n22:30 – Arrive in Baku\n\n💸 Price: 55 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Лерик, водопад Токиахиль',
      description: `Лёгкий, прохладный и вкусный поход 🤩 У прекрасного водопада Токиахиль в Лерике вас ждут лесная прогулка, купание в прохладной воде и деревенские вкусности: левенги, тандырный хлеб и чай у костра! 🍃🔥\n\n📍 Место: Токиахиль, Лерик | 🚶‍♀️ Протяжённость: 6 км | 📈 Сложность: лёгкая | ⏳ Длительность: 3–4 часа\n\n🎒 План тура:\n06:30 – Встреча: Генджлик, парк Ататюрка\n07:00 – Выезд из Баку\n11:00 – Прибытие в село Визазамин\n11:30 – Поход к водопаду\n13:00 – Купание у водопада\n15:30 – Левенги, тандырный хлеб и чай\n17:00 – Возвращение в село\n22:30 – Прибытие в Баку\n\n💸 Цена: 55 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-dilman': {
    en: {
      name: 'Agsu, Dilman Waterfall',
      description: `Looking for an easy and peaceful tour? Then the Dilman waterfall is exactly for you.\n\n📍 Location: Agsu, Dilman waterfall | ⏳ Route: easy (4 km)\n\n🎯 Tour schedule:\n06:40 – Gathering (Genclik, Badamli)\n09:30 – Arrive at Dilman village\n11:00 – Pass through the village towards the waterfall\n14:00 – Arrive at the waterfall\n17:00 – Return to Dilman village\n20:00 – Arrive in Baku\n\n🎟️ Price: 45 AZN per person\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Агсу, водопад Дильман',
      description: `Ищете лёгкий и спокойный тур? Тогда водопад Дильман — именно для вас.\n\n📍 Место: Агсу, водопад Дильман | ⏳ Маршрут: лёгкий (4 км)\n\n🎯 Программа тура:\n06:40 – Сбор (Генджлик, Бадамлы)\n09:30 – Прибытие в село Дильман\n11:00 – Проходим через село к водопаду\n14:00 – Прибытие к водопаду\n17:00 – Возвращение в село Дильман\n20:00 – Прибытие в Баку\n\n🎟️ Цена: 45 AZN с человека\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-yardimli': {
    en: {
      name: 'Yardimli, Canyon Hike (Mystic Nisagala)',
      description: `"Mystic Nisagala hike" 🌳🪵🌊 — Nisagala village, Yardimli. This medium-difficulty, 10 km hike offers a stunning walk to "Jidir duzu", lunch at the village house, tea by the samovar, and calm around the canyon.\n\nLength: 10 km (round trip) | Duration: 5 hours\n\nOur tour plan:\n06:30 Meeting at Genclik\n07:00 Departure to Yardimli\n10:30 Arrival at Nisagala village\n11:30 Hike to "Jidir duzu"\n13:00 Samovar tea\n14:30 Lunch and samovar tea at the village house\n15:30 Hike to the canyon\n22:30 Arrive in Baku\n\nTour price: 55 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Ярдымлы, поход по каньону (мистический Нисагала)',
      description: `«Мистический поход в Нисагала» 🌳🪵🌊 — село Нисагала, Ярдымлы. Этот 10-километровый поход средней сложности подарит потрясающий вид на «Джидир дюзю», обед в сельском доме, чай у самовара и спокойствие вокруг каньона.\n\nПротяжённость: 10 км (туда-обратно) | Длительность: 5 часов\n\nНаш план тура:\n06:30 Встреча в Генджлик\n07:00 Выезд в Ярдымлы\n10:30 Прибытие в село Нисагала\n11:30 Поход к «Джидир дюзю»\n13:00 Чай у самовара\n14:30 Обед и чай у самовара в сельском доме\n15:30 Поход к каньону\n22:30 Прибытие в Баку\n\nЦена тура: 55 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-embil': {
    en: {
      name: 'Shabran, Embil Lake Forest Hike',
      description: `We're heading to Embil lake, hidden in silence and surrounded by dense forest! An easy hike, calm nature, and beautiful photos make this a great choice.\n\n📍 Location: Embil lake, Shabran | 🚶‍♂️ Difficulty: medium-easy | 📏 Distance: 8 km (round trip)\n\n✨ Tour plan:\n06:40 – Gathering (20 Yanvar metro, in front of Bravo)\n07:00 – Departure from Baku\n10:00 – Arrive at Zeyva village, switch to mountain vehicles\n10:30 – Hike begins\n13:00 – Free time at Embil lake\n17:30 – Head towards Baku\n20:00 – Arrive in Baku\n\n💸 Price: 50 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Шабран, лесной поход к озеру Эмбиль',
      description: `Отправляемся к озеру Эмбиль, скрытому в тишине и окружённому густым лесом! Лёгкий поход, спокойная природа и красивые фото делают этот выбор отличным.\n\n📍 Место: озеро Эмбиль, Шабран | 🚶‍♂️ Сложность: средне-лёгкая | 📏 Дистанция: 8 км (туда-обратно)\n\n✨ План тура:\n06:40 – Сбор (метро 20 Января, у Bravo)\n07:00 – Выезд из Баку\n10:00 – Прибытие в село Зейва, пересадка на горный транспорт\n10:30 – Начало похода\n13:00 – Свободное время у озера Эмбиль\n17:30 – Выезжаем в сторону Баку\n20:00 – Прибытие в Баку\n\n💸 Цена: 50 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-mucu-lahic': {
    en: {
      name: 'Muju–Lahij Mountain Hike',
      description: `Starting from the ancient village of Muju (1140 m), we pass through the heart of the mountains to reach Lahij (1220 m)! Along the way, views of Babadag, Niyaldag and Fit mountain will captivate you 😍\n\n🚶‍♀️ Distance: 10 km | ⏰ Duration: 5 hours | ⬆️ Ascent: 1030 m | ⬇️ Descent: 700 m | ⚡️ Difficulty: Medium–hard\n\nThe route passes through Shahdag National Park's protected forests, mountain streams and highland roads up to 2000 m.\n\n💸 Price: 50 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Горный поход Муджу–Лагич',
      description: `Начиная от древнего села Муджу (1140 м), проходим через сердце гор до Лагича (1220 м)! По пути вас очаруют виды на Бабадаг, Нияльдаг и гору Фит 😍\n\n🚶‍♀️ Дистанция: 10 км | ⏰ Длительность: 5 часов | ⬆️ Набор высоты: 1030 м | ⬇️ Спуск: 700 м | ⚡️ Сложность: средне-тяжёлая\n\nМаршрут проходит через заповедные леса национального парка Шахдаг, горные реки и высокогорные дороги до 2000 м.\n\n💸 Цена: 50 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-xalit-yasil-nerimankend': {
    en: {
      name: 'Khalit Waterfall, Green Lake and Nerimankend Caves',
      description: `Three different natural wonders in one day: Cave ✔️ Waterfall ✔️ Lake ✔️ Early in the morning we visit the Nerimankend (Prophet) caves, then hike from Galaderesi village to Khalit waterfall, followed by tea by the samovar at Green Lake ☕\n\nNote: Times may vary depending on the group's pace.\n\n💰 Price: 50 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Водопад Халыт, Зелёное озеро и пещеры Нериманкенд',
      description: `Три разных природных чуда за один день: Пещера ✔️ Водопад ✔️ Озеро ✔️ Рано утром посещаем пещеры Нериманкенд (Пророка), затем поход из села Галадараси к водопаду Халыт, а после — чай у самовара на Зелёном озере ☕\n\nПримечание: время может меняться в зависимости от темпа группы.\n\n💰 Цена: 50 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-kuzun-laza': {
    en: {
      name: 'Qusar, Kuzun–Laza Hike',
      description: `Our most beloved hike, the one whose scenery captivates everyone — the Kuzun-Laza hike. Starting from Kuzun village, along the way we'll see close to 4 waterfalls, a canyon, mountain streams and green forests.\n\n🚶‍♂️ Distance: 6 km | ⚡ Difficulty: Medium\n\n🕕 Gathering: 06:30 (Genclik metro, in front of Badamli tea house)\n🚌 Departure: 07:00\n🌲 Hike: 10:30–17:30\n🏙 Return to Baku: approximately 22:00\n\n⚡ Price: 60 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Кусары, поход Кузун–Лаза',
      description: `Наш самый любимый поход, чьи пейзажи покоряют всех — поход Кузун-Лаза. Начиная от села Кузун, по пути увидим около 4 водопадов, каньон, горные реки и зелёные леса.\n\n🚶‍♂️ Дистанция: 6 км | ⚡ Сложность: средняя\n\n🕕 Сбор: 06:30 (метро Генджлик, у чайханы Бадамлы)\n🚌 Выезд: 07:00\n🌲 Поход: 10:30–17:30\n🏙 Возвращение в Баку: примерно в 22:00\n\n⚡ Цена: 60 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qaranohur': {
    en: {
      name: 'Ismayilli, Garanohur Lake Hike',
      description: `We're setting off to see Garanohur lake in spring. A day full of a thousand shades of green reflecting on crystal-clear water and cool mountain air awaits you! 🌿💧\n\n📍 Location: Garanohur lake, Ismayilli, Talistan | ⛰️ Difficulty: Medium (may be a bit hard for first-timers) | 🔗 Distance: 12 km (round trip)\n\n🕒 Tour Schedule:\n06:30 – Gathering and departure (Genclik, Ataturk Park)\n09:30 – Arrive at Talistan village, hike begins\n12:30 – Arrive at Garanohur lake, rest by the campfire\n16:30 – Return to the village\n18:00 – Depart for Baku\n21:30 – Arrive in Baku\n\n💳 Price: 45 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Исмаиллы, поход к озеру Гараногур',
      description: `Отправляемся увидеть озеро Гараногур весной. Вас ждёт день, полный тысячи оттенков зелёного, отражающихся в кристально чистой воде, и прохладного горного воздуха! 🌿💧\n\n📍 Место: озеро Гараногур, Исмаиллы, Талистан | ⛰️ Сложность: средняя (может быть немного тяжело для новичков) | 🔗 Дистанция: 12 км (туда-обратно)\n\n🕒 Программа тура:\n06:30 – Сбор и выезд (Генджлик, парк Ататюрка)\n09:30 – Прибытие в село Талистан, начало похода\n12:30 – Прибытие к озеру Гараногур, отдых у костра\n16:30 – Возвращение в село\n18:00 – Выезд в Баку\n21:30 – Прибытие в Баку\n\n💳 Цена: 45 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qalaciq-yurusu': {
    en: {
      name: 'Ismayilli, Galajig Hike',
      description: `We're going to spend spring's arrival and beauty in Galajig forest and waterfall 💦\n\n📍 Location: Ismayilli – Galajig village | 🚶‍♀️ Length: 3.5 km | 🧭 Difficulty: Medium-easy\n\n🔹 Tour plan:\n06:40 – Meeting (Genclik, Ataturk park exit)\n10:00 – Arrive at the village, hike begins\n11:00–14:00 – Rest and lunch in the forest\n14:00–15:00 – Go to the waterfall and back\n16:00 – Departure\n21:00 – Arrive in Baku\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Исмаиллы, поход Галаджиг',
      description: `Едем встретить приход и красоту весны в лесу и у водопада Галаджиг 💦\n\n📍 Место: Исмаиллы – село Галаджиг | 🚶‍♀️ Протяжённость: 3.5 км | 🧭 Сложность: средне-лёгкая\n\n🔹 План тура:\n06:40 – Встреча (Генджлик, выезд из парка Ататюрка)\n10:00 – Прибытие в село, начало похода\n11:00–14:00 – Отдых и обед в лесу\n14:00–15:00 – Идём к водопаду и обратно\n16:00 – Выезд\n21:00 – Прибытие в Баку\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-xanbulan': {
    en: {
      name: 'Hirkan Tour (Khanbulan Lake)',
      description: `Hirkan National Park – Khanbulan lake hike 🌿🏞️ You'll get acquainted with Lankaran's gem — Khanbulan lake! We'll walk through 4 km of the magical Hirkan forests towards the lake. After reaching the lake, we'll explore its surroundings with a scenic 2 km walk.\n\nDistance: 6 km | Difficulty: easy\n\n🕒 Tour Schedule:\n06:30 – Gathering (N. Narimanov metro, in front of McDonald's)\n07:00–10:00 — Baku → Lankaran\n10:00–11:00 — Lankaran → Hirkan National Park\n11:00–14:00 — Hike to Khanbulan lake\n14:00–15:00 — Lunch break\n15:00–17:00 — Walk around the lake\n18:00–21:00 — Lankaran → Baku\n\nPrice: 50 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Тур в Гиркан (озеро Ханбулан)',
      description: `Национальный парк Гиркан – поход к озеру Ханбулан 🌿🏞️ Вы познакомитесь с жемчужиной Ленкорани — озером Ханбулан! Пройдём 4 км по волшебным лесам Гиркана в сторону озера. Дойдя до озера, изучим его окрестности живописной 2-километровой прогулкой.\n\nДистанция: 6 км | Сложность: лёгкая\n\n🕒 Программа тура:\n06:30 – Сбор (метро Н. Нариманова, у McDonald's)\n07:00–10:00 — Баку → Ленкорань\n10:00–11:00 — Ленкорань → Национальный парк Гиркан\n11:00–14:00 — Поход к озеру Ханбулан\n14:00–15:00 — Обеденный перерыв\n15:00–17:00 — Прогулка вокруг озера\n18:00–21:00 — Ленкорань → Баку\n\nЦена: 50 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-eh-yolu-qriz': {
    en: {
      name: 'Eh Road, Griz Hike',
      description: `Not your ordinary hike — an adventure full of historic roads, mountain villages and scenery 😍 We travel the ancient Eh road to Griz village.\n\n📌Distance: 8 km (+4 km Griz bridge) | 📌Difficulty: medium-hard\n\nℹ️ Tour plan:\n06:30 - Gathering\n07:00–11:00 Baku–Quba-Grizdahne village\n11:00–17:00 Grizdahne village – Griz\n17:00–18:00 Lunch and tea break\n18:00–19:00 Descend to Griz bridge by off-road vehicles\n19:00–22:30 Depart for Baku\n\n💵 Price: 60 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Дорога Эх, поход в Гриз',
      description: `Не обычный поход — приключение, полное исторических дорог, горных сёл и пейзажей 😍 Идём по древней дороге Эх к селу Гриз.\n\n📌Дистанция: 8 км (+4 км мост Гриз) | 📌Сложность: средне-тяжёлая\n\nℹ️ План тура:\n06:30 - Сбор\n07:00–11:00 Баку–Губа-село Гриздахне\n11:00–17:00 Село Гриздахне – Гриз\n17:00–18:00 Обед и чайный перерыв\n18:00–19:00 Спуск к мосту Гриз на внедорожниках\n19:00–22:30 Отправляемся в Баку\n\n💵 Цена: 60 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qalaxudat-qriz': {
    en: {
      name: 'Galakhudat–Griz Hiking Trail',
      description: `Adventure-filled mountain roads, magnificent mountain views and the beauty of nature – we're going on the Galakhudat–Griz hiking tour 💪✨\n\n🚶‍♀️ Route: from Galakhudat village to Griz village | 📏 Distance: about 9 km | 📈 Difficulty: Medium–hard\n\n🔹 What we'll see: Galakhudat village, Gur-Gur waterfall (freezes in winter), Griz village and village life, mountain roads\n\n🎒 Tour plan:\n06:30 – Meeting: Genclik, Badamli exit\n07:00 – Departure from Baku\n10:00 – Arrive at Griz bridge\n10:00–11:00 – Ascend to Galakhudat by mountain vehicle\n11:00 – Hike begins\n15:00 – Break at Gur-Gur waterfall\n17:00 – Arrive at Griz village, meal at the village house\n23:00 – Arrive in Baku\n\n💸 Price: 60 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Пеший маршрут Галахудат–Гриз',
      description: `Полные приключений горные дороги, величественные горные виды и красота природы – идём в поход Галахудат–Гриз 💪✨\n\n🚶‍♀️ Маршрут: от села Галахудат до села Гриз | 📏 Дистанция: около 9 км | 📈 Сложность: средне-тяжёлая\n\n🔹 Что увидим: село Галахудат, водопад Гур-Гур (замерзает зимой), село Гриз и деревенский быт, горные дороги\n\n🎒 План тура:\n06:30 – Встреча: Генджлик, выезд у Бадамлы\n07:00 – Выезд из Баку\n10:00 – Прибытие к мосту Гриз\n10:00–11:00 – Подъём в Галахудат на горном транспорте\n11:00 – Начало похода\n15:00 – Привал у водопада Гур-Гур\n17:00 – Прибытие в село Гриз, приём пищи в сельском доме\n23:00 – Прибытие в Баку\n\n💸 Цена: 60 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qebele-soyuqbulaq': {
    en: {
      name: 'Gabala, Soyugbulaq Waterfall',
      description: `Gabala's breathtaking forests and Soyugbulaq waterfall await us this time! 🥾✨ A place few know about — cool, magnificent, a perfect choice for true nature lovers.\n\n🚶‍♀️ Distance: 9 km (round trip) | 📈 Difficulty: medium\n\n✅ Included in price: transport (Baku–Gabala–Baku), national park entry ticket, mountain guide, campfire tea, sandwich\n\n🔗 Tour Plan:\n06:30 – Meeting (Genclik, Badamli exit)\n7:00 – Departure from Baku\n11:00 – Arrive at Vandam village\n11:00–13:00 – Hike to Soyugbulaq waterfall\n17:00 – Depart towards Baku\n22:00 – Arrive in Baku\n\n📍 Limited spots, group of 15-18 people\n💸 Price: 55 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Габала, водопад Союгбулаг',
      description: `На этот раз нас ждут захватывающие леса Габалы и водопад Союгбулаг! 🥾✨ Место, о котором мало кто знает — прохладное, великолепное, отличный выбор для настоящих любителей природы.\n\n🚶‍♀️ Дистанция: 9 км (туда-обратно) | 📈 Сложность: средняя\n\n✅ В цену включено: транспорт (Баку–Габала–Баку), входной билет в нацпарк, горный гид, чай у костра, сэндвич\n\n🔗 План тура:\n06:30 – Встреча (Генджлик, выезд у Бадамлы)\n7:00 – Выезд из Баку\n11:00 – Прибытие в село Вандам\n11:00–13:00 – Поход к водопаду Союгбулаг\n17:00 – Отправляемся в сторону Баку\n22:00 – Прибытие в Баку\n\n📍 Ограниченное количество мест, группа 15-18 человек\n💸 Цена: 55 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-qax-qocyataq-hiking': {
    en: {
      name: 'Gakh, Gochyataq Waterfall Hike',
      description: `The Gakh – Gochyataq waterfall and Ilisu baths hike awaits you. We can now finally access the Gochyataq and Shahverdi waterfalls, closed off for many years 🥾\n\n✨ What awaits you? Hot water bliss in the Ilisu baths 💧, a magnificent hike to Gochyataq and Shahverdi waterfalls, an open-air movie night, mountain-road adventures on the Gaz-66 🚙\n\n📌 Schedule (Saturday):\n23:00 – Gathering\n24:00 – Departure from Baku\n05:00 – Arrive in Ilisu, breakfast\n06:00 – Depart for the baths by mountain vehicle (GAZ-66)\n07:30 – Hike to Shahverdi & Gochyataq waterfalls begins 🥾💧\n15:00 – Return from the waterfall, rest at the baths\n22:30 – Arrive in Baku\n\n💸 Price: 70 AZN\n📍 Limited spots, group of 15-18 people\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Гах, поход к водопаду Гочятаг',
      description: `Вас ждёт поход Гах – водопад Гочятаг и бани Илису. Наконец-то можно попасть к водопадам Гочятаг и Шахверди, закрытым долгие годы 🥾\n\n✨ Что вас ждёт? Блаженство горячей воды в банях Илису 💧, великолепный поход к водопадам Гочятаг и Шахверди, вечер кино под открытым небом, приключения по горным дорогам на ГАЗ-66 🚙\n\n📌 Программа (суббота):\n23:00 – Сбор\n24:00 – Выезд из Баку\n05:00 – Прибытие в Илису, завтрак\n06:00 – Выезд к баням на горном транспорте (ГАЗ-66)\n07:30 – Начало похода к водопадам Шахверди и Гочятаг 🥾💧\n15:00 – Возвращение от водопада, отдых в банях\n22:30 – Прибытие в Баку\n\n💸 Цена: 70 AZN\n📍 Ограниченное количество мест, группа 15-18 человек\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-seki-xan-yaylagi': {
    en: {
      name: 'Sheki, Khan Yaylagi Hike',
      description: `We're taking you on a route that breathes history — Sheki's Khan Yaylagi (Khan's Plateau)! ✨ This plateau, where Sheki's khans once rested with their families in the 18th–19th centuries, still preserves its magic today with mountain air and calm nature.\n\nOn this hike you'll feel history, nature, and a break from city life all at once 💫\n\n📍 Location: Sheki city – Khan Yaylagi | 📈 Level: Medium | ⛺️ Group limit: 18 people\n\n✅ Tour schedule:\nDay 1: Depart from Baku, Sheki sightseeing (Khan's Palace, Khan's mosque, family cemetery, Upper Caravanserai), overnight at a hostel\nDay 2: Hike start, hike finish, return to Baku\n\n💰 Price: 70 AZN\nNote: museum/palace entry and meals are not included in the price\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Шеки, поход на плато Хан-Яйлаг',
      description: `Мы приглашаем вас на маршрут, дышащий историей — плато Хан-Яйлаг в Шеки! ✨ На этом плато, где ханы Шеки некогда отдыхали с семьёй в XVIII–XIX веках, до сих пор сохраняется своя магия — горный воздух и спокойная природа.\n\nВ этом походе вы ощутите одновременно историю, природу и отдых от городской суеты 💫\n\n📍 Место: город Шеки – плато Хан-Яйлаг | 📈 Уровень: средний | ⛺️ Лимит группы: 18 человек\n\n✅ Программа тура:\n1-й день: выезд из Баку, экскурсия по Шеки (Ханский дворец, Ханская мечеть, семейное кладбище, Верхний караван-сарай), ночёвка в хостеле\n2-й день: начало похода, окончание похода, возвращение в Баку\n\n💰 Цена: 70 AZN\nПримечание: вход в музеи/дворец и питание не включены в цену\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-gobelek-turu': {
    en: {
      name: 'Mushroom Foraging Tour (Lankaran, Khanbulan Lake)',
      description: `We have a very interesting and unique mushroom foraging tour this time 😍\n\n✨ What awaits you?\n🍄 Mushroom expedition with professional mycologist Elgun müəllim\n🌲 Lankaran's enchanting Hirkan forests\n💧 Easy hike to Khanbulan lake\n🔥 Tea and picnic by the lake\n🎓 Introduction to mushroom species (edible vs poisonous)\n\n📍 Difficulty: Easy | 6 km hike | 📍 Group limit: 22 people\n\n💰 Price: 60 AZN\n⚡️Group registrations get a 10% discount\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Тур по сбору грибов (Ленкорань, озеро Ханбулан)',
      description: `На этот раз у нас очень интересный и особенный тур по сбору грибов 😍\n\n✨ Что вас ждёт?\n🍄 Грибная экспедиция с профессиональным микологом Эльгюном муаллимом\n🌲 Чарующие леса Гиркан в Ленкорани\n💧 Лёгкий поход к озеру Ханбулан\n🔥 Чай и пикник у озера\n🎓 Знакомство с видами грибов (съедобные и ядовитые)\n\n📍 Сложность: лёгкая | 6 км похода | 📍 Лимит группы: 22 человека\n\n💰 Цена: 60 AZN\n⚡️При групповой регистрации скидка 10%\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-beybeyim-dagi': {
    en: {
      name: 'Khizi, Beybeyim Mountain and Colorful Mountains',
      description: `We're going to see Beybeyim mountain and Khizi's Colorful Mountains 🏔 Beybeyim mountain is the highest point of the Varafta range (935 m). From the summit, a panorama opens onto Beshbarmag mountain, the Caspian Sea and Khizi district center.\n\n⏳ Duration: 6 hours | 📊 Difficulty: Medium–Easy | 🚶 Route: 10 km (round trip)\n\n🗓 Schedule:\n06:40 – Gathering (Genclik metro, Badamli exit)\n07:00–09:30 – Baku → Zarat village\n10:00–14:00 – Summit hike to Beybeyim mountain\n16:00–18:00 – Descent from the summit\n18:00–20:00 – Zarat village → Baku\n\n💰 Price: 45 AZN\n\n${NOTE_EN}\n\n${CONTACT_EN}`
    },
    ru: {
      name: 'Хызы, гора Бейбеим и разноцветные горы',
      description: `Едем увидеть гору Бейбеим и разноцветные горы Хызы 🏔 Гора Бейбеим — высшая точка хребта Варафта (935 м). С вершины открывается панорама на гору Бешбармаг, Каспийское море и центр Хызынского района.\n\n⏳ Длительность: 6 часов | 📊 Сложность: средне-лёгкая | 🚶 Маршрут: 10 км (туда-обратно)\n\n🗓 Программа:\n06:40 – Сбор (метро Генджлик, выезд у Бадамлы)\n07:00–09:30 – Баку → село Зарат\n10:00–14:00 – Восхождение на гору Бейбеим\n16:00–18:00 – Спуск с вершины\n18:00–20:00 – Село Зарат → Баку\n\n💰 Цена: 45 AZN\n\n${NOTE_RU}\n\n${CONTACT_RU}`
    }
  },
  'tour-kapadokya-sehr': {
    en: {
      name: '🎈 Cappadocia Magical Autumn Tour',
      description: 'Discover the one-of-a-kind valleys of Cappadocia, watch colorful hot-air balloons decorate the sky at sunrise, and spend unforgettable nights in a cave hotel! 🌅✨'
    },
    ru: {
      name: '🎈 Волшебный осенний тур в Каппадокию',
      description: 'Откройте для себя неповторимые долины Каппадокии, встречайте рассвет под разноцветными воздушными шарами и проведите незабываемые ночи в пещерном отеле! 🌅✨'
    }
  },
  'tour-roma-toskana': {
    en: {
      name: '🇮🇹 Rome and Tuscany Dreams',
      description: 'An unforgettable 5-day autumn journey to Rome, Florence and the unique valleys of Tuscany — the cradle of Italian culture. Rich with the ancient Colosseum, the Trevi Fountain and a stroll through Tuscany\'s famous vineyards. Direct Baku–Rome round-trip flights and a 4-star boutique hotel are included in the price!'
    },
    ru: {
      name: '🇮🇹 Мечты о Риме и Тоскане',
      description: 'Незабываемое 5-дневное осеннее путешествие в Рим, Флоренцию и уникальные долины Тосканы — колыбель итальянской культуры. Вас ждут древний Колизей, фонтан Треви и прогулка по знаменитым виноградникам Тосканы. Прямые авиабилеты Баку–Рим туда-обратно и 4-звёздочный бутик-отель включены в стоимость!'
    }
  },
  'tour-active-volleyball': {
    en: {
      name: 'Premium Volleyball Tournament at Heydar Aliyev Pro Arena 🏐',
      description: 'An amateur volleyball tournament held in a professional indoor arena. Register individually or with your own ready-made team and compete for the win. Referees, sports kits, and a cup with prizes for the winners are included.'
    },
    ru: {
      name: 'Премиум волейбольный турнир в Pro Arena имени Гейдара Алиева 🏐',
      description: 'Любительский волейбольный турнир на профессиональной крытой арене. Регистрируйтесь индивидуально или со своей готовой командой и боритесь за победу. Судьи, спортивная форма, а также кубок и призы для победителей включены.'
    }
  },
  'tour-active-rafting': {
    en: {
      name: 'Wild Rafting and Camping Adventure on the Kura River 🌊🚣‍♀️',
      description: 'An adrenaline-packed rafting experience on the wild waters of the Kura, with river crossings at Gabala and Shamkir. First-timers get a detailed briefing, and a professional instructor is assigned to every boat.'
    },
    ru: {
      name: 'Бурный рафтинг и кемпинг-приключение на реке Кура 🌊🚣‍♀️',
      description: 'Рафтинг, полный адреналина, по бурным водам Куры с речными переходами в Габале и Шамкире. Для новичков проводится подробный инструктаж, а к каждой лодке прикрепляется профессиональный инструктор.'
    }
  }
};
