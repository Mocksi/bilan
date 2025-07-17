#!/bin/bash
set -euo pipefail

# Bilan Build Script
# Builds all packages in the correct order

# Source shared color functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

echo "🔨 Building Bilan packages..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    print_error "This script must be run from the root directory of the Bilan project"
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
find packages -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Build SDK package first (other packages depend on it)
print_status "Building SDK package..."
cd packages/sdk
npm run build
print_success "SDK build completed"
cd ../..

# Build server package
print_status "Building server package..."
cd packages/server
npm run build
print_success "Server build completed"
cd ../..

# Build dashboard package (if exists)
if [ -d "packages/dashboard" ]; then
    print_status "Building dashboard package..."
    cd packages/dashboard
    if npm run build; then
        print_success "Dashboard build completed"
    else
        print_warning "Dashboard build failed (optional)"
    fi
    cd ../..
fi

# Build example applications (optional)
if [ -d "packages/examples" ]; then
    print_status "Building example applications..."
    for example in packages/examples/*/; do
        if [ -f "$example/package.json" ]; then
            example_name=$(basename "$example")
            print_status "Building example: $example_name"
            cd "$example"
            if npm run build 2>/dev/null; then
                print_success "Example $example_name build completed"
            else
                print_warning "Example $example_name build failed (optional)"
            fi
            cd - > /dev/null
        fi
    done
fi

# Verify builds
print_status "Verifying builds..."

# Check SDK build
if [ ! -f "packages/sdk/dist/index.js" ]; then
    print_error "SDK build verification failed - dist/index.js not found"
    exit 1
fi

# Check server build
if [ ! -f "packages/server/dist/cli.js" ]; then
    print_error "Server build verification failed - dist/cli.js not found"
    exit 1
fi

print_success "All builds completed successfully!"

# Print build summary
echo ""
echo "📊 Build Summary:"
echo "=================="
find packages -name "dist" -type d | while read -r dist_dir; do
    package_name=$(echo "$dist_dir" | cut -d'/' -f2)
    dist_size=$(du -sh "$dist_dir" | cut -f1)
    echo "📦 $package_name: $dist_size"
done

echo ""
print_success "🎉 Build process complete! All packages are ready for deployment." 