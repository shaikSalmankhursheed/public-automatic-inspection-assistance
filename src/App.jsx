import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import ButtonHandler from "./components/btn-handler";
import { detectFrame, detectVideo } from "./utils/detect";
import "./style/App.css";
import CustomVideoPlayer from "./components/CustomVideoPlayer";
import NewLoader from "./components/newLoader";
import VehicleConditionItem from "./components/vehicle-condition-item/vehicle-condition-item";

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 }); // loading state
  const [model, setModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  }); // init model & input shape
  const [partsModel, setPartsModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  }); // init parts model & input shape
  const [detections, setDetections] = useState([]);
  // references
  const imageRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const captureRef = useRef(null);

  // model configs
  const modelName = "yolov8n_seg";
  // console.log(detections);
  useEffect(() => {
    tf.ready().then(async () => {
      const yolov8 = await tf.loadGraphModel(
        `${window.location.href}/${modelName}_web_model/model.json`,
        {
          onProgress: (fractions) => {
            setLoading({ loading: true, progress: fractions }); // set loading fractions
          },
        }
      ); // load model

      // warming up model
      const dummyInput = tf.randomUniform(
        yolov8.inputs[0].shape,
        0,
        1,
        "float32"
      ); // random input
      const warmupResults = yolov8.execute(dummyInput);

      setLoading({ loading: false, progress: 1 });
      setModel({
        net: yolov8,
        inputShape: yolov8.inputs[0].shape,
        outputShape: warmupResults.map((e) => e.shape),
      }); // set model & input shape

      const yolov8n = await tf.loadGraphModel(
        `${window.location.href}/yolov8n_web_model/model.json`,
        {
          onProgress: (fractions) => {
            setLoading({ loading: true, progress: fractions }); // set loading fractions
          },
        }
      ); // load model

      // warming up model
      const partsWarmupResults = yolov8n.execute(dummyInput);
      setLoading({ loading: false, progress: 1 });
      setPartsModel({
        net: yolov8n,
        inputShape: yolov8n.inputs[0].shape,
      });
      tf.dispose([warmupResults, dummyInput, partsWarmupResults]); // cleanup memory
    });
  }, []);
  // useEffect(()=>{
  //   console.log(detections);
  // },[detections])

  const getPositions = (partsObject) => {
    let result = "";
    partsObject?.map((part) => {
      result += part.replaceAll("_", " ") + ",";
    });

    return result;
  };
  return (
    <div className="App">
      {loading.loading && (
        <NewLoader />

        //  <Loader>Loading... {(loading.progress * 100).toFixed(2)}%</Loader>
      )}
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className="header">
            <h1>Automatic Smart Vehicle Inspection Assistance</h1>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div className="content" style={{ marginY: "5rem" }}>
              <img
                src="#"
                ref={imageRef}
                onLoad={() =>
                  detectFrame(
                    imageRef.current,
                    model,
                    canvasRef.current,
                    captureRef.current,
                    partsModel,
                    detections,
                    setDetections
                  )
                }
              />
              <video
                autoPlay
                muted
                ref={cameraRef}
                onPlay={() =>
                  detectVideo(
                    cameraRef.current,
                    model,
                    canvasRef.current,
                    captureRef.current,
                    partsModel,
                    detections,
                    setDetections
                  )
                }
                // controls
              />
              <video
                autoPlay
                muted
                ref={videoRef}
                onPlay={() => {
                  detectVideo(
                    videoRef.current,
                    model,
                    canvasRef.current,
                    captureRef.current,
                    partsModel,
                    detections,
                    setDetections
                  );
                }}
                onSeeked={() =>
                  detectFrame(
                    videoRef.current,
                    model,
                    canvasRef.current,
                    captureRef.current,
                    partsModel,
                    detections,
                    setDetections
                  )
                }
                // onPlay={()=> detectVideo(videoRef.current,model,canvasRef.current, partsModel)}
                // onPause={()=>{setPaused(true);detectFrame(videoRef.current,model,canvasRef.current,partsModel)}}
              />
              <CustomVideoPlayer videoRef={videoRef}></CustomVideoPlayer>
              <canvas
                width={model.inputShape[1]}
                height={model.inputShape[2]}
                ref={canvasRef}
              />
              <canvas
                style={{ display: "none" }}
                width={model.inputShape[1]}
                height={model.inputShape[2]}
                ref={captureRef}
              ></canvas>
            </div>

            <ButtonHandler
              imageRef={imageRef}
              cameraRef={cameraRef}
              videoRef={videoRef}
              canvasRef={canvasRef.current}
              setDetections={setDetections}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              gap: "2rem",
              overflowY: "auto",
            }}
          >
            {detections?.map((detection) => {
              return (
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    videoRef.current.currentTime = detection.timeStamp;
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <VehicleConditionItem
                    imageUrl={detection.img}
                    timeStamps={detection.timeStamp}
                    severity="Low"
                    position={getPositions(detection.parts)}
                    isAddToRepairOrder={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
