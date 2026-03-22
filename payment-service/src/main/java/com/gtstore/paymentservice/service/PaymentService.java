package com.gtstore.paymentservice.service;

import com.gtstore.paymentservice.dto.PaymentEvent;
import com.gtstore.paymentservice.dto.PaymentRequest;
import com.gtstore.paymentservice.entity.Payment;
import com.gtstore.paymentservice.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private final PaymentRepository paymentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PaymentService(PaymentRepository paymentRepository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.paymentRepository = paymentRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Transactional
    public Payment initiatePayment(PaymentRequest request) {
        Payment payment = new Payment();
        payment.setOrderId(request.getOrderId());
        payment.setAmount(request.getAmount());
        payment.setGateway(request.getGateway() != null ? request.getGateway() : "MOCK_GATEWAY");
        payment.setStatus("PENDING");
        
        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment processCallback(String orderId, String status) {
        Optional<Payment> paymentOpt = paymentRepository.findByOrderId(orderId);
        if (paymentOpt.isPresent()) {
            Payment payment = paymentOpt.get();
            payment.setStatus(status);
            payment.setTransactionRef(UUID.randomUUID().toString());
            paymentRepository.save(payment);

            // Publish event
            PaymentEvent event = new PaymentEvent(orderId, status, payment.getTransactionRef());
            String topic = "SUCCESS".equalsIgnoreCase(status) ? "payment.succeeded" : "payment.failed";
            
            log.info("Publishing {} event for order: {}", topic, orderId);
            kafkaTemplate.send(topic, orderId, event);

            return payment;
        }
        throw new IllegalArgumentException("Payment not found for order: " + orderId);
    }
}
