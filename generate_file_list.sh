#!/bin/bash
# Generate complete file list for efficient game date discovery
# This prevents HTTP 404 errors by building a known file list

cd "$(dirname "$0")"

OUTPUT_FILE="public/data/available_files.json"
TEMP_FILE="/tmp/baseball_files.txt"

echo "🔍 Scanning for all available data files..."

# Find all JSON files in the 2025 data directory
find public/data/2025 -name "*.json" -type f | sort > "$TEMP_FILE"

# Convert to JSON format with metadata
echo "{" > "$OUTPUT_FILE"
echo '  "generated": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",' >> "$OUTPUT_FILE"
echo '  "files": [' >> "$OUTPUT_FILE"

FIRST=true
while IFS= read -r filepath; do
  # Extract date from filename (e.g., "july_25_2025.json" -> "2025-07-25")
  filename=$(basename "$filepath" .json)
  
  # Parse month_day_year format
  if [[ $filename =~ ^([a-z]+)_([0-9]{2})_([0-9]{4})$ ]]; then
    month_name="${BASH_REMATCH[1]}"
    day="${BASH_REMATCH[2]}"
    year="${BASH_REMATCH[3]}"
    
    # Convert month name to number
    case $month_name in
      january) month_num="01" ;;
      february) month_num="02" ;;
      march) month_num="03" ;;
      april) month_num="04" ;;
      may) month_num="05" ;;
      june) month_num="06" ;;
      july) month_num="07" ;;
      august) month_num="08" ;;
      september) month_num="09" ;;
      october) month_num="10" ;;
      november) month_num="11" ;;
      december) month_num="12" ;;
      *) continue ;;
    esac
    
    # Create ISO date
    iso_date="${year}-${month_num}-${day}"
    
    # Add to JSON (with comma handling)
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$OUTPUT_FILE"
    fi
    
    echo -n "    {" >> "$OUTPUT_FILE"
    echo -n '"date": "'$iso_date'", ' >> "$OUTPUT_FILE"
    echo -n '"path": "'$filepath'", ' >> "$OUTPUT_FILE"
    echo -n '"filename": "'$filename.json'"' >> "$OUTPUT_FILE"
    echo -n "}" >> "$OUTPUT_FILE"
  fi
done < "$TEMP_FILE"

echo "" >> "$OUTPUT_FILE"
echo "  ]," >> "$OUTPUT_FILE"

# Add count
FILE_COUNT=$(wc -l < "$TEMP_FILE")
echo '  "totalFiles": '$FILE_COUNT >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

# Cleanup
rm "$TEMP_FILE"

echo "✅ Generated file list: $OUTPUT_FILE"
echo "📊 Total files found: $FILE_COUNT"
echo "📅 Date range: $(head -1 "$OUTPUT_FILE" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' | head -1) to $(tail -5 "$OUTPUT_FILE" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' | tail -1)"

# Make the file readable by the web server
chmod 644 "$OUTPUT_FILE"

echo "🚀 File list ready for dynamic discovery service"