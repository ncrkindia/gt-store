package com.gtstore.cartservice.controller;

import com.gtstore.cartservice.model.Cart;
import com.gtstore.cartservice.model.CartItem;
import com.gtstore.cartservice.repository.CartRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartRepository cartRepository;

    @GetMapping
    public ResponseEntity<?> getCart(@RequestHeader(value = "X-User-Email", required = false) String email) {
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing X-User-Email header from API Gateway");
        }

        Cart cart = cartRepository.findById(email).orElse(new Cart());
        if (cart.getUserId() == null) {
            cart.setUserId(email);
        }
        
        return ResponseEntity.ok(cart);
    }

    @PostMapping("/items")
    public ResponseEntity<?> addOrUpdateItem(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody CartItem newItem) {
        
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        Cart cart = cartRepository.findById(email).orElse(new Cart());
        cart.setUserId(email);
        cart.setUpdatedAt(LocalDateTime.now());

        Optional<CartItem> existingItemMatch = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(newItem.getProductId())
                        && (i.getVariantId() == null ? newItem.getVariantId() == null : i.getVariantId().equals(newItem.getVariantId())))
                .findFirst();

        if (existingItemMatch.isPresent()) {
            CartItem existing = existingItemMatch.get();
            existing.setQuantity(existing.getQuantity() + newItem.getQuantity());
            if (existing.getQuantity() <= 0) {
                cart.getItems().remove(existing);
            }
        } else {
            if (newItem.getQuantity() > 0) {
                cart.getItems().add(newItem);
            }
        }

        Cart saved = cartRepository.save(cart);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<?> removeItem(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @PathVariable String productId) {
        
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        cartRepository.findById(email).ifPresent(cart -> {
            cart.getItems().removeIf(i -> i.getProductId().equals(productId));
            cart.setUpdatedAt(LocalDateTime.now());
            cartRepository.save(cart);
        });

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<?> clearCart(@RequestHeader(value = "X-User-Email", required = false) String email) {
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        cartRepository.deleteById(email);
        return ResponseEntity.noContent().build();
    }
}
