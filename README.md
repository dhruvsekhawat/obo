# Beat My Rate - Loan Officer Platform

A modern platform for loan officers to compete for and manage loan opportunities. The platform features a robust Django backend with a modern Next.js frontend.

## Current Project Status

- **Backend**: Fully implemented with Django REST Framework, including authentication, loan management, bidding system, and notifications
- **Frontend**: Recently rebuilt with Next.js 14, TypeScript, and Tailwind CSS
  - Currently implemented features:
    - User authentication (Email/Password and Google Sign-in)
    - Dashboard with statistics
    - Competitive loans browsing and bidding
    - Profile management
    - Real-time notifications via WebSocket
    - Loan officer preferences

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Django Channels (WebSocket)
- Redis (for WebSocket channel layer)
- Google OAuth2 integration
- Daphne (ASGI server)

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React Query
- React Hook Form
- Heroicons
- React Hot Toast
- Native WebSocket API

## Database Structure

### Core Models

1. **User & Authentication**
   - Custom User model with email as primary identifier
   - LoanOfficerProfile with preferences and statistics
   - JWT token-based authentication

2. **Loan Management**
   - Borrower: Personal and financial information
   - Loan: Core loan details and status
   - Types: Conventional, FHA, VA, Jumbo
   - Categories: Competitive and Guaranteed leads

3. **Bidding System**
   - Bid tracking with APR and status
   - Automatic outbid notifications
   - Bid history and analytics

4. **Notifications**
   - Real-time notification delivery
   - Types: Outbid, Bid Won, New Loan, etc.
   - WebSocket-based instant updates

## Setup Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

### Database Setup

1. Install PostgreSQL:
\`\`\`bash
# macOS (using Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt install postgresql-14
sudo systemctl start postgresql
\`\`\`

2. Create Database:
\`\`\`bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE beatmyrate;
CREATE USER bmruser WITH PASSWORD 'your_password';
ALTER ROLE bmruser SET client_encoding TO 'utf8';
ALTER ROLE bmruser SET default_transaction_isolation TO 'read committed';
ALTER ROLE bmruser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE beatmyrate TO bmruser;
\`\`\`

### Redis Setup

1. Install Redis:
\`\`\`bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server
\`\`\`

### Backend Setup

1. Clone the repository:
\`\`\`bash
git clone https://github.com/BMR-stealth/loan-bidding-platform.git
cd loan-bidding-platform
\`\`\`

2. Create and activate virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

3. Install backend dependencies:
\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

4. Set up environment variables:
Create a \`.env\` file in the backend directory with:
\`\`\`
DEBUG=True
SECRET_KEY=your_secret_key
DATABASE_URL=postgres://bmruser:your_password@localhost:5432/beatmyrate
GOOGLE_OAUTH2_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH2_CLIENT_SECRET=your_google_client_secret
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
\`\`\`

5. Run migrations:
\`\`\`bash
python manage.py migrate
\`\`\`

6. Create test data:
\`\`\`bash
# Create a test loan officer account
python manage.py create_test_loan_officer

# Create sample loans (default: 10 loans)
python manage.py create_test_loans --count 20  # Optional: specify count

# The test data includes:
# - Borrowers with realistic information
# - Mix of competitive and guaranteed loans
# - Various loan types (Conventional, FHA, VA, Jumbo)
# - Realistic loan amounts and APRs
\`\`\`

7. Start the backend servers:
\`\`\`bash
# Start Daphne (WebSocket + HTTP)
./run_daphne.sh

# Alternative: Run Django development server (HTTP only)
python manage.py runserver 8001
\`\`\`

### Frontend Setup

1. Install frontend dependencies:
\`\`\`bash
cd frontend
npm install
\`\`\`

2. Set up environment variables:
Create a \`.env.local\` file in the frontend directory with:
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:8001/api
NEXT_PUBLIC_WS_URL=ws://localhost:8001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Access the application at http://localhost:3000

## Project Structure

### Backend Structure
- \`authentication/\`: User authentication and profiles
  - Custom user model
  - JWT authentication
  - Google OAuth integration
  - Loan officer profiles and preferences
- \`loans/\`: Loan management and routing
  - Loan and borrower models
  - Loan search and filtering
  - Lead management
- \`bidding/\`: Bidding system logic
  - Bid placement and tracking
  - Competitive bidding rules
  - Bid history
- \`notifications/\`: Real-time notification system
  - WebSocket consumers
  - Notification models and types
  - Real-time delivery
- \`transactions/\`: Credit system transactions
  - Credit tracking
  - Transaction history
- \`api/\`: API configurations and base classes
- \`core/\`: Core settings and configurations

### Frontend Structure
- \`src/app/\`: Next.js pages and routing
  - \`(auth)/\`: Authentication pages
  - \`dashboard/\`: Dashboard and profile pages
  - \`competitive-loans/\`: Loan bidding pages
  - \`guaranteed-loans/\`: Guaranteed leads pages
- \`src/components/\`: Reusable React components
  - \`notifications/\`: Real-time notification components
  - \`auth/\`: Authentication components
  - \`shared/\`: Common UI components
- \`src/services/\`: API service integrations
  - WebSocket service
  - Authentication service
  - Loan and bidding services
- \`src/types/\`: TypeScript type definitions
- \`src/utils/\`: Utility functions

## API Endpoints

### Authentication
- \`POST /api/auth/register/\`: User registration
- \`POST /api/auth/login/\`: Email/password login
- \`POST /api/auth/google/\`: Google authentication
- \`GET /api/auth/user/\`: Get current user details

### Loans
- \`GET /api/loans/\`: List available loans
- \`GET /api/loans/competitive/\`: List competitive loans
- \`GET /api/loans/guaranteed/\`: List guaranteed loans
- \`POST /api/loans/{id}/bid/\`: Submit a bid
- \`GET /api/loans/dashboard-stats/\`: Get dashboard statistics

### Profile
- \`GET /api/auth/loan_officer/profile/\`: Get loan officer profile
- \`PUT /api/auth/loan_officer/preferences/\`: Update preferences

### WebSocket Endpoints
- \`ws://localhost:8001/ws/notifications/\`: Real-time notifications
  - Authentication required via JWT
  - Supports bidding notifications
  - Supports loan status updates

## Common Issues & Solutions

### Backend Issues
- Database connection errors:
  - Check PostgreSQL service is running
  - Verify database credentials in \`.env\`
  - Ensure database exists
- Redis connection errors:
  - Verify Redis is running (\`redis-cli ping\`)
  - Check Redis connection URL
- WebSocket connection issues:
  - Ensure Daphne is running
  - Check WebSocket URL in frontend
  - Verify Redis channel layer

### Frontend Issues
- TypeScript errors with components:
  - Ensure proper type definitions for props
  - Check component return types
- API connection issues:
  - Verify backend is running on port 8001
  - Check CORS settings in backend
  - Verify API URL in \`.env.local\`
- WebSocket connection issues:
  - Check WebSocket URL configuration
  - Verify authentication token
  - Check browser console for connection errors

## Development Workflow
1. Start PostgreSQL and Redis services
2. Start the backend server (Daphne)
3. Start the frontend development server
4. Create test data if needed
5. Access the application at http://localhost:3000

## Contributing
1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/YourFeature\`)
3. Commit your changes (\`git commit -m 'Add YourFeature'\`)
4. Push to the branch (\`git push origin feature/YourFeature\`)
5. Open a Pull Request

## License
This project is licensed under the MIT License.

## Support
For support, please open an issue on GitHub. 