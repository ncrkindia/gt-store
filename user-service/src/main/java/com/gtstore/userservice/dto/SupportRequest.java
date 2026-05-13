package com.gtstore.userservice.dto;

public class SupportRequest {
    private String name;
    private String email;
    private String subject;
    private String message;
    private String ticketNumber;

    // Default constructor for Jackson
    public SupportRequest() {}

    public SupportRequest(String name, String email, String subject, String message, String ticketNumber) {
        this.name = name;
        this.email = email;
        this.subject = subject;
        this.message = message;
        this.ticketNumber = ticketNumber;
    }

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }
}
