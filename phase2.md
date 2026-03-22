# GT Store - Phase 2 Documentation

Phase 2 of the GT Store project introduces a robust, event-driven microservices architecture. Moving away from a simpler setup, this phase integrates new services for order management, inventory control, payment processing, and asynchronous notifications, all orchestrated through an API Gateway and communicating via Kafka.

## System Architecture

The current system comprises several microservices, databases, authentication, and messaging infrastructure seamlessly working together.

```mermaid
graph TD
    Client[Web Client / Mobile App] -->|HTTPS| Gateway(API Gateway\nPort: 8080)
    Gateway -->|Auth Check| Keycloak(Keycloak IAM\nPort: 8180)
    
    subgraph Core Services
        UserService(User Service)
        ProductService(Product Service)
        CartService(Cart Service)
    end
    
    subgraph Order Processing
        OrderService(Order Service)
        InventoryService(Inventory Service)
        PaymentService(Payment Service)
        NotificationService(Notification Service)
    end
    
    Gateway --> UserService
    Gateway --> ProductService
    Gateway --> CartService
    Gateway --> OrderService
    Gateway --> InventoryService
    Gateway --> PaymentService
    Gateway --> NotificationService
    
    %% Database Connections
    ProductService -.->|Reads/Writes| MongoDB[(MongoDB\nCatalog)]
    UserService -.->|Reads/Writes| Postgres[(PostgreSQL\nUsers/Orders/Payments)]
    OrderService -.->|Reads/Writes| Postgres
    InventoryService -.->|Reads/Writes| Postgres
    PaymentService -.->|Reads/Writes| Postgres
    
    %% Synchronous Calls
    OrderService -- "Reserve Stock (REST)" --> InventoryService
    OrderService -- "Initiate Payment (REST)" --> PaymentService
    
    %% Asynchronous Messaging
    Kafka([Apache Kafka Message Broker])
    OrderService -.->|Publishes: order.created<br>order.paid<br>order.cancelled| Kafka
    PaymentService -.->|Publishes: payment.succeeded<br>payment.failed| Kafka
    
    Kafka -.->|Consumes: order.created<br>order.paid<br>payment.failed| NotificationService
    Kafka -.->|Consumes: payment.succeeded<br>payment.failed| OrderService
    Kafka -.->|Consumes: order.cancelled| InventoryService
    
    NotificationService -->|SMTP| Mailhog(Mailhog\nEmail Testing)
```

## Service Responsibilities (Phase 2 Additions)

### 1. Order Service (`order-service`)
- **Role:** Central orchestrator for the checkout lifecycle.
- **Key Functions:** Creates orders, initiates stock reservation, initiates payments, and tracks order statuses (PENDING, PAID, CANCELLED).
- **Events Published:** `order.created`, `order.paid`, `order.cancelled`
- **Events Consumed:** `payment.succeeded`, `payment.failed`

### 2. Inventory Service (`inventory-service`)
- **Role:** Manages product stock levels to prevent overselling.
- **Key Functions:** Synchronously reserves and releases stock via REST APIs.
- **Events Consumed:** `order.cancelled` (to release previously reserved stock back into inventory).

### 3. Payment Service (`payment-service`)
- **Role:** Handles payment gateway integrations and transaction tracking.
- **Key Functions:** Initiates mock payments and processes asynchronous payment callbacks from payment gateways.
- **Events Published:** `payment.succeeded`, `payment.failed`

### 4. Notification Service (`notification-service`)
- **Role:** Handles all outbound communication to customers asynchronously.
- **Key Functions:** Listens to cluster-wide Kafka events and formats/dispatches specialized emails (e.g., order confirmations, payment receipts).

## Event-Driven Checkout Workflow

The defining feature of Phase 2 is the fully integrated checkout flow coupling synchronous validation with asynchronous finalization.

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant OS as Order Service
    participant IS as Inventory Service
    participant PS as Payment Service
    participant K as Kafka Broker
    participant NS as Notification Service
    
    %% 1. Order Creation
    Client->>API: POST /api/orders (Checkout)
    API->>OS: Forward Request
    
    rect rgb(240, 248, 255)
        note right of OS: Synchronous Validation Phase
        OS->>IS: POST /api/inventory/reserve (Check & Deduct Stock)
        IS-->>OS: 200 OK (Stock Reserved)
        OS->>OS: Save Order (Status: PENDING)
        OS->>PS: POST /api/payments/initiate (Create Payment Intent)
        PS-->>OS: 200 OK (Payment Initialized)
    end
    
    OS-->>API: 201 Created (Order Details)
    API-->>Client: 201 Created (Order Details)
    
    %% 2. Asynchronous Event Sourcing
    rect rgb(255, 250, 240)
        note right of OS: Async Event Sourcing
        OS-)K: Publish `order.created`
        K-)NS: Consume `order.created`
        NS->>NS: Send "Order Received" Email via Mailhog
    end
    
    %% 3. Payment Callback Processing
    rect rgb(245, 255, 250)
        note right of PS: Async Payment Webhook Processing
        Client->>API: POST /api/payments/callback (Simulation)
        API->>PS: Forward Request
        PS->>PS: Validate & Update Payment Status
        PS-)K: Publish `payment.succeeded`
        PS-->>API: 200 OK
        API-->>Client: 200 OK
        
        K-)OS: Consume `payment.succeeded`
        OS->>OS: Update Order (Status: PAID)
        OS-)K: Publish `order.paid`
        
        K-)NS: Consume `order.paid`
        NS->>NS: Send "Payment Confirmed" Email via Mailhog
    end
```

## Key Technical Decisions & Learnings

During implementation, critical architectural improvements were made to ensure robust service isolation and fault tolerance:

*   **Kafka Decoupling via Raw JSON:** Initially, `spring-kafka` injected `__TypeId__` serialization headers containing the producer's fully qualified class name (e.g., `com.gtstore.orderservice.dto.OrderEvent`). This tightly coupled the consumer to the producer's package namespace, triggering `ClassNotFoundException` errors.
*   **The Fix:** We completely disabled type headers on the producer (`spring.json.add.type.headers: false`) and configured consumers to use `StringDeserializer`. The raw JSON string is now handled explicitly by the consumer application logic via Jackson's `ObjectMapper`, allowing absolute structural decoupling between microservices.
*   **Database Constraints:** Isolated MongoDB for read-heavy product catalog operations while sharing a PostgreSQL cluster with separate schemas for transactional safety regarding orders, payments, and users.
