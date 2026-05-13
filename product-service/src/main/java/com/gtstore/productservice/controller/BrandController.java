package com.gtstore.productservice.controller;

import com.gtstore.productservice.document.Brand;
import com.gtstore.productservice.repository.BrandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
public class BrandController {

    @Autowired
    private BrandRepository brandRepository;

    @GetMapping
    public List<Brand> getAllBrands() {
        return brandRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Brand> getBrand(@PathVariable String id) {
        return brandRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Brand> getBrandBySlug(@PathVariable String slug) {
        return brandRepository.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<Brand> getBrandByName(@PathVariable String name) {
        return brandRepository.findByNameIgnoreCase(name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private void generateSlug(Brand brand) {
        if (brand.getName() == null || brand.getName().trim().isEmpty()) {
            return;
        }
        String base = brand.getName().toLowerCase().trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        
        if (base.isEmpty()) {
            base = "brand";
        }

        String uniqueSlug = base;
        int counter = 1;
        
        while (true) {
            java.util.Optional<Brand> existing = brandRepository.findBySlug(uniqueSlug);
            if (existing.isEmpty() || existing.get().getId() != null && existing.get().getId().equals(brand.getId())) {
                break;
            }
            uniqueSlug = base + "-" + (++counter);
            if (counter > 100) {
                uniqueSlug = base + "-" + java.util.UUID.randomUUID().toString().substring(0, 5);
                break;
            }
        }
        brand.setSlug(uniqueSlug);
    }

    @PostMapping
    public ResponseEntity<Brand> createBrand(@RequestBody Brand brand) {
        if (brand.getSlug() == null || brand.getSlug().trim().isEmpty()) {
            generateSlug(brand);
        }
        Brand saved = brandRepository.save(brand);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Brand> updateBrand(@PathVariable String id, @RequestBody Brand brand) {
        if (!brandRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        brand.setId(id);
        if (brand.getSlug() == null || brand.getSlug().trim().isEmpty()) {
            generateSlug(brand);
        }
        return ResponseEntity.ok(brandRepository.save(brand));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBrand(@PathVariable String id) {
        if (!brandRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        brandRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
