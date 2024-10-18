import { Box } from "@mui/material";
import { LandingPage } from "./pages/LandingPage";
import { InitialPage } from "./pages/InitialPage";
import { useState } from "react";
const App = () => {
  const [isLandingPage, setIsLandingPage] = useState(true);
  return (
    <Box
      sx={{
        backgroundColor: " #00000026;",
        minHeight: "100vh",
        overflow: "auto",
      }}
    >
      {isLandingPage ? (
        <LandingPage setIsLandingPage={setIsLandingPage} />
      ) : (
        <InitialPage />
      )}
    </Box>
  );
};

export default App;
