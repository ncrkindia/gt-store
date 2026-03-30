package com.gtstore.notificationservice.listener;

import com.gtstore.notificationservice.dto.OrderEvent;
import com.gtstore.notificationservice.dto.PaymentEvent;
import com.gtstore.notificationservice.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

/**
 * Kafka Listener for the Notification Service.
 * Listens for system-wide events to trigger customer communications (emails).
 * 
 * - order.created: Notifies user that order is received.
 * - order.paid: Confirms payment and start of processing.
 * - payment.failed: Logs payment failures for manual follow-up (MVP).
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);
    private final EmailService emailService;

    public NotificationEventListener(EmailService emailService) {
        this.emailService = emailService;
    }

    private final ObjectMapper objectMapper = new ObjectMapper();

    @KafkaListener(topics = "order.created", groupId = "notification-group")
    public void handleOrderCreated(String eventJson) {
        try {
            OrderEvent event = objectMapper.readValue(eventJson, OrderEvent.class);
            log.info("Received order.created event for orderId: {}", event.getOrderId());
            String subject = "Your GT Store Order has been received! (" + event.getOrderId() + ")";
            String text = "Hello " + (event.getFullName() != null ? event.getFullName() : "Customer") + ",\n\n" +
                          "We have received your order " + event.getOrderId() + ".\n" +
                          "We are currently waiting for payment confirmation. Once confirmed, we will process your order.\n\n" +
                          "Thank you for shopping at GT Store!";
            emailService.sendSimpleMessage(event.getEmail(), subject, text);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse order.created event", e);
        }
    }

    @KafkaListener(topics = "order.paid", groupId = "notification-group")
    public void handleOrderPaid(String eventJson) {
        try {
            OrderEvent event = objectMapper.readValue(eventJson, OrderEvent.class);
            log.info("Received order.paid event for orderId: {}", event.getOrderId());
            String subject = "Payment Confirmed for GT Store Order (" + event.getOrderId() + ")";
            String text = "Hello " + (event.getFullName() != null ? event.getFullName() : "Customer") + ",\n\n" +
                          "Good news! We have received payment for your order " + event.getOrderId() + ".\n" +
                          "We are now preparing to ship your items.\n\n" +
                          "Thank you for your purchase!";
            emailService.sendSimpleMessage(event.getEmail(), subject, text);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse order.paid event", e);
        }
    }

    @KafkaListener(topics = "payment.failed", groupId = "notification-group")
    public void handlePaymentFailed(String eventJson) {
        try {
            PaymentEvent event = objectMapper.readValue(eventJson, PaymentEvent.class);
            log.info("Received payment.failed event for orderId: {}", event.getOrderId());
            // In a real system we would look up the user email from order service or user service.
            // For phase 2 MVP demo, we log it.
            log.warn("Payment failed for order {}; Notification to user is pending explicit email lookup integration.", event.getOrderId());
        } catch (JsonProcessingException e) {
            log.error("Failed to parse payment.failed event", e);
        }
    }
}
