package com.gtstore.inventoryservice.controller;

import com.gtstore.inventoryservice.dto.StockReservationRequest;
import com.gtstore.inventoryservice.dto.StockReservationResponse;
import com.gtstore.inventoryservice.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for the Inventory Service.
 * Manages product stock levels and reservations.
 * 
 * Provides synchronous endpoints for the Order Service to verify and reserve stock
 * during the initial phase of the checkout flow.
 */
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/{productId}")
    public ResponseEntity<Integer> getStock(@PathVariable String productId) {
        return ResponseEntity.ok(inventoryService.getStock(productId));
    }

    @PostMapping("/reserve")
    public ResponseEntity<StockReservationResponse> reserveStock(@RequestBody StockReservationRequest request) {
        boolean success = inventoryService.reserveStock(request);
        if (success) {
            return ResponseEntity.ok(new StockReservationResponse(true, "Stock reserved successfully"));
        } else {
            return ResponseEntity.badRequest().body(new StockReservationResponse(false, "Insufficient stock"));
        }
    }

    @PostMapping("/release")
    public ResponseEntity<StockReservationResponse> releaseStock(@RequestBody StockReservationRequest request) {
        inventoryService.releaseStock(request);
        return ResponseEntity.ok(new StockReservationResponse(true, "Stock released successfully"));
    }
}
