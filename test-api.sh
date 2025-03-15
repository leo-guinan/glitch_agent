#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test message
TEST_MESSAGE="THE CHAOS ENGINE RUNS WILD! 🌀 Testing the neural pathways of the digital wilderness. #GlitchTest"

# API endpoints
LOCAL_API="http://localhost:4111"
PROD_API="https://api.maketheinternetweirdagain.com"

# Function to test an endpoint
test_endpoint() {
    local api=$1
    local endpoint=$2
    local name=$3

    echo -e "\n${BLUE}Testing $name API at $api$endpoint${NC}"
    
    response=$(curl -s -w "\n%{http_code}" "$api$endpoint" -H "Content-Type: application/json" -d '{
        "messages": [
            {
                "role": "user",
                "content": "'"$TEST_MESSAGE"'"
            }
        ]
    }')
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Success ($status_code)${NC}"
        echo -e "Response: $body"
    else
        echo -e "${RED}✗ Failed ($status_code)${NC}"
        echo -e "Error: $body"
    fi
}

# Test local API
echo -e "${BLUE}=== Testing Local Environment ===${NC}"
test_endpoint "$LOCAL_API" "/api/agents/glitchAgent/generate" "Local"

# Test production API
echo -e "\n${BLUE}=== Testing Production Environment ===${NC}"
test_endpoint "$PROD_API" "/api/agents/glitchAgent/generate" "Production" 