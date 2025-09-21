#!/bin/bash

# Production Testing Script for iOS
# This script helps test the app in production-like conditions before deploying to TestFlight

set -e

echo "🚀 Starting Production Testing Workflow"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: TypeScript Compilation Check
echo
echo "1. Checking TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck; then
    print_status "TypeScript compilation passed"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Step 2: Production Bundle Creation
echo
echo "2. Creating production bundle..."
if npx expo export --platform ios --clear; then
    print_status "Production bundle created successfully"
else
    print_error "Production bundle creation failed"
    exit 1
fi

# Step 3: Check bundle warnings
echo
echo "3. Checking for critical bundle warnings..."
WARNINGS=$(npx expo export --platform ios 2>&1 | grep -E "ERROR|Failed" || true)
if [ ! -z "$WARNINGS" ]; then
    print_warning "Found bundle warnings:"
    echo "$WARNINGS"
else
    print_status "No critical bundle warnings found"
fi

# Step 4: Environment Variable Check
echo
echo "4. Validating environment variables..."
node -e "
const envVars = [
    'EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY',
    'EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY',
    'EXPO_PUBLIC_VIBECODE_GROK_API_KEY'
];

let missing = [];
envVars.forEach(varName => {
    if (!process.env[varName] || process.env[varName].trim().length === 0) {
        missing.push(varName);
    }
});

if (missing.length > 0) {
    console.log('Missing required environment variables:', missing.join(', '));
    process.exit(1);
} else {
    console.log('All required environment variables are present');
}
"
print_status "Environment variables validated"

echo
echo "======================================="
echo "🎉 Production Testing Complete!"
echo
echo "Next steps:"
echo "1. If all checks passed, you can build for TestFlight:"
echo "   npx eas build --platform ios --profile production"
echo
echo "2. Test locally in production mode:"
echo "   npx expo start --no-dev --minify"
echo
echo "3. Monitor the app startup and test key features:"
echo "   - App launches without crashing"
echo "   - Navigation works correctly" 
echo "   - Recipe store initializes properly"
echo "   - API calls function (if keys are configured)"