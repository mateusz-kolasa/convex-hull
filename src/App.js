import logo from './logo.svg';
import './App.css';
import React, { useRef, useEffect } from 'react';

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
    for (var i = 0; i <= 15; i++) {
      var rand = getRandomPoint();
      points.push(rand)
      drawCircle({ x: rand.x, y: rand.y });
    }

    points.sort((a, b) => getAngle(a) - getAngle(b));
    for (var i = 0; i < points.length - 1; i++) {
      drawLine({ x: points[i].x, y: points[i].y, x1: points[i+1].x, y1: points[i+1].y }, { color: 'blue' });
    }
    drawLine({ x: points[points.length-1].x, y: points[points.length-1].y, x1: points[0].x, y1: points[0].y }, { color: 'blue' });

    drawCircle({ x: canvasElement.width / 2, y: canvasElement.height / 2 }, { color: 'red', size: 5 })
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

  function getAngle(point) {
    return Math.atan2(canvas.current.height / 2 - point.y, canvas.current.width / 2 - point.x);
  }

  function getRandomPoint () {
    var x = Math.random() * canvas.current.width;
    var y = Math.random() * canvas.current.height;
    return { x: x, y: y };
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <canvas ref={canvas}></canvas>
      </header>
    </div>
  );
}

export default App;
