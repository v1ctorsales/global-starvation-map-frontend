// ==============================
// 🌍 CountriesDictionary.js
// Nome comum ↔ backend ↔ GeoJSON
// ==============================

// 🔹 Backend (datasets) usa nomes oficiais (ex: "United States", "Russian Federation")
// 🔹 GeoJSON (world-atlas) usa nomes longos (ex: "United States of America")

export const COMMON_TO_BACKEND = {
  // === ÁSIA ===
  China: "China",
  "People's Republic of China": "China",

  "South Korea": "Korea, Rep.",
  "Republic of Korea": "Korea, Rep.",

  "North Korea": "Korea, Dem. People's Rep.",
  "Democratic People's Republic of Korea": "Korea, Dem. People's Rep.",
  "Dem. Rep. Korea": "Korea, Dem. People's Rep.",
  "Korea, Dem. People's Rep.": "Korea, Dem. People's Rep.",

  Iran: "Iran, Islamic Rep.",
  Vietnam: "Viet Nam",
  Syria: "Syrian Arab Republic",
  Laos: "Lao PDR",
  Kyrgyzstan: "Kyrgyz Republic",
  Turkey: "Turkiye",
  Yemen: "Yemen, Rep.",

  // === ÁFRICA ===
  Egypt: "Egypt, Arab Rep.",
  "Central African Rep.": "Central African Republic",
  "Dem. Rep. Congo": "Congo, Dem. Rep.",
  Congo: "Congo, Rep.",
  "Côte d'Ivoire": "Cote d'Ivoire",
  Gambia: "Gambia, The",
  eSwatini: "Eswatini",
  "S. Sudan": "South Sudan",
  Somaliland: "Somalia",
  "Solomon Is.": "Solomon Islands",

  // === EUROPA ===
  Russia: "Russian Federation",
  Slovakia: "Slovak Republic",
  Macedonia: "North Macedonia",
  "The Republic of North Macedonia": "North Macedonia",
  "Bosnia and Herz.": "Bosnia and Herzegovina",

  // === AMÉRICAS ===
  "United States": "United States",
  "United States of America": "United States", // 👈 faz ambos funcionarem
  USA: "United States",
  US: "United States",

  "Dominican Rep.": "Dominican Republic",
  Venezuela: "Venezuela, RB",
};

// 🔹 GeoJSON (world-atlas) — usado para desenhar o mapa
export const COMMON_TO_GEOJSON = {
  China: "China",
  Russia: "Russia",
  "United States": "United States of America", // 👈 obrigatório para o mapa
  "United States of America": "United States of America",
  USA: "United States of America",

  "South Korea": "Korea, Republic of",
  "North Korea": "North Korea",
  "Korea, Dem. People's Rep.": "North Korea",
  "Democratic People's Republic of Korea": "North Korea",

  Iran: "Iran",
  Vietnam: "Vietnam",
  "Congo (Kinshasa)": "Democratic Republic of the Congo",
  "Congo (Brazzaville)": "Republic of the Congo",
  Egypt: "Egypt",
  Syria: "Syria",
  Laos: "Laos",
  "Central African Republic": "Central African Rep.",
};

// 🔹 Inversos (para exibição)
export const BACKEND_TO_COMMON = Object.fromEntries(
  Object.entries(COMMON_TO_BACKEND).map(([common, backend]) => [
    backend,
    common,
  ])
);

export const GEOJSON_TO_COMMON = Object.fromEntries(
  Object.entries(COMMON_TO_GEOJSON).map(([common, geojson]) => [
    geojson,
    common,
  ])
);

// ==============================
// 🧠 Funções utilitárias
// ==============================

export function normalizeCountryName(name) {
  // Converte para o formato esperado pelo backend
  return COMMON_TO_BACKEND[name] || name;
}

export function getDisplayName(name) {
  // backend → nome comum pra UI
  const entry = Object.entries(COMMON_TO_BACKEND).find(
    ([common, backend]) => backend === name
  );
  return entry ? entry[0] : name;
}

export function getGeoJsonName(name) {
  // backend ou comum → nome no GeoJSON
  const normalized = COMMON_TO_BACKEND[name] || name;
  const geojsonName = COMMON_TO_GEOJSON[normalized] || COMMON_TO_GEOJSON[name];
  return geojsonName || name;
}
