package com.gtstore.notificationservice.service;

import com.gtstore.notificationservice.config.NotificationProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender emailSender;
    private final TemplateEngine templateEngine;
    private final NotificationProperties notificationProperties;

    public EmailService(JavaMailSender emailSender, TemplateEngine templateEngine, NotificationProperties notificationProperties) {
        this.emailSender = emailSender;
        this.templateEngine = templateEngine;
        this.notificationProperties = notificationProperties;
    }

    public void sendHtmlMessage(String to, String subject, String templateName, Map<String, Object> templateModel) {
        if (to == null || to.isEmpty()) {
            log.warn("Cannot send email, recipient address is missing.");
            return;
        }

        try {
            log.info("Preparing to send {} email to {}", templateName, to);
            
            Context context = new Context();
            context.setVariables(templateModel);
            String htmlContent = templateEngine.process(templateName, context);

            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(notificationProperties.getFromEmail());
            helper.setTo(to);
            
            String cc = notificationProperties.getCcEmail();
            if (cc != null && !cc.isEmpty()) {
                helper.setCc(cc);
            }
            
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            emailSender.send(message);
            log.info("HTML Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("Failed to send HTML email to {}", to, e);
        }
    }
}
