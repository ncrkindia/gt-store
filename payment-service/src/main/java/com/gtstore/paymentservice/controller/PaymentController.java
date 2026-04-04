package com.gtstore.paymentservice.controller;

import com.gtstore.paymentservice.dto.PaymentRequest;
import com.gtstore.paymentservice.dto.PaymentResponse;
import com.gtstore.paymentservice.entity.Payment;
import com.gtstore.paymentservice.service.PaymentService;
import com.gtstore.paymentservice.service.PaypalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * REST Controller for the Payment Service.
 * Orchestrates payment initialization and callback processing.
 * 
 * Flow:
 * 1. Order Service calls /initiate during checkout.
 * 2. External gateway (or simulator) calls /callback with transaction status.
 * 3. Payment Service updates DB and publishes 'payment.succeeded/failed' to Kafka.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaypalService paypalService;

    public PaymentController(PaymentService paymentService, PaypalService paypalService) {
        this.paymentService = paymentService;
        this.paypalService = paypalService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponse> initiatePayment(@RequestBody PaymentRequest request) {
        Payment payment = paymentService.initiatePayment(request);
        return ResponseEntity.ok(new PaymentResponse(payment.getOrderId(), payment.getStatus(), payment.getTransactionRef()));
    }

    @PostMapping("/paypal/create/{orderId}")
    public ResponseEntity<Map<String, String>> createPaypalOrder(@PathVariable String orderId) {
        Payment payment = paymentService.getPaymentByOrderId(orderId);
        String paypalOrderId = paypalService.createOrder(payment.getAmount().doubleValue(), "USD", orderId);
        
        Map<String, String> response = new HashMap<>();
        response.put("paypalOrderId", paypalOrderId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/paypal/capture/{paypalOrderId}")
    public ResponseEntity<PaymentResponse> capturePaypalOrder(@PathVariable String paypalOrderId) {
        Map<String, Object> captureResponse = paypalService.captureOrder(paypalOrderId);
        String status = (String) captureResponse.get("status");
        
        // Find reference_id in purchase_units
        List<?> purchaseUnits = (List<?>) captureResponse.get("purchase_units");
        Map<?, ?> firstUnit = (Map<?, ?>) purchaseUnits.get(0);
        String orderId = (String) firstUnit.get("reference_id");

        String internalStatus = "COMPLETED".equals(status) ? "SUCCESS" : "FAILED";

        Payment payment = paymentService.processCallback(orderId, internalStatus);
        
        return ResponseEntity.ok(new PaymentResponse(payment.getOrderId(), payment.getStatus(), payment.getTransactionRef()));
    }

    @PostMapping("/callback")

    public ResponseEntity<PaymentResponse> paymentCallback(@RequestBody Map<String, String> payload) {
        String orderId = payload.get("orderId");
        String status = payload.get("status"); // SUCCESS or FAILED
        
        Payment payment = paymentService.processCallback(orderId, status);
        return ResponseEntity.ok(new PaymentResponse(payment.getOrderId(), payment.getStatus(), payment.getTransactionRef()));
    }
}
