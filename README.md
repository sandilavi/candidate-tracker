# Candidate Tracker

A full-stack, type-safe monorepo application for managing candidates and their job applications. Built with React (Vite), Fastify, Prisma, Zod, and PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Docker & Docker Compose (for running the local database)

## Quick Start (For Reviewers)

Follow these steps to spin up the local development environment.

### 1. Start the Database
The project includes a `docker-compose.yml` file to instantly provision a local PostgreSQL instance.

```bash
docker-compose up -d
```

### 2. Configure Environment Variables
Copy the example environment files to their actual locations.

**For the API:**
```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```
*(The `DATABASE_URL` in these files is already pre-configured to match the `docker-compose` credentials).*

**For the Web App:**
```bash
cp apps/web/.env.example apps/web/.env
```

### 3. Install Dependencies
Install the monorepo dependencies from the root directory:

```bash
npm install
```

### 4. Setup Database Schema and Seed Data
Push the Prisma schema to your running Docker database and populate it with the mock candidate/application data:

```bash
npm run db:push --workspace=@candidate-tracker/api
npm run seed --workspace=@candidate-tracker/api
```

### 5. Run the Application
Start both the React frontend and Fastify backend in parallel using Turborepo:

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

## Running Tests

The backend includes a comprehensive Vitest test suite testing the API endpoints, error handling, and database constraints.

```bash
npm run test --workspace=@candidate-tracker/api
```

*(Note: The test suite runs against a separate schema by injecting `.env.test`, so it won't wipe your development data).*

## Features

- **End-to-End Type Safety:** Zod schemas are shared across the frontend and backend via the `packages/shared` workspace.
- **Advanced Search & Pagination:** Cross-entity searching (searching applications by Candidate Name/Location or Job Title/Company) using Prisma's `OR` operators.
- **Global Error Handling:** Centralized error catching mapping Prisma unique constraints to clean HTTP 400 responses.
- **KPI Dashboard:** Real-time metrics and dynamic application tracking.

## Architectural Decisions

- **Monorepo & Shared Types**: Used Turborepo with a `packages/shared` workspace containing Zod schemas. This ensures that the frontend and backend are perfectly synced and we have a single source of truth for validation and types. Fastify type providers natively infer request/response shapes directly from these schemas.
- **Error Handling**: Implemented a centralized error handler in Fastify that specifically catches Zod validation errors and Prisma exceptions (like `P2002` unique constraint violations) and converts them into standardized JSON HTTP 400 responses.
- **Cross-Entity Search**: Search queries for applications perform a server-side join filtering through Prisma's advanced querying capabilities, matching against Candidate relations directly in SQL instead of fetching all records and filtering in JavaScript.
- **State Management**: React Query was chosen for server-side state management, abstracting away loading/error/submitting states and providing powerful caching and invalidation logic to make the UI feel snappy without manual data synchronization.

## Given More Time, I Would...

- **Implement Cursor-based Pagination**: Currently using offset-based pagination. For very large datasets, cursor-based pagination would provide better performance and stability against data shifts.
- **Add E2E Testing**: Add Cypress or Playwright tests to simulate user flows completely end-to-end (e.g. creating a candidate, applying for a job, deleting the application).
- **Kanban Board**: Build a drag-and-drop Kanban view for applications sorted by their active status for an improved recruiter experience.
- **Optimistic UI Updates**: Improve perceived performance further by optimistically updating list views on status changes or deletes before the server responds.
