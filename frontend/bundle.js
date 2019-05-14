import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import Options from './components/options/Options';
import './components/i18n';

const Loader = () => (
    <div>loading...</div>
  );

ReactDOM.render(<Suspense fallback={<Loader />}><Options/></Suspense>, document.getElementById('manage'));
