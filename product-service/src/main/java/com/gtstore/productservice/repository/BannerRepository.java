package com.gtstore.productservice.repository;

import com.gtstore.productservice.document.Banner;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface BannerRepository extends MongoRepository<Banner, String> {
    List<Banner> findByActiveTrueOrderByDisplayOrderAsc();
}
