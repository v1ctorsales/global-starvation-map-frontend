import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import ReactCountryFlag from "react-country-flag";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { motion, AnimatePresence } from "framer-motion";
import {
  normalizeCountryName,
  getDisplayName,
  getGeoJsonName,
} from "../utils/CountriesDictionary";
import { geoPath } from "d3-geo";

countries.registerLocale(enLocale);

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// paleta para múltiplos países comparados
const COLOR_PALETTE = [
  "#2563eb",
  "#f97316",
  "#40da78ff",
  "#9333ea",
  "#dc2626",
  "#d2f700ff",
  "#2a6111ff",
  "#03ebfcff",
  "#fc03a9ff",
  "#000000ff",
];

export default function CountryDetails({ country, indicator, onClose }) {
  const commonName = getDisplayName(country);
  const geoJsonName = getGeoJsonName(commonName);
  const backendName = normalizeCountryName(commonName);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [compareCountries, setCompareCountries] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [showComparisons, setShowComparisons] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCountries, setFilteredCountries] = useState([]);

  const MAX_COMPARE = 7;

  // país recém-adicionado (último da lista)
  const latestCountry = compareCountries[compareCountries.length - 1];

  const [activePanel, setActivePanel] = useState("default");
  // ============================
  // 🧮 Indicadores múltiplos
  // ============================
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [indicatorData, setIndicatorData] = useState(null);
  const [loadingIndicators, setLoadingIndicators] = useState(false);

  // ============================
  // 🔍 FILTRO DINÂMICO DE PAÍSES
  // ============================
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const all = Object.values(countries.getNames("en"));
      const matches = all
        .filter(
          (c) =>
            c.toLowerCase().includes(searchTerm.toLowerCase()) &&
            normalizeCountryName(c) !== normalizeCountryName(country) &&
            !compareCountries.includes(normalizeCountryName(c))
        )
        .slice(0, 6);
      setFilteredCountries(matches);
    } else {
      setFilteredCountries([]);
    }
  }, [searchTerm, compareCountries, country]);

  // Fecha busca com ESC
  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && setIsSearching(false);
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ============================
  // 📊 FETCH PRINCIPAL
  // ============================
  useEffect(() => {
    if (!country) return;
    setLoading(true);
    axios;
    axios
      .get(
        `http://127.0.0.1:8000/data/all_data_merged?country=${encodeURIComponent(
          backendName
        )}&indicator=${encodeURIComponent(indicator)}`
      )

      .then((res) => {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setRows([data]);
      })
      .catch((err) => console.error("Error fetching main country:", err))
      .finally(() => setLoading(false));
  }, [country, indicator]);

  // ============================
  // 📊 FETCH COMPARAÇÕES
  // ============================
  useEffect(() => {
    compareCountries.forEach((c) => {
      if (compareData[c]) return; // já baixado
      axios
        .get(
          `http://127.0.0.1:8000/data/all_data_merged?country=${encodeURIComponent(
            normalizeCountryName(c)
          )}&indicator=${encodeURIComponent(indicator)}`
        )
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data[0] : res.data;
          setCompareData((prev) => ({ ...prev, [c]: data }));
        })
        .catch((err) => console.error(`Error fetching ${c}:`, err));
    });
  }, [compareCountries, indicator]);

  // ============================
  // 📊 FETCH DE INDICADORES MÚLTIPLOS
  // ============================
  useEffect(() => {
    // só busca se houver 1 ou 2 indicadores selecionados
    if (!country || selectedIndicators.length === 0) return;

    const params = new URLSearchParams();
    params.append("country", backendName);
    selectedIndicators.forEach((ind) => params.append("indicators", ind));

    setLoadingIndicators(true);
    axios
      .get(`http://127.0.0.1:8000/indicators?${params.toString()}`)
      .then((res) => {
        setIndicatorData(res.data);
      })
      .catch((err) => console.error("Error fetching indicators:", err))
      .finally(() => setLoadingIndicators(false));
  }, [country, selectedIndicators]);

  // ============================
  // ⚙️ UTILIDADES
  // ============================
  const getIso2 = (name) => {
    const a3 = countries.getAlpha3Code(name, "en");
    return a3 ? countries.alpha3ToAlpha2(a3) : null;
  };

  const extractSeries = (dataObj) => {
    if (!dataObj) return [];
    const regex = new RegExp(`^${indicator}_(\\d{4})$`);
    return Object.entries(dataObj)
      .filter(([k, v]) => regex.test(k) && v != null)
      .map(([k, v]) => ({
        year: k.match(regex)[1],
        value: Number(v),
      }))
      .sort((a, b) => a.year - b.year);
  };
  // séries "cruas"
  const mainSeriesRaw = useMemo(
    () => extractSeries(rows[0]),
    [rows, indicator]
  );

  const compareSeriesRaw = useMemo(() => {
    return compareCountries.map((name) => ({
      name,
      data: extractSeries(compareData[name]),
    }));
  }, [compareCountries, compareData, indicator]);

  // anos contínuos (min..max) entre TODOS os países
  // anos contínuos (min..max) entre TODOS os países
  const allYearsNum = useMemo(() => {
    const years = new Set();
    mainSeriesRaw.forEach((d) => years.add(Number(d.year)));
    compareSeriesRaw.forEach((s) =>
      s.data.forEach((d) => years.add(Number(d.year)))
    );

    if (years.size === 0) return [];

    const min = Math.min(...Array.from(years));
    const max = Math.max(...Array.from(years));
    const seq = [];
    for (let y = min; y <= max; y++) seq.push(y);
    return seq;
  }, [mainSeriesRaw, compareSeriesRaw]);

  // tabela unificada: { year, [country]: value, [name1]: value, ... }
  const mergedData = useMemo(() => {
    // mapeia ano->valor do país principal
    const mainMap = new Map(
      mainSeriesRaw.map((d) => [Number(d.year), d.value])
    );
    // mapeia ano->valor de cada país comparado
    const cmpMaps = {};
    compareSeriesRaw.forEach((s) => {
      cmpMaps[s.name] = new Map(s.data.map((d) => [Number(d.year), d.value]));
    });

    return allYearsNum.map((y) => {
      const row = { year: y };
      row[backendName] = mainMap.get(y) ?? null;
      compareSeriesRaw.forEach((s) => {
        row[s.name] = cmpMaps[s.name].get(y) ?? null;
      });
      return row;
    });
  }, [allYearsNum, mainSeriesRaw, compareSeriesRaw, country]);

  const mainSeries = useMemo(() => extractSeries(rows[0]), [rows, indicator]);

  const compareSeries = useMemo(() => {
    return compareCountries.map((name) => ({
      name,
      data: extractSeries(compareData[name]),
    }));
  }, [compareCountries, compareData, indicator]);

  // ============================
  // 🧮 Calcula o range total de anos entre todos os países
  // ============================
  const allYears = useMemo(() => {
    const years = new Set();

    // adiciona os anos do país principal
    mainSeries.forEach((d) => years.add(Number(d.year)));

    // adiciona anos dos países comparados
    compareSeries.forEach((s) => {
      s.data.forEach((d) => years.add(Number(d.year)));
    });

    if (years.size === 0) return [];

    const min = Math.min(...years);
    const max = Math.max(...years);

    // gera uma sequência contínua, mesmo que algum país falte anos
    const range = [];
    for (let y = min; y <= max; y++) range.push(String(y));
    return range;
  }, [mainSeries, compareSeries]);

  const COLORS = COLOR_PALETTE;

  // ============================
  // 🧱 UI
  // ============================
  const open = !!country;

  const GEOJSON_NAME_FIX = {
    Russia: "Russian Federation",
    "United States": "United States of America",
    "South Korea": "Republic of Korea",
    "North Korea": "Democratic People's Republic of Korea",
    Iran: "Iran, Islamic Republic of",
    Vietnam: "Viet Nam",
    "Congo (Kinshasa)": "Democratic Republic of the Congo",
    "Congo (Brazzaville)": "Republic of the Congo",
    Egypt: "Egypt",
    Syria: "Syrian Arab Republic",
    Laos: "Lao People's Democratic Republic",
  };

  useEffect(() => {
    if (activePanel === "indicators") {
      setSelectedIndicators((prev) => {
        // se já tem algo selecionado, mantém
        if (prev.length > 0) return prev;
        // se vier string de prop indicator, inicia com ela
        if (indicator && typeof indicator === "string") return [indicator];
        return prev;
      });
    }
  }, [activePanel, indicator]);

  const [savedCountries, setSavedCountries] = useState([]);

  useEffect(() => {
    if (activePanel === "default") {
      // guarda o estado antes de limpar
      setSavedCountries(compareCountries);
      setCompareCountries([]);
      setCompareData({});
    } else if (
      activePanel === "countries" &&
      savedCountries.length > 0 &&
      compareCountries.length === 0
    ) {
      // restaura os países ao voltar pra aba Countries
      setCompareCountries(savedCountries);
    }
  }, [activePanel]);

  // 🔹 Combina as duas séries em um único array para o Recharts
  // Combina 1 ou 2 indicadores para o gráfico (sem normalizar)
  // util interna: parse de ano -> número (pega os 4 dígitos)
  const parseYear = (y) => {
    const m = String(y ?? "").match(/\d{4}/);
    const n = m ? Number(m[0]) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  // Combina 1 ou 2 indicadores para o gráfico (sem normalizar), garantindo ano numérico
  const multiIndicatorChartData = useMemo(() => {
    const details = indicatorData?.details;
    if (!details) return [];

    const keys = Object.keys(details || {});
    if (keys.length === 0) return [];

    // Map por indicador: { year(number) -> value(number) }
    const maps = {};
    keys.forEach((k) => {
      const rows = Array.isArray(details[k]) ? details[k] : [];
      maps[k] = new Map(
        rows
          .map((d) => {
            const y = parseYear(d.year);
            const v = Number(d.value);
            return [y, Number.isFinite(v) ? v : null];
          })
          .filter(([y, v]) => y !== null && v !== null)
      );
    });

    // Coleção de todos os anos válidos
    const yearsSet = new Set();
    keys.forEach((k) => {
      for (const y of maps[k].keys()) yearsSet.add(y);
    });
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    // Linha por ano
    return years.map((year) => {
      const row = { year };
      keys.forEach((k) => {
        row[k] = maps[k].get(year) ?? null;
      });
      return row;
    });
  }, [indicatorData]);

  // ============================
  // 🧭 Domínios e ticks por contexto
  // ============================

  // Countries → domínio baseado nos anos de todos os países
  const countryYears = (mergedData ?? []).map((d) => d.year);
  const countryDomain =
    countryYears.length > 0
      ? [Math.min(...countryYears), Math.max(...countryYears)]
      : [0, 0];

  // Indicators → domínio baseado nos anos de todos os indicadores
  const indYears = (multiIndicatorChartData ?? []).map((d) => d.year);
  const indDomain =
    indYears.length > 0
      ? [Math.min(...indYears), Math.max(...indYears)]
      : [0, 0];

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal container={document.body}>
        {/* Overlay com fade */}
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998] transition-opacity duration-300 data-[state=open]:opacity-100 data-[state=closed]:opacity-0" />

        {/* Conteúdo sempre centralizado */}
        <Dialog.Content
          aria-describedby="desc"
          className="fixed inset-0 flex items-center justify-center z-[9999] p-[4vh]"
        >
          {/* MODAL com animação de subida */}
          <motion.div
            initial={{ y: "5%", opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "5%", opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
            className="relative w-full h-full max-w-[1300px] max-h-[850px]
        bg-white rounded-3xl border border-slate-200/70
        shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)]
        overflow-hidden flex flex-col box-border"
          >
            {/* Botão Fechar */}
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="absolute top-5 right-5 z-[10000] flex items-center justify-center
            w-10 h-10 rounded-full bg-white text-slate-600 hover:text-slate-900
            border border-slate-200 shadow-sm transition-transform hover:scale-105"
              >
                ×
              </button>
            </Dialog.Close>

            {/* GRID PRINCIPAL */}
            <div className="grid grid-cols-[minmax(260px,30%)_1fr] flex-1 max-md:grid-cols-1 bg-gradient-to-br from-slate-50 to-white">
              {/* Painel esquerdo */}
              <aside className="pt-8 pl-6 pb-6 flex flex-col gap-6 items-center max-md:py-8 relative">
                {/* 🔹 HEADER (comportamento dinâmico) */}
                <div className="w-full flex items-center justify-center mb-4">
                  <div className="flex items-center gap-3 w-[85%] justify-center">
                    {activePanel === "countries" ||
                    activePanel === "indicators" ? (
                      <>
                        {/* Botão de voltar */}
                        <button
                          onClick={() => {
                            setActivePanel("default");
                            setShowComparisons(false);
                          }}
                          className="px-3 py-2 rounded-full border border-slate-300 text-slate-600 text-sm hover:bg-slate-100 hover:scale-[1.03] transition"
                        >
                          ←
                        </button>

                        {/* Botão Countries */}
                        <button
                          onClick={() => {
                            setActivePanel("countries");
                            setShowComparisons(true);
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm transition ${
                            activePanel === "countries"
                              ? "bg-[#134074] text-white cursor-default"
                              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          🏳️ Countries
                        </button>

                        {/* Botão Indicators */}
                        <button
                          onClick={() => {
                            setActivePanel("indicators");
                            setShowComparisons(false);
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm transition ${
                            activePanel === "indicators"
                              ? "bg-[#2563eb] text-white cursor-default"
                              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          📊 Indicators
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Modo padrão (sem seta) */}
                        <button
                          onClick={() => {
                            setActivePanel("countries");
                            setIsSearching(false);
                            setShowComparisons(true);
                          }}
                          className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm transition ${
                            activePanel === "countries"
                              ? "bg-[#134074] text-white scale-[1.03]"
                              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          🏳️ Countries
                        </button>

                        <button
                          onClick={() => setActivePanel("indicators")}
                          className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm transition ${
                            activePanel === "indicators"
                              ? "bg-[#2563eb] text-white scale-[1.03]"
                              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          📊 Indicators
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 🔹 CONTEÚDO PRINCIPAL */}
                <AnimatePresence mode="wait">
                  {/* --- MODO PADRÃO --- */}
                  {activePanel === "default" && (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="flex flex-col items-center gap-6"
                    >
                      {/* Bandeira + nome */}
                      <div className="flex items-center gap-3">
                        {getIso2(country) && (
                          <ReactCountryFlag
                            countryCode={getIso2(country)}
                            svg
                            style={{
                              width: "2em",
                              height: "2em",
                              borderRadius: "4px",
                              boxShadow: "0 0 4px rgba(0,0,0,0.1)",
                            }}
                          />
                        )}
                        <h1 className="text-slate-900 font-extrabold ...">
                          {getDisplayName(country)}
                        </h1>
                      </div>

                      {/* Silhueta */}
                      <div className="border border-slate-200 rounded-2xl h-[340px] w-[340px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-white overflow-hidden shadow-sm">
                        <ComposableMap
                          projection="geoEqualEarth"
                          projectionConfig={{ scale: 190 }}
                          width={340}
                          height={340}
                          style={{ width: "100%", height: "100%" }}
                        >
                          <Geographies geography={geoUrl}>
                            {({ geographies, path }) => {
                              // 🔹 Tenta obter o nome do GeoJSON corretamente
                              const geoName = getGeoJsonName(country);

                              console.log({
                                country,
                                backend: normalizeCountryName(country),
                                geojson: getGeoJsonName(country),
                                display: getDisplayName(
                                  normalizeCountryName(country)
                                ),
                              });

                              // Alguns arquivos do world-atlas não têm "properties.name" padronizado,
                              // então garantimos uma correspondência por "g.properties.name" ou "g.id"
                              const feature = geographies.find(
                                (g) =>
                                  g.properties.name === geoJsonName ||
                                  g.id === geoJsonName ||
                                  g.properties.name?.toLowerCase?.() ===
                                    geoJsonName.toLowerCase()
                              );

                              console.log(
                                "geoName:",
                                geoName,
                                "found:",
                                feature ? "✅ yes" : "❌ no"
                              );

                              if (!feature) {
                                console.warn(
                                  "⚠️ Country not found in GeoJSON:",
                                  geoName
                                );
                                return null;
                              }

                              const [[x0, y0], [x1, y1]] = path.bounds(feature);
                              const w = 320,
                                h = 320;
                              const scale =
                                0.9 * Math.min(w / (x1 - x0), h / (y1 - y0));
                              const cx = (x0 + x1) / 2,
                                cy = (y0 + y1) / 2;
                              const tx = 170 - scale * cx,
                                ty = 170 - scale * cy;

                              return (
                                <g
                                  transform={`translate(${tx},${ty}) scale(${scale})`}
                                >
                                  <Geography
                                    geography={feature}
                                    style={{
                                      default: {
                                        fill: "#2563eb",
                                        stroke: "#2563eb",
                                      },
                                      hover: { fill: "#2563eb" },
                                    }}
                                  />
                                </g>
                              );
                            }}
                          </Geographies>
                        </ComposableMap>
                      </div>
                    </motion.div>
                  )}

                  {/* --- MODO COUNTRIES --- */}
                  {activePanel === "countries" && (
                    <motion.div
                      key="countries"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="flex flex-col items-center gap-3 w-[340px]"
                    >
                      {/* Pílulas de países */}
                      <CountryPill
                        name={getDisplayName(country)}
                        color={COLOR_PALETTE[0]}
                      />

                      {(() => {
                        let colorIndex = 1;
                        return compareCountries.map((c) => {
                          const series = extractSeries(compareData[c]);
                          const hasData = series.length > 0;
                          const color = hasData
                            ? COLOR_PALETTE[colorIndex++ % COLOR_PALETTE.length]
                            : "#ccc";

                          return (
                            <motion.div
                              key={c}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="w-full"
                            >
                              <CountryPill
                                name={c}
                                color={color}
                                hasData={hasData}
                                closable
                                onClose={() => {
                                  setCompareCountries((prev) =>
                                    prev.filter((x) => x !== c)
                                  );
                                  setCompareData((prev) => {
                                    const copy = { ...prev };
                                    delete copy[c];
                                    return copy;
                                  });
                                }}
                              />
                            </motion.div>
                          );
                        });
                      })()}

                      {/* Botão Add country / Input de busca */}
                      {/* Botão Add country / Input de busca */}
                      <AnimatePresence mode="wait">
                        {!isSearching ? (
                          <motion.button
                            key="add-btn"
                            onClick={() => {
                              if (compareCountries.length < MAX_COMPARE)
                                setIsSearching(true);
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            disabled={compareCountries.length >= MAX_COMPARE}
                            className={`mt-3 w-full py-2 rounded-xl border text-sm font-medium transition ${
                              compareCountries.length >= MAX_COMPARE
                                ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                                : "border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {compareCountries.length >= MAX_COMPARE
                              ? "Maximum reached"
                              : "+ Add country"}
                          </motion.button>
                        ) : (
                          <motion.div
                            key="search-input"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            className="relative w-full mt-3"
                          >
                            <input
                              autoFocus
                              type="text"
                              placeholder="Type a country name..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onBlur={() =>
                                setTimeout(() => setIsSearching(false), 150)
                              }
                              className="w-full px-4 py-2 rounded-full text-sm text-slate-800 border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#134074] bg-white placeholder:text-slate-400"
                            />
                            {filteredCountries.length > 0 && (
                              <ul className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {filteredCountries.map((c) => (
                                  <li
                                    key={c}
                                    className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                                    onClick={() => {
                                      if (
                                        compareCountries.length < MAX_COMPARE
                                      ) {
                                        const normalized =
                                          normalizeCountryName(c);
                                        setCompareCountries((prev) => [
                                          ...prev,
                                          c,
                                        ]);
                                        setSearchTerm("");
                                        setFilteredCountries([]);
                                        setIsSearching(false);
                                      }
                                    }}
                                  >
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* --- MODO INDICATORS --- */}
                  {activePanel === "indicators" && (
                    <motion.div
                      key="indicators"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="flex flex-col items-center gap-4 text-slate-700 h-[340px] w-[340px]"
                    >
                      <h3 className="text-base font-semibold text-slate-800 mb-1">
                        Select up to 2 indicators
                      </h3>

                      <div className="flex flex-col gap-2 w-[90%]">
                        {[
                          {
                            key: "undernourishment",
                            label: "Undernourishment",
                            color: "#2563eb",
                          },
                          {
                            key: "population",
                            label: "Population",
                            color: "#f97316",
                          },
                          {
                            key: "poverty",
                            label: "Poverty Rate",
                            color: "#40da78ff",
                          },
                          {
                            key: "consumer_price_index",
                            label: "Consumer Price Index",
                            color: "#9333ea",
                          },
                          {
                            key: "food_calories",
                            label: "Food Calories",
                            color: "#dc2626",
                          },
                          {
                            key: "average_dietary_energy_supply_adequacy",
                            label: "Dietary Energy Supply Adequacy",
                            color: "#0b2545",
                          },
                        ].map((item) => {
                          const isSelected = selectedIndicators.includes(
                            item.key
                          );

                          return (
                            <motion.button
                              key={item.key}
                              onClick={() => {
                                setShowComparisons(false);
                                setSelectedIndicators((prev) => {
                                  const current = [...prev];

                                  // se já estava selecionado → desmarca
                                  if (current.includes(item.key)) {
                                    return current.filter(
                                      (v) => v !== item.key
                                    );
                                  }

                                  // se já há 2 selecionados → bloqueia
                                  if (current.length >= 2) return current;

                                  // adiciona novo
                                  return [...current, item.key];
                                });
                              }}
                              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition border shadow-sm w-full
              ${
                isSelected
                  ? "bg-[#2563eb]/10 border-[#2563eb]/50"
                  : "bg-white border-slate-300 hover:bg-slate-50"
              }`}
                            >
                              {/* Esquerda: checkbox + nome */}
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={isSelected}
                                  className={`w-4 h-4 rounded border transition-all ${
                                    isSelected
                                      ? "bg-[#2563eb] border-[#2563eb]"
                                      : "border-slate-400 bg-transparent"
                                  }`}
                                />
                                <span
                                  className={`text-left ${
                                    isSelected
                                      ? "text-slate-900 font-semibold"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>

                              {/* Direita: cor do gráfico */}
                              <span
                                className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                                style={{ backgroundColor: item.color }}
                              />
                            </motion.button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-slate-500 mt-3 text-center leading-tight">
                        Selecting multiple indicators will overlay their data on
                        the same chart.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </aside>

              {/* Painel direito */}
              <main className="p-8 flex flex-col min-w-0">
                <div className="rounded-2xl flex-1 bg-white border border-slate-200 p-5 relative min-h-[420px] shadow-sm">
                  {/* título dinâmico */}
                  <h2 className="absolute top-0 left-1/2 -translate-x-1/2 text-slate-700 font-semibold text-lg tracking-wide capitalize">
                    {activePanel === "indicators"
                      ? selectedIndicators.length === 2
                        ? `${selectedIndicators[0].replaceAll(
                            "_",
                            " "
                          )} vs ${selectedIndicators[1].replaceAll("_", " ")}`
                        : selectedIndicators.length === 1
                        ? selectedIndicators[0].replaceAll("_", " ")
                        : "Select an indicator"
                      : indicator?.replaceAll("_", " ") || "Indicator"}
                  </h2>

                  {loading ? (
                    <div className="flex items-center justify-center h-full font-medium text-slate-500">
                      Loading data...
                    </div>
                  ) : (
                    <>
                      {/* ===================== COUNTRIES GRAPH ===================== */}
                      {(activePanel === "countries" ||
                        activePanel === "default") && (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            key={`${country}-${indicator}-countries`}
                            data={mergedData}
                            margin={{
                              top: 20,
                              right: 20,
                              left: 10,
                              bottom: 20,
                            }}
                          >
                            <CartesianGrid stroke="#e2e8f0" vertical={false} />
                            <XAxis
                              dataKey="year"
                              type="number"
                              domain={countryDomain}
                              ticks={countryYears}
                              allowDecimals={false}
                              tick={{
                                fontWeight: 600,
                                fontSize: 12,
                                fill: "#334155",
                              }}
                              axisLine={false}
                              tickFormatter={(v) => String(v)}
                            />

                            <YAxis
                              tick={{
                                fontWeight: 600,
                                fontSize: 12,
                                fill: "#334155",
                              }}
                              axisLine={false}
                              tickFormatter={(v) =>
                                indicator === "population"
                                  ? `${(v / 1_000_000).toFixed(1)}M`
                                  : `${v}`
                              }
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "13px",
                              }}
                              labelFormatter={(v) => `Year: ${v}`}
                              formatter={(v) => {
                                if (indicator === "population") {
                                  const millions = (
                                    Number(v) / 1_000_000
                                  ).toFixed(1);
                                  return [`${millions} million`, "Population"];
                                }
                                return [
                                  `${(Number(v) || 0).toFixed(2)}%`,
                                  indicator,
                                ];
                              }}
                            />

                            {/* Linha do país principal */}
                            {mergedData && mergedData.length > 0 && (
                              <Line
                                key={`${backendName}-${indicator}`}
                                dataKey={backendName}
                                type="monotone"
                                stroke={COLOR_PALETTE[0]}
                                strokeWidth={2.3}
                                dot={false}
                                connectNulls
                                name={commonName}
                              />
                            )}

                            {/* Linhas dos países comparados */}
                            {compareCountries.map((name, idx) => {
                              const hasData =
                                Array.isArray(
                                  compareSeriesRaw.find((s) => s.name === name)
                                    ?.data
                                ) &&
                                compareSeriesRaw.find((s) => s.name === name)
                                  ?.data.length > 0;

                              if (!hasData) return null;

                              return (
                                <Line
                                  key={`${name}-${indicator}`}
                                  dataKey={name}
                                  type="monotone"
                                  stroke={
                                    COLOR_PALETTE[
                                      (idx + 1) % COLOR_PALETTE.length
                                    ]
                                  }
                                  strokeWidth={2.3}
                                  dot={false}
                                  connectNulls
                                  name={name}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      )}

                      {/* ===================== INDICATORS GRAPH ===================== */}
                      {activePanel === "indicators" && (
                        <ResponsiveContainer width="100%" height="100%">
                          {selectedIndicators.length === 0 ? (
                            // 🟡 nenhum selecionado
                            <div className="flex items-center justify-center h-full font-medium text-slate-500"></div>
                          ) : selectedIndicators.length === 1 ? (
                            // 🟢 apenas 1 → renderiza o mesmo gráfico local
                            <LineChart
                              key={`${country}-${selectedIndicators[0]}-single`}
                              data={mergedData}
                              margin={{
                                top: 50,
                                right: 20,
                                left: 10,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid
                                stroke="#e2e8f0"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="year"
                                type="number"
                                domain={countryDomain}
                                ticks={countryYears}
                                allowDecimals={false}
                                tick={{
                                  fontWeight: 600,
                                  fontSize: 12,
                                  fill: "#334155",
                                }}
                                axisLine={false}
                                tickFormatter={(v) => String(v)}
                              />
                              <YAxis
                                tick={{
                                  fontWeight: 600,
                                  fontSize: 12,
                                  fill: "#334155",
                                }}
                                axisLine={false}
                                tickFormatter={(v) =>
                                  indicator === "population"
                                    ? `${(v / 1_000_000).toFixed(1)}M`
                                    : `${v}`
                                }
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                }}
                                labelFormatter={(v) => `Year: ${v}`}
                                formatter={(v) => {
                                  const key = selectedIndicators[0];
                                  if (key === "population") {
                                    const millions = (
                                      Number(v) / 1_000_000
                                    ).toFixed(1);
                                    return [
                                      `${millions} million`,
                                      "Population",
                                    ];
                                  }
                                  return [
                                    `${(Number(v) || 0).toFixed(2)}%`,
                                    key,
                                  ];
                                }}
                              />

                              <Line
                                dataKey={backendName}
                                type="monotone"
                                stroke={COLOR_PALETTE[0]}
                                strokeWidth={2.3}
                                dot={false}
                                connectNulls
                                name={getDisplayName(country)}
                              />
                            </LineChart>
                          ) : (
                            // 🔵 dois indicadores → gráfico comparativo via backend
                            <LineChart
                              key={`${country}-indicators`}
                              data={multiIndicatorChartData}
                              margin={{
                                top: 50,
                                right: 20,
                                left: 10,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid
                                stroke="#e2e8f0"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="year"
                                type="number"
                                domain={indDomain}
                                ticks={indYears}
                                allowDecimals={false}
                                tick={{
                                  fontWeight: 600,
                                  fontSize: 12,
                                  fill: "#334155",
                                }}
                                axisLine={false}
                                tickFormatter={(v) => String(v)}
                              />
                              <YAxis
                                tick={{
                                  fontWeight: 600,
                                  fontSize: 12,
                                  fill: "#334155",
                                }}
                                axisLine={false}
                                tickFormatter={(v) =>
                                  indicator === "population"
                                    ? `${(v / 1_000_000).toFixed(1)}M`
                                    : `${v}`
                                }
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                }}
                                labelFormatter={(v) => `Year: ${v}`}
                                formatter={(value, name) => {
                                  if (name === "population") {
                                    const millions = (
                                      Number(value) / 1_000_000
                                    ).toFixed(1);
                                    return [
                                      `${millions} million`,
                                      name.replaceAll("_", " "),
                                    ];
                                  }
                                  return [
                                    `${(Number(value) || 0).toFixed(2)}%`,
                                    name.replaceAll("_", " "),
                                  ];
                                }}
                              />
                              {indicatorData?.details &&
                                Object.keys(indicatorData.details || {}).map(
                                  (ind, idx) => (
                                    <Line
                                      key={ind}
                                      dataKey={ind}
                                      type="monotone"
                                      stroke={
                                        COLOR_PALETTE[
                                          idx % COLOR_PALETTE.length
                                        ]
                                      }
                                      strokeWidth={2.3}
                                      dot={false}
                                      connectNulls
                                      name={ind.replaceAll("_", " ")}
                                    />
                                  )
                                )}
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      )}
                    </>
                  )}
                </div>
              </main>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// =========================
// COMPONENTE DE PÍLULA
// =========================
function CountryPill({
  name,
  color,
  closable = false,
  onClose,
  hasData = true,
}) {
  // 🧠 converte nomes problemáticos manualmente para nomes ISO válidos
  const normalizedForFlag =
    {
      "Korea, Rep.": "South Korea",
      "Korea, Dem. People's Rep.": "North Korea",
      "Congo, Dem. Rep.": "Democratic Republic of the Congo",
      "Congo, Rep.": "Republic of the Congo",
      "Cote d'Ivoire": "Ivory Coast",
      "Egypt, Arab Rep.": "Egypt",
      "Gambia, The": "Gambia",
      "Iran, Islamic Rep.": "Iran",
      "Lao PDR": "Laos",
      "Yemen, Rep.": "Yemen",
      "Venezuela, RB": "Venezuela",
      Turkiye: "Turkey",
    }[name] || name;

  const a3 = countries.getAlpha3Code(normalizedForFlag, "en");
  const iso2 = a3 ? countries.alpha3ToAlpha2(a3) : null;

  return (
    <div className="flex items-center justify-between w-full px-4 py-2 rounded-xl border border-slate-200 shadow-sm bg-white hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        {iso2 && (
          <ReactCountryFlag
            countryCode={iso2}
            svg
            style={{ width: "1.5em", height: "1.5em", borderRadius: "3px" }}
          />
        )}
        <span className="font-medium text-slate-700 text-sm">
          {getDisplayName(name)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {hasData ? (
          <span
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : (
          <span className="text-xs text-slate-400 font-medium">(No data)</span>
        )}
        {closable && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            title="Remove comparison"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
