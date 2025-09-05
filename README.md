# Beat My Rate - Loan Officer Platform

A competitive loan marketplace platform that connects borrowers with loan officers through real-time bidding. Loan officers compete to offer the best mortgage rates while borrowers get access to competitive pricing.

## Problem Statement

Traditional mortgage lending is inefficient. Borrowers struggle to find competitive rates, while loan officers waste time on unqualified leads. The market lacks transparency and real-time competition.

## Solution

Beat My Rate creates a reverse auction marketplace where:
- Borrowers upload loan documents and requirements
- Loan officers bid competitively with lower APRs
- Real-time notifications keep all parties informed
- AI processes documents to extract loan data automatically

## Architecture

### Backend (Django 5.1.4)
- **Framework**: Django REST Framework with ASGI support
- **Database**: PostgreSQL with comprehensive relational models
- **Authentication**: JWT tokens with Google OAuth2 integration
- **Real-time**: Django Channels with Redis for WebSocket support
- **AI Processing**: Google Gemini for document extraction
- **Server**: Daphne ASGI server for WebSocket + HTTP

### Frontend (Next.js 15.0.4)
- **Framework**: Next.js with App Router and TypeScript
- **Styling**: Tailwind CSS with responsive design
- **State Management**: React Query for server state
- **Forms**: React Hook Form with validation
- **Real-time**: Native WebSocket API integration

### Database Design

#### Core Models
- **CustomUser**: Email-based authentication with role-based access
- **LoanOfficerProfile**: Comprehensive profiles with NMLS verification
- **Borrower**: Personal and financial information
- **Loan**: Core loan details with competitive/guaranteed lead types
- **Bid**: Real-time competitive bidding system
- **Notification**: WebSocket-based notification delivery
- **UploadedDocument**: AI-powered document processing

#### Key Relationships
- One-to-many: Borrower → Loans
- Many-to-many: LoanOfficer → Bids → Loans
- One-to-one: LoanOfficerProfile → Preferences
- Generic Foreign Key: Notifications → Any model

### Real-time System

#### WebSocket Architecture
- **NotificationConsumer**: Handles real-time notifications
- **BidConsumer**: Manages live bid updates
- **Redis Channel Layer**: Scalable message distribution
- **JWT Authentication**: Secure WebSocket connections

#### Message Types
- Bid updates with APR changes
- Outbid notifications
- New loan availability
- Loan status changes

### AI Document Processing

#### Google Gemini Integration
- **Model**: Gemini 1.5 Flash for fast processing
- **Input**: PDF loan estimates
- **Output**: Structured JSON with loan data
- **Fallback**: Placeholder data when AI fails
- **Confidence Scoring**: Quality assessment of extractions

#### Extracted Data
- Borrower information
- Loan amount and APR
- Interest rates and terms
- Monthly payments
- Closing costs

### Authentication System

#### JWT Implementation
- Access tokens (1 hour lifetime)
- Refresh tokens (7 days lifetime)
- Token rotation on refresh
- Blacklist for security

#### Google OAuth2
- Seamless social login
- Profile data synchronization
- Role-based access control

### API Design

#### RESTful Endpoints
- `/api/auth/` - Authentication and user management
- `/api/loans/` - Loan CRUD operations
- `/api/bidding/` - Bid placement and tracking
- `/api/notifications/` - Notification management
- `/api/document_processing/` - Document upload and processing

#### Response Format
- Consistent JSON responses
- Pagination for list endpoints
- Error handling with status codes
- CORS configuration for frontend

### Security

#### Data Protection
- Password hashing with Argon2
- SQL injection prevention via Django ORM
- XSS protection with CSRF tokens
- Input validation and sanitization

#### Access Control
- Role-based permissions
- JWT token validation
- WebSocket authentication
- CORS policy enforcement

## Technical Implementation

### Database Migrations
- Version-controlled schema changes
- Data migration support
- Rollback capabilities
- Production-safe deployments

### Environment Configuration
- Environment variable management
- Development/production settings
- Secret key protection
- Database connection pooling

### Logging and Monitoring
- Structured logging with Django
- Error tracking and reporting
- Performance monitoring
- Debug information capture

### Testing Strategy
- Unit tests for models and views
- Integration tests for API endpoints
- WebSocket connection testing
- AI processing validation

## Performance Optimizations

### Database
- Indexed queries for fast lookups
- Select related for efficient joins
- Pagination for large datasets
- Query optimization

### Frontend
- Code splitting with Next.js
- Image optimization
- Caching strategies
- Bundle size optimization

### Real-time
- Message throttling
- Connection pooling
- Efficient WebSocket management
- Redis optimization

## Deployment

### Requirements
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Environment Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001

# Frontend
cd frontend
npm install
npm run dev
```

### Production Considerations
- Daphne ASGI server for WebSocket support
- Static file serving with WhiteNoise
- Database connection pooling
- Redis clustering for scalability
- Load balancing for high availability

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - Email/password login
- `POST /api/auth/google/` - Google OAuth2
- `GET /api/auth/user/` - Current user details

### Loan Management
- `GET /api/loans/` - List available loans
- `GET /api/loans/competitive/` - Competitive loans
- `GET /api/loans/guaranteed/` - Guaranteed leads
- `POST /api/loans/{id}/bid/` - Submit bid

### WebSocket Endpoints
- `ws://localhost:8001/ws/notifications/` - Real-time notifications
- `ws://localhost:8001/ws/bids/` - Live bid updates

## Development Workflow

1. Feature branch creation
2. Local development and testing
3. Code review process
4. Automated testing
5. Production deployment

## Future Enhancements

- Machine learning for loan matching
- Advanced analytics dashboard
- Mobile application
- Third-party integrations
- Automated underwriting