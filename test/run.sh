#!/bin/bash

npm start & &disown
sleep 10
npm test