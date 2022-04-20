import logo from './logo.svg';
import './App.css';
import React, { useRef, useEffect } from 'react';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

function App() {
  const canvas = useRef();
  let context = null;

  // initialize the canvas context
  useEffect(() => {
    // dynamically assign the width and height to canvas
    const canvasElement = canvas.current;
    canvasElement.width = canvasElement.clientWidth;
    canvasElement.height = canvasElement.clientHeight;
 
    // get context of the canvas
    context = canvasElement.getContext("2d");

    var points = []
    for (let i = 0; i <= 15; i++) {
      var rand = getRandomPoint();
      points.push(rand);
      drawCircle({ x: rand.x, y: rand.y });
    }

    points.sort((a, b) => getAngle(a) - getAngle(b));
    drawPolygon(points, 'blue')

    drawCircle({ x: canvasElement.width / 2, y: canvasElement.height / 2 }, { color: 'red', size: 5 });

    var ch = require('convex-hull');
    var hullIndexes = ch(points.map(point => [point.x, point.y]));

    var hull = [];
    for (let i = 0; i < hullIndexes.length; i++) {
      hull.push(points[hullIndexes[i][0]]);
    }

    drawPolygon(hull, 'green');
  }, []);

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

  const getAngle = (point) => {
    return Math.atan2(canvas.current.height / 2 - point.y, canvas.current.width / 2 - point.x);
  }

  const getRandomPoint = () => {
    var x = Math.random() * canvas.current.width;
    var y = Math.random() * canvas.current.height;
    return { x: x, y: y };
  }

  return (
    <div className="App">
      <div className='split-panel'>
        <div className='menu-panel'>
          <Typography id="input-points-count" gutterBottom>
            Liczba punktów
          </Typography>
          <Slider defaultValue={10} min={5} max={25} valueLabelDisplay="on" aria-labelledby='input-points-count'/>
        </div>

        <div className='canvas-panel'>
          <canvas ref={canvas}></canvas>
        </div>
      </div>
    </div>
  );
}

export default App;
