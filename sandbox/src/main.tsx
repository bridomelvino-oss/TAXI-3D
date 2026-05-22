import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../../jungletribes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
