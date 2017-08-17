#!/bin/bash
ls -l app/data/*
npm start &disown
sleep 10
npm test