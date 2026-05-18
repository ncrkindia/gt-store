package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.dto.*;
import com.gtstore.orderservice.entity.Order;
import com.gtstore.orderservice.entity.OrderItem;
import com.gtstore.orderservice.entity.OrderAudit;
import com.gtstore.orderservice.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST Controller for the Order Service.
 * Manages the order lifecycle: creation, status tracking, and history.
 * 
 * Flow:
 * 1. Synchronously validates and reserves stock via Inventory Service.
 * 2. Synchronously initiates payment via Payment Service.
 * 3. Asynchronously publishes events for notification and finalization.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    private PromotionService promotionService;

    @PostMapping("/calculate")
    public ResponseEntity<com.gtstore.orderservice.dto.CheckoutCalculationResponse> calculateOrder(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody com.gtstore.orderservice.dto.CheckoutCalculationRequest request) {
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean isCod = request != null && "COD".equalsIgnoreCase(request.getPaymentMethod());
        com.gtstore.orderservice.dto.CheckoutCalculationResponse calc = promotionService.calculateCheckout(request, email, isCod);
        return ResponseEntity.ok(calc);
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 100000");
            log.info("Initialized order_number_seq sequence successfully.");
            
            // Database migration for legacy orders with NULL orderNumber
            List<Order> legacyOrders = orderRepository.findByOrderNumberIsNull();
            if (legacyOrders != null && !legacyOrders.isEmpty()) {
                log.info("Found {} legacy orders without order numbers. Running FPE migration...", legacyOrders.size());
                int migratedCount = 0;
                for (Order order : legacyOrders) {
                    try {
                        Long seqVal = jdbcTemplate.queryForObject("SELECT nextval('order_number_seq')", Long.class);
                        if (seqVal != null) {
                            String orderNum = com.gtstore.orderservice.util.OrderIdGenerator.generate(seqVal);
                            order.setOrderNumber(orderNum);
                            orderRepository.save(order);
                            migratedCount++;
                        }
                    } catch (Exception ex) {
                        log.error("Failed to migrate legacy order ID: {}", order.getId(), ex);
                    }
                }
                log.info("Database migration completed. Successfully generated order numbers for {} legacy orders.", migratedCount);
            }
        } catch (Exception e) {
            log.warn("Could not check or create database sequence or perform migration: " + e.getMessage(), e);
        }
    }

    private final RestTemplate restTemplate = new RestTemplate();
    private final String INVENTORY_URL = "http://inventory-service:4008/api/inventory/reserve";
    private final String PAYMENT_URL = "http://payment-service:4009/api/payments/initiate";

    @PostMapping
    public ResponseEntity<?> createOrder(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestHeader(value = "X-User-Name", required = false) String name,
            @RequestBody Order orderRequest) {

        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        // 1. Reserve Inventory via REST
        if (orderRequest.getItems() != null) {
            for (OrderItem itemReq : orderRequest.getItems()) {
                StockReservationRequest stockReq = new StockReservationRequest();
                stockReq.setProductId(itemReq.getProductId());
                stockReq.setVariantId(itemReq.getVariantId());
                stockReq.setQuantity(itemReq.getQuantity());

                try {
                    ResponseEntity<StockReservationResponse> stockRes = restTemplate.postForEntity(INVENTORY_URL,
                            stockReq, StockReservationResponse.class);
                    if (!stockRes.getStatusCode().is2xxSuccessful() || !stockRes.getBody().isSuccess()) {
                        return ResponseEntity.badRequest()
                                .body("Failed to reserve stock for product " + itemReq.getProductId());
                    }
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                            .body("Inventory service unavailable or out of stock: " + e.getMessage());
                }
            }
        }

        // 2. Create Order
        Order order = new Order();
        order.setUserId(email);
        
        try {
            Long seqValue = jdbcTemplate.queryForObject("SELECT nextval('order_number_seq')", Long.class);
            if (seqValue != null) {
                String orderNum = com.gtstore.orderservice.util.OrderIdGenerator.generate(seqValue);
                order.setOrderNumber(orderNum);
                log.info("Generated unique order number: {} from sequence: {}", orderNum, seqValue);
            } else {
                order.setOrderNumber(java.util.UUID.randomUUID().toString().substring(0, 10).toUpperCase());
            }
        } catch (Exception e) {
            log.error("Failed to fetch next order sequence number, falling back to random string.", e);
            order.setOrderNumber(java.util.UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        
        // Use granular initial states
        boolean isCod = "COD".equalsIgnoreCase(orderRequest.getPaymentMethod());
        order.setStatus(isCod ? "AWAITING_FULFILLMENT" : "PENDING_PAYMENT");
        
        order.setShippingAddressId(orderRequest.getShippingAddressId());
        order.setPaymentMethod(isCod ? "COD" : "ONLINE");
        
        // Populate snapshot fields
        order.setShippingLine1(orderRequest.getShippingLine1());
        order.setShippingLine2(orderRequest.getShippingLine2());
        order.setShippingCity(orderRequest.getShippingCity());
        order.setShippingState(orderRequest.getShippingState());
        order.setShippingPincode(orderRequest.getShippingPincode());
        order.setShippingCountry(orderRequest.getShippingCountry());
        order.setCustomerPhone(orderRequest.getCustomerPhone());
        order.setCustomerName(orderRequest.getCustomerName() != null ? orderRequest.getCustomerName() : name);

        // Build Secure Calculation Request
        com.gtstore.orderservice.dto.CheckoutCalculationRequest calcReq = new com.gtstore.orderservice.dto.CheckoutCalculationRequest();
        calcReq.setCouponCode(orderRequest.getCouponCode());
        calcReq.setLoyaltyPointsToUse(orderRequest.getLoyaltyPointsUsed());
        calcReq.setPaymentMethod(isCod ? "COD" : "ONLINE");
        
        List<com.gtstore.orderservice.dto.OrderItemDto> dtoList = new java.util.ArrayList<>();
        if (orderRequest.getItems() != null) {
            for (OrderItem itemReq : orderRequest.getItems()) {
                com.gtstore.orderservice.dto.OrderItemDto dto = new com.gtstore.orderservice.dto.OrderItemDto();
                dto.setProductId(itemReq.getProductId());
                dto.setVariantId(itemReq.getVariantId());
                dto.setQuantity(itemReq.getQuantity());
                dto.setPrice(itemReq.getPrice());
                dtoList.add(dto);
            }
        }
        calcReq.setItems(dtoList);

        com.gtstore.orderservice.dto.CheckoutCalculationResponse calcRes = promotionService.calculateCheckout(calcReq, email, isCod);
        
        order.setTotalAmount(calcRes.getFinalPayable());
        order.setDiscountAmount(calcRes.getProductDiscounts().add(calcRes.getCartDiscounts()));
        order.setTaxAmount(calcRes.getTaxes());
        order.setShippingCharge(calcRes.getShippingCharge());
        order.setCodCharge(calcRes.getCodCharge());
        order.setCouponCode(orderRequest.getCouponCode());
        order.setLoyaltyPointsUsed(calcRes.getLoyaltyPointsUsed());

        BigDecimal offerSubtotal = BigDecimal.ZERO;
        if (orderRequest.getItems() != null) {
            for (com.gtstore.orderservice.dto.CheckoutCalculationResponse.CalculatedItemDto cItem : calcRes.getItems()) {
                BigDecimal itemOfferPrice = cItem.getDiscountedPrice() != null ? cItem.getDiscountedPrice() : BigDecimal.ZERO;
                offerSubtotal = offerSubtotal.add(itemOfferPrice.multiply(BigDecimal.valueOf(cItem.getQuantity())));
            }
        }

        if (orderRequest.getItems() != null) {
            for (com.gtstore.orderservice.dto.CheckoutCalculationResponse.CalculatedItemDto cItem : calcRes.getItems()) {
                OrderItem item = new OrderItem();
                item.setProductId(cItem.getProductId());
                // find variant from original
                orderRequest.getItems().stream().filter(i -> i.getProductId().equals(cItem.getProductId())).findFirst().ifPresent(i -> item.setVariantId(i.getVariantId()));
                item.setQuantity(cItem.getQuantity());
                
                BigDecimal itemOfferPrice = cItem.getOriginalPrice() != null ? cItem.getOriginalPrice() : BigDecimal.ZERO;
                item.setPrice(itemOfferPrice); // Use original price as base price
                
                BigDecimal propDiscount = cItem.getCouponDiscountAmount() != null ? cItem.getCouponDiscountAmount() : BigDecimal.ZERO;
                BigDecimal propPoints = cItem.getLoyaltyPointsUsed() != null ? cItem.getLoyaltyPointsUsed() : BigDecimal.ZERO;
                
                item.setDiscountAmount(propDiscount);
                item.setLoyaltyPointsUsed(propPoints);
                item.setProductName(cItem.getProductName());
                item.setGstPercentage(cItem.getGstPercentage());
                
                order.addItem(item);
            }
        }

        OrderAudit audit = new OrderAudit();
        audit.setAction("ORDER_CREATED");
        audit.setDescription("Order initiated via Checkout. Payment Method: " + order.getPaymentMethod());
        audit.setPerformedBy(email);
        audit.setPerformedByName(name != null ? name : "Customer");
        audit.setPerformedByEmail(email);
        order.addAudit(audit);

        Order saved = orderRepository.save(order);
        String extOrderId = saved.getOrderNumber() != null ? saved.getOrderNumber() : saved.getId().toString();

        // Loyalty Processing
        try {
            java.util.Map<String, Object> earnReq = new java.util.HashMap<>();
            earnReq.put("email", email);
            earnReq.put("orderId", extOrderId);
            earnReq.put("totalAmount", order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            earnReq.put("shippingCharge", order.getShippingCharge() != null ? order.getShippingCharge() : BigDecimal.ZERO);
            earnReq.put("codCharge", order.getCodCharge() != null ? order.getCodCharge() : BigDecimal.ZERO);
            restTemplate.postForEntity("http://user-service:4004/api/users/loyalty/earn", earnReq, Void.class);

            if (order.getLoyaltyPointsUsed() != null && order.getLoyaltyPointsUsed().compareTo(BigDecimal.ZERO) > 0) {
                java.util.Map<String, Object> redeemReq = new java.util.HashMap<>();
                redeemReq.put("email", email);
                redeemReq.put("orderId", extOrderId);
                redeemReq.put("pointsUsed", order.getLoyaltyPointsUsed());
                restTemplate.postForEntity("http://user-service:4004/api/users/loyalty/redeem", redeemReq, Void.class);
            }
        } catch (Exception ex) {
            log.error("Failed to process loyalty points for order {}", extOrderId, ex);
        }

        // 3. Initiate Payment (Only if NOT COD)
        if (!"COD".equalsIgnoreCase(saved.getPaymentMethod())) {
            PaymentRequest paymentRequest = new PaymentRequest();
            paymentRequest.setOrderId(extOrderId);
            paymentRequest.setAmount(order.getTotalAmount());
            paymentRequest.setGateway("RAZORPAY");

            try {
                restTemplate.postForEntity(PAYMENT_URL, paymentRequest, PaymentResponse.class);
            } catch (Exception e) {
                log.error("Failed to initiate payment for order {}", extOrderId, e);
            }
        }

        // 4. Publish order.created
        OrderEvent event = new OrderEvent();
        event.setOrderId(extOrderId);
        event.setStatus(saved.getStatus());
        event.setEmail(email);
        event.setFullName(saved.getCustomerName() != null ? saved.getCustomerName() : name);
        event.setPaymentMethod(saved.getPaymentMethod());
        event.setShippingLine1(saved.getShippingLine1());
        event.setShippingLine2(saved.getShippingLine2());
        event.setShippingCity(saved.getShippingCity());
        event.setShippingState(saved.getShippingState());
        event.setShippingPincode(saved.getShippingPincode());
        event.setShippingCountry(saved.getShippingCountry());
        event.setCustomerPhone(saved.getCustomerPhone());

        if (saved.getItems() != null) {
            event.setItems(saved.getItems().stream().map(i -> {
                OrderItemDto dto = new OrderItemDto();
                dto.setProductId(i.getProductId());
                dto.setVariantId(i.getVariantId());
                dto.setQuantity(i.getQuantity());
                dto.setPrice(i.getPrice());
                dto.setDiscountAmount(i.getDiscountAmount());
                dto.setLoyaltyPointsUsed(i.getLoyaltyPointsUsed());
                dto.setProductName(i.getProductName());
                dto.setGstPercentage(i.getGstPercentage());
                return dto;
            }).collect(Collectors.toList()));
        }

        kafkaTemplate.send("order.created", event.getOrderId(), event);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<?> getOrders(@RequestHeader(value = "X-User-Email", required = false) String email) {
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(email);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{orderNumber}")
    public ResponseEntity<?> getOrder(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @PathVariable String orderNumber) {

        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Optional<Order> orderOpt = orderRepository.findByOrderNumber(orderNumber);
        if (orderOpt.isEmpty()) {
            try {
                orderOpt = orderRepository.findById(UUID.fromString(orderNumber));
            } catch (Exception e) {
                // Ignore parsing exception
            }
        }

        return orderOpt
                .filter(o -> o.getUserId().equals(email))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{orderNumber}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable String orderNumber,
            @RequestParam String status,
            @RequestParam(required = false) String details,
            @RequestHeader(value = "X-User-Name", required = false) String actorName,
            @RequestHeader(value = "X-User-Email", required = false) String actorEmail) {
        
        Optional<Order> orderOpt = orderRepository.findByOrderNumber(orderNumber);
        if (orderOpt.isEmpty()) {
            try {
                orderOpt = orderRepository.findById(UUID.fromString(orderNumber));
            } catch (Exception e) {
                // Ignore parsing exception
            }
        }

        return orderOpt
                .map(order -> {
                    String oldStatus = order.getStatus();
                    order.setStatus(status.toUpperCase());

                    OrderAudit audit = new OrderAudit();
                    audit.setAction("STATUS_UPDATED");
                    
                    String auditDesc = "Status transitioned from " + oldStatus + " to " + status.toUpperCase();
                    if (details != null && !details.trim().isEmpty()) {
                        auditDesc += ". Action Details: " + details.trim();
                    }
                    
                    audit.setDescription(auditDesc);
                    audit.setPerformedBy(actorEmail != null ? actorEmail : "ADMIN");
                    audit.setPerformedByName(actorName != null ? actorName : "System Administrator");
                    audit.setPerformedByEmail(actorEmail);
                    order.addAudit(audit);

                    Order saved = orderRepository.save(order);
                    String extOrderId = saved.getOrderNumber() != null ? saved.getOrderNumber() : saved.getId().toString();
                    
                    // Emit specific event topics
                    String topic = null;
                    if ("SHIPPED".equalsIgnoreCase(status) || "DISPATCHED".equalsIgnoreCase(status)) {
                        topic = "order.shipped";
                    } else if ("READY_TO_BE_SHIPPED".equalsIgnoreCase(status)) {
                        topic = "order.ready_to_be_shipped";
                    } else if ("CANCELLED".equalsIgnoreCase(status) || "CANCELLED_BY_CUSTOMER".equalsIgnoreCase(status)) {
                        topic = "order.cancelled";
                    } else if ("FAILED".equalsIgnoreCase(status) || "FULFILLMENT_FAILED".equalsIgnoreCase(status)) {
                        topic = "order.failed"; // Inventory and Payment should react to this
                    } else if ("ORDER_CONFIRMED".equalsIgnoreCase(status)) {
                        topic = "order.confirmed";
                    } else if ("DELIVERED".equalsIgnoreCase(status)) {
                        topic = "order.delivered";
                    }

                    if (topic != null) {
                        OrderEvent event = new OrderEvent();
                        event.setOrderId(extOrderId);
                        event.setStatus(saved.getStatus());
                        event.setEmail(saved.getUserId());
                        event.setFullName(saved.getCustomerName());
                        event.setShippingLine1(saved.getShippingLine1());
                        event.setShippingLine2(saved.getShippingLine2());
                        event.setShippingCity(saved.getShippingCity());
                        event.setShippingState(saved.getShippingState());
                        event.setShippingPincode(saved.getShippingPincode());
                        event.setShippingCountry(saved.getShippingCountry());
                        event.setCustomerPhone(saved.getCustomerPhone());
                        
                        // Capture order items for external services consuming the event stream
                        if (saved.getItems() != null) {
                            event.setItems(saved.getItems().stream().map(i -> {
                                OrderItemDto dto = new OrderItemDto();
                                dto.setProductId(i.getProductId());
                                dto.setVariantId(i.getVariantId());
                                dto.setQuantity(i.getQuantity());
                                dto.setPrice(i.getPrice());
                                dto.setDiscountAmount(i.getDiscountAmount());
                                dto.setLoyaltyPointsUsed(i.getLoyaltyPointsUsed());
                                dto.setProductName(i.getProductName());
                                dto.setGstPercentage(i.getGstPercentage());
                                return dto;
                            }).collect(Collectors.toList()));
                        }

                        kafkaTemplate.send(topic, event.getOrderId(), event);
                        log.info("Emitted {} event for order {}", topic, extOrderId);
                    }

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{orderNumber}/cancel")
    public ResponseEntity<?> cancelOrder(
            @PathVariable String orderNumber,
            @RequestHeader(value = "X-User-Email", required = false) String email) {
        
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<Order> orderOpt = orderRepository.findByOrderNumber(orderNumber);
        if (orderOpt.isEmpty()) {
            try {
                orderOpt = orderRepository.findById(UUID.fromString(orderNumber));
            } catch (Exception e) {
                // Ignore parsing exception
            }
        }

        return orderOpt.map(order -> {
            if (!order.getUserId().equals(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            // Strict cancellation window: Only before SHIPPED
            String status = order.getStatus();
            if ("SHIPPED".equalsIgnoreCase(status) || "DELIVERED".equalsIgnoreCase(status)) {
                return ResponseEntity.badRequest().body("Order cannot be cancelled once it is " + status);
            }
            
            order.setStatus("CANCELLED_BY_CUSTOMER");
            
            OrderAudit audit = new OrderAudit();
            audit.setAction("ORDER_CANCELLED");
            audit.setDescription("Cancelled by customer via portal");
            audit.setPerformedBy(email);
            order.addAudit(audit);

            Order saved = orderRepository.save(order);
            String extOrderId = saved.getOrderNumber() != null ? saved.getOrderNumber() : saved.getId().toString();
            
            OrderEvent event = new OrderEvent();
            event.setOrderId(extOrderId);
            event.setStatus("CANCELLED_BY_CUSTOMER");
            event.setEmail(email);
            event.setFullName(saved.getCustomerName());
            
            if (saved.getItems() != null) {
                event.setItems(saved.getItems().stream().map(i -> {
                    OrderItemDto dto = new OrderItemDto();
                    dto.setProductId(i.getProductId());
                    dto.setVariantId(i.getVariantId());
                    dto.setQuantity(i.getQuantity());
                    dto.setPrice(i.getPrice());
                    dto.setDiscountAmount(i.getDiscountAmount());
                    dto.setLoyaltyPointsUsed(i.getLoyaltyPointsUsed());
                    dto.setProductName(i.getProductName());
                    dto.setGstPercentage(i.getGstPercentage());
                    return dto;
                }).collect(Collectors.toList()));
            }

            kafkaTemplate.send("order.cancelled", event.getOrderId(), event);
            log.info("Order {} cancelled by customer {}", extOrderId, email);
            
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Admin-only endpoint to retrieve all platform orders.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAllByOrderByCreatedAtDesc());
    }

    /**
     * Admin-only: Retrieve details of a specific order by ID.
     */
    @GetMapping("/all/{orderNumber}")
    public ResponseEntity<Order> getOrderByIdAdmin(@PathVariable String orderNumber) {
        Optional<Order> orderOpt = orderRepository.findByOrderNumber(orderNumber);
        if (orderOpt.isEmpty()) {
            try {
                orderOpt = orderRepository.findById(UUID.fromString(orderNumber));
            } catch (Exception e) {
                // Ignore parsing exception
            }
        }
        return orderOpt
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<java.util.Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("error", "Bad Request", "message", e.getMessage()));
    }
}
