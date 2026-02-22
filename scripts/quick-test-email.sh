#!/bin/bash
# Quick Test Script for Seznam/Centrum Email Verification
# This is a bash script version for easy copy-paste testing

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SkauTreg Email Integration Quick Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will guide you through testing Seznam and Centrum"
echo "email integrations."
echo ""
echo "Before starting, make sure you have:"
echo "  1. Created an email account (Seznam or Centrum)"
echo "  2. Generated an APP PASSWORD for that account"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prompt for provider
read -p "Which provider to test? (seznam/centrum): " PROVIDER
echo ""

# Validate provider
if [[ "$PROVIDER" != "seznam" && "$PROVIDER" != "centrum" ]]; then
    echo "❌ Invalid provider. Must be 'seznam' or 'centrum'"
    exit 1
fi

# Prompt for email
read -p "Enter your email address: " EMAIL
echo ""

# Prompt for app password
read -sp "Enter your APP PASSWORD (input hidden): " PASSWORD
echo ""
echo ""

# Ask if they want to send test email
read -p "Send test email? (y/n): " SEND_TEST
SEND_TO=""

if [[ "$SEND_TEST" == "y" || "$SEND_TEST" == "Y" ]]; then
    read -p "Send to email: " SEND_TO
    echo ""
fi

# Construct command
CMD="node scripts/verify-email-providers.mjs --provider=$PROVIDER --email=$EMAIL --password=$PASSWORD"

if [[ -n "$SEND_TO" ]]; then
    CMD="$CMD --send-to=$SEND_TO"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Running verification..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the command
eval $CMD

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
