package com.gtstore.productservice.repository;

import com.gtstore.productservice.document.Brand;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface BrandRepository extends MongoRepository<Brand, String> {
    Optional<Brand> findBySlug(String slug);
    Optional<Brand> findByNameIgnoreCase(String name);
}
