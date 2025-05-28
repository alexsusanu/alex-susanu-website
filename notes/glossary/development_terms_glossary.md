# Development Terms Glossary
category: Programming
tags: glossary, development, programming, terminology

## API (Application Programming Interface)

**What it is:** A set of rules and protocols that allows different software applications to communicate with each other.

**Why it matters:** APIs are the backbone of modern software. They enable integration between services, allow third-party developers to build on existing platforms, and make modular, scalable architectures possible.

**Real-world analogy:** Like a waiter in a restaurant - you don't go directly to the kitchen, you tell the waiter (API) what you want, and they bring it back to you.

**Examples:**
- **REST APIs** - Most common, uses HTTP methods (GET, POST, PUT, DELETE)
- **GraphQL** - Query language that lets clients request exactly the data they need
- **WebSocket APIs** - For real-time, two-way communication

**When you'll use it:** Building web apps, mobile apps, integrating payment systems, social media features, or any time you need data from external services.

## Git

**What it is:** A distributed version control system that tracks changes to files and coordinates work among multiple developers.

**Why it matters:** Git is essential for collaboration, backup, and maintaining code history. It prevents code loss, enables parallel development, and provides a complete audit trail of changes.

**Key concepts:**
- **Repository (repo)** - Container for your project and its history
- **Commit** - Snapshot of changes with a descriptive message
- **Branch** - Parallel version of code for new features
- **Merge** - Combining changes from different branches

**Essential commands:**
```bash
git clone    # Copy a repository
git add      # Stage changes
git commit   # Save changes with message
git push     # Upload to remote repository
git pull     # Download latest changes
```

**When you'll use it:** Every software project. Period.

## Database

**What it is:** Organized collection of structured information, or data, stored electronically in a computer system.

**Why it matters:** Applications need persistent storage. Databases provide efficient ways to store, retrieve, update, and delete data while maintaining integrity and supporting concurrent access.

**Types:**
- **Relational (SQL)** - Structured data in tables (MySQL, PostgreSQL, Oracle)
- **NoSQL** - Flexible schemas for varied data (MongoDB, Cassandra, Redis)
- **Graph** - Relationships between data points (Neo4j, Amazon Neptune)

**Key concepts:**
- **CRUD** - Create, Read, Update, Delete operations
- **Normalization** - Organizing data to reduce redundancy
- **Indexing** - Speed up data retrieval
- **ACID** - Atomicity, Consistency, Isolation, Durability

**When you'll use it:** Any application that needs to store user data, content, transactions, or state.

## Framework

**What it is:** Pre-written code that provides a foundation and structure for building applications.

**Why it matters:** Frameworks save time by providing common functionality, enforce best practices, and offer tested, optimized solutions to common problems.

**Examples by language:**
- **JavaScript** - React, Angular, Vue.js (frontend), Node.js/Express (backend)
- **Python** - Django, Flask, FastAPI
- **Java** - Spring Boot, Hibernate
- **PHP** - Laravel, Symfony

**Benefits:**
- **Faster development** - Don't reinvent the wheel
- **Best practices** - Built-in security, performance optimizations
- **Community support** - Documentation, tutorials, plugins
- **Maintainability** - Standardized code structure

**When you'll use it:** Almost every project. Choosing the right framework is crucial for project success.

## IDE (Integrated Development Environment)

**What it is:** Software application providing comprehensive facilities for software development including code editor, debugger, and build tools.

**Why it matters:** IDEs boost productivity with features like syntax highlighting, auto-completion, debugging, and integrated tools that streamline the development workflow.

**Popular IDEs:**
- **VS Code** - Lightweight, extensible, free
- **IntelliJ IDEA** - Powerful for Java, many language plugins
- **PyCharm** - Python-focused with Django support
- **Xcode** - Apple's IDE for iOS/macOS development

**Key features:**
- **Syntax highlighting** - Color-codes different parts of code
- **Auto-completion** - Suggests code as you type
- **Debugging** - Step through code to find issues
- **Version control integration** - Git commands built-in
- **Extensions** - Add functionality for specific needs

**When you'll use it:** Daily coding work. The right IDE can significantly impact your productivity.

## Library vs Framework

**What's the difference:** 
- **Library** - You call its functions when you need them
- **Framework** - It calls your code when it needs it (inversion of control)

**Library example:** jQuery - you decide when to use `$.ajax()`
**Framework example:** React - React decides when to call your component functions

**Why it matters:** Understanding this distinction helps you choose the right tools and understand how to structure your code within different architectures.

## SDK (Software Development Kit)

**What it is:** Collection of software development tools, including libraries, documentation, code samples, and guides.

**Why it matters:** SDKs provide everything needed to develop applications for specific platforms or services, standardizing how developers interact with systems.

**Examples:**
- **Android SDK** - Tools for building Android apps
- **iOS SDK** - Apple's tools for iPhone/iPad apps
- **AWS SDK** - Libraries for interacting with Amazon Web Services
- **Stripe SDK** - Payment processing integration

**Components typically included:**
- **APIs and libraries** - Pre-built functions
- **Documentation** - How-to guides and references
- **Code examples** - Sample implementations
- **Development tools** - Compilers, debuggers, emulators

**When you'll use it:** When building for specific platforms (mobile, cloud services, payment systems).

## Package Manager

**What it is:** Tool that automates installing, updating, and managing software packages and their dependencies.

**Why it matters:** Package managers prevent "dependency hell," ensure consistent environments, and make sharing code easy across teams and projects.

**Examples by language:**
- **npm** - Node.js/JavaScript packages
- **pip** - Python packages
- **Maven/Gradle** - Java dependencies
- **Composer** - PHP packages
- **NuGet** - .NET packages

**Key concepts:**
- **Package** - Bundled code with metadata
- **Dependency** - Code your project needs to function
- **Version lock** - Ensuring consistent dependency versions
- **Registry** - Central repository of packages

**When you'll use it:** Every modern development project uses package managers.

## Debugging

**What it is:** Process of finding and fixing bugs (errors) in computer programs.

**Why it matters:** Debugging is essential for creating reliable software. Good debugging skills separate professional developers from beginners.

**Types of bugs:**
- **Syntax errors** - Code doesn't follow language rules
- **Logic errors** - Code runs but produces wrong results
- **Runtime errors** - Code crashes during execution
- **Performance issues** - Code is slow or inefficient

**Debugging techniques:**
- **Print debugging** - Add console.log/print statements
- **Breakpoints** - Pause execution at specific lines
- **Step debugging** - Execute code line by line
- **Stack traces** - Follow the path that led to an error

**Tools:**
- **Browser DevTools** - Built into Chrome, Firefox
- **IDE debuggers** - Integrated debugging features
- **Logging frameworks** - Structured error tracking

**When you'll use it:** Every day as a developer. Bugs are inevitable.

## Testing

**What it is:** Process of executing code to find defects and verify that software behaves as expected.

**Why it matters:** Testing prevents bugs from reaching users, ensures code quality, and provides confidence when making changes.

**Types of testing:**
- **Unit tests** - Test individual functions/components
- **Integration tests** - Test how parts work together
- **End-to-end tests** - Test complete user workflows
- **Performance tests** - Test speed and scalability

**Testing frameworks:**
- **JavaScript** - Jest, Mocha, Cypress
- **Python** - pytest, unittest
- **Java** - JUnit, TestNG
- **C#** - NUnit, MSTest

**Best practices:**
- **Test early and often** - Don't wait until the end
- **Write testable code** - Design for easy testing
- **Test edge cases** - What happens with invalid input?
- **Maintain tests** - Keep them updated with code changes

**When you'll use it:** Professional development requires testing. It's not optional.

## Refactoring

**What it is:** Process of restructuring existing code without changing its external behavior to improve readability, reduce complexity, or improve performance.

**Why it matters:** Code becomes messy over time. Refactoring keeps codebases maintainable, makes adding features easier, and reduces technical debt.

**Common refactoring techniques:**
- **Extract method** - Break large functions into smaller ones
- **Rename variables** - Use clearer, more descriptive names
- **Remove duplication** - DRY (Don't Repeat Yourself)
- **Simplify conditionals** - Make if/else logic clearer

**When to refactor:**
- **Before adding new features** - Clean foundation
- **When fixing bugs** - Understand and improve problematic code
- **During code reviews** - Team identifies improvement opportunities
- **Regular maintenance** - Prevent technical debt accumulation

**When you'll use it:** Continuously throughout your career. Clean code is professional code.

## Version Control

**What it is:** System for tracking changes to files over time, allowing multiple people to collaborate and maintaining history of modifications.

**Why it matters:** Version control is essential for any serious development work. It enables collaboration, provides backup, and allows you to experiment safely.

**Key concepts:**
- **Repository** - Storage location for your code and its history
- **Commit** - Snapshot of changes with a message
- **Branch** - Independent line of development
- **Merge** - Combining changes from different branches
- **Tag** - Marking specific versions (releases)

**Popular systems:**
- **Git** - Most popular, distributed system
- **Subversion (SVN)** - Centralized system, still used in some enterprises
- **Mercurial** - Similar to Git, less popular

**Workflow patterns:**
- **Feature branches** - Create branch per feature
- **Git flow** - Structured branching model
- **GitHub flow** - Simpler model for continuous deployment

**When you'll use it:** Every professional development project.

## Code Review

**What it is:** Systematic examination of code changes by team members before merging into the main codebase.

**Why it matters:** Code reviews catch bugs, ensure code quality, share knowledge across the team, and maintain coding standards.

**What reviewers look for:**
- **Correctness** - Does the code work as intended?
- **Style** - Does it follow team conventions?
- **Performance** - Are there efficiency issues?
- **Security** - Any vulnerabilities introduced?
- **Maintainability** - Is it easy to understand and modify?

**Best practices:**
- **Review small changes** - Large reviews are less effective
- **Be constructive** - Suggest improvements, don't just criticize
- **Automate what you can** - Use linters, formatters
- **Focus on important issues** - Don't nitpick minor style issues

**Tools:**
- **GitHub Pull Requests** - Most common for Git workflows
- **GitLab Merge Requests** - Similar functionality
- **Bitbucket Pull Requests** - Atlassian's solution
- **Review Board** - Dedicated code review tool

**When you'll use it:** Any team development environment. Essential for code quality.

## Deployment

**What it is:** Process of making software available for use, typically by moving it from development environment to production.

**Why it matters:** Even great code is useless if users can't access it. Reliable deployment processes are crucial for delivering value.

**Deployment environments:**
- **Development** - Where developers write and test code
- **Staging** - Production-like environment for final testing
- **Production** - Live environment where real users access the application

**Deployment strategies:**
- **Blue-Green** - Two identical environments, switch traffic instantly
- **Rolling** - Gradually replace old version with new version
- **Canary** - Deploy to small subset of users first
- **Feature flags** - Deploy code but control feature activation

**Tools and platforms:**
- **Heroku** - Simple platform-as-a-service
- **AWS** - Comprehensive cloud services
- **Netlify/Vercel** - Static site deployment
- **Docker** - Containerized deployment

**When you'll use it:** Every time you want users to see your changes.