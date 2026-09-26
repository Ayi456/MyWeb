import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import { registerServiceWorker } from "./pwa/register";
import "./styles/global.css";
import "./styles/overlay.css";
import "./styles/polish.css";
registerServiceWorker();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
