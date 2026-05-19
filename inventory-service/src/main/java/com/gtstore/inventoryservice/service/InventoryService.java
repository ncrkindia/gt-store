package com.gtstore.inventoryservice.service;

import com.gtstore.inventoryservice.dto.StockReservationRequest;
import com.gtstore.inventoryservice.entity.Inventory;
import com.gtstore.inventoryservice.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public InventoryService(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    public Integer getStock(String productId) {
        return getStock(productId, null);
    }

    public Integer getStock(String productId, String variantId) {
        Optional<Inventory> invOpt = Optional.empty();
        if (variantId != null && !variantId.trim().isEmpty() && !"std".equalsIgnoreCase(variantId)) {
            invOpt = inventoryRepository.findByProductIdAndVariantId(productId, variantId.trim());
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(productId).filter(i -> i.getVariantId() == null || i.getVariantId().trim().isEmpty() || "std".equalsIgnoreCase(i.getVariantId()));
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(productId);
        }
        return invOpt.map(Inventory::getStock).orElse(0);
    }

    @Transactional
    public boolean reserveStock(StockReservationRequest request) {
        if (request.getQuantity() == null) {
            request.setQuantity(1); // Default to 1 if null
        }
        Optional<Inventory> invOpt = Optional.empty();
        if (request.getVariantId() != null && !request.getVariantId().trim().isEmpty() && !"std".equalsIgnoreCase(request.getVariantId())) {
            invOpt = inventoryRepository.findByProductIdAndVariantId(request.getProductId(), request.getVariantId().trim());
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(request.getProductId()).filter(i -> i.getVariantId() == null || i.getVariantId().trim().isEmpty() || "std".equalsIgnoreCase(i.getVariantId()));
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(request.getProductId());
        }

        if (invOpt.isPresent()) {
            Inventory inv = invOpt.get();
            if (inv.getStock() != null && inv.getStock() >= request.getQuantity()) {
                inv.setStock(inv.getStock() - request.getQuantity());
                inventoryRepository.save(inv);
                return true;
            }
        }
        return false;
    }

    @Transactional
    public void releaseStock(StockReservationRequest request) {
        if (request.getQuantity() == null) {
            request.setQuantity(1);
        }
        Optional<Inventory> invOpt = Optional.empty();
        if (request.getVariantId() != null && !request.getVariantId().trim().isEmpty() && !"std".equalsIgnoreCase(request.getVariantId())) {
            invOpt = inventoryRepository.findByProductIdAndVariantId(request.getProductId(), request.getVariantId().trim());
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(request.getProductId()).filter(i -> i.getVariantId() == null || i.getVariantId().trim().isEmpty() || "std".equalsIgnoreCase(i.getVariantId()));
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(request.getProductId());
        }

        if (invOpt.isPresent()) {
            Inventory inv = invOpt.get();
            if (inv.getStock() != null) {
                inv.setStock(inv.getStock() + request.getQuantity());
                inventoryRepository.save(inv);
            }
        }
    }

    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    @Transactional
    public Inventory updateStock(String productId, String variantId, Integer quantity) {
        Optional<Inventory> invOpt = Optional.empty();
        if (variantId != null && !variantId.trim().isEmpty() && !"std".equalsIgnoreCase(variantId)) {
            invOpt = inventoryRepository.findByProductIdAndVariantId(productId, variantId.trim());
        } else {
            invOpt = inventoryRepository.findByProductId(productId).filter(i -> i.getVariantId() == null || i.getVariantId().trim().isEmpty() || "std".equalsIgnoreCase(i.getVariantId()));
        }

        Inventory inventory = invOpt.orElse(new Inventory());
        if (inventory.getProductId() == null) {
            inventory.setProductId(productId);
        }
        if (variantId != null && !variantId.trim().isEmpty() && !"std".equalsIgnoreCase(variantId)) {
            inventory.setVariantId(variantId.trim());
        }
        inventory.setStock(quantity);
        return inventoryRepository.save(inventory);
    }
}
