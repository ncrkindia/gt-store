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
        return inventoryRepository.findByProductId(productId)
                .map(Inventory::getStock)
                .orElse(0);
    }

    @Transactional
    public boolean reserveStock(StockReservationRequest request) {
        Optional<Inventory> invOpt = Optional.empty();
        if (request.getVariantId() != null && !request.getVariantId().trim().isEmpty() && !"std".equalsIgnoreCase(request.getVariantId())) {
            invOpt = inventoryRepository.findByProductIdAndVariantId(request.getProductId(), request.getVariantId());
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(request.getProductId());
        }

        if (invOpt.isPresent()) {
            Inventory inv = invOpt.get();
            if (inv.getStock() >= request.getQuantity()) {
                inv.setStock(inv.getStock() - request.getQuantity());
                inventoryRepository.save(inv);
                return true;
            }
        }
        return false;
    }

    @Transactional
    public void releaseStock(StockReservationRequest request) {
        Optional<Inventory> invOpt = Optional.empty();
        if (request.getVariantId() != null && !request.getVariantId().trim().isEmpty() && !"std".equalsIgnoreCase(request.getVariantId())) {
            invOpt = inventoryRepository.findByProductIdAndVariantId(request.getProductId(), request.getVariantId());
        }
        if (!invOpt.isPresent()) {
            invOpt = inventoryRepository.findByProductId(request.getProductId());
        }

        if (invOpt.isPresent()) {
            Inventory inv = invOpt.get();
            inv.setStock(inv.getStock() + request.getQuantity());
            inventoryRepository.save(inv);
        }
    }

    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    @Transactional
    public Inventory updateStock(String productId, Integer quantity) {
        Inventory inventory = inventoryRepository.findByProductId(productId)
                .orElse(new Inventory());
        
        if (inventory.getProductId() == null) {
            inventory.setProductId(productId);
        }
        
        inventory.setStock(quantity);
        return inventoryRepository.save(inventory);
    }
}
