package com.gtstore.userservice.dto;

public class SupportReplyEvent {
    private String ticketNumber;
    private String customerName;
    private String customerEmail;
    private String originalSubject;
    private String replyMessage;

    public SupportReplyEvent() {}

    public SupportReplyEvent(String ticketNumber, String customerName, String customerEmail, String originalSubject, String replyMessage) {
        this.ticketNumber = ticketNumber;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.originalSubject = originalSubject;
        this.replyMessage = replyMessage;
    }

    // Getters and Setters
    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getOriginalSubject() { return originalSubject; }
    public void setOriginalSubject(String originalSubject) { this.originalSubject = originalSubject; }

    public String getReplyMessage() { return replyMessage; }
    public void setReplyMessage(String replyMessage) { this.replyMessage = replyMessage; }
}
