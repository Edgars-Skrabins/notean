# Notean

This project only contains the frontend, it relies on the [notean-backend](../backend) project for the backend — the app won't work without that running too.

## Prerequisites

- Node.js and npm

## Setup

Install the dependencies with `npm install`.

## Running the frontend

Run `npm run dev` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

The frontend expects the backend to be running at `http://127.0.0.1:3000`.

## Running the full app (backend + frontend)

1. Set up and start the [backend](../backend) first — see its README. It needs to be running at `http://127.0.0.1:3000` before you log in or register.
2. In a separate terminal, run `npm run dev` here and open `http://localhost:4200/`.

## Create components

Run `npm run newcomponent component-name` to generate a new component.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
