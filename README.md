# Beat My Rate - Loan Officer Platform

A modern platform for loan officers to compete for and manage loan opportunities.

## Features

- **User Authentication**
  - Email/Password login
  - Google Sign-in integration
  - Profile management with NMLS validation
  - Profile completion tracking
  - Session management

- **Loan Management**
  - Guaranteed loan assignments based on routing score
  - Competitive bidding system with real-time updates
  - Loan status tracking
  - Comprehensive dashboard with statistics
  - Loan filtering and search

- **Bidding System**
  - APR-based bidding with minimum/maximum thresholds
  - Real-time outbid notifications
  - Bid history tracking
  - Auto-routing for guaranteed loans
  - Winning bid determination

- **Profile & Preferences**
  - Notification preferences (email, in-app)
  - APR thresholds for auto-bidding
  - Communication preferences
  - Profile completion tracking
  - NMLS verification

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework for API
- PostgreSQL for database
- Google Auth for OAuth2
- JWT for authentication
- WebSocket for real-time notifications
- Celery for background tasks (upcoming)

### Frontend
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- React Query for data fetching
- React Hook Form for form handling
- Heroicons for icons
- React Hot Toast for notifications

## Detailed Setup Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git

### Database Setup
1. Install PostgreSQL:
   ```bash
   # macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql

   # Ubuntu
   sudo apt install postgresql
   sudo systemctl start postgresql
   ```

2. Create database:
   ```bash
   psql postgres
   CREATE DATABASE beatmyrate;
   CREATE USER yourusername WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE beatmyrate TO yourusername;
   ```

### Backend Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd beatmyrate
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Update .env with your database credentials and other configurations
   ```

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Create test data (optional):
   ```bash
   python manage.py create_test_loan_officer
   python manage.py create_test_loans
   ```

7. Start the development server:
   ```bash
   python manage.py runserver 8001
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   # Update with your configuration
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Access the application at `http://localhost:3000`

## Development Workflow

### Backend Development
- Models are in their respective app directories (authentication, loans, bidding, etc.)
- API endpoints follow REST conventions
- Use Django admin interface at `/admin` for data management
- Run tests: `python manage.py test`

### Frontend Development
- Pages are in `src/app` directory (Next.js 14 App Router)
- Components are in `src/components`
- API services are in `src/services`
- TypeScript types are in `src/types`
- Use `npm run lint` for linting
- Use `npm run type-check` for type checking

### Key URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8001/api`
- Admin Interface: `http://localhost:8001/admin`
- API Documentation: `http://localhost:8001/api/docs`

### Test Users
After running the test data commands, you can use these accounts:
- Email: `test@example.com` / Password: `testpass123`
- Email: `loan.officer@example.com` / Password: `testpass123`

## Database Schema

### Key Models
- **User & LoanOfficerProfile**: User authentication and profile data
- **Loan**: Core loan information and status
- **Bid**: Bid information and history
- **Notification**: System notifications
- **Transaction**: Credit system transactions

## Common Issues & Solutions

### Backend
1. Database connection issues:
   - Check PostgreSQL service is running
   - Verify database credentials in .env
   - Ensure database exists

2. Migration issues:
   - Run `python manage.py makemigrations`
   - For conflicts: `python manage.py migrate --fake`

### Frontend
1. Build errors:
   - Clear `.next` directory
   - Run `npm clean-install`
   - Check Node.js version (18+ required)

2. API connection issues:
   - Verify backend is running on port 8001
   - Check CORS settings in backend
   - Verify API URL in .env.local

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Backend: Follow PEP 8
- Frontend: Use Prettier and ESLint configs
- Use TypeScript strictly (no any unless necessary)
- Write tests for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@beatmyrate.com or open an issue on GitHub. 