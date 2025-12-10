import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { scaleLinear } from "d3-scale";
import ReactDOMServer from "react-dom/server";
import ReactCountryFlag from "react-country-flag";
import CountryDetails from "./CountryDetails";
import InfoModal from "./InfoModal";
import ReactDOM from "react-dom";
import {
  normalizeCountryName,
  getDisplayName,
  getGeoJsonName,
} from "../utils/CountriesDictionary";

countries.registerLocale(enLocale);

const LEGENDS = {
  // ---------------------------
  // INDICADORES EM PERCENTUAL
  // ---------------------------
  undernourishment: [
    { max: 2.5, label: "≤ 2.5%" },
    { max: 5, label: "≤ 5%" },
    { max: 10, label: "≤ 10%" },
    { max: 20, label: "≤ 20%" },
    { max: 40, label: "≤ 40%" },
    { max: Infinity, label: "> 40%" },
  ],
  poverty: [
    { max: 5, label: "≤ 5%" },
    { max: 10, label: "≤ 10%" },
    { max: 20, label: "≤ 20%" },
    { max: 30, label: "≤ 30%" },
    { max: 50, label: "≤ 50%" },
    { max: Infinity, label: "> 50%" },
  ],
  mean_inflation: [
    { max: 2, label: "≤ 2%" },
    { max: 5, label: "≤ 5%" },
    { max: 10, label: "≤ 10%" },
    { max: 20, label: "≤ 20%" },
    { max: 40, label: "≤ 40%" },
    { max: Infinity, label: "> 40%" },
  ],
  max_inflation: [
    { max: 5, label: "≤ 5%" },
    { max: 10, label: "≤ 10%" },
    { max: 20, label: "≤ 20%" },
    { max: 40, label: "≤ 40%" },
    { max: 80, label: "≤ 80%" },
    { max: Infinity, label: "> 80%" },
  ],

  // ---------------------------
  // POPULATION — MILHÕES
  // ---------------------------
  population: [
    { max: 1, label: "≤ 1M" },
    { max: 5, label: "≤ 5M" },
    { max: 20, label: "≤ 20M" },
    { max: 50, label: "≤ 50M" },
    { max: 100, label: "≤ 100M" },
    { max: Infinity, label: "> 100M" },
  ],

  // ---------------------------
  // FOOD CALORIES — mil kcal/dia
  // ---------------------------
  food_calories: [
    { max: 2200, label: "≤ 2200" },
    { max: 2600, label: "≤ 2600" },
    { max: 3000, label: "≤ 3000" },
    { max: 3400, label: "≤ 3400" },
    { max: 3800, label: "≤ 3800" },
    { max: Infinity, label: "> 3800" },
  ],

  // ---------------------------
  // ENERGY SUPPLY ADEQUACY — %
  // ---------------------------
  energy_suply_adeq: [
    { max: 90, label: "≤ 90%" },
    { max: 100, label: "≤ 100%" },
    { max: 120, label: "≤ 120%" },
    { max: 140, label: "≤ 140%" },
    { max: 160, label: "≤ 160%" },
    { max: Infinity, label: "> 160%" },
  ],

  // ---------------------------
  // GDP per capita — USD
  // ---------------------------
  gdp: [
    { max: 5000, label: "≤ $5k" },
    { max: 10000, label: "≤ $10k" },
    { max: 20000, label: "≤ $20k" },
    { max: 40000, label: "≤ $40k" },
    { max: 60000, label: "≤ $60k" },
    { max: Infinity, label: "> $60k" },
  ],
};

const getColor = (indicator, value) => {
  if (value == null || isNaN(value)) return "#ccc";

  const legend = LEGENDS[indicator];

  // fallback (não deveria acontecer)
  if (!legend) return "#ccc";

  const colors = [
    "#d3f2a3", // mais claro
    "#8dda94",
    "#5fb187",
    "#32877d",
    "#136069",
    "#074050", // mais escuro
  ];

  for (let i = 0; i < legend.length; i++) {
    if (value <= legend[i].max) return colors[i];
  }

  return colors[colors.length - 1];
};

const indicatorLabels = {
  mean_inflation: "Mean Inflation (2024)",
  max_inflation: "Max Inflation (2024)",
  poverty: "Poverty Rate (Latest)",
  undernourishment: "Undernourishment (2022)",
  population: "Population (2024)",
  energy_suply_adeq: "Energy Supply Adequacy (2023)",
  food_calories: "Food Calories (2022)",
  gdp: "GDP per Capita (2024)",
};

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const API = import.meta.env.VITE_API_BASE_URL;

export default function WorldMap() {
  const [data, setData] = useState([]);
  const [indicator, setIndicator] = useState("undernourishment");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/latest?indicator=${indicator}`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => console.error("Erro na requisição:", err));
  }, [indicator]);

  const dataMap = {};
  data.forEach((d) => {
    const normalizedName = normalizeCountryName(d["Country Name"]);
    dataMap[normalizedName] = d.Value;
  });

  const values = data.map((d) => d.Value).filter((v) => v != null);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const colorScale = scaleLinear()
    .domain([minVal, maxVal])
    .range(["#c6dbef", "#08306b"]);

  return (
    <>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 188 }}
        width={980}
        height={500}
        style={{ width: "100%", height: "100vh" }}
      >
        <ZoomableGroup
          center={[0, 0]}
          zoom={1}
          minZoom={1}
          maxZoom={8}
          translateExtent={[
            [0, 0],
            [980, 500],
          ]}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = geo.properties.name;

                if (countryName === "North Korea") {
                  console.log(
                    "✅ GeoJSON match",
                    "countryName:",
                    countryName,
                    "→ backend:",
                    normalizeCountryName(countryName),
                    "→ geojson:",
                    getGeoJsonName(countryName)
                  );
                }

                if (countryName.toLowerCase().includes("korea")) {
                  console.log("🧭 GeoJSON countryName:", countryName);
                }

                const normalizedName = normalizeCountryName(countryName);
                let val = dataMap[normalizedName] ?? dataMap[countryName];

                // ⚠️ Population vem em números absolutos — convertemos para milhões
                if (indicator === "population" && val != null) {
                  val = val / 1_000_000;
                }

                if (countryName === "North Korea") {
                  console.log("🇰🇵 DEBUG North Korea", {
                    countryName,
                    normalizedName,
                    "dataMap[normalizedName]": dataMap[normalizedName],
                    "dataMap[countryName]": dataMap[countryName],
                    allDataKeys: Object.keys(dataMap).filter((k) =>
                      k.toLowerCase().includes("korea")
                    ),
                  });
                }

                const iso3 = countries.numericToAlpha3(geo.id);
                const iso2 = iso3
                  ? countries.alpha3ToAlpha2(iso3, "en")
                  : undefined;

                const fillColor =
                  val !== undefined ? getColor(indicator, val) : "#7f7f7f";

                const tooltipContent = ReactDOMServer.renderToStaticMarkup(
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {iso2 && (
                        <ReactCountryFlag
                          countryCode={iso2}
                          svg
                          style={{
                            width: "1.5em",
                            height: "1.5em",
                            borderRadius: "2px",
                          }}
                          title={countryName}
                        />
                      )}
                      <strong>{getDisplayName(normalizedName)}</strong>
                    </span>

                    {val !== undefined ? (
                      <span>
                        {indicatorLabels[indicator]}: {val.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: "#a1a1a1ff" }}>No data</span>
                    )}
                  </div>
                );

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    data-tooltip-id="country-tooltip"
                    data-tooltip-html={tooltipContent}
                    style={{
                      default: { fill: fillColor, outline: "none" },
                      hover: { fill: "#999", outline: "none" },
                      pressed: { fill: "#222", outline: "none" },
                    }}
                    onClick={() => {
                      const normalizedName = normalizeCountryName(countryName);
                      const val =
                        dataMap[normalizedName] ?? dataMap[countryName];
                      if (val !== undefined && !isNaN(val)) {
                        setSelectedCountry(normalizedName);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          background: "rgba(0,0,0,0.4)",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        {/* Linha com ícone + select */}
        <div className="relative mb-3 flex items-center gap-3">
          {/* Ícone de informação */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="text-white/80 hover:text-white transition transform hover:scale-110 focus:outline-none"
            title="About this map"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" />
              <circle cx="12" cy="8" r="0.8" fill="currentColor" />
            </svg>
          </button>

          {/* Select de indicador */}
          <div className="relative flex-1">
            <select
              id="indicator"
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
              className="w-[220px] appearance-none bg-[#ffffff10] text-white text-sm font-medium
      px-4 py-2.5 rounded-xl border border-white/30 backdrop-blur-sm
      hover:bg-[#ffffff15] focus:outline-none focus:ring-2 focus:ring-[#40a9ff]/70 focus:border-[#40a9ff]/70
      transition duration-300"
            >
              {Object.entries(indicatorLabels).map(([key, label]) => (
                <option
                  key={key}
                  value={key}
                  className="text-slate-800 bg-white"
                >
                  {label}
                </option>
              ))}
            </select>

            {/* seta decorativa */}
            <svg
              className="absolute right-4 top-[14px] w-4 h-4 text-white/70 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* LEGEND DYNAMIC */}
        <div style={{ marginTop: 10 }}>
          {LEGENDS[indicator].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  background: getColor(
                    indicator,
                    item.max === Infinity
                      ? LEGENDS[indicator][i - 1]?.max || 0
                      : item.max
                  ),
                  border: "1px solid #333",
                  marginRight: 8,
                }}
              />
              <span style={{ color: "white", fontSize: 12 }}>{item.label}</span>
            </div>
          ))}

          {/* No data box */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "#a1a1a1ff",
                border: "1px solid #333",
                marginRight: 8,
              }}
            />
            <span style={{ color: "white", fontSize: 12 }}>No data</span>
          </div>
        </div>
      </div>

      {/* Modal de informação */}
      {showInfoModal &&
        ReactDOM.createPortal(
          <InfoModal onClose={() => setShowInfoModal(false)} />,
          document.body
        )}

      <Tooltip id="country-tooltip" float />
      {/* Portal do modal fora da área do mapa */}
      {ReactDOM.createPortal(
        selectedCountry ? (
          <CountryDetails
            country={selectedCountry}
            indicator={indicator}
            onClose={() => setSelectedCountry(null)}
          />
        ) : null,
        document.body
      )}
    </>
  );
}
