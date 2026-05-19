package com.gtstore.userservice.dto;

public class SupportRequest {
    private String name;
    private String email;
    private String mobile;
    private String subject;
    private String message;
    private String ticketNumber;

    private String attachmentUrl;

    // Default constructor for Jackson
    public SupportRequest() {}

    public SupportRequest(String name, String email, String mobile, String subject, String message, String ticketNumber, String attachmentUrl) {
        this.name = name;
        this.email = email;
        this.mobile = mobile;
        this.subject = subject;
        this.message = message;
        this.ticketNumber = ticketNumber;
        this.attachmentUrl = attachmentUrl;
    }

    // Getters and Setters
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }
}
