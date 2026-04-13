package com.gtstore.paymentservice.service;

import com.gtstore.paymentservice.config.RazorpayConfig;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.razorpay.Refund;
import java.util.Map;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private final RazorpayConfig razorpayConfig;
    private RazorpayClient client;

    public RazorpayService(RazorpayConfig razorpayConfig) {
        this.razorpayConfig = razorpayConfig;
        try {
            this.client = new RazorpayClient(razorpayConfig.getKeyId(), razorpayConfig.getKeySecret());
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay Client", e);
        }
    }

    public String createOrder(Double amount, String currency, String receipt) throws RazorpayException {
        JSONObject orderRequest = new JSONObject();
        // Razorpay expects amount in paise (100 paise = 1 unit)
        orderRequest.put("amount", (int) (amount * 100));
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receipt);

        Order order = client.orders.create(orderRequest);
        log.info("Created Razorpay order: {} for receipt: {}", order.get("id"), receipt);
        return order.get("id");
    }

    public boolean verifyPaymentSignature(Map<String, String> payload) {
        String razorpayOrderId = payload.get("razorpay_order_id");
        String razorpayPaymentId = payload.get("razorpay_payment_id");
        String razorpaySignature = payload.get("razorpay_signature");

        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", razorpayOrderId);
            options.put("razorpay_payment_id", razorpayPaymentId);
            options.put("razorpay_signature", razorpaySignature);

            return Utils.verifyPaymentSignature(options, razorpayConfig.getKeySecret());
        } catch (RazorpayException e) {
            log.error("Signature verification failed", e);
            return false;
        }
    }

    public String refundPayment(String paymentId, Double amount) throws RazorpayException {
        JSONObject refundRequest = new JSONObject();
        refundRequest.put("amount", (int) (amount * 100)); // amount in paise
        refundRequest.put("speed", "normal");
        
        Refund refund = client.payments.refund(paymentId, refundRequest);
        log.info("Triggered Razorpay refund: {} for payment: {}", refund.get("id"), paymentId);
        return refund.get("id");
    }
}
