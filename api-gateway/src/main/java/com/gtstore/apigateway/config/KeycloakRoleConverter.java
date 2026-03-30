package com.gtstore.apigateway.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

public class KeycloakRoleConverter implements Converter<Jwt, Flux<GrantedAuthority>> {

    @Override
    @SuppressWarnings("unchecked")
    public Flux<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = (Map<String, Object>) jwt.getClaims().get("realm_access");
        
        if (realmAccess == null || realmAccess.isEmpty()) {
            return Flux.empty();
        }
        
        List<String> roles = (List<String>) realmAccess.get("roles");
        
        if (roles == null || roles.isEmpty()) {
            return Flux.empty();
        }
        
        return Flux.fromIterable(roles.stream()
                .map(roleName -> "ROLE_" + roleName)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList()));
    }
}
