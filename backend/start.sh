#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate

echo "Creating test data..."
python manage.py create_test_loans --count 15
python manage.py create_test_loan_officer

echo "Starting server..."
exec daphne -b 0.0.0.0 -p $PORT backend.asgi:application
