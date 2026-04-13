package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.dto.*;
import com.gtstore.orderservice.entity.Order;
import com.gtstore.orderservice.entity.OrderItem;
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

        BigDecimal totalAmount = BigDecimal.ZERO;

        if (orderRequest.getItems() != null) {
            for (OrderItem itemReq : orderRequest.getItems()) {
                OrderItem item = new OrderItem();
                item.setProductId(itemReq.getProductId());
                item.setVariantId(itemReq.getVariantId());
                item.setQuantity(itemReq.getQuantity());
                item.setPrice(itemReq.getPrice());

                totalAmount = totalAmount.add(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
                order.addItem(item);
            }
        }
        order.setTotalAmount(totalAmount);
        Order saved = orderRepository.save(order);

        // 3. Initiate Payment (Only if NOT COD)
        if (!"COD".equalsIgnoreCase(saved.getPaymentMethod())) {
            PaymentRequest paymentRequest = new PaymentRequest();
            paymentRequest.setOrderId(saved.getId().toString());
            paymentRequest.setAmount(totalAmount);
            paymentRequest.setGateway("RAZORPAY");

            try {
                restTemplate.postForEntity(PAYMENT_URL, paymentRequest, PaymentResponse.class);
            } catch (Exception e) {
                log.error("Failed to initiate payment for order {}", saved.getId(), e);
            }
        }

        // 4. Publish order.created
        OrderEvent event = new OrderEvent();
        event.setOrderId(saved.getId().toString());
        event.setStatus(saved.getStatus());
        event.setEmail(email);
        event.setFullName(name);
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

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @PathVariable UUID id) {

        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        return orderRepository.findById(id)
                .filter(o -> o.getUserId().equals(email))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        return orderRepository.findById(id)
                .map(order -> {
                    order.setStatus(status.toUpperCase());
                    Order saved = orderRepository.save(order);
                    
                    // Emit specific event topics
                    String topic = null;
                    if ("SHIPPED".equalsIgnoreCase(status) || "DISPATCHED".equalsIgnoreCase(status)) {
                        topic = "order.shipped";
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
                        event.setOrderId(saved.getId().toString());
                        event.setStatus(saved.getStatus());
                        event.setEmail(saved.getUserId());
                        event.setShippingLine1(saved.getShippingLine1());
                        event.setShippingLine2(saved.getShippingLine2());
                        event.setShippingCity(saved.getShippingCity());
                        event.setShippingState(saved.getShippingState());
                        event.setShippingPincode(saved.getShippingPincode());
                        event.setShippingCountry(saved.getShippingCountry());
                        event.setCustomerPhone(saved.getCustomerPhone());
                        
                        kafkaTemplate.send(topic, event.getOrderId(), event);
                        log.info("Emitted {} event for order {}", topic, saved.getId());
                    }

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Email", required = false) String email) {
        
        if (email == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return orderRepository.findById(id).map(order -> {
            if (!order.getUserId().equals(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            // Strict cancellation window: Only before SHIPPED
            String status = order.getStatus();
            if ("SHIPPED".equalsIgnoreCase(status) || "DELIVERED".equalsIgnoreCase(status)) {
                return ResponseEntity.badRequest().body("Order cannot be cancelled once it is " + status);
            }
            
            order.setStatus("CANCELLED_BY_CUSTOMER");
            Order saved = orderRepository.save(order);
            
            OrderEvent event = new OrderEvent();
            event.setOrderId(saved.getId().toString());
            event.setStatus("CANCELLED_BY_CUSTOMER");
            event.setEmail(email);
            
            if (saved.getItems() != null) {
                event.setItems(saved.getItems().stream().map(i -> {
                    OrderItemDto dto = new OrderItemDto();
                    dto.setProductId(i.getProductId());
                    dto.setVariantId(i.getVariantId());
                    dto.setQuantity(i.getQuantity());
                    return dto;
                }).collect(Collectors.toList()));
            }

            kafkaTemplate.send("order.cancelled", event.getOrderId(), event);
            log.info("Order {} cancelled by customer {}", id, email);
            
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
}
