#!/bin/bash
set -e

npm install --ignore-scripts

cp data/processed/hearing-enrichment.json public/data/hearing-enrichment.json 2>/dev/null || true
