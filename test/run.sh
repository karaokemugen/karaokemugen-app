#!/bin/bash
ls -l app/data/*
node src/index.js --debug &disown
sleep 10
npm test