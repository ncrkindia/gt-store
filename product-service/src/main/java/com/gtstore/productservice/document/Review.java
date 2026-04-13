package com.gtstore.productservice.document;

import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;

public class Review {

    @Field("user_name")
    private String userName;

    private int rating;
    private String comment;
    private LocalDateTime date;

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }
}
