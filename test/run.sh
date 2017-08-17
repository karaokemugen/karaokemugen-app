#!/bin/bash
ls -l app/data/*
node src/index.js &disown
sleep 10
npm test