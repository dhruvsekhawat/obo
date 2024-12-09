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
    - Real-time notifications

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework
- PostgreSQL
- JWT Authentication
- WebSocket for real-time updates
- Google OAuth2 integration

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React Query
- React Hook Form
- Heroicons
- React Hot Toast

## Setup Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git

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
DATABASE_URL=postgres://username:password@localhost:5432/beatmyrate
GOOGLE_OAUTH2_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH2_CLIENT_SECRET=your_google_client_secret
\`\`\`

5. Run migrations:
\`\`\`bash
python manage.py migrate
\`\`\`

6. Create test data (optional):
\`\`\`bash
python manage.py create_test_loan_officer
python manage.py create_test_loans
\`\`\`

7. Start the backend server:
\`\`\`bash
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
- \`loans/\`: Loan management and routing
- \`bidding/\`: Bidding system logic
- \`notifications/\`: Real-time notification system
- \`transactions/\`: Credit system transactions
- \`api/\`: API configurations and base classes
- \`core/\`: Core settings and configurations

### Frontend Structure
- \`src/app/\`: Next.js pages and routing
  - \`(auth)/\`: Authentication pages
  - \`dashboard/\`: Dashboard and profile pages
  - \`competitive-loans/\`: Loan bidding pages
- \`src/components/\`: Reusable React components
- \`src/services/\`: API service integrations
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
- \`POST /api/loans/{id}/bid/\`: Submit a bid
- \`GET /api/loans/dashboard-stats/\`: Get dashboard statistics

### Profile
- \`GET /api/auth/loan_officer/profile/\`: Get loan officer profile
- \`PUT /api/auth/loan_officer/preferences/\`: Update preferences

## Common Issues & Solutions

### Backend Issues
- Database connection errors:
  - Check PostgreSQL service is running
  - Verify database credentials in \`.env\`
  - Ensure database exists

### Frontend Issues
- TypeScript errors with components:
  - Ensure proper type definitions for props
  - Check component return types
- API connection issues:
  - Verify backend is running on port 8001
  - Check CORS settings in backend
  - Verify API URL in \`.env.local\`

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