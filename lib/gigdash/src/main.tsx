import { createRoot } from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";
import "./index.css";

document.documentElement.classList.add("dark");
document.documentElement.classList.remove("light");
localStorage.removeItem("gigdash-theme");

createRoot(document.getElementById("root")!).render(<App />);
