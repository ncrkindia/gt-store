package com.gtstore.productservice.document;

import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

import java.util.List;

public class Review {

    private String id = java.util.UUID.randomUUID().toString();

    @Field("user_name")
    private String userName;

    private int rating;
    private String comment;
    private LocalDateTime date;
    
    // Status can be PENDING, APPROVED, REJECTED
    private String status = "PENDING";
    
    // Up to 5 image URLs
    private List<String> images;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }
}
