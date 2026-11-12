import React from "react";
import { createRoot } from "react-dom/client";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./app.css";
import { Theme } from "@astryxdesign/core/theme";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import huHU from "@astryxdesign/core/locales/hu-HU.generated.js";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { App } from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Theme theme={neutralTheme} mode="system">
      <InternationalizationProvider locale="hu-HU" messages={{ "hu-HU": huHU }}>
        <App />
      </InternationalizationProvider>
    </Theme>
  </React.StrictMode>
);
