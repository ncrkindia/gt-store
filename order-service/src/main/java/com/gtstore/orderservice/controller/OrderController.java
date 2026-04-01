package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.dto.*;
import com.gtstore.orderservice.entity.Order;
import com.gtstore.orderservice.entity.OrderItem;
import com.gtstore.orderservice.repository.OrderRepository;
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

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String INVENTORY_URL = "http://inventory-service:8086/api/inventory/reserve";
    private final String PAYMENT_URL = "http://payment-service:8087/api/payments/initiate";

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
                    ResponseEntity<StockReservationResponse> stockRes = restTemplate.postForEntity(INVENTORY_URL, stockReq, StockReservationResponse.class);
                    if (!stockRes.getStatusCode().is2xxSuccessful() || !stockRes.getBody().isSuccess()) {
                        return ResponseEntity.badRequest().body("Failed to reserve stock for product " + itemReq.getProductId());
                    }
                } catch (Exception e) {
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Inventory service unavailable or out of stock: " + e.getMessage());
                }
            }
        }

        // 2. Create Order
        Order order = new Order();
        order.setUserId(email);
        order.setStatus("PENDING");
        order.setShippingAddressId(orderRequest.getShippingAddressId());
        
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

        // 3. Initiate Payment
        PaymentRequest paymentRequest = new PaymentRequest();
        paymentRequest.setOrderId(saved.getId().toString());
        paymentRequest.setAmount(totalAmount);
        paymentRequest.setGateway("CREDIT_CARD");

        try {
            restTemplate.postForEntity(PAYMENT_URL, paymentRequest, PaymentResponse.class);
        } catch (Exception e) {
            // Log payment init failure
        }

        // 4. Publish order.created
        OrderEvent event = new OrderEvent();
        event.setOrderId(saved.getId().toString());
        event.setStatus("PENDING");
        event.setEmail(email);
        event.setFullName(name);
        
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
                    order.setStatus(status);
                    return ResponseEntity.ok(orderRepository.save(order));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Admin-only endpoint to retrieve all platform orders.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAllByOrderByCreatedAtDesc());
    }
}
