# Performance & Optimization Glossary
category: Programming
tags: glossary, performance, optimization, caching, scalability

## Cache

**What it is:** Temporary storage that saves frequently accessed data for faster retrieval.

**Why it matters:** Caching is one of the most effective performance optimizations. It reduces database queries, API calls, and computation time, dramatically improving user experience.

**Types of caching:**
- **Browser cache** - Stores files locally on user's device
- **CDN cache** - Content cached at edge servers globally
- **Application cache** - In-memory storage (Redis, Memcached)
- **Database cache** - Query results stored in memory
- **CPU cache** - Hardware-level caching in processors

**Cache strategies:**
- **Cache-aside (Lazy loading)** - Application manages cache explicitly
- **Write-through** - Write to cache and database simultaneously
- **Write-behind (Write-back)** - Write to cache immediately, database later
- **Refresh-ahead** - Proactively refresh cache before expiration

**Cache invalidation:**
- **TTL (Time To Live)** - Automatic expiration after set time
- **Manual invalidation** - Explicitly remove outdated data
- **Event-based** - Invalidate when underlying data changes
- **LRU (Least Recently Used)** - Remove oldest unused items when full

**Cache busting techniques:**
- **Query parameters** - Add `?v=123` to URLs
- **Filename versioning** - Include version in filename
- **Cache headers** - Control browser caching behavior
- **CDN purging** - Manually clear CDN caches

**When you'll use it:** Almost every application benefits from caching. It's fundamental to performance optimization.

## Load Balancing

**What it is:** Distribution of incoming requests across multiple servers to ensure no single server becomes overwhelmed.

**Why it matters:** Load balancing improves application availability, performance, and scalability by distributing traffic and providing redundancy.

**Load balancing algorithms:**
- **Round Robin** - Requests distributed sequentially to each server
- **Least Connections** - Routes to server with fewest active connections
- **Weighted Round Robin** - Servers get different amounts of traffic
- **IP Hash** - Routes based on client IP address
- **Least Response Time** - Routes to fastest responding server
- **Random** - Distributes requests randomly

**Types of load balancers:**
- **Layer 4 (Transport)** - Routes based on IP and port information
- **Layer 7 (Application)** - Routes based on content (HTTP headers, URLs)
- **Hardware load balancers** - Dedicated physical devices
- **Software load balancers** - Applications running on standard servers
- **Cloud load balancers** - Managed services (AWS ELB, Azure Load Balancer)

**Health checks:**
- **Active monitoring** - Load balancer actively checks server health
- **Passive monitoring** - Monitor server responses to real requests
- **Custom health endpoints** - Application-specific health checks
- **Graceful degradation** - Remove unhealthy servers from rotation

**When you'll use it:** Any application expecting significant traffic or requiring high availability.

## Horizontal vs Vertical Scaling

**What they are:** Two approaches to increasing system capacity to handle more load.

**Vertical Scaling (Scale Up):**
- **Definition** - Add more power to existing servers (CPU, RAM, storage)
- **Pros** - Simple to implement, no application changes needed
- **Cons** - Limited by hardware constraints, single point of failure
- **Example** - Upgrade server from 8GB to 32GB RAM

**Horizontal Scaling (Scale Out):**
- **Definition** - Add more servers to handle increased load
- **Pros** - Virtually unlimited scaling, better fault tolerance
- **Cons** - Requires application design for distribution
- **Example** - Add 3 more web servers behind load balancer

**Why it matters:** Understanding scaling options helps architects design systems that can grow with demand and remain available during failures.

**Design considerations:**
- **Stateless applications** - Easier to scale horizontally
- **Database scaling** - Often the bottleneck in horizontal scaling
- **Session management** - Sticky sessions vs distributed sessions
- **Data consistency** - Challenges with distributed data

**When you'll use it:** 
- **Vertical scaling** - Quick fixes, legacy applications, database servers
- **Horizontal scaling** - Web applications, microservices, cloud-native apps

## Database Optimization

**What it is:** Techniques to improve database performance, reduce query times, and handle larger datasets efficiently.

**Why it matters:** Databases are often the bottleneck in application performance. Optimizing database operations can dramatically improve overall system performance.

**Query optimization:**
- **Indexing** - Create indexes on frequently queried columns
- **Query analysis** - Use EXPLAIN to understand query execution
- **Query rewriting** - Optimize SQL for better performance
- **Avoiding N+1 queries** - Fetch related data in single query

**Database design optimization:**
- **Normalization** - Reduce data redundancy
- **Denormalization** - Strategic redundancy for performance
- **Partitioning** - Split large tables across multiple storage units
- **Sharding** - Distribute data across multiple database servers

**Indexing strategies:**
- **Primary indexes** - Unique identifiers (usually automatic)
- **Secondary indexes** - Additional indexes on frequently queried columns
- **Composite indexes** - Indexes on multiple columns
- **Covering indexes** - Include all needed columns in index

**Connection management:**
- **Connection pooling** - Reuse database connections
- **Connection limits** - Prevent database overload
- **Read replicas** - Distribute read operations across multiple databases
- **Write/read separation** - Route queries to appropriate servers

**When you'll use it:** Any application with significant database usage needs optimization for good performance.

## Lazy Loading

**What it is:** Design pattern that defers loading of non-critical resources until they're actually needed.

**Why it matters:** Lazy loading improves initial page load times, reduces bandwidth usage, and provides better user experience by loading content progressively.

**Types of lazy loading:**
- **Image lazy loading** - Load images as they enter viewport
- **Code splitting** - Load JavaScript modules on demand
- **Data lazy loading** - Fetch additional data when needed
- **Route-based loading** - Load page components when navigating

**Implementation techniques:**
- **Intersection Observer API** - Modern browser API for viewport detection
- **Scroll event listeners** - Traditional approach (less efficient)
- **Libraries** - LazyLoad, Lozad.js, react-lazyload
- **Native loading="lazy"** - Browser support for images and iframes

**Benefits:**
- **Faster initial load** - Reduced initial payload size
- **Bandwidth savings** - Don't load unused content
- **Better perceived performance** - Content appears to load faster
- **Improved mobile experience** - Especially important on slower connections

**Best practices:**
- **Placeholder content** - Show skeleton or blur while loading
- **Progressive enhancement** - Ensure functionality without JavaScript
- **Preload critical content** - Don't lazy load above-the-fold content
- **Error handling** - Graceful degradation when loading fails

**When you'll use it:** Any application with images, large datasets, or code that isn't immediately needed.

## Content Delivery Network (CDN)

**What it is:** Network of geographically distributed servers that deliver web content to users from the nearest location.

**Why it matters:** CDNs dramatically improve website performance by reducing latency, decrease server load, and provide better user experience globally.

**How CDNs work:**
1. **User requests content** - Browser requests image, CSS, JavaScript
2. **CDN edge server responds** - Nearest server provides cached content
3. **Cache miss handling** - If not cached, fetch from origin server
4. **Content caching** - Store content at edge for future requests
5. **Cache expiration** - Content refreshed based on TTL settings

**Types of CDN content:**
- **Static assets** - Images, CSS, JavaScript files
- **Dynamic content** - API responses, personalized content
- **Video streaming** - Optimized for media delivery
- **Software downloads** - Large files distributed globally

**Popular CDN providers:**
- **Cloudflare** - Free tier, DDoS protection, security features
- **AWS CloudFront** - Integrated with AWS ecosystem
- **Fastly** - Real-time analytics, edge computing capabilities
- **KeyCDN** - Simple pricing, good performance
- **Azure CDN** - Microsoft's global network

**CDN optimization techniques:**
- **Cache headers** - Control how long content is cached
- **Compression** - Gzip/Brotli compression for text files
- **Image optimization** - WebP format, responsive images
- **HTTP/2 support** - Multiplexing and server push

**When you'll use it:** Any website with global users, media content, or performance requirements.

## Minification

**What it is:** Process of removing unnecessary characters from code (whitespace, comments, long variable names) without changing functionality.

**Why it matters:** Minification reduces file sizes, leading to faster downloads, less bandwidth usage, and improved page load times.

**What gets minified:**
- **JavaScript** - Remove whitespace, shorten variable names, remove comments
- **CSS** - Remove whitespace, combine selectors, optimize properties
- **HTML** - Remove whitespace, comments, optional tags
- **Images** - Compress without quality loss (lossless compression)

**Minification techniques:**
- **Whitespace removal** - Eliminate unnecessary spaces, tabs, newlines
- **Comment removal** - Strip out developer comments
- **Variable name shortening** - Use shorter variable names (a, b, c)
- **Dead code elimination** - Remove unused functions and variables
- **Property optimization** - Shorthand CSS properties

**Popular minification tools:**
- **JavaScript** - UglifyJS, Terser, esbuild
- **CSS** - cssnano, clean-css, PurgeCSS
- **HTML** - HTMLMinifier, html-minifier-terser
- **Build tools** - Webpack, Rollup, Parcel (built-in minification)

**Best practices:**
- **Source maps** - Maintain debugging capability in production
- **Automated process** - Integrate into build pipeline
- **Test minified code** - Ensure functionality isn't broken
- **Separate concerns** - Different strategies for different file types

**When you'll use it:** Every production web application should minify assets for optimal performance.

## Bundling

**What it is:** Process of combining multiple files into single files to reduce the number of HTTP requests.

**Why it matters:** Bundling reduces network overhead, improves caching efficiency, and can significantly improve page load times, especially for applications with many small files.

**Types of bundling:**
- **JavaScript bundling** - Combine multiple JS files into one
- **CSS bundling** - Merge stylesheets into single file
- **Asset bundling** - Include images, fonts as data URLs
- **Code splitting** - Strategic bundling with multiple output files

**Bundling strategies:**
- **Single bundle** - Everything in one file (simple but not optimal)
- **Vendor bundling** - Separate bundle for third-party libraries
- **Route-based bundling** - Different bundles for different pages
- **Dynamic imports** - Load bundles on demand

**Popular bundling tools:**
- **Webpack** - Most popular, highly configurable
- **Rollup** - Tree-shaking focus, good for libraries
- **Parcel** - Zero-configuration bundler
- **esbuild** - Extremely fast Go-based bundler
- **Vite** - Fast development with optimized production builds

**Bundle optimization:**
- **Tree shaking** - Remove unused code from bundles
- **Code splitting** - Split bundles for better caching
- **Chunk optimization** - Balance bundle sizes
- **Compression** - Gzip/Brotli compression

**When you'll use it:** Any modern web application with multiple JavaScript or CSS files.

## Debouncing and Throttling

**What they are:** Techniques to control the frequency of function execution, particularly useful for performance optimization of event handlers.

**Debouncing:**
- **Definition** - Delay function execution until after a specified time has passed since the last call
- **Use case** - Search suggestions, form validation, resize events
- **Example** - Only send search request 300ms after user stops typing

**Throttling:**
- **Definition** - Limit function execution to at most once per specified time interval
- **Use case** - Scroll events, mousemove events, API rate limiting
- **Example** - Update scroll position indicator at most once every 100ms

**Why they matter:** These techniques prevent performance issues from high-frequency events, reduce server load, and improve user experience.

**Implementation examples:**

**Debounce:**
```javascript
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage
const debouncedSearch = debounce(searchFunction, 300);
searchInput.addEventListener('input', debouncedSearch);
```

**Throttle:**
```javascript
function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  return function(...args) {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    }
  };
}

// Usage
const throttledScroll = throttle(handleScroll, 100);
window.addEventListener('scroll', throttledScroll);
```

**When you'll use them:**
- **Debouncing** - User input, API calls, expensive calculations
- **Throttling** - Animation, scroll events, mouse tracking

## Memory Management

**What it is:** Process of allocating, using, and freeing memory efficiently in applications to prevent memory leaks and optimize performance.

**Why it matters:** Poor memory management leads to memory leaks, performance degradation, and application crashes. Good memory management ensures stable, performant applications.

**Memory concepts:**
- **Stack memory** - Fast, automatic, limited size (local variables)
- **Heap memory** - Slower, manual management, larger (objects, arrays)
- **Garbage collection** - Automatic memory cleanup in managed languages
- **Memory leaks** - Memory that's allocated but never freed

**Common memory issues:**
- **Memory leaks** - Objects not properly disposed
- **Circular references** - Objects referencing each other prevent cleanup
- **Event listener leaks** - Forgotten event handlers
- **Closure leaks** - Functions holding onto unnecessary scope
- **DOM leaks** - Detached DOM nodes still referenced

**Memory optimization techniques:**
- **Object pooling** - Reuse objects instead of creating new ones
- **Weak references** - References that don't prevent garbage collection
- **Manual cleanup** - Explicitly remove references when done
- **Efficient data structures** - Choose appropriate data types

**Memory profiling tools:**
- **Browser DevTools** - Memory tab for heap snapshots
- **Node.js** - Built-in memory usage monitoring
- **Application monitoring** - New Relic, Datadog memory metrics
- **Language-specific tools** - JProfiler (Java), Instruments (iOS)

**When you'll use it:** Any long-running application, especially those with dynamic content creation or event handling.

## Performance Monitoring

**What it is:** Continuous measurement and analysis of application performance metrics to identify issues and optimization opportunities.

**Why it matters:** You can't improve what you don't measure. Performance monitoring helps identify bottlenecks, track improvements, and ensure good user experience.

**Key performance metrics:**
- **Response time** - How long requests take to complete
- **Throughput** - Number of requests processed per second
- **Error rate** - Percentage of failed requests
- **Availability** - Percentage of time system is operational
- **Resource utilization** - CPU, memory, disk, network usage

**Client-side metrics:**
- **First Contentful Paint (FCP)** - When first content appears
- **Largest Contentful Paint (LCP)** - When main content loads
- **First Input Delay (FID)** - Time to interactive
- **Cumulative Layout Shift (CLS)** - Visual stability
- **Time to Interactive (TTI)** - When page becomes fully interactive

**Server-side metrics:**
- **Database query time** - How long database operations take
- **API response time** - Time for API endpoints to respond
- **Background job processing** - Queue processing times
- **Cache hit rates** - Effectiveness of caching strategies

**Performance monitoring tools:**
- **Real User Monitoring (RUM)** - Google Analytics, New Relic Browser
- **Synthetic monitoring** - Pingdom, GTmetrix, WebPageTest
- **Application Performance Monitoring** - New Relic, Datadog, AppDynamics
- **Open source** - Prometheus + Grafana, ELK stack

**When you'll use it:** Every production application should have performance monitoring to ensure good user experience.

## Database Indexing

**What it is:** Database optimization technique that creates additional data structures to speed up data retrieval operations.

**Why it matters:** Proper indexing can make database queries orders of magnitude faster, while poor indexing can severely degrade performance.

**How indexes work:**
- **Data structure** - Usually B-trees or hash tables
- **Pointer system** - Indexes point to actual data locations
- **Trade-offs** - Faster reads but slower writes and more storage

**Types of indexes:**
- **Primary index** - Usually on primary key (automatic)
- **Secondary index** - Additional indexes on other columns
- **Composite index** - Index on multiple columns
- **Unique index** - Ensures uniqueness while optimizing lookups
- **Partial index** - Index only subset of rows meeting condition
- **Full-text index** - For text search operations

**Indexing strategies:**
- **Query analysis** - Identify frequently used WHERE clauses
- **Composite index order** - Most selective columns first
- **Covering indexes** - Include all needed columns in index
- **Index maintenance** - Regular analysis and optimization

**Index performance considerations:**
- **Selectivity** - Indexes work best on columns with many unique values
- **Cardinality** - High cardinality columns benefit more from indexing
- **Update frequency** - Frequently updated columns have indexing overhead
- **Index size** - Large indexes may not fit in memory

**When you'll use it:** Any database with performance requirements needs strategic indexing on frequently queried columns.