#!/bin/bash

# Output file
OUTPUT_FILE="file_line_count_report.txt"

# Start the report
echo "==================================================================" > "$OUTPUT_FILE"
echo "FILE LINE COUNT REPORT - GestioneCommerciale-Mobile" >> "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "==================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to process files in a directory
process_directory() {
    local dir=$1
    local indent=$2
    local files_found=false
    
    # Check if there are any source files in this directory
    local file_count=$(find "$dir" -maxdepth 1 -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.xml" -o -name "*.md" -o -name "*.txt" -o -name "*.yml" -o -name "*.yaml" \) 2>/dev/null | wc -l)
    
    if [ "$file_count" -gt 0 ]; then
        files_found=true
        echo "" >> "$OUTPUT_FILE"
        echo "${indent}📁 $dir" >> "$OUTPUT_FILE"
        echo "${indent}$(printf '─%.0s' {1..60})" >> "$OUTPUT_FILE"
        
        # Process each file type
        for ext in js html css json ts tsx jsx xml md txt yml yaml; do
            local files=$(find "$dir" -maxdepth 1 -type f -name "*.$ext" 2>/dev/null | sort)
            if [ ! -z "$files" ]; then
                while IFS= read -r file; do
                    if [ -f "$file" ]; then
                        local lines=$(wc -l < "$file" 2>/dev/null || echo "0")
                        local filename=$(basename "$file")
                        printf "${indent}  %-50s %6d lines\n" "$filename" "$lines" >> "$OUTPUT_FILE"
                    fi
                done <<< "$files"
            fi
        done
    fi
    
    # Process subdirectories
    local subdirs=$(find "$dir" -maxdepth 1 -type d ! -path "$dir" ! -name "node_modules" ! -name ".git" ! -name ".vscode" ! -name "dist" ! -name "build" 2>/dev/null | sort)
    if [ ! -z "$subdirs" ]; then
        while IFS= read -r subdir; do
            if [ -d "$subdir" ]; then
                process_directory "$subdir" "  $indent"
            fi
        done <<< "$subdirs"
    fi
}

# Calculate totals by file type
echo "SUMMARY BY FILE TYPE" >> "$OUTPUT_FILE"
echo "==================================================================" >> "$OUTPUT_FILE"

total_lines=0
total_files=0

for ext in js html css json ts tsx jsx xml md txt yml yaml; do
    files=$(find /home/flavio2025/Desktop/GestioneCommerciale-Mobile -type f -name "*.$ext" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null)
    if [ ! -z "$files" ]; then
        count=0
        lines=0
        while IFS= read -r file; do
            if [ -f "$file" ]; then
                ((count++))
                file_lines=$(wc -l < "$file" 2>/dev/null || echo "0")
                ((lines+=file_lines))
            fi
        done <<< "$files"
        
        if [ $count -gt 0 ]; then
            printf "%-15s %5d files  %8d lines\n" "*.$ext" "$count" "$lines" >> "$OUTPUT_FILE"
            ((total_files+=count))
            ((total_lines+=lines))
        fi
    fi
done

echo "------------------------------------------------------------------" >> "$OUTPUT_FILE"
printf "%-15s %5d files  %8d lines\n" "TOTAL" "$total_files" "$total_lines" >> "$OUTPUT_FILE"

# Detailed file listing by directory
echo "" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "DETAILED FILE LISTING BY DIRECTORY" >> "$OUTPUT_FILE"
echo "==================================================================" >> "$OUTPUT_FILE"

# Start processing from root directory
process_directory "/home/flavio2025/Desktop/GestioneCommerciale-Mobile" ""

echo "" >> "$OUTPUT_FILE"
echo "==================================================================" >> "$OUTPUT_FILE"
echo "Report generated successfully!" >> "$OUTPUT_FILE"