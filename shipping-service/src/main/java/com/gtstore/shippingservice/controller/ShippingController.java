package com.gtstore.shippingservice.controller;

import com.gtstore.shippingservice.entity.Shipment;
import com.gtstore.shippingservice.repository.ShipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping")
public class ShippingController {

    @Autowired
    private ShipmentRepository shipmentRepository;

    /**
     * Admin view of comprehensive logistical consignment feed.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Shipment>> getAllShipments() {
        return ResponseEntity.ok(shipmentRepository.findAllByOrderByCreatedAtDesc());
    }

    /**
     * Locate specific shipment details mapping back from static order key.
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<Shipment> getShipmentByOrderId(@PathVariable String orderId) {
        return shipmentRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
