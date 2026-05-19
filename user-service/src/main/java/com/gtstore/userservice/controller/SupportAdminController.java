package com.gtstore.userservice.controller;

import com.gtstore.userservice.entity.SupportTicket;
import com.gtstore.userservice.entity.SupportMessage;
import com.gtstore.userservice.entity.SupportAudit;
import com.gtstore.userservice.repository.SupportTicketRepository;
import com.gtstore.userservice.dto.SupportReplyEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.kafka.core.KafkaTemplate;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users/admin/support")
public class SupportAdminController {

    @Autowired
    private SupportTicketRepository ticketRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * GET list of all support tickets, ordered by newest first.
     */
    @GetMapping("/tickets")
    public ResponseEntity<List<SupportTicket>> getAllTickets() {
        return ResponseEntity.ok(ticketRepository.findAllByOrderByCreatedAtDesc());
    }

    /**
     * GET specific ticket details (includes messages and audits automatically due to JSON relationship).
     */
    @GetMapping("/tickets/{id}")
    public ResponseEntity<SupportTicket> getTicket(@PathVariable Long id) {
        return ticketRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * UPDATE ticket status.
     */
    @PutMapping("/tickets/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestHeader(value = "X-User-Email", required = false) String adminEmail) {
        
        return ticketRepository.findById(id).map(ticket -> {
            String oldStatus = ticket.getStatus();
            String newStatus = status.toUpperCase();
            
            if (oldStatus.equals(newStatus)) {
                return ResponseEntity.ok(ticket);
            }

            ticket.setStatus(newStatus);
            
            SupportAudit audit = new SupportAudit();
            audit.setAction("STATUS_CHANGE");
            audit.setDescription("Ticket status modified from " + oldStatus + " to " + newStatus);
            audit.setPerformedBy(adminEmail != null ? adminEmail : "ADMIN_PORTAL");
            ticket.addAudit(audit);
            
            SupportTicket saved = ticketRepository.save(ticket);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST a new message (reply or internal note) inside a ticket.
     */
    @PostMapping("/tickets/{id}/messages")
    @Transactional
    public ResponseEntity<?> addMessage(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "X-User-Email", required = false) String adminEmail) {
        
        return ticketRepository.findById(id).map(ticket -> {
            String messageText = (String) payload.get("message");
            Boolean isInternal = (Boolean) payload.getOrDefault("isInternal", false);
            Boolean sendEmail = (Boolean) payload.getOrDefault("sendEmail", false);
            String attachmentUrl = (String) payload.get("attachmentUrl");
            
            if (messageText == null || messageText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
            }

            String sender = adminEmail != null ? adminEmail : "ADMIN_SUPPORT";

            // 1. Create the Message record
            SupportMessage msg = new SupportMessage();
            msg.setMessage(messageText);
            msg.setSender(sender);
            msg.setInternal(isInternal);
            msg.setEmailSent(sendEmail && !isInternal); // Internal notes should NEVER send emails to customer
            msg.setAttachmentUrl(attachmentUrl);
            ticket.addMessage(msg);

            // 2. Auto transition status if reply sent (from OPEN to IN_PROGRESS or RESPONDED)
            if (!isInternal && "OPEN".equals(ticket.getStatus())) {
                ticket.setStatus("IN_PROGRESS");
            }

            // 3. Add audit log
            SupportAudit audit = new SupportAudit();
            audit.setAction(isInternal ? "NOTE_ADDED" : "REPLY_ADDED");
            audit.setDescription(isInternal ? "Internal discussion note appended" : "Official reply published from portal");
            audit.setPerformedBy(sender);
            ticket.addAudit(audit);

            // 4. Publish to Kafka if notification email is desired and it's an outer reply
            if (sendEmail && !isInternal) {
                SupportReplyEvent event = new SupportReplyEvent(
                    ticket.getTicketNumber(),
                    ticket.getName(),
                    ticket.getEmail(),
                    ticket.getSubject(),
                    messageText
                );
                kafkaTemplate.send("support.reply", event);
                
                // Additional audit log for email dispatch
                SupportAudit emailAudit = new SupportAudit();
                emailAudit.setAction("EMAIL_SENT");
                emailAudit.setDescription("Notification email dispatched to " + ticket.getEmail());
                emailAudit.setPerformedBy(sender);
                ticket.addAudit(emailAudit);
            }

            SupportTicket saved = ticketRepository.save(ticket);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * PUT update linked order IDs for a support ticket.
     */
    @PutMapping("/tickets/{id}/link-orders")
    @Transactional
    public ResponseEntity<?> updateLinkedOrders(
            @PathVariable Long id,
            @RequestBody List<String> orderIds,
            @RequestHeader(value = "X-User-Email", required = false) String adminEmail) {
        
        return ticketRepository.findById(id).map(ticket -> {
            List<String> oldOrders = ticket.getLinkedOrderIds();
            ticket.setLinkedOrderIds(orderIds);

            SupportAudit audit = new SupportAudit();
            audit.setAction("ORDERS_LINKED");
            audit.setDescription("Linked orders updated. Previous list: " + oldOrders + ", New count: " + orderIds.size());
            audit.setPerformedBy(adminEmail != null ? adminEmail : "ADMIN_SUPPORT");
            ticket.addAudit(audit);

            SupportTicket saved = ticketRepository.save(ticket);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET all support tickets linked to a specific Order ID.
     */
    @GetMapping("/tickets/by-order/{orderId}")
    public ResponseEntity<List<SupportTicket>> getTicketsForOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(ticketRepository.findTicketsByOrderId(orderId));
    }
}
