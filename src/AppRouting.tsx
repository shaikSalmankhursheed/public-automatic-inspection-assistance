import { LandingPage } from "./pages/LandingPage";
import { InitialPage } from "./pages/InitialPage";
import { useState } from "react";
export const AppRouting = () => {
  const [isLandingPage, setIsLandingPage] = useState(true);

  return (
    <>
      {isLandingPage ? (
        <LandingPage setIsLandingPage={setIsLandingPage} />
      ) : (
        <InitialPage />
      )}
    </>
  );
};

export default AppRouting;
