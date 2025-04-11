#!/bin/bash

# Script to fetch CSV data from Dune API and save to data folder

# Check if API key is provided
# if [ -z "$1" ]; then
#   echo "Error: API key is required"
#   echo "Usage: ./update.sh <api_key>"
#   exit 1
# fi

API_KEY="C5OGjFaT3m3DFiExbTfMdkj1wtfKgvkH"
DATA_DIR="../data"

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Read sources from sources.json
SOURCES_FILE="../sources.json"
if [ ! -f "$SOURCES_FILE" ]; then
  echo "Error: sources.json not found"
  exit 1
fi

# Parse sources.json and fetch data for each source
cat "$SOURCES_FILE" | jq -r 'to_entries | .[] | "\(.key) \(.value)"' | while read -r SOURCE_NAME SOURCE_ID; do
  echo "Fetching data for $SOURCE_NAME (ID: $SOURCE_ID)..."
  
  # Construct the URL
  URL="https://api.dune.com/api/v1/query/$SOURCE_ID/results/csv?api_key=$API_KEY"
  
  # Fetch the data and save to file
  OUTPUT_FILE="$DATA_DIR/$SOURCE_NAME.csv"
  
  # Use curl to fetch the data
  curl -s "$URL" -o "$OUTPUT_FILE"
  
  # Check if download was successful
  if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
    echo "Successfully downloaded data for $SOURCE_NAME to $OUTPUT_FILE"
  else
    echo "Error downloading data for $SOURCE_NAME"
    # Remove empty file if download failed
    [ -f "$OUTPUT_FILE" ] && rm "$OUTPUT_FILE"
  fi
done

echo "All downloads completed."
