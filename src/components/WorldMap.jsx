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
import ReactDOMServer from "react-dom/server";
import ReactCountryFlag from "react-country-flag";
import CountryDetails from "./CountryDetails";
import InfoModal from "./InfoModal";
import ReactDOM from "react-dom";
import {
  normalizeCountryName,
  getDisplayName,
} from "../utils/CountriesDictionary";

countries.registerLocale(enLocale);

const LEGENDS = {
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
  population: [
    { max: 1, label: "≤ 1M" },
    { max: 5, label: "≤ 5M" },
    { max: 20, label: "≤ 20M" },
    { max: 50, label: "≤ 50M" },
    { max: 100, label: "≤ 100M" },
    { max: Infinity, label: "> 100M" },
  ],
  food_calories: [
    { max: 2200, label: "≤ 2200" },
    { max: 2600, label: "≤ 2600" },
    { max: 3000, label: "≤ 3000" },
    { max: 3400, label: "≤ 3400" },
    { max: 3800, label: "≤ 3800" },
    { max: Infinity, label: "> 3800" },
  ],
  energy_suply_adeq: [
    { max: 90, label: "≤ 90%" },
    { max: 100, label: "≤ 100%" },
    { max: 120, label: "≤ 120%" },
    { max: 140, label: "≤ 140%" },
    { max: 160, label: "≤ 160%" },
    { max: Infinity, label: "> 160%" },
  ],
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
  if (!legend) return "#ccc";
  const colors = [
    "#d3f2a3",
    "#8dda94",
    "#5fb187",
    "#32877d",
    "#136069",
    "#074050",
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
  energy_suply_adeq: "Energy Supply Adeq. (2023)",
  food_calories: "Food Calories (2022)",
  gdp: "GDP per Capita (2024)",
};

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const API = import.meta.env.VITE_API_BASE_URL;

const FULL_TEXT =
  "Developed by Victor Sales and Valentina-Serrano-Muñoz for AISS";

export default function WorldMap() {
  const [data, setData] = useState([]);
  const [indicator, setIndicator] = useState("undernourishment");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Estados de carregamento
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [showLoadingUI, setShowLoadingUI] = useState(true);
  const [hasLoadedFirstTime, setHasLoadedFirstTime] = useState(false);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  // Estado para o efeito de digitação
  const [typedText, setTypedText] = useState("");

  // 1. Timers Globais
  useEffect(() => {
    setShowLoadingUI(true);
    setIsLoadingComplete(false);

    const completionTimer = setTimeout(() => {
      setIsLoadingComplete(true);
    }, 4100);

    const fadeOutTimer = setTimeout(() => {
      setShowLoadingUI(false);
    }, 5000);

    return () => {
      clearTimeout(completionTimer);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  // 2. Typing Effect
  useEffect(() => {
    let index = 0;
    setTypedText("");

    const typingInterval = setInterval(() => {
      if (index <= FULL_TEXT.length) {
        setTypedText(FULL_TEXT.slice(0, index));
        index++;
      } else {
        clearInterval(typingInterval);
      }
    }, 40);

    return () => clearInterval(typingInterval);
  }, []);

  // 3. Chamada da API
  useEffect(() => {
    setIsLoadingApi(true);
    axios
      .get(`${API}/latest?indicator=${indicator}`)
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Erro na requisição:", err);
        setData([]);
      })
      .finally(() => {
        setIsLoadingApi(false);
        setHasLoadedFirstTime(true);
      });
  }, [indicator]);

  const isOverlayActive = showLoadingUI || !hasLoadedFirstTime;

  const dataMap = {};
  if (Array.isArray(data)) {
    data.forEach((d) => {
      const normalizedName = normalizeCountryName(d["Country Name"]);
      dataMap[normalizedName] = d.Value;
    });
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes blink {
            50% { opacity: 0; }
          }
          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            70% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes rotate-phone {
            0%, 10% { transform: rotate(0deg); }
            40%, 60% { transform: rotate(90deg); }
            90%, 100% { transform: rotate(90deg); }
          }
          .cursor-blink {
            animation: blink 1s step-end infinite;
          }

          /* Lógica de Orientação: */
          
          /* Por padrão, esconde o aviso e mostra o conteúdo */
          .rotate-warning-container { display: none; }
          .main-content-container { display: block; }

          /* Apenas em telas pequenas (mobile/tablet) E que estejam em Portrait (em pé) */
          @media only screen and (max-width: 900px) and (orientation: portrait) {
            .rotate-warning-container { 
              display: flex; 
              position: fixed;
              inset: 0;
              z-index: 9999;
              background-color: #111;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              text-align: center;
              padding: 2rem;
            }
            .main-content-container { display: none; }
          }
        `}
      </style>

      {/* AVISO DE ROTAÇÃO (Visível apenas em Mobile Portrait) */}
      <div className="rotate-warning-container">
        <div style={{ width: 64, height: 64, marginBottom: 20 }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
            />
          </svg>
          <div
            style={{
              marginTop: "-40px",
              animation: "rotate-phone 2s infinite ease-in-out alternate",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5fb187"
              strokeWidth="2"
            >
              <path
                d="M4 12a8 8 0 018-8m8 8a8 8 0 01-8 8"
                strokeLinecap="round"
                style={{ opacity: 0.5 }}
              />
              <path
                d="M12 4l4 4-4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "0.5rem",
            fontWeight: "bold",
          }}
        >
          Please Rotate Your Device
        </h2>
      </div>

      {/* CONTAINER PRINCIPAL (Escondido em Mobile Portrait) */}
      <div className="main-content-container">
        {/* LOADING OVERLAY */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1b1b1b",
            zIndex: 50,
            flexDirection: "column",
            gap: "4rem",
            opacity: isOverlayActive ? 1 : 0,
            visibility: isOverlayActive ? "visible" : "hidden",
            transition: "opacity 1.2s ease-out, visibility 1.2s ease-out",
            pointerEvents: isOverlayActive ? "auto" : "none",
          }}
        >
          <div
            style={{
              color: "white",
              fontFamily: "monospace",
              fontSize: "16px",
              textAlign: "center",
              maxWidth: "90%",
              lineHeight: "1.5",
            }}
          >
            {typedText}
            <span
              className="cursor-blink"
              style={{ color: "#5fb187", fontWeight: "bold" }}
            >
              |
            </span>
          </div>

          <div
            style={{
              width: 25,
              height: 25,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!isLoadingComplete ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTop: "3px solid #5fb187",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5fb187"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  animation: "popIn .6s ease-out forwards",
                }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>

        {/* MAPA */}
        {/* Usamos 100dvh para garantir que o mapa ocupe a altura correta no mobile landscape */}
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 188 }}
          width={980}
          height={500}
          style={{ width: "100%", height: "100dvh" }}
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
                  const normalizedName = normalizeCountryName(countryName);
                  let val = dataMap[normalizedName] ?? dataMap[countryName];

                  if (indicator === "population" && val != null) {
                    val = val / 1_000_000;
                  }

                  const iso3 = countries.numericToAlpha3(geo.id);
                  const iso2 = iso3
                    ? countries.alpha3ToAlpha2(iso3, "en")
                    : undefined;
                  const fillColor =
                    val !== undefined ? getColor(indicator, val) : "#b9b9b9ff";

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
                        default: {
                          fill: fillColor,
                          outline: "none",
                          transition: "fill 0.3s ease",
                        },
                        hover: { fill: "#474747c0", outline: "none" },
                        pressed: { fill: "#222", outline: "none" },
                      }}
                      onClick={() => {
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

        {/* Controles e Legenda (Estilo Original Desktop) */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "rgba(0,0,0,0.4)",
            padding: "10px",
            borderRadius: "8px",
            zIndex: 40,
          }}
        >
          <div className="relative mb-3 flex items-center gap-3">
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
              <svg
                className="absolute right-[0.6rem] top-[14px] w-4 h-4 text-white/70 pointer-events-none"
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
                <span style={{ color: "white", fontSize: 12 }}>
                  {item.label}
                </span>
              </div>
            ))}

            <div
              style={{ display: "flex", alignItems: "center", marginTop: 6 }}
            >
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
              <button
                onClick={() => setShowInfoModal(true)}
                className="text-white/80 hover:text-white transition transform hover:scale-110 focus:outline-none"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: "auto",
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
            </div>
          </div>
        </div>

        {showInfoModal &&
          ReactDOM.createPortal(
            <InfoModal onClose={() => setShowInfoModal(false)} />,
            document.body
          )}
        <Tooltip id="country-tooltip" float />
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
      </div>
    </>
  );
}
