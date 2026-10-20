# Notean

Notean is a team workspace app for documents, diagrams and kanban boards.

This repository contains the whole app:

- `frontend/`: an Angular app, served at `http://localhost:4200`.
- `backend/`: a Rails API, served at `http://127.0.0.1:3000`.

The frontend won't work without the backend running.

## Prerequisites

- Node.js and npm
- Ruby 3.3.5 (see `backend/.ruby-version`)
- Bundler (`gem install bundler`)
- Docker with Compose, which runs the PostgreSQL database

`backend/config/master.key` decrypts `backend/config/credentials.yml.enc`, which is needed for JWT signing. It is committed to the repo for early development convenience, so no extra setup is needed. This must be addressed before any deployment: rotate the key and credentials, and gitignore `config/master.key` again.

The database URLs in `backend/config/database.yml` use dev-only credentials (user and password `notean`, matching `docker-compose.yml`), committed for the same reason. Before any deployment, create an env file that provides `DATABASE_URL` with real credentials. Production reads only `DATABASE_URL` and must never use the committed dev credentials.

## Setup

1. Start the database from the repository root. It keeps its data in a Docker volume between restarts.
   ```
   docker compose up -d
   ```
2. Install the backend dependencies and create the database:
   ```
   cd backend
   bundle install
   bin/rails db:prepare
   ```
3. Install the frontend dependencies:
   ```
   cd frontend
   npm install
   ```

## Running the app

1. Make sure the database is running (`docker compose up -d` from the repository root). Stop it with `docker compose down`; `docker compose down -v` also deletes its data.
2. Start the backend in one terminal. It must be running at `http://127.0.0.1:3000` before you log in or register.
   ```
   cd backend
   bin/rails server
   ```
3. Start the frontend in a second terminal, then open `http://localhost:4200/`. It reloads automatically when you change a source file.
   ```
   cd frontend
   npm run dev
   ```

## Running tests

- Backend: `bin/rails test` in `backend/`.
- Frontend: `npm run test` in `frontend/`, which runs the unit tests via [Karma](https://karma-runner.github.io).

## Frontend tasks

Run these in `frontend/`:

- `npm run newcomponent component-name` generates a new component.
- `npm run build` builds the app into `frontend/dist/`.

For more help with the Angular CLI, use `ng help` or see the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
