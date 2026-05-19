package com.gtstore.userservice.controller;

import com.gtstore.userservice.entity.Address;
import com.gtstore.userservice.entity.User;
import com.gtstore.userservice.repository.AddressRepository;
import com.gtstore.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.kafka.core.KafkaTemplate;
import com.gtstore.userservice.dto.SupportRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.gtstore.userservice.entity.SupportTicket;
import com.gtstore.userservice.entity.SupportAudit;
import com.gtstore.userservice.repository.SupportTicketRepository;

/**
 * REST Controller for the User Service.
 * Manages user profiles and addresses, synchronized with Pahchaan identities.
 * 
 * Uses 'X-User-Email' and 'X-User-Name' headers (propagated by the API Gateway)
 * to identify and upsert users in the local PostgreSQL database.
 */
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @PostMapping("/support")
    @jakarta.transaction.Transactional
    public ResponseEntity<?> submitSupportRequest(@RequestBody SupportRequest request) {
        log.info("Received support request from: {}", request.getEmail());
        
        // 1. Store in database
        SupportTicket ticket = new SupportTicket();
        ticket.setName(request.getName());
        ticket.setEmail(request.getEmail());
        ticket.setMobile(request.getMobile());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getMessage());
        ticket.setAttachmentUrl(request.getAttachmentUrl());
        
        // Generate initial audit log
        SupportAudit audit = new SupportAudit();
        audit.setAction("TICKET_CREATED");
        audit.setDescription("Support request generated via online form");
        audit.setPerformedBy(request.getEmail());
        ticket.addAudit(audit);
        
        SupportTicket savedTicket = supportTicketRepository.save(ticket);
        
        // 2. Attach generated ticket number to the Kafka event payload
        request.setTicketNumber(savedTicket.getTicketNumber());
        
        // 3. Publish to Kafka for async email notification via notification-service
        kafkaTemplate.send("support.request", request);
        
        return ResponseEntity.ok(Map.of(
            "message", "Support request submitted successfully",
            "ticketNumber", savedTicket.getTicketNumber()
        ));
    }

    /**
     * Endpoint hit by frontend to get the current profile.
     * The API Gateway intercepts the Pahchaan JWT and forwards claims as headers.
     * We use these headers to find or create the user in our DB.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestHeader(value = "X-User-Name", required = false) String name) {
        
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing X-User-Email header");
        }

        // Upsert user
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name != null ? name : email);
            return userRepository.save(newUser);
        });

        // Fetch user addresses
        List<Address> addresses = addressRepository.findByUserId(user.getId());

        return ResponseEntity.ok(Map.of(
            "user", user,
            "addresses", addresses
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateUser(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody User updatedUser) {
        
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        
        User user = optionalUser.get();
        user.setPhone(updatedUser.getPhone());
        user.setSecondaryPhone(updatedUser.getSecondaryPhone());
        user.setGender(updatedUser.getGender());
        user.setBirthday(updatedUser.getBirthday());
        
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<?> addAddress(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody Address address) {
        
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
        }
        
        User user = optionalUser.get();
        address.setUserId(user.getId());

        if (address.getName() == null || address.getName().trim().isEmpty()) {
            address.setName(user.getName());
        }
        if (address.getPhone() == null || address.getPhone().trim().isEmpty()) {
            address.setPhone(user.getPhone());
        }
        
        if (address.isDefault()) {
            addressRepository.clearDefaultAddressForUser(user.getId());
        }
        
        Address savedAddress = addressRepository.save(address);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedAddress);
    }

    @PutMapping("/me/addresses/{id}")
    public ResponseEntity<?> updateAddress(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody Address updatedAddress) {
        
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = optionalUser.get();
        
        return addressRepository.findById(id).map(existing -> {
            if (!existing.getUserId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            String name = updatedAddress.getName();
            if (name == null || name.trim().isEmpty()) {
                name = user.getName();
            }
            existing.setName(name);

            String phone = updatedAddress.getPhone();
            if (phone == null || phone.trim().isEmpty()) {
                phone = user.getPhone();
            }
            existing.setPhone(phone);

            existing.setLine1(updatedAddress.getLine1());
            existing.setLine2(updatedAddress.getLine2());
            existing.setCity(updatedAddress.getCity());
            existing.setState(updatedAddress.getState());
            existing.setPincode(updatedAddress.getPincode());
            existing.setCountry(updatedAddress.getCountry());
            
            if (updatedAddress.isDefault()) {
                addressRepository.clearDefaultAddressForUser(user.getId());
            }
            existing.setDefault(updatedAddress.isDefault());
            return ResponseEntity.ok((Object) addressRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/me/addresses/{id}")
    public ResponseEntity<?> deleteAddress(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String email) {
        
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        return addressRepository.findById(id).map(existing -> {
            if (!existing.getUserId().equals(optionalUser.get().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            addressRepository.delete(existing);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- Wishlist Management --- //

    @Autowired
    private com.gtstore.userservice.repository.WishlistRepository wishlistRepository;

    @GetMapping("/me/wishlist")
    public ResponseEntity<?> getWishlist(@RequestHeader(value = "X-User-Email", required = false) String email) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        List<com.gtstore.userservice.entity.WishlistItem> wishlist = wishlistRepository.findByUserId(optionalUser.get().getId());
        return ResponseEntity.ok(wishlist);
    }

    @PostMapping("/me/wishlist")
    public ResponseEntity<?> addWishlistItem(
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @RequestBody Map<String, String> payload) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        String productId = payload.get("productId");
        if (productId == null || productId.isEmpty()) return ResponseEntity.badRequest().body("productId is required");

        Optional<com.gtstore.userservice.entity.WishlistItem> exists = wishlistRepository.findByUserIdAndProductId(optionalUser.get().getId(), productId);
        if (exists.isPresent()) {
            return ResponseEntity.ok(exists.get());
        }

        com.gtstore.userservice.entity.WishlistItem item = new com.gtstore.userservice.entity.WishlistItem();
        item.setUserId(optionalUser.get().getId());
        item.setProductId(productId);
        com.gtstore.userservice.entity.WishlistItem savedItem = wishlistRepository.save(item);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(savedItem);
    }

    @DeleteMapping("/me/wishlist/{productId}")
    public ResponseEntity<?> removeWishlistItem(
            @PathVariable String productId,
            @RequestHeader(value = "X-User-Email", required = false) String email) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        
        wishlistRepository.deleteByUserIdAndProductId(optionalUser.get().getId(), productId);
        return ResponseEntity.ok().build();
    }
}
