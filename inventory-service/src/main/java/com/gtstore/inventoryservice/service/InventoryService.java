package com.gtstore.inventoryservice.service;

import com.gtstore.inventoryservice.dto.StockReservationRequest;
import com.gtstore.inventoryservice.entity.Inventory;
import com.gtstore.inventoryservice.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        Optional<Inventory> invOpt = (request.getVariantId() != null)
                ? inventoryRepository.findByProductIdAndVariantId(request.getProductId(), request.getVariantId())
                : inventoryRepository.findByProductId(request.getProductId());

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
        Optional<Inventory> invOpt = (request.getVariantId() != null)
                ? inventoryRepository.findByProductIdAndVariantId(request.getProductId(), request.getVariantId())
                : inventoryRepository.findByProductId(request.getProductId());

        if (invOpt.isPresent()) {
            Inventory inv = invOpt.get();
            inv.setStock(inv.getStock() + request.getQuantity());
            inventoryRepository.save(inv);
        }
    }
}
