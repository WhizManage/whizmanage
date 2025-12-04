import App from "./App";
import { render } from "@wordpress/element";
import "./global.css";
// import "./style.css";

import { ContextProvider } from "./context/ContextProvider";

render(
  <ContextProvider>
    <App />
  </ContextProvider>,
  document.getElementById("whizmanage")
);
