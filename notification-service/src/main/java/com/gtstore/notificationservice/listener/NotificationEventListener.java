package com.gtstore.notificationservice.listener;

import com.gtstore.notificationservice.dto.OrderEvent;
import com.gtstore.notificationservice.dto.SupportRequestEvent;
import com.gtstore.notificationservice.service.EmailService;
import com.gtstore.notificationservice.config.NotificationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

import java.util.HashMap;
import java.util.Map;

@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);
    private final EmailService emailService;
    private final NotificationProperties notificationProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @org.springframework.beans.factory.annotation.Value("${platform.web-url}")
    private String webUrl;

    public NotificationEventListener(EmailService emailService, NotificationProperties notificationProperties) {
        this.emailService = emailService;
        this.notificationProperties = notificationProperties;
    }

    @KafkaListener(topics = "order.created", groupId = "notification-group")
    public void handleOrderCreated(String eventJson) {
        processEvent(eventJson, "ORDER_CONFIRMED", "Order Confirmed - GT Store");
    }

    @KafkaListener(topics = "order.paid", groupId = "notification-group")
    public void handleOrderPaid(String eventJson) {
        processEvent(eventJson, "PAYMENT_SUCCESSFUL", "Payment Received - GT Store");
    }

    @KafkaListener(topics = "order.shipped", groupId = "notification-group")
    public void handleOrderShipped(String eventJson) {
        processEvent(eventJson, "ORDER_DISPATCHED", "Your order has been shipped! - GT Store");
    }

    @KafkaListener(topics = "order.cancelled", groupId = "notification-group")
    public void handleOrderCancelled(String eventJson) {
        processEvent(eventJson, "ORDER_CANCELLED", "Order Cancelled - GT Store");
    }

    @KafkaListener(topics = "order.failed", groupId = "notification-group")
    public void handleOrderFailed(String eventJson) {
        processEvent(eventJson, "FULFILLMENT_FAILED", "Update regarding your order - GT Store");
    }

    @KafkaListener(topics = "support.request", groupId = "notification-group")
    public void handleSupportRequest(String eventJson) {
        try {
            SupportRequestEvent event = objectMapper.readValue(eventJson, SupportRequestEvent.class);
            log.info("Processing support request from: {}", event.getEmail());

            Map<String, Object> model = new HashMap<>();
            model.put("name", event.getName());
            model.put("email", event.getEmail());
            model.put("subject", event.getSubject());
            model.put("message", event.getMessage());

            // 1. Send detailed email to support team
            String adminTemplate = notificationProperties.getTemplates().get("SUPPORT_ADMIN");
            emailService.sendHtmlMessage(notificationProperties.getCcEmail(), "Support Request: " + event.getSubject(), adminTemplate, model);

            // 2. Send acknowledgement to the customer
            String ackTemplate = notificationProperties.getTemplates().get("SUPPORT_ACK");
            emailService.sendHtmlMessage(event.getEmail(), "We've received your support request", ackTemplate, model);

        } catch (JsonProcessingException e) {
            log.error("Failed to parse support request social JSON", e);
        }
    }

    private void processEvent(String eventJson, String type, String subject) {
        try {
            OrderEvent event = objectMapper.readValue(eventJson, OrderEvent.class);
            log.info("Processing {} event for orderId: {}", type, event.getOrderId());

            Map<String, String> templates = notificationProperties.getTemplates();
            String templateName = templates != null ? templates.get(type) : null;
            
            if (templateName == null) {
                log.error("No template configured for notification type: {}", type);
                return;
            }

            Map<String, Object> model = new HashMap<>();
            model.put("orderId", event.getOrderId());
            model.put("fullName", event.getFullName());
            model.put("status", event.getStatus());
            model.put("paymentMethod", event.getPaymentMethod());
            model.put("items", event.getItems());
            
            // Add Dynamic Direct Tracking Link
            String trackingUrl = (webUrl != null ? webUrl : "https://gtstore.slpro.in") + "/orders/" + event.getOrderId();
            model.put("trackLink", trackingUrl);
            
            // Add Address and Phone
            model.put("shippingLine1", event.getShippingLine1());
            model.put("shippingLine2", event.getShippingLine2());
            model.put("shippingCity", event.getShippingCity());
            model.put("shippingState", event.getShippingState());
            model.put("shippingPincode", event.getShippingPincode());
            model.put("shippingCountry", event.getShippingCountry());
            model.put("customerPhone", event.getCustomerPhone());

            emailService.sendHtmlMessage(event.getEmail(), subject, templateName, model);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse event JSON for type {}", type, e);
        }
    }
}
