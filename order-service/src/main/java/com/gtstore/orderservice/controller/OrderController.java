package com.gtstore.orderservice.controller;

import com.gtstore.orderservice.entity.Order;
import com.gtstore.orderservice.entity.OrderItem;
import com.gtstore.orderservice.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @PostMapping
    public ResponseEntity<?> createOrder(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody Order orderRequest) {
        
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

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
                
                totalAmount = totalAmount.add(
                    item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                );
                
                order.addItem(item);
            }
        }
        
        order.setTotalAmount(totalAmount);
        
        Order saved = orderRepository.save(order);
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
        // In a real app, verify admin role here
        return orderRepository.findById(id)
                .map(order -> {
                    order.setStatus(status);
                    return ResponseEntity.ok(orderRepository.save(order));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
