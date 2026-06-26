# ELECTRE Decision Support Tool

A lightweight, frameworkless, pure TypeScript decision-support web application implementing the **ELECTRE II** (Weighted Outranking) and **ELECTRE Iv** (Weightless Outranking) mathematical engines.

## Live Demo
The application is automatically compiled and hosted online via GitHub Pages at:
`https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/`

## Project Architecture
- **Decoupled Strategy:** The core mathematical hub (`electre.ts`) handles multi-criteria evaluations in RAM, independent of UI rendering loops.
- **State Management:** Fully client-side state machine using native DOM events and localized storage caching.

## Local Installation & Execution
1. Clone the repository:
   ```bash
   git clone [https://github.com/](https://github.com/)<username>/<repository>.git