#!/bin/bash

# Phase 1: Infrastructure Tests
# This script tests the basic infrastructure setup after cleanup

echo "========================================="
echo "Phase 1: Infrastructure Validation Tests"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $test_name ... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "Step 1: Starting Docker services"
echo "---------------------------------"
docker-compose down > /dev/null 2>&1
docker-compose up -d

# Wait for services to start
echo "Waiting for services to initialize (30 seconds)..."
sleep 30

echo ""
echo "Step 2: Service Health Checks"
echo "-----------------------------"

# Test 1: PostgreSQL
run_test "PostgreSQL connection" "docker exec trading-postgres pg_isready -U trader -d trading"

# Test 2: Redis
run_test "Redis connection" "docker exec trading-redis redis-cli ping | grep -q PONG"

# Test 3: Backend Spring Boot
run_test "Backend health check" "curl -f http://localhost:8080/actuator/health"

# Test 4: Nautilus Service
run_test "Nautilus service health" "curl -f http://localhost:8002/health"

# Test 5: ML Service
run_test "ML service health" "curl -f http://localhost:8001/health"

# Test 6: Frontend
run_test "Frontend availability" "curl -f http://localhost:3000"

echo ""
echo "Step 3: Container Status Checks"
echo "-------------------------------"

# Test 7: All containers running
run_test "All containers running" "docker-compose ps | grep -c 'Up' | grep -q 6"

echo ""
echo "Step 4: Network Connectivity"
echo "----------------------------"

# Test 8: Backend to Database
run_test "Backend → Database connectivity" "docker exec trading-backend nc -zv postgres 5432"

# Test 9: Backend to Redis
run_test "Backend → Redis connectivity" "docker exec trading-backend nc -zv redis 6379"

# Test 10: Backend to Nautilus
run_test "Backend → Nautilus connectivity" "docker exec trading-backend curl -f http://nautilus-service:8002/health"

echo ""
echo "Step 5: Volume Mounts"
echo "---------------------"

# Test 11: Check volume mounts
run_test "Docker volumes created" "docker volume ls | grep -q trading"

echo ""
echo "Step 6: Environment Variables"
echo "-----------------------------"

# Test 12: Check if .env exists
if [ -f ".env" ]; then
    run_test ".env file exists" "true"
else
    echo -e "${YELLOW}WARNING: .env file not found. Using .env.example${NC}"
    run_test ".env.example exists" "[ -f .env.example ]"
fi

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ Phase 1 COMPLETE: All infrastructure tests passed!${NC}"
    echo "You can now proceed to Phase 2: Nautilus Core Integration"
    exit 0
else
    echo -e "${RED}❌ Phase 1 INCOMPLETE: Some tests failed${NC}"
    echo "Please fix the issues above before proceeding to Phase 2"

    echo ""
    echo "Troubleshooting Tips:"
    echo "--------------------"
    echo "1. Check Docker logs: docker-compose logs [service-name]"
    echo "2. Verify .env configuration"
    echo "3. Ensure ports are not already in use"
    echo "4. Check Docker daemon is running"

    exit 1
fi