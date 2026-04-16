# Run tests with coverage


set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"


cd "$PROJECT_ROOT"

echo "Running tests with coverage..."

uv sync --group dev

uv run python -m pytest tests/ \
    --cov-report xml:coverage.xml \
    --cov=zirak \
    --junitxml=reports/test-results.xml \
    -v

echo ""
echo "Tests completed. Coverage report generated at coverage.xml and test results at reports/test-results.xml"