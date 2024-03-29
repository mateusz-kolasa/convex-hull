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

  var pointCountRef = useRef(10);
  var displayPolygonRef = useRef(true);
  var displayConvexHullRef = useRef(true);
  var displayBezierRef = useRef(true);

  var bezierSize = 0.1;
  var elipsePoints = 100;
  const bezierPointsRef = useRef([]);
  const elipsePointsRef = useRef([]);

  const pointsRef = useRef([]);
  const hullRef = useRef([]);

  const [edgesBoundingBoxes, setEdgesBoundingBoxes] = useState([]);
  var edgesBoundingBoxesDisplay = [];

  var geneticCountRef = useRef([10]);
  var geneticItersRef = useRef([100]);
  var mutationMaxRef = useRef([1]);
  var geneticBoundingBoxesDisplay = [];
  const [geneticBoundingBoxes, setGeneticBoundingBoxes] = useState([]);

  var geneticBoundingBoxBestDisplay = false;
  var geneticBestRef = useRef(null);

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
    let pointCount = pointCountRef.current;
    let points = [];

    for (let i = 0; i < pointCount; i++) {
      var rand = getRandomPoint();
      points.push(rand);
    }
    points.sort((a, b) => getAngle(a) - getAngle(b));
    pointsRef.current = points;

    var ch = require('convex-hull');
    var hullIndexes = ch(points.map(point => [point.x, point.y]));

    let hull = [];
    for (let i = 0; i < hullIndexes.length; i++) {
      hull.push(points[hullIndexes[i][0]]);
    }
    hullRef.current = hull;

    clearCalculated();
    generateBezier();
    redraw();
  }

  const clearCalculated = () => {
    geneticBestRef.current = null;
    setEdgesBoundingBoxes([]);
    setGeneticBoundingBoxes([]);
  }

  // Clear rect and draw polygon and it's convex hull
  const redraw = () => {
    context = canvas.current.getContext("2d");
    context.clearRect(0, 0, canvas.current.width, canvas.current.height);
    
    let points = pointsRef.current;
    let hull = hullRef.current;

    for (let i = 0; i < points.length; i++) {
      drawCircle(points[i]);
    }

    if (displayPolygonRef.current)
      drawPolygon(points, 'blue');

    if (displayConvexHullRef.current)
      drawPolygon(hull, 'green');

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

    if (geneticBoundingBoxBestDisplay) {
      let geneticBest = geneticBestRef.current;
      let rectangle = boundingBoxToRectangle(geneticBest);
      rectangle = rotatePolygon(rectangle, -geneticBest.angle);
      drawPolygon(rectangle, 'red');
    }

    if (displayBezierRef.current) {
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
    for (let i = 0; i < geneticCountRef.current; i++) {
      let angle = Math.random() * Math.PI / 2;
      let rotated = rotatePolygon(hull, angle);
      let boundingBoxArea = getBoundingBoxAndArea(rotated);
      boundingBoxArea.angle = angle;

      population.push(boundingBoxArea);
    }
    population.sort((a, b) => a.area - b.area);
    geneticBestRef.current = {...population[0]};

    for (let i = 0; i < geneticItersRef.current; i++) {
      population = population.slice(0, Math.floor(geneticCountRef.current / 2));

      // Crossing
      let newPopulation = [];
      for (let j = 0; j < Math.ceil(geneticCountRef.current / 2); j++) {
        newPopulation.push(crossRandomPair(population));
      }
      population = population.concat(newPopulation);

      // Mutation by random from max set degree
      for (let j = 0; j < geneticCountRef.current; j++) {
        population[j].angle += mutationMaxRef.current * ((Math.random() - 0.5) * 2) / 360 * 2 * Math.PI;
        population[j].angle = (population[j].angle + (Math.PI / 2)) % (Math.PI / 2)
      }

      // Update values
      for (let j = 0; j < geneticCountRef.current; j++) {
        let rotated = rotatePolygon(hull, population[j].angle);
        let boundingBoxArea = getBoundingBoxAndArea(rotated);
        boundingBoxArea.angle = population[j].angle;
        population[j] = boundingBoxArea; 
      }

      population.sort((a, b) => a.area - b.area);
      if (population[0].area < geneticBestRef.current.area) {
        geneticBestRef.current = {...population[0]};
      }
    }

    geneticBoundingBoxesDisplay = new Array(geneticCountRef.current).fill(false);
    setGeneticBoundingBoxes(population);
  }

  // perform crossing between pair, results in mean of angles between them
  const crossRandomPair = (population) => {
    let angleLimit = Math.PI / 2; // 90 degree max
    let a = Math.floor(Math.random() * population.length);
    let b = a;

    while (b == a) {
      b = Math.floor(Math.random() * population.length);
    }

    let angle = 0;
    if (Math.abs(population[a].angle - population[b].angle) <= (angleLimit / 2)) { // Find angle point halfway between a and b
      angle = (population[a].angle + population[b].angle) / 2;
    }
    else { // if they are further away than half of max find closer point from other side
      let minAngle = Math.min(population[a].angle, population[b].angle)
      let maxAngle = Math.max(population[a].angle, population[b].angle)
      
      angle = (maxAngle + ((minAngle + angleLimit - maxAngle) / 2)) % angleLimit;
      let toDeg = 360 / (2 * Math.PI);
    }


    return {angle: angle}
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
    if (pointCountRef.current == val)
      return;

    pointCountRef.current = val;
    generatePolygonAndHull();
  }

  const setGeneticCount = (val) => {
    geneticCountRef.current = val;
  }

  const setGeneticIters = (val) => {
    geneticItersRef.current = val;
  }

  const setGeneticMutation = (val) => {
    mutationMaxRef.current = val;
  }

  const setPolygonDisplay = (isOn) => {
    displayPolygonRef.current = isOn;
    redraw();
  } 

  const setConvexHullDisplay = (isOn) => {
    displayConvexHullRef.current = isOn;
    redraw();
  }

  const setBezierDisplay = (isOn) => {
    displayBezierRef.current = isOn;
    redraw();
  }

  const setEdgesBoundingBoxesChecked = (index, isOn) => {
    edgesBoundingBoxesDisplay[index] = isOn;
    redraw();
  }

  const setGeneticBoundingBoxBestChecked = (isOn) => {
    geneticBoundingBoxBestDisplay = isOn;
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
          <Slider defaultValue={10} min={5} max={25} step={1} valueLabelDisplay="on" aria-labelledby='input-points-count'
               onChange={(e, val) => setPointCount(val) } />

            <FormControlLabel control={<Checkbox defaultChecked />} label="Figura" 
                  onChange={(e) => setPolygonDisplay(e.target.checked) } />
            <FormControlLabel control={<Checkbox defaultChecked />} label="Powłoka wypukła" 
                  onChange={(e) => setConvexHullDisplay(e.target.checked) } />
            <FormControlLabel control={<Checkbox defaultChecked />} label="Krzywe Beziera" 
                  onChange={(e) => setBezierDisplay(e.target.checked) } />

            <Button variant="contained" onClick={() => { areaFromEdges()}}>Pole za pomocą krawędzi</Button>
            {edgesBoundingBoxes.map((item, index) => (
                <FormControlLabel control={<Checkbox />} label={item.area.toFixed(2)} key={"edgeCheckbox" + index}
                onChange={(e) => setEdgesBoundingBoxesChecked(index, e.target.checked) } />
            ))}

            <Button variant="contained" onClick={() => { areaGeneticAlgorithm()}}>Pole za algorytmu genetycznego</Button>
            <Typography id="input-genetic-count" gutterBottom>
              Populacja algorytmu
            </Typography>
            <Slider defaultValue={10} min={10} max={100} valueLabelDisplay="on" aria-labelledby='input-genetic-count'
               onChange={(e, val) => setGeneticCount(val) } />

            <Typography id="input-genetic-count" gutterBottom>
              Liczba iteracji
            </Typography>
            <Slider defaultValue={100} min={50} max={500} step={1} valueLabelDisplay="on" aria-labelledby='input-genetic-iters'
               onChange={(e, val) => setGeneticIters(val) } />

            <Typography id="input-genetic-count" gutterBottom>
              Maksymalna mutacja w stopniach
            </Typography>      
            <Slider defaultValue={1} min={0.1} max={15} step={0.1} valueLabelDisplay="on" aria-labelledby='input-genetic-mutation'
               onChange={(e, val) => setGeneticMutation(val) } />

            {geneticBestRef.current != null &&
              <div>
                <Typography variant="h6"> Najlepszy: </Typography>
                <FormControlLabel control={<Checkbox />} label={geneticBestRef.current.area.toFixed(2) + " => " + 
                (360 * geneticBestRef.current.angle / (2 * Math.PI)).toFixed(2) + '\u00b0'} key={"geneticCheckboxBest"}
                onChange={(e) => setGeneticBoundingBoxBestChecked(e.target.checked) } />    
              </div>
            }

            {geneticBoundingBoxes.length > 0 &&
                <Typography variant="h6"> Ostatnie pokolenie: </Typography>
            }
            {geneticBoundingBoxes.map((item, index) => (
                <FormControlLabel control={<Checkbox />} label={item.area.toFixed(2) + " => " + 
                (360 * item.angle / (2 * Math.PI)).toFixed(2) + '\u00b0'} key={"geneticCheckbox" + index}
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
