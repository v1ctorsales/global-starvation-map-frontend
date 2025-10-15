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

countries.registerLocale(enLocale);

const getColor = (value) => {
  if (value == null || isNaN(value)) return "#ccc";
  if (value <= 2.5) return "#d4f0f0";
  if (value <= 5) return "#a6dcef";
  if (value <= 10) return "#5aa9e6";
  if (value <= 20) return "#2e7bb4";
  if (value <= 40) return "#134074";
  return "#0b2545";
};

const indicatorLabels = {
  undernourishment: "Undernourishment",
  poverty: "Poverty Rate",
  population: "Population",
  food_calories: "Food Calories",
};

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function WorldMap() {
  const [data, setData] = useState([]);
  const [indicator, setIndicator] = useState("undernourishment");

  useEffect(() => {
    axios
      .get(`http://127.0.0.1:8000/latest?indicator=${indicator}`)
      .then((res) => {
        console.log("📊 Dados recebidos do backend:", res.data);
        setData(res.data);
      })
      .catch((err) => console.error("Erro na requisição:", err));
  }, [indicator]);

  const dataMap = {};
  data.forEach((d) => {
    dataMap[d["Country Name"]] = d.Value;
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
                const iso3 = countries.numericToAlpha3(geo.id);
                const iso2 = iso3
                  ? countries.alpha3ToAlpha2(iso3, "en")
                  : undefined;

                const val = dataMap[countryName];
                const fillColor = val !== undefined ? getColor(val) : "#EEE";

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
                      <strong>{countryName}</strong>
                    </span>

                    {val !== undefined ? (
                      <span>
                        {indicatorLabels[indicator]}: {val.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: "#666" }}>No data</span>
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
        <select
          value={indicator}
          onChange={(e) => setIndicator(e.target.value)}
          style={{ padding: "5px", marginBottom: "10px", display: "block" }}
        >
          {Object.entries(indicatorLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {[
          { label: "≤ 2.5", color: "#d4e6f0ff" },
          { label: "≤ 5", color: "#a6dcef" },
          { label: "≤ 10", color: "#5a86e6ff" },
          { label: "≤ 20", color: "#2e7bb4" },
          { label: "≤ 40", color: "#134074" },
          { label: "> 40", color: "#0b2545" },
          { label: "No data", color: "#ccc" },
        ].map((item, i) => (
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
                background: item.color,
                border: "1px solid #333",
                marginRight: 8,
              }}
            />
            <span style={{ color: "white", fontSize: 12 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <Tooltip id="country-tooltip" float />
    </>
  );
}
