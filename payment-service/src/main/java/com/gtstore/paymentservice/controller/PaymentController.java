package com.gtstore.paymentservice.controller;

import com.gtstore.paymentservice.dto.PaymentRequest;
import com.gtstore.paymentservice.dto.PaymentResponse;
import com.gtstore.paymentservice.entity.Payment;
import com.gtstore.paymentservice.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponse> initiatePayment(@RequestBody PaymentRequest request) {
        Payment payment = paymentService.initiatePayment(request);
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
