import * as tf from "@tensorflow/tfjs";
import { renderBoxes, Colors, renderPartsBoxes } from "./renderBox";
import labels from "./labels.json";
import parts_lables from "./parts_labels.json";

const numClass = labels.length;
const partnumClass = parts_lables.length;
const colors = new Colors();

/**
 * Preprocess image / frame before forwarded into the model
 * @param {HTMLVideoElement|HTMLImageElement} source
 * @param {Number} modelWidth
 * @param {Number} modelHeight
 * @returns input tensor, xRatio and yRatio
 */
const preprocess = (source, modelWidth, modelHeight) => {
  let xRatio, yRatio; // ratios for boxes
  const input = tf.tidy(() => {
    const img = tf.browser.fromPixels(source);

    // padding image to square => [n, m] to [n, n], n > m
    const [h, w] = img.shape.slice(0, 2); // get source width and height
    const maxSize = Math.max(w, h); // get max size
    const imgPadded = img.pad([
      [0, maxSize - h], // padding y [bottom only]
      [0, maxSize - w], // padding x [right only]
      [0, 0],
    ]);

    xRatio = maxSize / w; // update xRatio
    yRatio = maxSize / h; // update yRatio

    return tf.image
      .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
      .div(255.0) // normalize
      .expandDims(0); // add batch
  });

  return [input, xRatio, yRatio];
};

/**
 * Function to detect image.
 * @param {HTMLImageElement} source Source
 * @param {tf.GraphModel} model loaded YOLOv8 tensorflow.js model
 * @param {HTMLCanvasElement} canvasRef canvas reference
 * @param {VoidFunction} callback Callback function to run after detect frame is done
 */
export const detectFrame = async (source, model, canvasRef, captureRef, partsModel, detections, setDetections, callback = () => {}) => {

  const [modelHeight, modelWidth] = model.inputShape.slice(1, 3); // get model width and height
  const [modelSegHeight, modelSegWidth, modelSegChannel] = model.outputShape[0].slice(1);
  const ctx = canvasRef.getContext("2d");
  const captureContext = captureRef.getContext('2d');
  // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas
  tf.engine().startScope(); // start scoping tf engine
  captureContext.drawImage(source,0,0,ctx.canvas.width,ctx.canvas.height);
  const currentTime = source.currentTime;
  const start = performance.now();

  const [input, xRatio, yRatio] = preprocess(source, modelWidth, modelHeight); // do preprocessing

  const res = model.net.execute(input); // execute model
  const transRes = tf.tidy(() => res[1].transpose([0, 2, 1])); // transpose main result
  const transSegMask = tf.tidy(() => res[0].transpose([0, 3, 1, 2]).squeeze()); // transpose segmentation mask result

  const boxes = tf.tidy(() => {
    const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
    const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
    const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
    const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
    return tf
      .concat(
        [
          y1,
          x1,
          tf.add(y1, h), //y2
          tf.add(x1, w), //x2
        ],
        2
      )
      .squeeze();
  }); // get boxes [y1, x1, y2, x2]
  const [scores, classes] = tf.tidy(() => {
    // class scores
    const rawScores = transRes.slice([0, 0, 4], [-1, -1, numClass]).squeeze(0); // #6 only squeeze axis 0 to handle only 1 class models
    return [rawScores.max(1), rawScores.argMax(1)];
  });  // get scores and classes

  const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2); // do nms to filter boxes
  const detReady = tf.tidy(() =>
    tf.concat(
      [
        boxes.gather(nms, 0),
        scores.gather(nms, 0).expandDims(1),
        classes.gather(nms, 0).expandDims(1),
      ],
      1 // axis
    )
  ); // indexing selected boxes, scores and classes from NMS result


  const numDetections = await detReady.dataSync().length/6;
  if (numDetections<=0){
    callback;
  }
  const masks = tf.tidy(() => {
    const sliced = transRes.slice([0,0, 4 + numClass], [-1, -1,modelSegChannel]).squeeze(); // slice mask from every detection [m, mask_size]
    return sliced
      .gather(nms, 0) // get selected mask from NMS result
      .matMul(transSegMask.reshape([modelSegChannel, -1])) // matmul mask with segmentation mask result [n, mask_size] x [mask_size, h x w] => [n, h x w]
      .reshape([nms.shape[0], modelSegHeight, modelSegWidth]); // reshape back [n, h x w] => [n, h, w]
  }); // processing mask

  const toDraw = []; // list boxes to draw
  let overlay = tf.zeros([modelHeight, modelWidth, 4]); // initialize overlay to draw mask
  var targetRGBA;
  for (let i = 0; i < detReady.shape[0]; i++) {
    const rowData = detReady.slice([i, 0], [1, 6]); // get every first 6 element from every row
    let [y1, x1, y2, x2, score, label] = rowData.dataSync(); // [y1, x1, y2, x2, score, label]
    const color = colors.get(label); // get label color
  
    const downSampleBox = [
      Math.floor((y1 * modelSegHeight) / modelHeight), // y
      Math.floor((x1 * modelSegWidth) / modelWidth), // x
      Math.round(((y2 - y1) * modelSegHeight) / modelHeight), // h
      Math.round(((x2 - x1) * modelSegWidth) / modelWidth), // w
    ]; // downsampled box (box ratio at model output)
  
    const upSampleBox = [
      Math.floor(y1 * yRatio), // y
      Math.floor(x1 * xRatio), // x
      Math.round((y2 - y1) * yRatio), // h
      Math.round((x2 - x1) * xRatio), // w
    ]; // upsampled box (box ratio to draw)
  
    const proto = tf.tidy(() => {
      const sliced = masks.slice(
        [
          i,
          downSampleBox[0] >= 0 ? downSampleBox[0] : 0,
          downSampleBox[1] >= 0 ? downSampleBox[1] : 0,
        ],
        [
          1,
          downSampleBox[0] + downSampleBox[2] <= modelSegHeight
            ? downSampleBox[2]
            : modelSegHeight - downSampleBox[0],
          downSampleBox[1] + downSampleBox[3] <= modelSegWidth
            ? downSampleBox[3]
            : modelSegWidth - downSampleBox[1],
        ]
      ); // coordinate to slice mask from proto
      return sliced.squeeze().expandDims(-1); // sliced proto [h, w, 1]
    });
    const upsampleProto = tf.image.resizeBilinear(proto, [upSampleBox[2], upSampleBox[3]]); // resizing proto to drawing size
    const mask = tf.tidy(() => {
      const padded = upsampleProto.pad([
        [upSampleBox[0], modelHeight - (upSampleBox[0] + upSampleBox[2])],
        [upSampleBox[1], modelWidth - (upSampleBox[1] + upSampleBox[3])],
        [0, 0],
      ]); // padding proto to canvas size
      return padded.less(0.5); // make boolean mask from proto to indexing overlay
    }); // final boolean mask
  
    // Convert mask to a boolean array and find coordinates of mask pixels
    targetRGBA = [...Colors.hexToRgba(color), 150];
    overlay = tf.tidy(() => {
      const newOverlay = overlay.where(mask, [...Colors.hexToRgba(color), 150]); // indexing overlay from mask with RGBA code
      overlay.dispose(); // dispose old overlay tensor (free memory)
      return newOverlay; // return new overlay
    }); // new overlay
 // Log the mask coordinates
 

    toDraw.push({
      box: upSampleBox,
      score: score,
      klass: label,
      label: labels[label],
      color: color,
      // maskCoordinates: maskCoordinates, // Store coordinates of the mask
    }); // push box information to draw later
  
    tf.dispose([rowData, proto, upsampleProto, mask]); // dispose unused tensor to free memory
  }

  const maskImg = new ImageData(
    new Uint8ClampedArray(await overlay.data()), // tensor to array
    modelHeight,
    modelWidth
  ); // create image data from mask overlay
   // render overlay to canvas
  
  function findPixelsWithRGBA(imageData, targetRGBA) {
    const { width, height, data } = imageData; // Get width, height, and pixel data
    const coordinates = [];
    
    // Loop through each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];     // Red channel
      const g = data[i + 1]; // Green channel
      const b = data[i + 2]; // Blue channel
      const a = data[i + 3]; // Alpha channel
  
      // Check if the current pixel matches the target RGBA value
      if (r === targetRGBA[0] && g === targetRGBA[1] && b === targetRGBA[2] && a === targetRGBA[3]) {
        // Calculate the x and y coordinates of the pixel
        const pixelIndex = i / 4; // Divide by 4 because there are 4 values per pixel (RGBA)
        const x = pixelIndex % width; // X coordinate
        const y = Math.floor(pixelIndex / width); // Y coordinate
  
        // Store the coordinates
        coordinates.push({ x, y });
      }
    }
  
    return coordinates;
  }
  // console.log(targetRGBA);
  // Example usage:
  const matchingPixels = numDetections>0?findPixelsWithRGBA(maskImg, targetRGBA):[{x:0,y:0}];
  
  // Logs an array of coordinates where the target color is found
  // ctx.fillStyle= [...Colors.hexToRgba('#000000'), 150];
  // matchingPixels.forEach(({ x, y }) => {
  //   ctx.fillRect(x, y, 1, 1); // Draw a 1x1 rectangle at (x, y)
  // });

  // renderBoxes(ctx, toDraw); // render boxes

  await detectParts(source,currentTime,input,xRatio,yRatio,partsModel, ctx, captureRef, captureContext,matchingPixels , maskImg, toDraw, detections, setDetections);
  tf.engine().endScope(); // end of scoping

  callback();
   // run callback function

  
};


export const detectParts = async (source,currentTime,input,xRatio,yRatio, model, ctx, captureRef,captureContext,maskCoordinates, maskImg, toDraw, detections, setDetections) => {
  // console.log(maskCoordinates)
  // console.log(model)
  // const start = performance.now();
  // const [modelWidth, modelHeight] = model.inputShape.slice(1, 3); // get model width and height
  // tf.engine().startScope(); // start scoping tf engine
  // const [input, xRatio, yRatio] = preprocess(source, modelWidth, modelHeight); // preprocess image
  // console.log(model)
  const res = model.net.execute(input); // inference model
  const transRes = res.transpose([0, 2, 1]); // transpose result [b, det, n] => [b, n, det]
  // console.log(transRes)
  const boxes = tf.tidy(() => {
    const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
    const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
    const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
    const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
    return tf
      .concat(
        [
          y1,
          x1,
          tf.add(y1, h), //y2
          tf.add(x1, w), //x2
        ],
        2
      )
      .squeeze();
  }); // process boxes [y1, x1, y2, x2]
  const [scores, classes] = tf.tidy(() => {
    // class scores
    const rawScores = transRes.slice([0, 0, 4], [-1, -1, partnumClass]).squeeze(0); // #6 only squeeze axis 0 to handle only 1 class models
    return [rawScores.max(1), rawScores.argMax(1)];
  }); // get max scores and classes index

  const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2); // NMS to filter boxes
  const boxes_data = boxes.gather(nms, 0).dataSync(); // indexing boxes by nms index
  const scores_data = scores.gather(nms, 0).dataSync(); // indexing scores by nms index
  const classes_data = classes.gather(nms, 0).dataSync(); // indexing classes by nms index
  const filtered_boxes= []
  const filtered_scores = []
  const filtered_classes = []
  for (let i = 0; i < scores_data.length; ++i) {
    let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4); // Extract part box coordinates
    // console.log(y1, x1, y2, x2)
    // Check if this box is within the mask coordinates
    let pixel_count = 0
    const box_area = (x2-x1) * (y2-y1)
    maskCoordinates.forEach(({ x, y }) => {
      if( x >= x1 && x <= x2 && y >= y1 && y <= y2){
        pixel_count+=1;
      }
    });
    // console.log(pixel_count)
    const box_overlap_percentage = (pixel_count/box_area)*100;

    // If the part is inside the mask, add it to the filtered parts list
    const parts_over_damages = maskCoordinates.every(({x,y})=>{
      if( x >= x1 && x <= x2 && y >= y1 && y <= y2){
        return true;
      }
      else{
        return false;
      }
    });
    const damage_overlap_percentage = (pixel_count/maskCoordinates.length)*100;
    if (box_overlap_percentage>20||parts_over_damages|| damage_overlap_percentage>20) {
        // console.log(isInMask)
        filtered_boxes.push(y1, x1, y2, x2);
        filtered_scores.push(scores_data[i]);
        filtered_classes.push(classes_data[i]);
    }
  }
  if (filtered_classes.length>0){
      // renderPartsBoxes(ctx,boxes_data, scores_data, classes_data,[xRatio,yRatio])
      ctx.putImageData(maskImg, 0, 0);
      renderPartsBoxes(ctx, filtered_boxes, filtered_scores, filtered_classes, [xRatio, yRatio]); // render boxes
      const filtered_class_names= filtered_classes.map(ind=>{
        return parts_lables[ind];
      })
      // console.log(detections);

        const prevParts =new  Set();
        detections.map((item)=>{
          item.parts.map(part=>{
            prevParts.add(part);
          })
        });
        const parts = []
        filtered_class_names.map(name=>{
            if(!prevParts.has(name)){
              parts.push(name);
            }
        })
        if (parts.length>0){
          // console.log([...detections,{timeStamp:source.currentTime,parts:parts}]);
          // console.log(parts)

          captureContext.fillStyle= '#B23B46';
          captureContext.globalAlpha = 0.75
          maskCoordinates.map(({x,y})=>{
              captureContext.fillRect(x,y,1,1);
          })
          renderPartsBoxes(captureContext, filtered_boxes, filtered_scores, filtered_classes, [xRatio, yRatio]);
          // captureContext.putImageData(maskImg,0,0);
          const curImage = captureRef.toDataURL('image/jpeg')
          const end = performance.now()
          // console.log(end-start,"ms")
          // const delayTime = (end-start)/1000;
          setDetections(prevState=>[...prevState,{timeStamp:currentTime,parts:parts,img:curImage}]);
          detections.push({timeStamp:currentTime,parts:parts,img:curImage});

        }

      // setDetections((prevState)=>{
      //   if(prevState.length>0){
      //     const prevParts =new  Set();
      //     prevState.map((item)=>{
      //       item.parts.map(part=>{
      //         prevParts.add(part);
      //       })
      //     });
      //     const parts = []
      //     filtered_class_names.map(name=>{
      //         if(!prevParts.has(name)){
      //           parts.push(name);
      //         }
      //     })
      //     if (parts.length>0){
      //       prevState.push({timeStamp:source.currentTime,parts:parts})
      //     }
      //     return prevState;
      //   }
      //   else{
      //     prevState.push({timeStamp:source.currentTime,parts:filtered_class_names})
      //     return prevState
      //   }
       
      // });
  }
  else{
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  }
  // tf.dispose([res, transRes, boxes, scores, classes, nms]); // clear memory

};
/**
 * Function to detect video from every source.
 * @param {HTMLVideoElement} vidSource video source
 * @param {tf.GraphModel} model loaded YOLOv8 tensorflow.js model
 * @param {HTMLCanvasElement} canvasRef canvas reference
 */
export const detectVideo = async (vidSource, model, canvasRef, captureRef, partsModel, detections, setDetections )=> {
  /**
   * Function to detect every frame from video
   */
  const detect = async () => {
    console.log(detections);
    if (vidSource.videoWidth === 0 && vidSource.srcObject === null) {
      const ctx = canvasRef.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas
      return; // handle if source is closed
    }
    
    if (!vidSource.paused){
        await detectFrame(vidSource, model, canvasRef, captureRef, partsModel, detections, setDetections,() => {
        setTimeout(detect,40); // get another frame
      });
    }
    else if (vidSource.paused){
      await detectFrame(vidSource,model,canvasRef,captureRef,partsModel,detections,setDetections);
    }
    // detectParts(vidSource,partsModel,canvasRef,()=>{
    //   requestAnimationFrame(detect)
    // })
  };

  await detect(); // initialize to detect every frame
};
