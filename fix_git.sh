#!/bin/bash

echo "========================================"
echo "      JUST COOK BRO - GIT FIXER"
echo "========================================"

# 1. Force remove the build directory (The culprit for Web lags)
echo "🧹 Deleting build artifacts..."
rm -rf build/
rm -rf .dart_tool/

# 2. Run flutter clean to ensure state is reset
echo "🛁 Running Flutter Clean..."
flutter clean

# 3. Remove everything from Git staging (keeps files on disk)
echo "🚫 Untracking all files..."
git rm -r --cached .

# 4. Re-add only the files that match .gitignore
echo "✨ Re-staging source code..."
git add .

echo "========================================"
echo "✅ FIXED! You can now commit without lag."
echo "========================================"
