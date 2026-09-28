import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* /app?job=<id> for a real upload, /app?demo=1 for the demo */}
        <Route path="/app" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
