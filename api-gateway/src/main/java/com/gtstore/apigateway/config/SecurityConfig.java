package com.gtstore.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Security Configuration for the GT Store API Gateway.
 * Configures the resource server, JWT validation, and Role-Based Access Control
 * (RBAC).
 * 
 * - Public routes: /api/products/ (GET), /api/categories/ (GET)
 * - Admin routes: POST/PUT/DELETE on products/categories, global order views.
 * - Authenticated routes: All other /api/** endpoints.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        // Public endpoints
                        .pathMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/products/bulk").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/search/**").permitAll()

                        // Admin endpoints
                        .pathMatchers(HttpMethod.POST, "/api/products/**").hasRole("admin")
                        .pathMatchers(HttpMethod.PUT, "/api/products/**").hasRole("admin")
                        .pathMatchers(HttpMethod.DELETE, "/api/products/**").hasRole("admin")

                        .pathMatchers(HttpMethod.POST, "/api/categories/**").hasRole("admin")
                        .pathMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("admin")
                        .pathMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole("admin")

                        .pathMatchers(HttpMethod.GET, "/api/orders/all").hasRole("admin")
                        .pathMatchers(HttpMethod.PUT, "/api/orders/*/status").hasRole("admin")

                        .pathMatchers(HttpMethod.GET, "/api/inventory/all").hasRole("admin")
                        .pathMatchers(HttpMethod.PUT, "/api/inventory/**").hasRole("admin")

                        // All other endpoints require authentication
                        .pathMatchers("/api/**").authenticated()
                        .anyExchange().permitAll())
                .oauth2ResourceServer(
                        oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(grantedAuthoritiesExtractor())));

        return http.build();
    }

    private ReactiveJwtAuthenticationConverter grantedAuthoritiesExtractor() {
        KeycloakRoleConverter keycloakRoleConverter = new KeycloakRoleConverter();
        ReactiveJwtAuthenticationConverter jwtAuthenticationConverter = new ReactiveJwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(keycloakRoleConverter);
        return jwtAuthenticationConverter;
    }
}
