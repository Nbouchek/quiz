# QuizApp Frontend

A modern quiz application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- Modern, responsive UI with Tailwind CSS
- Type-safe development with TypeScript
- Server-side rendering with Next.js
- Authentication with NextAuth.js
- State management with React Query
- Form handling with React Hook Form
- Input validation with Zod
- Testing with Jest and React Testing Library
- End-to-end testing with Cypress

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/QuizApp.git
   cd QuizApp/frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment variables:

   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests
- `npm run test:watch` - Run Jest tests in watch mode
- `npm run test:e2e` - Run Cypress end-to-end tests
- `npm run test:e2e:dev` - Open Cypress test runner

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configurations
│   ├── styles/          # Global styles and Tailwind CSS configuration
│   └── types/           # TypeScript type definitions
├── public/              # Static files
├── tests/               # Test files
├── .env.example         # Example environment variables
├── .eslintrc.json      # ESLint configuration
├── .prettierrc         # Prettier configuration
├── jest.config.js      # Jest configuration
├── next.config.js      # Next.js configuration
├── postcss.config.js   # PostCSS configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Testing

### Unit and Integration Tests

Run unit and integration tests with Jest:

```bash
npm test
```

### End-to-End Tests

Run end-to-end tests with Cypress:

```bash
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
