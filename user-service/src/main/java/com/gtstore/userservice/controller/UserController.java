package com.gtstore.userservice.controller;

import com.gtstore.userservice.entity.Address;
import com.gtstore.userservice.entity.User;
import com.gtstore.userservice.repository.AddressRepository;
import com.gtstore.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    /**
     * Endpoint hit by frontend to get the current profile.
     * The API Gateway intercepts the Keycloak JWT and forwards claims as headers.
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
        
        Address savedAddress = addressRepository.save(address);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedAddress);
    }
}
