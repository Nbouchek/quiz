/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Visit the home page before each test
    cy.visit('/')
  })

  it('Shows login button when not authenticated', () => {
    // Look for the Sign in button in the navbar
    cy.get('nav').contains('Sign in').should('be.visible')
  })

  it('Navigates to login page when Sign in is clicked', () => {
    // Click the Sign in button and verify redirection to login page
    cy.get('nav').contains('Sign in').click()
    cy.url().should('include', '/login')

    // Verify login page elements
    cy.contains('Sign in to your account').should('be.visible')
    cy.contains('Sign in with Google').should('be.visible')
    cy.contains('Sign in with Facebook').should('be.visible')
    cy.contains('Sign in with Apple').should('be.visible')
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
  })

  it('Shows validation errors for empty email/password submission', () => {
    cy.visit('/login')
    cy.get('form').submit()
    cy.contains('Email is required').should('be.visible')
    cy.contains('Password is required').should('be.visible')
  })

  // This test simulates a successful login by mocking the session
  // Note: You'll need to set up mocking in Cypress to properly test this
  it('Redirects to home page after successful mock login', () => {
    // This is a placeholder for how you might test with mocked authentication
    // Real implementation would depend on your Cypress setup for mocking NextAuth
    cy.visit('/login')

    // Example of how you might mock a successful login
    // cy.window().then((window) => {
    //   window.sessionStorage.setItem('mockAuthState', 'authenticated')
    // })

    cy.get('input[type="email"]').type('test@example.com')
    cy.get('input[type="password"]').type('password123')
    cy.get('form').submit()

    // In a real implementation with proper mocking:
    // cy.url().should('eq', Cypress.config().baseUrl + '/')
    // cy.get('nav').contains('Sign out').should('be.visible')
  })
})
