package com.gtstore.paymentservice.listener;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gtstore.paymentservice.entity.Payment;
import com.gtstore.paymentservice.repository.PaymentRepository;
import com.gtstore.paymentservice.service.RazorpayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventListener.class);
    private final PaymentRepository paymentRepository;
    private final RazorpayService razorpayService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PaymentEventListener(PaymentRepository paymentRepository, RazorpayService razorpayService) {
        this.paymentRepository = paymentRepository;
        this.razorpayService = razorpayService;
    }

    @KafkaListener(topics = {"order.cancelled", "order.failed"}, groupId = "payment-group")
    public void handleOrderFailed(String eventJson) {
        try {
            JsonNode event = objectMapper.readTree(eventJson);
            String orderId = event.get("orderId").asText();
            
            log.info("Received failure event for order: {}. Checking for refund...", orderId);
            
            paymentRepository.findByOrderId(orderId).ifPresent(payment -> {
                if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
                    triggerRefund(payment);
                } else {
                    log.info("Order {} was never paid or already processed. Status: {}", orderId, payment.getStatus());
                }
            });
        } catch (JsonProcessingException e) {
            log.error("Failed to parse order failure event", e);
        }
    }

    private void triggerRefund(Payment payment) {
        log.info("Initiating refund for order: {} Gateway: {}", payment.getOrderId(), payment.getGateway());
        
        try {
            if ("RAZORPAY".equalsIgnoreCase(payment.getGateway()) && payment.getTransactionRef() != null) {
                String refundId = razorpayService.refundPayment(payment.getTransactionRef(), payment.getAmount());
                payment.setStatus("REFUNDED");
                log.info("Success! Razorpay Refund ID: {}", refundId);
            } else {
                log.warn("Refund not supported for gateway: {} or missing transaction ref", payment.getGateway());
                payment.setStatus("REFUND_FAILED");
            }
            paymentRepository.save(payment);
        } catch (Exception e) {
            log.error("Refund failed for order: {}", payment.getOrderId(), e);
            payment.setStatus("REFUND_ERROR");
            paymentRepository.save(payment);
        }
    }
}
