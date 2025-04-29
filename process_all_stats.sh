#!/bin/bash

# Directory containing the CSV files
CSV_DIR="../../../Python/CappingProScraper"

# Check if CSV_DIR exists and is a directory
if [ ! -d "$CSV_DIR" ]; then
    echo "Error: Directory '$CSV_DIR' not found."
    exit 1
fi

echo "Looking for CSV files directly in: $CSV_DIR"

# Find CSV files matching the pattern *only* in the specified directory
# -maxdepth 1 prevents find from descending into subdirectories
find "$CSV_DIR" -maxdepth 1 -name "*.csv" | while IFS= read -r file; do
    # Check if it's actually a file (find might list the directory itself if it matches *.csv)
    if [ -f "$file" ]; then
        echo "Processing file: $file"
        # Ensure the file path is quoted in case it contains spaces
        node src/services/statLoader.js "$file"

        # Optional: Add a small delay between files
        sleep 0.1 # Reduced delay slightly, adjust as needed
    fi
done

echo "All stats files in '$CSV_DIR' have been processed."