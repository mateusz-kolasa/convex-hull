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
  var displayBezier = true;

  var bezierSize = 0.1;
  var elipsePoints = 100;
  const bezierPointsRef = useRef([]);
  const elipsePointsRef = useRef([]);

  const points = useRef([]);
  const hullRef = useRef([]);

  const [edgesBoundingBoxes, setEdgesBoundingBoxes] = useState([]);
  var edgesBoundingBoxesDisplay = [];

  var geneticCount = 6;
  var geneticIters = 100;
  var geneticBoundingBoxesDisplay = [];
  const [geneticBoundingBoxes, setGeneticBoundingBoxes] = useState([]);

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

    generateBezier();
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

    for (let i = 0; i < geneticBoundingBoxes.length; i++) {
      if (geneticBoundingBoxesDisplay[i]) {
        let rectangle = boundingBoxToRectangle(geneticBoundingBoxes[i]);
        rectangle = rotatePolygon(rectangle, -geneticBoundingBoxes[i].angle);
        drawPolygon(rectangle, 'red');
      }
    }


    if (displayBezier) {
      let bezierPoints = bezierPointsRef.current;
      for (let i = 0; i < bezierPoints.length; i++) {
        drawCircle(bezierPoints[i].p1, {color: 'red', size: 3});
        drawCircle(bezierPoints[i].p2, {color: 'red', size: 3});
      }

      let elipsePoints = elipsePointsRef.current;

      for (let i = 0; i < elipsePoints.length; i++) {
        drawPolygon(elipsePoints[i], 'gray', true);
      }
    }
  }

  // Generate bezier elipses for convex hull
  const generateBezier = () => {
    let hull = hullRef.current;
    let bezierPoints = [];
    let elipsePoints = [];

    for (let i = 0; i < hull.length; i++) {
      let pointsPair = generateBezierPoints(hull[(i-1+hull.length) % hull.length], hull[i], hull[(i+1) % hull.length]);
      bezierPoints.push(pointsPair);
    }
    bezierPointsRef.current = bezierPoints;

    for (let i = 0; i < hull.length; i++) {
      let elipse = generateBezierElipse(hull[i], bezierPoints[i].p2, 
                      bezierPoints[(i+1) % hull.length].p1, hull[(i+1) % hull.length]);
      elipsePoints.push(elipse);
    }
    elipsePointsRef.current = elipsePoints;
  }

  const generateBezierPoints = (a, b, c) => {
    let v1 = normalizeVector({ x: b.x - a.x, y: b.y - a.y});
    let v2 = normalizeVector({ x: c.x - b.x, y: c.y - b.y});

    let k = v1.x * v2.y - v1.y * v2.x;
    if (k < 0) {
      //the angle is greater than pi, invert outgoing, 
      //ready to get interior bisector 
      v2 = {x: -v2.x, y: -v2.y };
    }
    else {
      //the angle is less than pi, invert incoming, 
      v1 = {x: -v1.x, y: -v1.y };
    }

    let bisector = normalizeVector({ x: v1.x + v2.x, y : v1.y + v2.y });
    bisector = { x: -bisector.y, y: bisector.x }

    // Check distances and reorder, so that p1 is close to a, and p2 close to b
    let da = distance(a, b);
    let da_part = da * bezierSize;

    let dc = distance(c, b);
    let dc_part = dc * bezierSize;

    let p1 = null;
    let p2 = null;

    if (da > distance(a, {x: b.x + bisector.x, y: b.y + bisector.y })){
      p1 = {x: b.x + bisector.x * da_part, y: b.y + bisector.y * da_part};
      p2 = {x: b.x - bisector.x * dc_part, y: b.y - bisector.y * dc_part};
    }
    else {
      p1 = {x: b.x - bisector.x * da_part, y: b.y - bisector.y * da_part};
      p2 = {x: b.x + bisector.x * dc_part, y: b.y + bisector.y * dc_part};
    }

    return { p1: p1, p2: p2 }; 
  }

  // Generate points for bezier elypse given 4 points
  const generateBezierElipse = (a, b, c, d) => {
    let elipse = [];

    for (let i = 0; i < elipsePoints; i++) {
      let t = i / elipsePoints;
      let x = (a.x * (1 - t)**3) + (3 * b.x * t * (1 - t)**2) + (3 * c.x * t**2 * (1 - t)) + (d.x * t**3);
      let y = (a.y * (1 - t)**3) + (3 * b.y * t * (1 - t)**2) + (3 * c.y * t**2 * (1 - t)) + (d.y * t**3);
      elipse.push({x: x, y: y});
    }    
    return elipse;
  }

  const distance = (a, b) => {
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)
  }

  const normalizeVector = (vector) => {
    let magnitiude = Math.sqrt(vector.x**2 + vector.y**2);
    return { x: vector.x / magnitiude, y: vector.y / magnitiude };
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

  // Calculate areas of rectangle using genetic algortithm
  const areaGeneticAlgorithm = () => {
    let hull = hullRef.current;
    let population = [];

    // Initialize with random angles from 0 to 90 degrees
    for (let i = 0; i < geneticCount; i++) {
      let angle = Math.random() * Math.PI / 2;
      let rotated = rotatePolygon(hull, angle);
      let boundingBoxArea = getBoundingBoxAndArea(rotated);
      boundingBoxArea.angle = angle;

      population.push(boundingBoxArea);
    }

    for (let i = 0; i < geneticIters; i++) {
      population.sort((a, b) => a.area - b.area);
      population = population.slice(0, Math.floor(geneticCount / 2));

      // Crossing
      let newPopulation = [];
      for (let j = 0; j < Math.ceil(geneticCount / 2); j++) {
        newPopulation.push(crossRandomPair(population));
      }
      population = population.concat(newPopulation);

      // Mutation by max 1 degree
      for (let j = 0; j < geneticCount; j++) {
        population[j].angle += Math.random() / 360 * 2 * Math.PI;
        population[j].angle = Math.min(Math.max(population[j].angle, 0), Math.PI / 2);
      }

      // Update values
      for (let j = 0; j < geneticCount; j++) {
        let rotated = rotatePolygon(hull, population[j].angle);
        let boundingBoxArea = getBoundingBoxAndArea(rotated);
        boundingBoxArea.angle = population[j].angle;
        population[j] = boundingBoxArea; 
      }
    }

    population.sort((a, b) => a.area - b.area);
    setGeneticBoundingBoxes(population);

    geneticBoundingBoxesDisplay = new Array(geneticCount).fill(false);
  }

  // perform crossing between pair, results in mean of angles between them
  const crossRandomPair = (population) => {
    let a = Math.floor(Math.random() * population.length);
    let b = a;

    while (b == a) {
      b = Math.floor(Math.random() * population.length);
    }

    return {angle: Math.min(Math.max((population[a].angle + population[b].angle) / 2, 0), Math.PI / 2)}
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

  const drawPolygon = (points, color, open = false) => {
    for (let i = 0; i < points.length - 1; i++) {
      drawLine({ x: points[i].x, y: points[i].y, x1: points[i+1].x, y1: points[i+1].y }, { color: color });
    }

    if (!open)
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

  const setGeneticCount = (val) => {
    geneticCount = val;
  }

  const setPolygonDisplay = (isOn) => {
    displayPolygon = isOn;
    redraw();
  } 

  const setConvexHullDisplay = (isOn) => {
    displayConvexHull = isOn;
    redraw();
  }

  const setBezierDisplay = (isOn) => {
    displayBezier = isOn;
    redraw();
  }

  const setEdgesBoundingBoxesChecked = (index, isOn) => {
    edgesBoundingBoxesDisplay[index] = isOn;
    redraw();
  }

  const setGeneticBoundingBoxesChecked = (index, isOn) => {
    geneticBoundingBoxesDisplay[index] = isOn;
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
            <FormControlLabel control={<Checkbox defaultChecked />} label="Krzywe Beziera" 
                  onChange={(e) => setBezierDisplay(e.target.checked) } />

            <Button variant="contained" onClick={() => { areaFromEdges()}}>Pole za pomocą krawędzi</Button>
            {edgesBoundingBoxes.map((item, index) => (
                <FormControlLabel control={<Checkbox />} label={item.area} key={"edgeCheckbox" + index}
                onChange={(e) => setEdgesBoundingBoxesChecked(index, e.target.checked) } />
            ))}

            <Button variant="contained" onClick={() => { areaGeneticAlgorithm()}}>Pole za algorytmu genetycznego</Button>
            <Typography id="input-genetic-count" gutterBottom>
              Populacja algorytmu
            </Typography>
            <Slider defaultValue={6} min={6} max={15} valueLabelDisplay="on" aria-labelledby='input-genetic-count'
               onChange={(e, val) => setGeneticCount(val) } />
            {geneticBoundingBoxes.map((item, index) => (
                <FormControlLabel control={<Checkbox />} label={item.area} key={"geneticCheckbox" + index}
                onChange={(e) => setGeneticBoundingBoxesChecked(index, e.target.checked) } />
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
