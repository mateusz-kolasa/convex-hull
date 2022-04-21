import './App.css';
import React, { useRef, useEffect, useState } from 'react';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';

function App() {
  const canvas = useRef();
  let context = null;

  var pointCount = 10;
  var displayPolygon = true;
  var displayConvexHull = true;

  const points = useRef([]);
  const hullRef = useRef([]);

  const [edgesBoundingBoxes, setEdgesBoundingBoxes] = useState([]);
  var edgesBoundingBoxesDisplay = [];

  // initialize the canvas context
  useEffect(() => {
    // dynamically assign the width and height to canvas
    const canvasElement = canvas.current;
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
 
    // get context of the canvas
    context = canvasElement.getContext("2d");

    generatePolygonAndHull();
  }, []);

  const generatePolygonAndHull = () => {
    points.current = []
    for (let i = 0; i < pointCount; i++) {
      var rand = getRandomPoint();
      points.current.push(rand);
    }
    points.current.sort((a, b) => getAngle(a) - getAngle(b));

    var ch = require('convex-hull');
    var hullIndexes = ch(points.current.map(point => [point.x, point.y]));

    hullRef.current = [];
    for (let i = 0; i < hullIndexes.length; i++) {
      hullRef.current.push(points.current[hullIndexes[i][0]]);
    }

    redraw();
  }

  // Clear rect and draw polygon and it's convex hull
  const redraw = () => {
    context = canvas.current.getContext("2d");
    context.clearRect(0, 0, canvas.current.width, canvas.current.height);

    for (let i = 0; i < points.current.length; i++) {
      drawCircle(points.current[i]);
    }

    if (displayPolygon)
      drawPolygon(points.current, 'blue')

    if (displayConvexHull)
      drawPolygon(hullRef.current, 'green');

    for (let i = 0; i < edgesBoundingBoxes.length; i++) {
      if (edgesBoundingBoxesDisplay[i]) {
        let rectangle = boundingBoxToRectangle(edgesBoundingBoxes[i]);
        rectangle = rotatePolygon(rectangle, edgesBoundingBoxes[i].angle);
        drawPolygon(rectangle, 'brown');
      }
    }
  }

  // Calculate areas of rectangle using min-max points after rotating to edge
  const areaFromEdges = () => {
    let hull = hullRef.current;
    redraw();
    
    let boundingBoxes = [];
    hull.push(hull[0]);
    for (let i = 0; i < hull.length - 1; i++) {

      // Calculate angle between line and x axis
      let xr = hull[i].x - hull[i + 1].x;
      let yr = hull[i].y - hull[i + 1].y;
      let angle = Math.atan2(yr, xr);
      
      // rotate polygon in opoosite direction and find it's bounding box
      let rotated = rotatePolygon(hull, -angle);
      let boundingBoxArea = getBoundingBoxAndArea(rotated);
      boundingBoxArea.angle = angle;
      boundingBoxes.push(boundingBoxArea);
    }
    boundingBoxes.sort((a, b) => a.area - b.area);
    edgesBoundingBoxesDisplay = new Array(boundingBoxes.length).fill(false);

    hull.pop();
    setEdgesBoundingBoxes(boundingBoxes);
  }

  // Rotate polygon by angle around center of canvas
  const rotatePolygon = (polygon, angle) => {
    let x_center = canvas.current.width / 2;
    let y_center = canvas.current.height / 2;
    let rotated_polygon = [];

    for (let i = 0; i < polygon.length; i++) {
      let x = polygon[i].x - x_center; 
      let y = polygon[i].y - y_center;

      let xRotated = (x * Math.cos(angle)) - (y * Math.sin(angle)) + x_center;
      let yRotated = (x * Math.sin(angle)) + (y * Math.cos(angle)) + y_center;

      rotated_polygon.push({x: xRotated, y: yRotated});
    }

    return rotated_polygon;
  }

  // Find bounding box of polygon and calculate area
  const getBoundingBoxAndArea = (polygon) => {
    let polygon_x = polygon.map((vertex) => vertex.x);
    let polygon_y = polygon.map((vertex) => vertex.y);

    let xmin = Math.min(...polygon_x);
    let ymin = Math.min(...polygon_y);
    let xmax = Math.max(...polygon_x);
    let ymax = Math.max(...polygon_y);

    return {xmin: xmin, ymin: ymin, xmax: xmax, ymax: ymax, area: (xmax-xmin)*(ymax-ymin)};
  }

  // convert bounding box to point list
  const boundingBoxToRectangle = (boundingBox) => {
    let rectangle = [];
    rectangle.push({x: boundingBox.xmin, y: boundingBox.ymin});
    rectangle.push({x: boundingBox.xmax, y: boundingBox.ymin});
    rectangle.push({x: boundingBox.xmax, y: boundingBox.ymax});
    rectangle.push({x: boundingBox.xmin, y: boundingBox.ymax});
    return rectangle;
  }

  const drawLine = (info, style = {}) => {
    const { x, y, x1, y1 } = info;
    const { color = 'black', width = 1 } = style;
 
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  }

  const drawCircle = (info, style = {}) => {
    const { x, y } = info;
    const { color = 'black', size = 3 } = style;

    context.fillStyle = color;
    context.beginPath();
    context.ellipse(x, y, size, size, 0, 0, 2 * Math.PI);
    context.fill();
  };

  const drawPolygon = (points, color) => {
    for (let i = 0; i < points.length - 1; i++) {
      drawLine({ x: points[i].x, y: points[i].y, x1: points[i+1].x, y1: points[i+1].y }, { color: color });
    }
    drawLine({ x: points[points.length-1].x, y: points[points.length-1].y, x1: points[0].x, y1: points[0].y }, { color: color });
  }

  // Get angle relative to center of canvas
  const getAngle = (point) => {
    return Math.atan2(canvas.current.height / 2 - point.y, canvas.current.width / 2 - point.x);
  }

  // Generates random point within canvas minus padding 
  const getRandomPoint = () => {
    let padding = 0.1;

    var x = Math.random() * (canvas.current.width * (1 - 2 * padding)) + (canvas.current.width * padding);
    var y = Math.random() * (canvas.current.height * (1 - 2 * padding)) + (canvas.current.height * padding);
    return { x: x, y: y };
  }

  const setPointCount = (val) => {
    if (pointCount == val)
      return;

    pointCount = val;
    generatePolygonAndHull();
  }

  const setPolygonDisplay = (isOn) => {
    displayPolygon = isOn;
    redraw();
  } 

  const setConvexHullDisplay = (isOn) => {
    displayConvexHull = isOn;
    redraw();
  }

  const setEdgesBoundingBoxesChecked = (index, isOn) => {
    edgesBoundingBoxesDisplay[index] = isOn;
    redraw();
  }

  return (
    <div className="App">
      <div className='split-panel'>
        <div className='menu-panel'>
          <Typography id="input-points-count" gutterBottom>
            Liczba punktów
          </Typography>
          <Slider defaultValue={10} min={5} max={25} valueLabelDisplay="on" aria-labelledby='input-points-count'
               onChange={(e, val) => setPointCount(val) } />

            <FormControlLabel control={<Checkbox defaultChecked />} label="Figura" 
                  onChange={(e) => setPolygonDisplay(e.target.checked) } />
            <FormControlLabel control={<Checkbox defaultChecked />} label="Powłoka wypukła" 
                  onChange={(e) => setConvexHullDisplay(e.target.checked) } />

            <Button variant="contained" onClick={() => { areaFromEdges()}}>Pole za pomocą krawędzi</Button>
            {edgesBoundingBoxes.map((item, index) => (
                <FormControlLabel control={<Checkbox />} label={item.area} key={"edgeChecbox" + index}
                onChange={(e) => setEdgesBoundingBoxesChecked(index, e.target.checked) } />
            ))}
        </div>

        <div className='canvas-panel'>
          <canvas ref={canvas}></canvas>
        </div>
      </div>
    </div>
  );
}

export default App;
