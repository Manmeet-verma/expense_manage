# Expense Manager

A full-stack expense tracking application with role-based access control (Admin & Members) built with Next.js, NextAuth.js, Prisma, and Supabase PostgreSQL.

## Features

- **Authentication**: Secure login/signup with NextAuth.js (Credentials provider)
- **Role-Based Access**: 
  - ADMIN: Can view all expenses, approve/reject with remarks
  - MEMBER: Can create, edit, delete their own expenses (before approval)
- **Expense Management**: 
  - Create, read, update, delete expenses
  - Categories: Food, Travel, Transportation, Accommodation, Office Supplies, Communication, Entertainment, Other
  - Status tracking: PENDING, APPROVED, REJECTED
- **Dashboard**: Stats cards showing total, pending, approved, rejected expenses
- **Modern UI**: Tailwind CSS with clean, responsive design

## Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Backend**: Next.js API Routes / Server Actions
- **Auth**: NextAuth.js v5 (Beta)
- **Database**: Prisma ORM with Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- Supabase account (or PostgreSQL database)

### 2. Database Setup

1. Create a Supabase project at https://supabase.com
2. Get your database connection string from Supabase dashboard:
   - Settings → Database → Connection string
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

### 3. Environment Variables

Update the `.env` file with your Supabase credentials:

```env
# Supabase Database URL
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-random-string"

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

Generate a secret with: `openssl rand -base64 32`

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

This will create the User and Expense tables in your database.

### 6. Seed Database (Optional)

```bash
npm run db:seed
```

This creates demo users:
- **Admin**: admin@example.com / admin123
- **Member**: member@example.com / member123

### 7. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
├── actions/              # Server Actions
│   ├── auth.ts          # Signup action
│   └── expense.ts       # Expense CRUD actions
├── app/                  # Next.js App Router
│   ├── (dashboard)/     # Protected dashboard routes
│   │   ├── admin/       # Admin dashboard
│   │   └── dashboard/   # Member dashboard
│   ├── api/auth/        # NextAuth API routes
│   ├── login/           # Login page
│   └── signup/          # Signup page
├── components/           # React components
│   ├── forms/           # Form components
│   └── ui/              # UI primitives
├── lib/                  # Core utilities
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   └── utils.ts         # Helper functions
├── prisma/              # Database schema
│   ├── schema.prisma    # Schema definition
│   └── seed.ts          # Seed data
└── types/               # TypeScript types
```

## API Routes & Server Actions

### Server Actions

- `signup(data)` - Create new user
- `createExpense(data)` - Create expense (member)
- `getMyExpenses()` - Get user's expenses
- `getAllExpenses()` - Get all expenses (admin)
- `updateExpense(id, data)` - Update expense
- `deleteExpense(id)` - Delete expense
- `approveOrRejectExpense(data)` - Approve/reject (admin)
- `getExpenseStats()` - Get dashboard statistics

### Protected Routes

- `/dashboard` - Member dashboard (MEMBER role)
- `/admin` - Admin dashboard (ADMIN role)

## Usage

### Member Flow

1. Login or signup as MEMBER
2. Create new expenses with title, amount, category
3. View your submitted expenses
4. Edit/delete pending expenses only

### Admin Flow

1. Login or signup as ADMIN
2. View all expenses from all users
3. Click checkmark to approve, X to reject
4. Add optional remarks when approving/rejecting

## License

MIT
