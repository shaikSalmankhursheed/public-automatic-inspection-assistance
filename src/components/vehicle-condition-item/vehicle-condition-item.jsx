import React from "react";
import "./vehicle-condition-item.css";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Button } from "@mui/material";

const VehicleConditionItem = ({
  imageUrl = "https://gts.ai/wp-content/uploads/2024/05/Damaged-car-gts-10.webp",
  Title = "Scratch",
  position = "Left front bumper",
  price = "10.00",
  priceExcludingVat = "8.00",
  isAddToRepairOrder = true,
  timeStamps = "0:03",
  severity = "Low",
}) => {
  const calculateSeverity = () => {
    let length = position?.split(",").length;
    if (length === 2) return "Low";
    if (length === 3) return "Medium";
    if (length === 4) return "High";
  };
  return (
    <div className="parent-wrapper">
      <div className="left-section">
        <div>
          <img src={imageUrl} alt="snapshot" width={100} height={100}></img>
        </div>
        <div className="left-section-text">
          at {parseFloat(Number(timeStamps).toFixed(2)) || 0}
        </div>
      </div>
      <div className="right-section">
        <div
          style={{
            fontSize: "18px",
            fontWeight: 400,
            textAlign: "left",
          }}
        >
          {Title}
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 400,
            textAlign: "left",
            color: "rgba(0, 0, 0, 0.6)",
          }}
        >
          {position}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            marginTop: "0.5rem",
            gap: 6,
          }}
        >
          <div style={{}}>Severity:</div>
          <div>{calculateSeverity()}</div>
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 500,
            textAlign: "left",
            color: "rgba(0, 0, 0, 0.6)",
            marginTop: "0.5rem",
          }}
        >
          &#163; {price}
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 400,
            textAlign: "left",
            color: "rgba(0, 0, 0, 0.6)",
          }}
        >
          excl. VAT &#163; {priceExcludingVat}
        </div>
        <Button
          sx={{
            display: isAddToRepairOrder ? "block" : "none",
            marginTop: "0.5rem",

            fontSize: "16px",
            backgroundColor: "white !important",
            color: "rgba(46, 121, 178, 1) !important",
            border: "1px solid rgba(46, 121, 178, 1) !important",
            borderRadius: "5px",
            cursor: "pointer",
            transition: "background-color 0.3s ease, border-color 0.3s ease",
            outline: "none !important",
            boxShadow: "none !important",

            "&:focus, &:focus-visible": {
              outline: "none !important",
            },
          }}
        >
          Add to repair order
        </Button>
      </div>
      <div>
        <DeleteOutlineRoundedIcon
          style={{ fontSize: "24px", color: "red", cursor: "pointer" }}
        />
      </div>
    </div>
  );
};

export default VehicleConditionItem;
