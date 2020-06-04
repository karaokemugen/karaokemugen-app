import { BrowserRouter } from "react-router-dom";
import App from "./app";
import ReactDOM from 'react-dom';
import React from 'react';
import './electron';

ReactDOM.render(<BrowserRouter><App /></BrowserRouter>, document.getElementById('root'));
