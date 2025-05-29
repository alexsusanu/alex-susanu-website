// Content data for About Me and CV sections
const CONTENT_DATA = {
    intro: `
        <div class="greeting">Hello there! 👋</div>
        
        <p>I'm Alex, and I absolutely love what I do! I'm a customer-focused engineer who thrives on solving problems and making technology work better for everyone. Over the past few years, I've had the pleasure of working in some really exciting, fast-paced environments where no two days are the same.</p>
        
        <p>My journey has taken me through building <span class="highlight">Java microservices</span>, diving into production firefighting (the fun kind!), crafting automation scripts that make everyone's lives easier, and keeping systems humming along smoothly. There's something incredibly satisfying about improving uptime, creating tools that genuinely help the team, or being the person who jumps in when things get critical.</p>
        
        <p>I'm comfortable with a variety of tools—<span class="highlight">Java, Bash, Kubernetes, Docker, AWS</span>—but honestly, what excites me most is learning something new when a challenge calls for it. There's always another cool technology or approach to explore!</p>
        
        <p>What I think sets me apart is how much I enjoy the people side of tech. I've spent plenty of time working directly with clients, writing documentation that people actually want to read, running training sessions, and helping translate between the technical and non-technical worlds. I genuinely believe that the best solutions come from understanding what people really need.</p>
        
        <p>I'm excited about opportunities where I can bring together my technical skills with my people-first approach—whether that's in <span class="highlight">tech support, DevOps, backend engineering</span>, or wherever there's a good problem to solve and great people to work with.</p>
        
        <p>Thanks so much for taking the time to get to know me a bit! I'd love to chat more about how we might work together—feel free to reach out anytime.</p>
        
        <div class="signature">
            <div>Cheers,</div>
            <div class="name">Alex Susanu</div>
        </div>
    `,
    
    cv: `
        <div class="section-title">Summary</div>
        <p>Customer-focused engineer with extensive experience in Java, APIs, DevOps, coding, client communication, and technical support. Proven track record of providing responsive support, resolving issues efficiently, and maintaining clear communication with clients and stakeholders. Adept at troubleshooting and automating solutions that improve performance and reduce downtime. Technically proficient with Java, Bash, AWS, Kubernetes, and Linux, emphasizing proactive support with minimal operational disruption.</p>
        
        <p>Combines strong technical expertise with exceptional interpersonal skills and business acumen. Excels in collaborative, multilingual environments, effectively bridging gaps between technical and non-technical teams.</p>
        
        <p>Solution-oriented professional known for building client trust and contributing to team success through empathy and adaptability. Balances technical execution with business priorities while staying current with emerging tools to deliver practical, user-focused outcomes.</p>
        
        <div class="section-title">Experience</div>
        
        <div class="job-title">Technical and Development Engineer</div>
        <div class="company-info">10x Banking – London, UK | Nov 2021 – Jul 2024</div>
        
        <div class="role-subtitle">DevOps & Development Support Associate Engineer</div>
        <ul>
            <li><strong>Contributed to Java Spring Boot microservices development:</strong>
                <ul class="nested-list">
                    <li>Enhanced features and fixed bugs across account and transaction services</li>
                    <li>Participated in code reviews improving quality and consistency</li>
                    <li>Followed API development best practices for versioning and documentation</li>
                </ul>
            </li>
            <li><strong>Enhanced infrastructure monitoring and reliability:</strong>
                <ul class="nested-list">
                    <li>Achieved 99.99% uptime for mission-critical banking services using New Relic and CloudWatch</li>
                    <li>Reduced system downtime by 35% through proactive incident prevention</li>
                    <li>Created shared dashboards increasing cross-team visibility and early anomaly detection</li>
                </ul>
            </li>
            <li><strong>Streamlined development and deployment processes:</strong>
                <ul class="nested-list">
                    <li>Reduced cycle time by 30% by optimizing Jenkins CI/CD pipelines</li>
                    <li>Built Docker-based testing environments accelerating bug fixes and feature rollouts</li>
                    <li>Collaborated with QA to define test cases, decreasing defect rates by 15%</li>
                </ul>
            </li>
            <li><strong>Improved platform stability and user experience:</strong>
                <ul class="nested-list">
                    <li>Deployed API integration fixes, reducing transaction errors by 25%</li>
                    <li>Troubleshot Kubernetes-managed microservices, decreasing escalations by 15%</li>
                    <li>Leveraged Linux expertise to minimize operational disruptions</li>
                </ul>
            </li>
            <li><strong>Excelled in customer support and client relationship management:</strong>
                <ul class="nested-list">
                    <li>Created clear technical updates and guidance for stakeholders, reducing follow-up inquiries by 30%</li>
                    <li>Authored knowledge base articles enabling 40% faster issue resolution and improved self-service capabilities</li>
                    <li>Built strong relationships increasing client confidence in platform stability</li>
                    <li>Reduced average response time to critical customer issues from 2 hours to 30 minutes</li>
                    <li>Implemented structured ticket escalation system decreasing resolution time by 25%</li>
                    <li>Facilitated technical training sessions for clients, resulting in 40% fewer recurring support requests</li>
                </ul>
            </li>
            <li><strong>Leveraged technical expertise to automate support and operational tasks:</strong>
                <ul class="nested-list">
                    <li>Developed Bash scripts for log analysis that identified recurring issues, reducing troubleshooting time by 60%</li>
                    <li>Created a Spring Boot microservice for automated health checks across 30+ production endpoints</li>
                    <li>Built Python scripts automating customer data verification, freeing 20% of team capacity</li>
                    <li>Implemented Jenkins pipeline automation reducing deployment-related support tickets by 35%</li>
                    <li>Designed a custom CLI tool in Golang enabling support engineers to quickly diagnose common API issues</li>
                    <li>Automated database integrity checks using SQL scripts, preventing potential customer-facing data issues</li>
                </ul>
            </li>
        </ul>
        
        <div class="job-title">Associate Software Developer (Freelance)</div>
        <div class="company-info">Remote | 2023 - 2024</div>
        <ul>
            <li><strong>Delivered comprehensive technical solutions improving client business outcomes:</strong>
                <ul class="nested-list">
                    <li>Developed Golang tools and implemented SEO strategies increasing website traffic and revenue</li>
                    <li>Created Bash scripts for system integrations, simplifying data workflows</li>
                    <li>Automated client processes enabling focus on business growth while maintaining reliable technical performance</li>
                </ul>
            </li>
        </ul>
        
        <div class="job-title">Java Developer (Bootcamp Project Work)</div>
        <div class="company-info">Coders Campus – Remote | 2020 – 2021</div>
        <ul>
            <li><strong>Developed robust Spring Boot applications with MySQL databases for high transaction volumes:</strong>
                <ul class="nested-list">
                    <li>Designed RESTful APIs following industry best practices for scalability and security</li>
                    <li>Wrote comprehensive automated tests using JUnit and Mockito ensuring code quality</li>
                    <li>Led code reviews and provided mentorship to junior developers</li>
                    <li>Collaborated effectively in Agile sprint cycles for timely delivery</li>
                </ul>
            </li>
        </ul>
        
        <div class="job-title">Technical Solutions & Customer Support Specialist (Self-Employed)</div>
        <div class="company-info">Remote | 2015 – 2021</div>
        <ul>
            <li><strong>Created tailored automation solutions transforming client operations:</strong>
                <ul class="nested-list">
                    <li>Developed custom tools using Python, Bash, and SQL streamlining workflows</li>
                    <li>Implemented data entry automation with APIs reducing errors while accelerating processing</li>
                    <li>Designed scripts integrating third-party services (social media platforms, marketing tools)</li>
                </ul>
            </li>
            <li><strong>Delivered exceptional customer support and technical assistance:</strong>
                <ul class="nested-list">
                    <li>Maintained 98% customer satisfaction rating across diverse client base</li>
                    <li>Established 24-hour SLA for critical issues with 100% compliance record</li>
                    <li>Created personalized onboarding processes reducing client ramp-up time by 50%</li>
                    <li>Developed troubleshooting guides that empowered customers to resolve 65% of common issues independently</li>
                    <li>Conducted regular check-ins with key accounts, resulting in 85% retention rate</li>
                </ul>
            </li>
            <li><strong>Leveraged technical expertise driving measurable business results:</strong>
                <ul class="nested-list">
                    <li>Built customer support chatbot using NodeJS and natural language processing, handling 40% of initial inquiries</li>
                    <li>Developed Bash-based monitoring system alerting clients of potential issues before they impacted operations</li>
                    <li>Created custom REST API endpoints in Spring Boot allowing clients to access support resources programmatically</li>
                    <li>Implemented PostgreSQL database solutions to track customer issues, identifying patterns that led to proactive fixes</li>
                </ul>
            </li>
        </ul>
        
        <div class="section-title">Education & Certifications</div>
        <ul>
            <li><strong>BSc Computer Science</strong> – Pursuing at Birkbeck, University of London</li>
            <li><strong>CompTIA Security+</strong> – Expected June 2025
                <ul class="nested-list">
                    <li>Focusing on network security, risk management, and threat identification/mitigation</li>
                </ul>
            </li>
            <li><strong>Active Hack The Box (HTB)</strong> – Pentesting
                <ul class="nested-list">
                    <li>Developing skills in network enumeration, web application vulnerabilities, and privilege escalation techniques</li>
                </ul>
            </li>
        </ul>
        
        <div class="section-title">Languages</div>
        <p>I am a multilingual professional, fluent in Romanian (native), English and Italian (C2), with upper beginner/intermediate proficiency in French and Spanish (A2/B1).</p>
        <p>My language skills reflect my cultural adaptability and enable me to engage effectively across different international markets and teams.</p>
        <p>Currently studying Russian to further enhance my communication capabilities in diverse professional settings.</p>
    `
};

// Function to show different sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load content for intro and cv sections
    if (sectionId === 'intro') {
        document.getElementById('intro-content').innerHTML = CONTENT_DATA.intro;
    } else if (sectionId === 'cv') {
        document.getElementById('cv-content').innerHTML = CONTENT_DATA.cv;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load intro content by default
    document.getElementById('intro-content').innerHTML = CONTENT_DATA.intro;
});

// Add this to the end of your navigation.js file

// Dark mode toggle functionality
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    
    // Save preference
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    
    // Update button text
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }
}

// Initialize dark mode from saved preference
document.addEventListener('DOMContentLoaded', function() {
    // Load intro content by default
    document.getElementById('intro-content').innerHTML = CONTENT_DATA.intro;
    
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark');
    }
    
    // Update toggle button text
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        const isDark = document.body.classList.contains('dark');
        toggleBtn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }
});