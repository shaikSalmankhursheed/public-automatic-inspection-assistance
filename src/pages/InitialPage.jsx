import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import ButtonHandler from "../components/btn-handler";
import { detectFrame, detectVideo } from "../utils/detect";
import "../style/App.css";
import CustomVideoPlayer from "../components/CustomVideoPlayer";
import NewLoader from "../components/newLoader";
import VehicleConditionItem from "../components/vehicle-condition-item/vehicle-condition-item";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export const InitialPage = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 }); // loading state
  const [model, setModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  }); // init model & input shape
  const [videoEnded, setVideoEnded] = useState(false);
  const [partsModel, setPartsModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  }); // init parts model & input shape
  const [detections, setDetections] = useState([]);
  const [analysedDetections, setAnalysedDetections] = useState([]);
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
  const handleSubmit = async () => {
    // event.preventDefault();
    const content = [];
    let prompt = "detect damage seviority of ";
    let partCount = Number(detections.length);
    const imageList = [];
    detections.map((item) => {
      item.parts.map((part) => {
        prompt += part + ",";
      });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: item.img.split(",")[1],
        },
      });
    });
    prompt += `for given ${partCount} images and produce the array of json as below model, Answer in JSON formatAssistant:
[{
  FileName:"",
  Severity:"",
  Description:"",
  EstimationCost:"",
              }]`;
    content.unshift({ type: "text", text: prompt });
    // content.push({"type": "text",
    //             "text":prompt})
    // content.push(imageList);
    // console.log(content);
    const client = new BedrockRuntimeClient({
      region: "us-west-2",
      credentials: {
        accessKeyId: import.meta.env.VITE_accessKeyId,
        secretAccessKey: import.meta.env.VITE_secretAccessKey,
      },
    });

    const params = {
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0", // or any other model ID you want to use
      contentType: "application/json",
      accept: "application/json",

      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: content,
          },
        ],
      }),
    };

    try {
      const command = new InvokeModelCommand(params);
      const data = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(data.body));
      console.log("responseBody", JSON.parse(responseBody.content[0].text));
      const d = JSON.parse(responseBody.content[0].text);
      const awsAnalysed = [];
      d.map((item, index) => {
        awsAnalysed.push({ ...detections[index], ...item });
      });
      setAnalysedDetections(awsAnalysed);
      console.log(analysedDetections);
      setVideoEnded(true);
      // setResponse(responseBody);
    } catch (error) {
      setVideoEnded(true);
      console.error("Error invoking Bedrock model:", error);
      // setResponse("Error occurred while processing your request.");
    }
  };

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
                onEnded={() => {
                  handleSubmit();
                }}
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
              setVideoEnded={setVideoEnded}
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
            {videoEnded &&
              (analysedDetections.length > 0
                ? analysedDetections?.map((detection, ind) => {
                    // console.log(detection.Seviority);
                    if (ind < detections.length) {
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
                            severity={detection.Severity}
                            position={getPositions(detection.parts)}
                            isAddToRepairOrder={false}
                            price={detection.EstimationCost}
                          />
                        </div>
                      );
                    }
                  })
                : detections?.map((detection, ind) => {
                    // console.log(detection.Seviority);
                    if (ind < detections.length) {
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
                            position={getPositions(detection.parts)}
                            isAddToRepairOrder={false}
                          />
                        </div>
                      );
                    }
                  }))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default InitialPage;
