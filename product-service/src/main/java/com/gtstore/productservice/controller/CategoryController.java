package com.gtstore.productservice.controller;

import com.gtstore.productservice.document.Category;
import com.gtstore.productservice.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategory(@PathVariable String id) {
        return categoryRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Category> getCategoryBySlug(@PathVariable String slug) {
        return categoryRepository.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private void generateSlug(Category category) {
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            return;
        }
        String base = category.getName().toLowerCase().trim()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        
        if (base.isEmpty()) {
            base = "category";
        }

        String uniqueSlug = base;
        int counter = 1;
        
        while (true) {
            java.util.Optional<Category> existing = categoryRepository.findBySlug(uniqueSlug);
            if (existing.isEmpty() || existing.get().getId() != null && existing.get().getId().equals(category.getId())) {
                break;
            }
            uniqueSlug = base + "-" + (++counter);
            if (counter > 100) {
                uniqueSlug = base + "-" + java.util.UUID.randomUUID().toString().substring(0, 5);
                break;
            }
        }
        category.setSlug(uniqueSlug);
    }

    @PostMapping
    public ResponseEntity<Category> createCategory(@RequestBody Category category) {
        if (category.getSlug() == null || category.getSlug().trim().isEmpty()) {
            generateSlug(category);
        }
        Category saved = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable String id, @RequestBody Category category) {
        if (!categoryRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        category.setId(id);
        if (category.getSlug() == null || category.getSlug().trim().isEmpty()) {
            generateSlug(category);
        }
        return ResponseEntity.ok(categoryRepository.save(category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable String id) {
        if (!categoryRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        categoryRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
