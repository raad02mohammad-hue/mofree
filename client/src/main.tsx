import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Default to dark mode (health/life hub style)
if (!document.documentElement.classList.contains("dark") && !document.documentElement.classList.contains("light")) {
  document.documentElement.classList.add("dark");
}

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);
