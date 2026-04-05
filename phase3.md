# GT Store: Phase 3 (Advanced Infrastructure & Admin) Walkthrough

Phase 3 transforms the GT Store from a functional microservices collection into a production-ready platform with professional routing, security, and deep observability.

## 1. Production-Grade Edge Infrastructure
The system now uses **Nginx** as its primary entrance, providing a single point of contact for the entire ecosystem.

- **SSL Termination**: All traffic is served over `https://localhost` using self-signed certificates.
- **Intelligent Routing**: 
    - `/` -> Main Storefront (React)
    - `/admin/` -> Admin Management Console (React)
    - `/api/` -> API Gateway (Spring Cloud)
- **High Availability DNS**: Configured with a Docker-aware resolver to prevent Nginx from crashing if backend services (like the Gateway) are still booting.

## 2. Admin Console & Access Control (RBAC)
Security has been hardened using Role-Based Access Control to separate shoppers from administrators.

- **Admin UI**: A dedicated Vite + React dashboard hosted at `/admin` for inventory and order management.
- **Keycloak RBAC**:
    - Users are assigned roles (`user`, `admin`) in Keycloak.
    - The API Gateway uses a custom `KeycloakRoleConverter` to extract these roles from JWT tokens.
- **Endpoint Protection**:
    - **Public**: `GET /api/products/**` (Catalog viewing).
    - **Admin Only**: `POST/PUT/DELETE` on Products/Categories and Global Order management.
    - **Authenticated**: Standard account actions (Orders, Profile).

## 3. Observability & Monitoring
A full-stack monitoring suite is integrated to track system health and request lifecycles.

- **Metrics (Prometheus & Grafana)**:
    - Every microservice exports metrics via Micrometer.
    - Prometheus scrapes these metrics.
    - Grafana (:3001) provides visual dashboards for CPU, memory, and request rates.
- **Distributed Tracing (Zipkin)**:
    - Tracks requests as they hop across microservices (e.g., Checkout -> Order -> Inventory).
    - Essential for debugging latency and failures in an event-driven system.

### Observability Ports
| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Grafana** | [http://localhost:3001](http://localhost:3001) | Dashboarding (User: `admin` / `admin`) |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | Metrics Querying |
| **Zipkin** | [http://localhost:9411](http://localhost:9411) | Distributed Tracing |

## 4. Search & Recommendations
The platform now features a high-performance **Search Service** powered by **Elasticsearch**, enabling advanced discovery for shoppers.

- **Full-Text Search**: Supports fuzzy matching and faceted filtering.
- **Asynchronous Indexing**: Microservices (Product, Order) emit events to **Kafka**, which are consumed by the Search Service to update the Elasticsearch index in real-time.
- **Improved UX**: Significantly faster lookup times compared to traditional database queries.

## 5. Unified API Documentation
To simplify developer onboarding, all microservice APIs are now aggregated into a single developer portal.

- **Swagger UI**: Accessible via the API Gateway at `https://localhost/api/swagger-ui.html`.
- **Automatic Aggregation**: The Gateway dynamically discovers services and merges their OpenAPI definitions into a unified interface.
- **Try-It-Out**: Developers can test authenticated and public endpoints directly from the browser.

## 6. Payment Gateway Enhancements
The **Payment Service** has been expanded to support professional third-party payment providers.

- **PayPal Integration**: Standard checkout now supports PayPal's secure payment flow.
- **Modular Design**: The service uses the Strategy Pattern to easily add more providers (e.g., Stripe, Razorpay) in the future.
- **Webhooks**: Handles asynchronous payment completion notifications to ensure order status consistency.

## 7. System Architecture (Final)

```mermaid
flowchart TD
    User([User Browser]) -->|HTTPS :443| Nginx[Nginx Reverse Proxy]
    
    subgraph Frontends
        Nginx -->|/ | Web[Storefront UI]
        Nginx -->|/admin | Admin[Admin Console]
    end
    
    Nginx -->|/api | Gateway[API Gateway]
    
    subgraph Monitoring
        Gateway -.-> Metrics[Prometheus]
        Gateway -.-> Tracing[Zipkin]
        Metrics --> Grafana
    end
    
    subgraph Microservices
        Gateway --> Services[Order, Product, User, etc.]
        Gateway --> Search[Search Service]
    end
    
    subgraph Events
        Kafka[Kafka Broker]
        Services -.-> Kafka
        Kafka -.-> Search
    end
    
    subgraph Data
        Search -.-> ES[Elasticsearch]
    end
    
    Gateway --> KC[Keycloak Auth]
```
