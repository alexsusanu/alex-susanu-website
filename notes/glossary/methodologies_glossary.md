# Methodologies & Practices Glossary
category: General
tags: glossary, methodologies, agile, devops, practices

## Agile

**What it is:** Set of principles and practices for software development that emphasizes collaboration, flexibility, and rapid iteration.

**Why it matters:** Agile helps teams respond to changing requirements, deliver value faster, and improve product quality through continuous feedback and adaptation.

**Core values (Agile Manifesto):**
- **Individuals and interactions** over processes and tools
- **Working software** over comprehensive documentation
- **Customer collaboration** over contract negotiation
- **Responding to change** over following a plan

**Key principles:**
- **Customer satisfaction** through early and continuous delivery
- **Welcome changing requirements** even late in development
- **Deliver working software frequently** (weeks rather than months)
- **Business people and developers** must work together daily

**Common frameworks:**
- **Scrum** - Most popular, uses sprints and specific roles
- **Kanban** - Visual workflow management with continuous flow
- **Lean** - Focus on eliminating waste and maximizing value
- **Extreme Programming (XP)** - Engineering practices focus

**When you'll use it:** Most modern software development teams use some form of Agile methodology.

## Scrum

**What it is:** Agile framework that organizes work into time-boxed iterations called sprints, with specific roles, events, and artifacts.

**Why it matters:** Scrum provides structure for Agile development, helping teams collaborate effectively and deliver working software regularly.

**Key roles:**
- **Product Owner** - Defines requirements and priorities
- **Scrum Master** - Facilitates process and removes obstacles
- **Development Team** - Cross-functional group that builds the product

**Scrum events:**
- **Sprint** - Time-boxed iteration (usually 2-4 weeks)
- **Sprint Planning** - Plan work for upcoming sprint
- **Daily Scrum** - Brief daily coordination meeting
- **Sprint Review** - Demonstrate completed work to stakeholders
- **Sprint Retrospective** - Team reflects on process improvements

**Scrum artifacts:**
- **Product Backlog** - Prioritized list of features and requirements
- **Sprint Backlog** - Work selected for current sprint
- **Increment** - Working product at end of sprint

**Benefits:**
- **Predictable delivery** - Regular sprint cycles
- **Transparency** - Clear visibility into progress
- **Adaptability** - Can change direction between sprints
- **Team empowerment** - Self-organizing teams

**When you'll use it:** Teams that want structured Agile process with regular delivery cycles.

## DevOps

**What it is:** Cultural and technical movement that emphasizes collaboration between development and operations teams to deliver software faster and more reliably.

**Why it matters:** DevOps breaks down silos between development and operations, enabling faster delivery, higher quality, and better collaboration.

**Core principles:**
- **Culture of collaboration** - Shared responsibility for outcomes
- **Automation** - Reduce manual, error-prone processes
- **Measurement** - Use metrics to drive improvements
- **Sharing** - Knowledge and tools across teams

**Key practices:**
- **Continuous Integration/Continuous Deployment** - Automated build and deployment
- **Infrastructure as Code** - Manage infrastructure like software
- **Monitoring and logging** - Comprehensive system observability
- **Configuration management** - Automated system configuration

**Popular tools:**
- **Version control** - Git, GitHub, GitLab
- **CI/CD** - Jenkins, GitHub Actions, Azure DevOps
- **Configuration management** - Ansible, Puppet, Chef
- **Containerization** - Docker, Kubernetes
- **Monitoring** - Prometheus, Grafana, ELK stack

**Benefits:**
- **Faster time to market** - Reduced deployment friction
- **Higher quality** - Automated testing and deployment
- **Better reliability** - Infrastructure as code and monitoring
- **Improved collaboration** - Shared tools and processes

**When you'll use it:** Any organization looking to improve software delivery speed and quality.

## Lean

**What it is:** Methodology focused on maximizing customer value while minimizing waste in processes and resources.

**Why it matters:** Lean helps organizations become more efficient by eliminating activities that don't add value, leading to faster delivery and lower costs.

**Core principles:**
- **Identify value** - What do customers actually want?
- **Map value stream** - Understand the flow of work
- **Create flow** - Eliminate bottlenecks and delays
- **Establish pull** - Work is pulled by customer demand
- **Pursue perfection** - Continuous improvement

**Types of waste (Muda):**
- **Overproduction** - Building more than needed
- **Waiting** - Idle time between activities
- **Transportation** - Unnecessary movement of materials
- **Overprocessing** - More work than customer values
- **Inventory** - Excess work in progress
- **Motion** - Unnecessary movement of people
- **Defects** - Rework and corrections

**Lean tools:**
- **Value stream mapping** - Visualize entire process flow
- **Kaizen** - Continuous small improvements
- **5S** - Workplace organization system
- **Kanban** - Visual workflow management

**When you'll use it:** Any process that can benefit from waste reduction and efficiency improvements.

## Kanban

**What it is:** Visual workflow management method that uses boards and cards to represent work items and their progress through different stages.

**Why it matters:** Kanban provides visibility into work flow, helps identify bottlenecks, and enables teams to optimize their processes continuously.

**Core principles:**
- **Visualize workflow** - Make work and process visible
- **Limit work in progress** - Focus on finishing before starting new work
- **Manage flow** - Optimize the movement of work items
- **Make policies explicit** - Clear rules about how work flows
- **Implement feedback loops** - Regular review and improvement
- **Improve collaboratively** - Evolve process through experimentation

**Kanban board structure:**
- **Columns** - Represent different stages of work (To Do, In Progress, Done)
- **Cards** - Individual work items or tasks
- **WIP limits** - Maximum number of items allowed in each column
- **Swimlanes** - Horizontal divisions for different types of work

**Benefits:**
- **Improved visibility** - Everyone can see status of all work
- **Better flow** - Identify and resolve bottlenecks
- **Flexibility** - Easy to adapt to changing priorities
- **Continuous improvement** - Regular retrospectives and adjustments

**When you'll use it:** Teams that want visual workflow management with continuous flow rather than fixed iterations.

## Test-Driven Development (TDD)

**What it is:** Software development practice where tests are written before the code they test, following a red-green-refactor cycle.

**Why it matters:** TDD improves code quality, design, and confidence in changes by ensuring comprehensive test coverage and forcing developers to think about requirements upfront.

**TDD cycle:**
1. **Red** - Write a failing test for desired functionality
2. **Green** - Write minimal code to make the test pass
3. **Refactor** - Improve code while keeping tests passing
4. **Repeat** - Continue cycle for next piece of functionality

**Benefits:**
- **Better design** - Forces thinking about interfaces and requirements
- **High test coverage** - Tests written for all functionality
- **Confidence in changes** - Regression testing catches breaking changes
- **Documentation** - Tests serve as examples of how code should work
- **Debugging ease** - Smaller, focused tests make issues easier to isolate

**Best practices:**
- **Write smallest possible test** - Focus on one behavior at a time
- **Keep tests simple** - Tests should be easy to understand
- **Fast execution** - Tests should run quickly for fast feedback
- **Independent tests** - Tests shouldn't depend on each other

**When you'll use it:** Any development where code quality and maintainability are important priorities.

## Code Review

**What it is:** Systematic examination of source code changes by team members before merging into the main codebase.

**Why it matters:** Code reviews catch bugs, ensure code quality, share knowledge across the team, and maintain coding standards.

**Review process:**
1. **Developer creates pull request** - Proposes changes for review
2. **Reviewers examine code** - Check for issues and improvements
3. **Feedback provided** - Comments and suggestions for changes
4. **Developer addresses feedback** - Makes requested changes
5. **Approval and merge** - Code integrated into main branch

**What reviewers look for:**
- **Correctness** - Does the code work as intended?
- **Style and conventions** - Follows team coding standards?
- **Performance** - Any efficiency issues or optimizations?
- **Security** - Potential vulnerabilities introduced?
- **Maintainability** - Is code easy to understand and modify?
- **Testing** - Adequate test coverage for changes?

**Best practices:**
- **Keep changes small** - Easier to review and less risky
- **Be constructive** - Suggest improvements, don't just criticize
- **Review promptly** - Don't let reviews block progress
- **Use automation** - Linters and formatters catch style issues
- **Focus on important issues** - Don't nitpick minor style preferences

**When you'll use it:** Any team development environment. Essential for maintaining code quality.

## Pair Programming

**What it is:** Software development technique where two programmers work together at one workstation, with one writing code while the other reviews.

**Why it matters:** Pair programming improves code quality, shares knowledge, and can actually increase productivity despite using two developers.

**Roles:**
- **Driver** - Types code and focuses on tactical implementation
- **Navigator** - Reviews code, thinks strategically, suggests improvements
- **Role switching** - Partners regularly switch roles

**Benefits:**
- **Higher code quality** - Real-time code review catches issues immediately
- **Knowledge sharing** - Both developers learn from each other
- **Reduced debugging time** - Fewer bugs make it into codebase
- **Better design** - Two perspectives lead to better solutions
- **Team collaboration** - Improves communication and teamwork

**When it works best:**
- **Complex problems** - Benefit from multiple perspectives
- **Knowledge transfer** - Senior developer mentoring junior
- **Critical code** - High-importance features that need extra attention
- **Learning new technologies** - Shared exploration of unfamiliar tools

**When you'll use it:** Selectively for complex problems, mentoring, or critical code sections.

## Continuous Integration (CI)

**What it is:** Development practice where developers frequently integrate code changes into shared repository, with automated builds and tests.

**Why it matters:** CI catches integration issues early, provides fast feedback to developers, and maintains a always-deployable main branch.

**CI process:**
1. **Developer commits code** - Changes pushed to version control
2. **Automated build triggered** - Code compiled and packaged
3. **Automated tests run** - Unit, integration, and other tests
4. **Results reported** - Pass/fail status communicated to team
5. **Issues addressed** - Failed builds fixed immediately

**Key practices:**
- **Frequent commits** - Integrate changes multiple times per day
- **Automated builds** - No manual compilation steps
- **Comprehensive testing** - High confidence in build quality
- **Fast builds** - Quick feedback to developers
- **Fix broken builds immediately** - Maintain clean main branch

**CI tools:**
- **Jenkins** - Open-source automation server
- **GitHub Actions** - Integrated with GitHub repositories
- **GitLab CI/CD** - Built into GitLab platform
- **Azure DevOps** - Microsoft's CI/CD solution
- **CircleCI** - Cloud-based CI/CD platform

**When you'll use it:** Every professional software development team should implement CI.

## Continuous Deployment (CD)

**What it is:** Extension of continuous integration where every code change that passes automated tests is automatically deployed to production.

**Why it matters:** CD enables faster delivery of features to users, reduces deployment risk through automation, and provides rapid feedback on changes.

**Deployment pipeline stages:**
1. **Source control** - Code changes trigger pipeline
2. **Build** - Compile and package application
3. **Test** - Automated testing at multiple levels
4. **Staging deployment** - Deploy to production-like environment
5. **Production deployment** - Automated release to users

**Deployment strategies:**
- **Blue-green deployment** - Switch between two identical environments
- **Rolling deployment** - Gradually replace old version with new
- **Canary deployment** - Deploy to small subset of users first
- **Feature flags** - Deploy code but control feature activation

**Requirements for successful CD:**
- **Comprehensive test suite** - High confidence in automated tests
- **Monitoring and alerting** - Detect issues quickly
- **Rollback capability** - Quick recovery from problems
- **Infrastructure automation** - Consistent, repeatable deployments

**When you'll use it:** Teams with mature CI practices and comprehensive testing who want to maximize deployment frequency.