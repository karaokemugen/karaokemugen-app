import { BrowserRouter } from "react-router-dom";
import ReactDOM from 'react-dom';
import React from 'react';
import * as Sentry from '@sentry/browser';

import App from "./app";
import './electron';

Sentry.init({dsn: "https://464814b9419a4880a2197b1df7e1d0ed@o399537.ingest.sentry.io/5256806"});

ReactDOM.render(<BrowserRouter><App /></BrowserRouter>, document.getElementById('root'));
