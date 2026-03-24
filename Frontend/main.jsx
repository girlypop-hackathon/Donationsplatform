/*
Oprettet: 17-03-2026
Oprettet af: Nikoleta
Beskrivelse: Main entry point for the React application. Renders the App component into the root DOM element. Also imports global styles for the application.
*/

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
