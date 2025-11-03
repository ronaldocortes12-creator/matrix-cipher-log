import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorHandler } from "./utils/errorReporting";

// Setup global error reporting
setupGlobalErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);
