package com.gtstore.productservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                // Public GET endpoints for catalog
                .requestMatchers(new AntPathRequestMatcher("/api/products/**", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/products/bulk", "POST")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/categories/**", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/brands/**", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/banners/**", "GET")).permitAll()
                
                // Swagger/OpenAPI endpoints
                .requestMatchers(new AntPathRequestMatcher("/v3/api-docs/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/swagger-ui/**")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/swagger-ui.html")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/products/v3/api-docs/**")).permitAll()
                
                // Require auth for mutating endpoints
                .anyRequest().authenticated()
            )

            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
        
        return http.build();
    }
}
