# gt-store

Step 1 – Overall Architecture
Build GT Store as a microservices platform: Product, Inventory, Cart, Order, Payment, User/Profile, Notification, Search, API‑Gateway/BFF, Auth‑Adapter (for Keycloak integration).

Use Java (Spring Boot + Spring Cloud) for all backend REST APIs, React (TypeScript preferred) for the web UI, and Keycloak as central auth server with OAuth2/OpenID Connect.

All services run as Docker containers, fronted optionally by nginx reverse proxy on Docker Desktop.

Use PostgreSQL/MySQL for relational data (orders, users, payments), MongoDB for catalog/search metadata, Redis for cache and session‑like data, and Kafka/RabbitMQ for async events.

Follow modern microservice practices: API Gateway, service discovery (later if needed), centralized logging/metrics, circuit breakers, and message‑driven communication for non‑blocking flows.

Step 2 – Microservices Breakdown
Define separate Spring Boot services (each its own repo/module).

API Gateway / Edge Service

Tech: Spring Cloud Gateway + Spring Security OAuth2 Resource Server.

Responsibilities:

Single public entry point /api/**.

Validate Keycloak access tokens (JWT) before routing to downstream services.
​

Inject user context (email, name) into headers/X‑Correlation‑Id for services.
​

Global rate limiting, request logging, CORS, basic response compression.

Auth Adapter / User Service

Tech: Spring Boot + JPA + Keycloak integration libs.

Responsibilities:

Store app‑level users table with columns: id, email (unique), name, created_at, updated_at.

On first request with valid Keycloak token, upsert user by email and map name from Keycloak claim.

Expose /me endpoint returning app user with roles, addresses, wishlist count.

Manage addresses, profile info, and preference flags.

Product Service

Tech: Spring Boot + MongoDB (for flexible catalog), optional search index later.

Responsibilities:

CRUD for categories, brands, products, variants (size/color), images.

Filters, sorting, pagination, search by keyword.

Promotion flags: featured, new arrivals, bestsellers.

Inventory Service

Tech: Spring Boot + relational DB (PostgreSQL/MySQL).

Responsibilities:

Track stock per product variant and warehouse.

Provide APIs to reserve/release stock and to confirm stock on order placement.

Subscribe to order events to decrement/increment stock asynchronously.

Cart Service

Tech: Spring Boot + Redis (primary) + fallback relational store.

Responsibilities:

User cart per email/userId, stored in Redis with TTL.

Operations: add/remove item, update quantity, get cart summary, apply coupon.

Calculate totals via Product Service price and promotions.

Order Service

Tech: Spring Boot + JPA (PostgreSQL/MySQL) + Kafka/RabbitMQ.

Responsibilities:

Create orders from cart, manage statuses (PENDING, PAID, SHIPPED, DELIVERED, CANCELLED).

Start transaction: reserve stock (Inventory Service), initiate payment, on success mark order PAID.
​

Publish events order.created, order.paid, order.cancelled to message broker for Notification/Analytics.

Payment Service

Tech: Spring Boot + integration with external gateways (mock first).

Responsibilities:

Initiate payment request, receive webhook callbacks, update payment status.

Expose POST /payments and webhook POST /payments/callback.

Idempotent processing of callbacks; publish events payment.succeeded, payment.failed.

Notification Service

Tech: Spring Boot, consumes Kafka/RabbitMQ topics, integrates with SMTP for email.

Responsibilities:

Send transactional emails: registration welcome, order confirmation, shipping updates, password‑related notifications.

Email templates for GT Store branding and Flipkart‑style layout.

Handle async retry and dead‑letter queue for failed emails.

Search / Recommendation Service (Phase 2, optional initially)

Tech: Spring Boot + Elasticsearch/OpenSearch, or basic DB search initially.
​

Responsibilities:

Aggregate searchable product fields, categories, and tags.

Provide search suggestions, filter queries, and recommendations (“people also viewed”).

Admin/Backoffice Service

Tech: Spring Boot backend, React admin UI.

Responsibilities:

Manage products, stock, orders, coupons, banners and featured collections.

Role‑based access via Keycloak roles (ADMIN, MANAGER).

Step 3 – Keycloak & Authentication Flow
Keycloak Realm & Clients

Create realm gt-store.

Create client gt-store-web as public client for React SPA, using Authorization Code + PKCE.

Create client gt-store-gateway as confidential (or bearer‑only) for API Gateway.

Configure valid redirect URIs (e.g. http://localhost:3000/*) and Web Origins.

Mapping to Users Table

Ensure ID token/access token has email and name (or preferred_username) claims via Keycloak mappers.

API Gateway validates JWT and forwards claims in headers X-User-Email, X-User-Name.
​

User Service reads headers, upserts into users table: email as unique key, name from claim.
​

React Login Flow

Use keycloak-js or a React wrapper (@react-keycloak/web style) to:

Initialize Keycloak on app load with check-sso to silently detect sessions.
​

Trigger login/logout redirects.

Store access token in memory (plus silent refresh) and attach it as Authorization: Bearer <token> to /api/* calls.
​

Backend Auth

API Gateway configured as OAuth2 Resource Server with JWKS URL from Keycloak realm.
​

Downstream microservices either:

Trust API Gateway and use propagated X-User-* headers, or

Also run as Resource Servers relying on JWT validation (if direct calls allowed).
​

Step 4 – Database & Cache Design
Relational Schema (PostgreSQL/MySQL)

users: id, email (unique), name, phone, created_at, updated_at.

addresses: id, user_id, line1, line2, city, state, pincode, country, is_default.

orders: id, user_id, status, total_amount, payment_id, created_at, updated_at.

order_items: id, order_id, product_id, variant_id, quantity, price.

inventory: id, product_id, variant_id, warehouse_id, stock.

payments: id, order_id, status, gateway, transaction_ref, amount, created_at.

MongoDB (Catalog)

products collection with fields: name, slug, description, price, images, brand, categories, attributes, rating, meta.

Redis

Keys:

cart:{userId} → cart JSON.

session-cache:{userId} → quick user profile snapshot.

product-cache:{productId} → frequently viewed product details.

Step 5 – Web UI (React) Tasks
Global Setup

React + TypeScript, Vite/CRA, React Router, React Query/TanStack Query for data fetching and cache.

Global layout: sticky header, search bar, category nav, responsive grid, dark/light theme toggle.

Modern Feature Pages

Home: banners, carousels, featured categories, deals of the day, personalized recommendations.

Search & Listing: filters (price range, category, brand, rating), infinite scroll, sort by relevance/newest/price.

Product Detail: image gallery with zoom, ratings & reviews, offers, availability by pincode, similar products.

Cart & Checkout: multi‑step checkout, address selection, order summary, payment selection.

User Account: profile, addresses, orders history, wishlist, saved cards (if any).

Interactive Theme & UX

Flipkart‑style but distinct branding for GT Store, with micro‑interactions: hover states, skeleton loaders, optimistic UI updates for cart actions.

Use component library (MUI/Ant Design/Tailwind+Headless UI) for consistent design.

Show login state from Keycloak in header with user menu (profile, orders, logout).
​

Step 6 – Async Processing & Email
Message Broker

Use Kafka/RabbitMQ for events order.created, order.paid, order.shipped, user.registered.

Order Service publishes events; Notification Service consumes them to send emails.

Email Service

Configure SMTP (e.g. SES, SendGrid, local mailhog for dev).

Implement templated emails with branding and dynamic placeholders.

Implement retries with backoff and a dead‑letter queue.

Async Tasks

Use async consumers for: recalculating recommendations, indexing products into search, sending push/email notifications.

Step 7 – Logging, Monitoring, Observability
Logging

Use structured JSON logging in all services (logback + logstash encoder style).

Include correlation ID per request; generate at API Gateway and propagate via header X-Correlation-Id.

Log key events: auth success/fail, order created, payment status changes, email send attempts.

Tracing & Metrics

Integrate Micrometer + Zipkin/Tempo for distributed tracing, Prometheus for metrics, Grafana dashboards (can be phase 2).

Expose /actuator endpoints for health, metrics, info on each service.
​

Error Handling

Global error handler in each service returning standardized error JSON with error codes.

Circuit breakers and retries using Resilience4j on inter-service calls (Inventory, Payment, Notification).

Step 8 – Docker & Nginx on Docker Desktop
Containerization

Each backend microservice: Dockerfile (multi‑stage Maven/Gradle build, then JRE runtime).

React frontend: built static files served either via nginx static container or dedicated Node server container.

Keycloak: official Keycloak container with realm and client import on startup.

docker‑compose Setup

Define services: gateway, product-service, order-service, inventory-service, cart-service, payment-service, user-service, notification-service, frontend, keycloak, nginx, db-*, redis, kafka.

Internal Docker network; expose only nginx (80/443) and Keycloak (optional) to host.

nginx Reverse Proxy

location / { proxy_pass http://frontend:3000; } for React app.

location /api/ { proxy_pass http://gateway:8080/; } for backend.
​

Forward necessary headers and support optional HTTPS for local dev.

Step 9 – Security & Best Practices
Enforce HTTPS at nginx level (self‑signed for dev, real cert in prod), redirect HTTP to HTTPS.
​

Use secure cookies (if any), proper CORS at API Gateway, and limit direct service exposure.

Store secrets via environment variables or Docker secrets; avoid hard‑coding credentials.
​

Define coarse roles in Keycloak: ROLE_USER, ROLE_ADMIN, ROLE_SUPPORT, and secure admin APIs accordingly.

Step 10 – Implementation Phases
Phase 1 (MVP)

Set up Keycloak realm + clients.

Implement API Gateway, User Service, Product Service, Cart Service, Order Service (sync flow without external payments).

React UI with login, browsing, cart, and basic checkout.

Phase 2

Introduce Payment Service integration, Notification Service with email, Inventory Service with async reservation events.

Add Redis cache and basic search.

Phase 3

Advanced search/recommendation service, full observability stack, admin console, and production‑grade nginx + SSL setup.