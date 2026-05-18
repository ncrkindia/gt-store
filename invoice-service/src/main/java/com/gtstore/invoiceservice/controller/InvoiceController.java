package com.gtstore.invoiceservice.controller;

import com.gtstore.invoiceservice.dto.OrderDto;
import com.gtstore.invoiceservice.dto.OrderItemDto;
import com.gtstore.invoiceservice.entity.InvoiceRecord;
import com.gtstore.invoiceservice.repository.InvoiceRepository;
import com.gtstore.invoiceservice.util.PdfGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private static final Logger log = LoggerFactory.getLogger(InvoiceController.class);
    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    private InvoiceRepository invoiceRepository;

    // Define internal inter-service resolution addresses
    private static final String ORDER_SVC_URL = "http://order-service:4007/api/orders/";
    private static final String PROD_SVC_URL = "http://product-service:4005/api/products/bulk?includeUnlisted=true";

    @GetMapping("/order/{orderId}")
    @Transactional
    public ResponseEntity<byte[]> downloadInvoice(
            @PathVariable String orderId,
            @RequestHeader(value = "X-User-Email", required = false) String authEmail) {
        
        log.info("Initiating invoice generation request for order: {}", orderId);

        try {
            // 1. Fetch Order Details with forward authorization context (using specialized system-hop logic or direct call if secure cluster)
            // Direct retrieval from internal host
            HttpHeaders headers = new HttpHeaders();
            if (authEmail != null) headers.set("X-User-Email", authEmail);
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<OrderDto> orderResp = restTemplate.exchange(
                    ORDER_SVC_URL + orderId, HttpMethod.GET, request, OrderDto.class
            );

            if (!orderResp.getStatusCode().is2xxSuccessful() || orderResp.getBody() == null) {
                log.warn("Source order {} retrieval failed with {}", orderId, orderResp.getStatusCode());
                return ResponseEntity.notFound().build();
            }

            OrderDto order = orderResp.getBody();

            // 2. Business Rule Validation (Optional: Only allow if DELIVERED or SHIPPED)
            // For wider support allowing PAID orders as well, strictly enforcement can be toggled
            /* 
            if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            */

            // 3. Ensure dynamic serial caching logic (Incremental starting from 1 across system)
            InvoiceRecord invRec = invoiceRepository.findByOrderId(orderId)
                    .orElseGet(() -> invoiceRepository.save(new InvoiceRecord(orderId)));
            
            // 4. Enrich Item Names via Product Service lookup (only if not already recorded/snapshotted in the order item!)
            try {
                List<OrderItemDto> itemsToEnrich = order.getItems().stream()
                        .filter(item -> item.getProductName() == null || item.getProductName().trim().isEmpty() || "Product Item".equals(item.getProductName()))
                        .collect(Collectors.toList());
                
                if (!itemsToEnrich.isEmpty()) {
                    List<String> ids = itemsToEnrich.stream().map(OrderItemDto::getProductId).collect(Collectors.toList());
                    HttpEntity<List<String>> bulkReq = new HttpEntity<>(ids);
                    ResponseEntity<List<Map<String, Object>>> prodResp = restTemplate.exchange(
                            PROD_SVC_URL, HttpMethod.POST, bulkReq, new ParameterizedTypeReference<List<Map<String, Object>>>() {}
                    );
                    if (prodResp.getStatusCode().is2xxSuccessful() && prodResp.getBody() != null) {
                        Map<String, Map<String, Object>> prodMap = prodResp.getBody().stream().collect(Collectors.toMap(
                                p -> p.get("id").toString(),
                                p -> p
                        ));
                        
                        itemsToEnrich.forEach(item -> {
                            Map<String, Object> prodData = prodMap.get(item.getProductId());
                            if (prodData != null) {
                                item.setProductName(String.valueOf(prodData.getOrDefault("name", "Product Item")));
                                Object rawGst = prodData.get("gstPercentage");
                                if (rawGst != null) {
                                    try {
                                        item.setGstPercentage(Integer.parseInt(rawGst.toString()));
                                    } catch (Exception ignored) {}
                                }
                            }
                        });
                    }
                }
            } catch (Exception e) {
                 log.warn("Optional item name enrichment failed, falling back to IDs: {}", e.getMessage());
            }

            // 5. Generate Byte Stream with the cached incremental invoice number
            byte[] pdfBytes = PdfGenerator.generateInvoice(order, invRec.getInvoiceNo());

            // 6. Compose Response Headers
            HttpHeaders respHeaders = new HttpHeaders();
            respHeaders.setContentType(MediaType.APPLICATION_PDF);
            String pdfFilename = "INVOICE-" + (order.getOrderNumber() != null ? order.getOrderNumber() : orderId.substring(0, Math.min(8, orderId.length()))).toUpperCase() + ".pdf";
            respHeaders.setContentDisposition(ContentDisposition.attachment()
                    .filename(pdfFilename)
                    .build());
            respHeaders.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, respHeaders, HttpStatus.OK);

        } catch (Exception e) {
            log.error("Critical collapse during PDF generation pipeline for {}: {}", orderId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
