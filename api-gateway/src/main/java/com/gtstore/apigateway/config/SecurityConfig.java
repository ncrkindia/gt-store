package com.gtstore.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

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
        public CorsWebFilter corsWebFilter() {
                CorsConfiguration config = new CorsConfiguration();
                config.setAllowedOrigins(List.of(
                                "https://gts-admin.slpro.in",
                                "https://gt-store.slpro.in",
                                "http://localhost:5173",
                                "http://localhost:5174"));
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                config.setAllowedHeaders(List.of(
                                HttpHeaders.AUTHORIZATION,
                                HttpHeaders.CONTENT_TYPE,
                                HttpHeaders.ACCEPT));
                config.setAllowCredentials(true);
                config.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/api/**", config);
                return new CorsWebFilter(source);
        }

        @Bean
        public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
                http
                                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                                .cors(cors -> cors.configurationSource(request -> {
                                        CorsConfiguration config = new CorsConfiguration();
                                        config.setAllowedOrigins(List.of(
                                                        "https://gts-admin.slpro.in",
                                                        "https://gt-store.slpro.in",
                                                        "https://gtstore.slpro.in",
                                                        "http://localhost:5173",
                                                        "http://localhost:5174"));
                                        config.setAllowedMethods(
                                                        List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                                        config.setAllowedHeaders(List.of(
                                                        HttpHeaders.AUTHORIZATION,
                                                        HttpHeaders.CONTENT_TYPE,
                                                        HttpHeaders.ACCEPT));
                                        config.setAllowCredentials(true);
                                        config.setMaxAge(3600L);
                                        return config;
                                }))
                                .authorizeExchange(exchanges -> exchanges
                                                // Public endpoints
                                                .pathMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                                                .pathMatchers(HttpMethod.POST, "/api/products/bulk").permitAll()
                                                .pathMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                                                .pathMatchers(HttpMethod.GET, "/api/search/**").permitAll()
                                                .pathMatchers(HttpMethod.POST, "/api/products/sync").permitAll()

                                                // Swagger/OpenAPI endpoints
                                                .pathMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/webjars/**").permitAll()
                                                // Allow docs forwarding to microservices
                                                .pathMatchers("/api/*/v3/api-docs").permitAll()



                                                // Admin endpoints - role matches Keycloak role assigned to admin users
                                                .pathMatchers(HttpMethod.POST, "/api/products/**").hasRole("GTS_ADMIN")
                                                .pathMatchers(HttpMethod.PUT, "/api/products/**").hasRole("GTS_ADMIN")
                                                .pathMatchers(HttpMethod.DELETE, "/api/products/**")
                                                .hasRole("GTS_ADMIN")

                                                .pathMatchers(HttpMethod.POST, "/api/categories/**")
                                                .hasRole("GTS_ADMIN")
                                                .pathMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("GTS_ADMIN")
                                                .pathMatchers(HttpMethod.DELETE, "/api/categories/**")
                                                .hasRole("GTS_ADMIN")

                                                .pathMatchers(HttpMethod.GET, "/api/orders/all").hasRole("GTS_ADMIN")
                                                .pathMatchers(HttpMethod.PUT, "/api/orders/*/status")
                                                .hasRole("GTS_ADMIN")

                                                .pathMatchers(HttpMethod.GET, "/api/inventory/all").hasRole("GTS_ADMIN")
                                                .pathMatchers(HttpMethod.PUT, "/api/inventory/**").hasRole("GTS_ADMIN")

                                                // All other endpoints require authentication
                                                .pathMatchers("/api/**").authenticated()
                                                .anyExchange().permitAll())
                                .headers(headers -> headers
                                                .frameOptions(ServerHttpSecurity.HeaderSpec.FrameOptionsSpec::disable)
                                                .contentSecurityPolicy(csp -> csp
                                                                .policyDirectives("frame-ancestors 'self' https://gts-admin.slpro.in http://localhost:5174")))
                                .oauth2ResourceServer(


                                                oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(
                                                                grantedAuthoritiesExtractor())));

                return http.build();
        }

        private ReactiveJwtAuthenticationConverter grantedAuthoritiesExtractor() {
                KeycloakRoleConverter keycloakRoleConverter = new KeycloakRoleConverter();
                ReactiveJwtAuthenticationConverter jwtAuthenticationConverter = new ReactiveJwtAuthenticationConverter();
                jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(keycloakRoleConverter);
                return jwtAuthenticationConverter;
        }
}
