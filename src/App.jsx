import {
  Box,
} from "@mui/material";
import { LandingPage } from "./pages/LandingPage";
import { InitialPage } from "./pages/InitialPage";
import { useState } from "react";
const App = () => {
  const [isLandingPage, setIsLandingPage] = useState(true);
  return (
    <Box sx={{backgroundColor: " #00000026;", height: "100%"}}>    
      {isLandingPage ? (
        <LandingPage setIsLandingPage={setIsLandingPage} />
      ) : (
        <InitialPage />
      )}
    </Box>
  );
};

export default App;
