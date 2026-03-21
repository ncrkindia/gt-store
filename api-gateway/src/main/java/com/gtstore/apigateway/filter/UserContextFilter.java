package com.gtstore.apigateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class UserContextFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(UserContextFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .map(Authentication::getPrincipal)
                .cast(Jwt.class)
                .map(jwt -> {
                    String email = jwt.getClaimAsString("email");
                    String name = jwt.getClaimAsString("name");
                    if (name == null) {
                        name = jwt.getClaimAsString("preferred_username");
                    }
                    
                    if (email != null) {
                        logger.debug("Injecting User Context - Email: {}", email);
                        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                                .header("X-User-Email", email)
                                .header("X-User-Name", name != null ? name : "")
                                .build();
                        return exchange.mutate().request(mutatedRequest).build();
                    }
                    return exchange;
                })
                .defaultIfEmpty(exchange)
                .flatMap(chain::filter);
    }

    @Override
    public int getOrder() {
        return -1; // Execute early in the filter chain
    }
}
