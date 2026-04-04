package com.gtstore.paymentservice.service;

import com.gtstore.paymentservice.config.PaypalConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.*;


@Service
public class PaypalService {

    private static final Logger log = LoggerFactory.getLogger(PaypalService.class);
    private final PaypalConfig paypalConfig;
    private final RestTemplate restTemplate;

    public PaypalService(PaypalConfig paypalConfig) {
        this.paypalConfig = paypalConfig;
        this.restTemplate = new RestTemplate();
    }

    private String getBaseUrl() {
        return "sandbox".equalsIgnoreCase(paypalConfig.getMode()) 
            ? "https://api-m.sandbox.paypal.com" 
            : "https://api-m.paypal.com";
    }

    public String getAccessToken() {
        String url = getBaseUrl() + "/v1/oauth2/token";
        
        log.info("Fetching PayPal access token from: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(paypalConfig.getClientId(), paypalConfig.getClientSecret());
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("grant_type", "client_credentials");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.POST, request, (Class<Map<String, Object>>) (Class<?>) Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return (String) response.getBody().get("access_token");
        }
        throw new RuntimeException("Could not retrieve PayPal access token");
    }

    public String createOrder(Double total, String currency, String orderId) {
        String accessToken = getAccessToken();
        String url = getBaseUrl() + "/v2/checkout/orders";
        
        log.info("Creating PayPal order for GT order: {}", orderId);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> orderRequest = new HashMap<>();
        orderRequest.put("intent", "CAPTURE");

        Map<String, Object> purchaseUnit = new HashMap<>();
        purchaseUnit.put("reference_id", orderId);
        
        Map<String, Object> amount = new HashMap<>();
        amount.put("currency_code", currency);
        amount.put("value", String.format(Locale.US, "%.2f", total));
        
        purchaseUnit.put("amount", amount);
        orderRequest.put("purchase_units", Collections.singletonList(purchaseUnit));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(orderRequest, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.POST, request, (Class<Map<String, Object>>) (Class<?>) Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return (String) response.getBody().get("id");
        }
        throw new RuntimeException("Could not create PayPal order");
    }

    public Map<String, Object> captureOrder(String paypalOrderId) {
        String accessToken = getAccessToken();
        String url = getBaseUrl() + "/v2/checkout/orders/" + paypalOrderId + "/capture";
        
        log.info("Capturing PayPal order: {}", paypalOrderId);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> request = new HttpEntity<>("{}", headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.POST, request, (Class<Map<String, Object>>) (Class<?>) Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            return response.getBody();
        }
        throw new RuntimeException("Could not capture PayPal order: " + paypalOrderId);
    }
}

